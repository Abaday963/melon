// Настоящий Postgres в памяти: выполняет server/schema.sql и пробует его обойти от лица клиента.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const db = new PGlite({ extensions: { pgcrypto } });
const schema = readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8');

async function rpc(name, ...args) {
  const marks = args.map((_, i) => `$${i + 1}`).join(', ');
  await db.exec('set role anon');
  try {
    const res = await db.query(`select ${name}(${marks}) as r`, args);
    return res.rows[0].r;
  } finally {
    await db.exec('reset role');
  }
}

async function fails(message, promise) {
  await assert.rejects(promise, (error) => error.message.includes(message), `ожидалась ошибка ${message}`);
}

async function user(nick) {
  return (await rpc('melon_register', nick, 'secret1')).token;
}

before(async () => {
  await db.exec('create role anon nologin; create role authenticated nologin;');
  await db.exec(schema);
  await db.exec(schema); // повторный запуск не должен ломаться
});

test('регистрация и вход', async () => {
  const reg = await rpc('melon_register', 'Abylai', 'secret1');
  assert.equal(reg.nick, 'Abylai');
  assert.equal(reg.token.length, 64);
  const login = await rpc('melon_login', 'abylai', 'secret1');
  assert.ok(login.token);
  assert.notEqual(login.token, reg.token);
  assert.equal((await rpc('melon_login', 'abylai', 'wrong')).error, 'bad_login');
  assert.equal((await rpc('melon_login', 'nobody', 'x')).error, 'bad_login');
});

test('плохие ники и пароли отклоняются', async () => {
  await fails('bad_nick', rpc('melon_register', 'ab', 'secret1'));
  await fails('bad_nick', rpc('melon_register', '<script>', 'secret1'));
  await fails('bad_password', rpc('melon_register', 'Goodnick', '123'));
  await user('Taken');
  await fails('nick_taken', rpc('melon_register', 'TAKEN', 'secret1'));
});

test('пароль и токен не лежат открытым текстом', async () => {
  const { token } = await rpc('melon_register', 'Plain', 'secret1');
  const row = (await db.query("select pass_hash from melon_users where nick = 'Plain'")).rows[0];
  assert.ok(row.pass_hash.startsWith('$2'));
  const sessions = (await db.query('select token_hash from melon_sessions')).rows;
  assert.ok(!sessions.some((s) => s.token_hash === token));
});

test('8 неверных паролей блокируют вход, и блокировка сохраняется', async () => {
  await user('Locked');
  for (let i = 0; i < 8; i++) await rpc('melon_login', 'Locked', 'wrong');
  assert.equal((await rpc('melon_login', 'Locked', 'secret1')).error, 'locked');
});

test('клиент не может читать таблицы напрямую', async () => {
  await db.exec('set role anon');
  try {
    for (const table of ['melon_users', 'melon_sessions', 'melon_friends', 'melon_posts', 'melon_reports']) {
      await fails('permission denied', db.query(`select * from ${table}`));
    }
    await fails('permission denied', db.query("update melon_users set is_admin = true"));
    await fails('permission denied', db.query("select melon_uid('x')"));
    await fails('permission denied', db.query("select melon_new_session(gen_random_uuid())"));
  } finally {
    await db.exec('reset role');
  }
});

test('прогресс: на новом устройстве возвращается лучший', async () => {
  const token = await user('Synced');
  const saved = JSON.stringify({ xp: 500, done: { u1l1: 100 } });
  assert.equal((await rpc('melon_sync', token, 500, 10, 200, 40, 1, 12, saved)).xp, 500);
  const behind = await rpc('melon_sync', token, 100, 10, 50, 5, 0, 1, '{"xp":100}');
  assert.equal(behind.xp, 500);
  assert.equal(behind.progress.done.u1l1, 100);
  const login = await rpc('melon_login', 'Synced', 'secret1');
  assert.equal(login.xp, 500);
  assert.equal(login.progress.xp, 500);
});

test('неделя сбрасывается, рекорды не уменьшаются, мусор обрезается', async () => {
  const token = await user('Weeker');
  await rpc('melon_sync', token, 100, 10, 100, 50, 2, 20, null);
  await rpc('melon_sync', token, 150, 11, 50, 40, 1, 10, null);
  const rows = await rpc('melon_rating', token, 11);
  assert.equal(rows[0].week_xp, 50);
  assert.equal(rows[0].words, 50);
  assert.equal(rows[0].units, 2);
  assert.equal(rows[0].blitz, 20);
  assert.equal((await rpc('melon_rating', token, 12))[0].week_xp, 0);
  await rpc('melon_sync', token, 200, 12, -5, 999999999, 9999, 9999, null);
  const after = (await rpc('melon_rating', token, 12))[0];
  assert.equal(after.week_xp, 0);
  assert.equal(after.words, 100000);
  assert.equal(after.units, 100);
  assert.equal(after.blitz, 1000);
});

test('плохой токен никуда не пускает', async () => {
  await fails('bad_token', rpc('melon_sync', 'nope', 1, 1, 1, 1, 1, 1, null));
  await fails('bad_token', rpc('melon_rating', 'nope', 1));
  await fails('bad_token', rpc('melon_post', 'nope', 'bug', 'text'));
  await fails('bad_token', rpc('melon_add_friend', 'nope', 'Taken'));
});

test('друзья видят друг друга, посторонние — нет', async () => {
  const a = await user('Friend_A');
  const b = await user('Friend_B');
  const c = await user('Stranger');
  assert.equal((await rpc('melon_rating', a, 1)).length, 1);
  await fails('no_user', rpc('melon_add_friend', a, 'Ghost'));
  await fails('self', rpc('melon_add_friend', a, 'Friend_A'));
  assert.equal((await rpc('melon_add_friend', a, 'friend_b')).nick, 'Friend_B');
  await rpc('melon_add_friend', a, 'friend_b');
  const nicks = (rows) => rows.map((r) => r.nick).sort();
  assert.deepEqual(nicks(await rpc('melon_rating', a, 1)), ['Friend_A', 'Friend_B']);
  assert.deepEqual(nicks(await rpc('melon_rating', b, 1)), ['Friend_A', 'Friend_B']);
  assert.deepEqual(nicks(await rpc('melon_rating', c, 1)), ['Stranger']);
  await rpc('melon_remove_friend', b, 'Friend_A');
  assert.deepEqual(nicks(await rpc('melon_rating', a, 1)), ['Friend_A']);
});

test('доска: писать только с аккаунтом, читать можно всем', async () => {
  const token = await user('Poster');
  await fails('bad_text', rpc('melon_post', token, 'bug', '   '));
  await fails('bad_text', rpc('melon_post', token, 'hack', 'text'));
  await fails('bad_text', rpc('melon_post', token, 'bug', 'x'.repeat(501)));
  await rpc('melon_post', token, 'bug', '<b>Не работает</b> звук');
  await fails('too_fast', rpc('melon_post', token, 'chat', 'ещё'));
  const list = await rpc('melon_posts_list', null);
  assert.equal(list[0].body, '<b>Не работает</b> звук');
  assert.equal(list[0].mine, false);
  assert.equal((await rpc('melon_posts_list', token))[0].mine, true);
});

test('удалить можно только своё, а модератор — любое', async () => {
  const owner = await user('Owner');
  const other = await user('Other');
  const { id } = await rpc('melon_post', owner, 'idea', 'удали меня');
  await rpc('melon_post_delete', other, id);
  assert.ok((await rpc('melon_posts_list', null)).some((p) => p.id === id));
  await rpc('melon_post_delete', owner, id);
  assert.ok(!(await rpc('melon_posts_list', null)).some((p) => p.id === id));

  const admin = await user('Admin1');
  await db.exec("update melon_users set is_admin = true where nick = 'Admin1'");
  const second = await user('Owner2');
  const post = await rpc('melon_post', second, 'chat', 'спам');
  assert.equal((await rpc('melon_posts_list', admin))[0].can_delete, true);
  await rpc('melon_post_delete', admin, post.id);
  assert.ok(!(await rpc('melon_posts_list', null)).some((p) => p.id === post.id));
});

test('две жалобы скрывают сообщение, своя и повторная не считаются', async () => {
  const author = await user('Author');
  const r1 = await user('Reporter1');
  const r2 = await user('Reporter2');
  const { id } = await rpc('melon_post', author, 'chat', 'плохое');
  const visible = async () => (await rpc('melon_posts_list', null)).some((p) => p.id === id);
  await rpc('melon_post_report', author, id);
  await rpc('melon_post_report', r1, id);
  await rpc('melon_post_report', r1, id);
  assert.equal(await visible(), true);
  await rpc('melon_post_report', r2, id);
  assert.equal(await visible(), false);
});

test('удаление аккаунта требует пароль и стирает всё', async () => {
  const token = await user('Goner');
  await fails('bad_login', rpc('melon_delete_account', token, 'wrong'));
  await rpc('melon_post', token, 'chat', 'пока');
  await rpc('melon_delete_account', token, 'secret1');
  assert.equal((await rpc('melon_login', 'Goner', 'secret1')).error, 'bad_login');
  await fails('bad_token', rpc('melon_rating', token, 1));
  assert.ok(!(await rpc('melon_posts_list', null)).some((p) => p.nick === 'Goner'));
});
