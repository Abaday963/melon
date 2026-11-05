// Связь с сервером. Без интернета приложение продолжает работать, а сюда просто приходит ошибка.
import { SUPABASE_KEY, SUPABASE_URL } from './config.js';

export const hasServer = () => Boolean(SUPABASE_URL && SUPABASE_KEY);

const MESSAGES = {
  bad_nick: 'Ник: 3–16 букв, цифр или _',
  bad_password: 'Пароль: минимум 6 символов',
  nick_taken: 'Этот ник уже занят',
  bad_login: 'Неверный ник или пароль',
  locked: 'Слишком много попыток. Подожди 5 минут',
  no_user: 'Такого ника нет',
  self: 'Это твой собственный ник',
  too_many: 'Слишком много, попробуй позже',
  too_fast: 'Подожди немного перед следующим сообщением',
  bad_text: 'Напиши сообщение, до 500 символов',
  too_big: 'Прогресс слишком большой для сохранения',
  offline: 'Нет связи с сервером',
};

export class CloudError extends Error {
  constructor(code) {
    super(MESSAGES[code] ?? MESSAGES.offline);
    this.code = code;
  }
}

async function rpc(name, args) {
  let response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new CloudError('offline');
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new CloudError('offline');
  }
  if (!response.ok) {
    const code = String(data?.message ?? '');
    throw new CloudError(code in MESSAGES ? code : code === 'bad_token' ? 'bad_token' : 'offline');
  }
  if (data?.error) throw new CloudError(data.error);
  return data;
}

export const register = (nick, password) => rpc('melon_register', { p_nick: nick, p_password: password });
export const login = (nick, password) => rpc('melon_login', { p_nick: nick, p_password: password });
export const logout = (token) => rpc('melon_logout', { p_token: token });
export const deleteAccount = (token, password) => rpc('melon_delete_account', { p_token: token, p_password: password });

export const sync = (token, stats, progress) => rpc('melon_sync', {
  p_token: token,
  p_xp: stats.xp,
  p_week_key: stats.weekKey,
  p_week_xp: stats.weekXp,
  p_words: stats.words,
  p_units: stats.units,
  p_blitz: stats.blitz,
  p_progress: progress,
});

export const rating = (token, weekKey) => rpc('melon_rating', { p_token: token, p_week_key: weekKey });
export const addFriend = (token, nick) => rpc('melon_add_friend', { p_token: token, p_nick: nick });
export const removeFriend = (token, nick) => rpc('melon_remove_friend', { p_token: token, p_nick: nick });

export const listPosts = (token) => rpc('melon_posts_list', { p_token: token ?? null });
export const addPost = (token, kind, body) => rpc('melon_post', { p_token: token, p_kind: kind, p_body: body });
export const deletePost = (token, id) => rpc('melon_post_delete', { p_token: token, p_id: id });
export const reportPost = (token, id) => rpc('melon_post_report', { p_token: token, p_id: id });
