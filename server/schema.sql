-- Сервер Melon: аккаунты, друзья, рейтинг, доска.
-- Выполнить один раз целиком в Supabase → SQL Editor. Повторный запуск безопасен.
--
-- Клиент не видит таблицы: всё идёт через функции ниже.
-- Пароль хранится только как bcrypt-хеш, токен входа — только как sha256.
-- Сделать себя модератором доски:
--   update melon_users set is_admin = true where lower(nick) = lower('ТвойНик');

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists melon_users (
  id           uuid primary key default gen_random_uuid(),
  nick         text not null,
  pass_hash    text not null,
  is_admin     boolean not null default false,
  failed       int not null default 0,
  locked_until timestamptz,
  xp           int not null default 0,
  week_key     int not null default 0,
  week_xp      int not null default 0,
  words        int not null default 0,
  units        int not null default 0,
  blitz        int not null default 0,
  progress     jsonb,
  created_at   timestamptz not null default now(),
  seen_at      timestamptz not null default now()
);
create unique index if not exists melon_users_nick on melon_users (lower(nick));

create table if not exists melon_sessions (
  token_hash text primary key,
  user_id    uuid not null references melon_users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists melon_friends (
  user_id   uuid not null references melon_users (id) on delete cascade,
  friend_id uuid not null references melon_users (id) on delete cascade,
  primary key (user_id, friend_id)
);

create table if not exists melon_posts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references melon_users (id) on delete cascade,
  kind       text not null check (kind in ('bug', 'idea', 'chat')),
  body       text not null check (char_length(body) between 1 and 500),
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists melon_posts_new on melon_posts (created_at desc);
create index if not exists melon_posts_user on melon_posts (user_id, created_at desc);

create table if not exists melon_reports (
  post_id bigint not null references melon_posts (id) on delete cascade,
  user_id uuid not null references melon_users (id) on delete cascade,
  primary key (post_id, user_id)
);

alter table melon_users enable row level security;
alter table melon_sessions enable row level security;
alter table melon_friends enable row level security;
alter table melon_posts enable row level security;
alter table melon_reports enable row level security;

-- ---------- Внутренние функции ----------

create or replace function melon_hash_token(p_token text)
returns text language sql immutable
set search_path = public, extensions
as $$ select encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') $$;

create or replace function melon_new_session(p_user uuid)
returns text language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_token text := encode(gen_random_bytes(32), 'hex');
begin
  insert into melon_sessions (token_hash, user_id) values (melon_hash_token(v_token), p_user);
  return v_token;
end $$;

create or replace function melon_uid(p_token text)
returns uuid language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  select user_id into v_id from melon_sessions where token_hash = melon_hash_token(p_token);
  if v_id is null then
    raise exception 'bad_token';
  end if;
  return v_id;
end $$;

-- ---------- Аккаунт ----------

create or replace function melon_register(p_nick text, p_password text)
returns json language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_nick text := btrim(coalesce(p_nick, ''));
  v_id uuid;
begin
  if v_nick !~ '^[A-Za-zА-Яа-яЁё0-9_]{3,16}$' then
    raise exception 'bad_nick';
  end if;
  if char_length(coalesce(p_password, '')) < 6 or octet_length(p_password) > 72 then
    raise exception 'bad_password';
  end if;
  if exists (select 1 from melon_users where lower(nick) = lower(v_nick)) then
    raise exception 'nick_taken';
  end if;
  insert into melon_users (nick, pass_hash)
  values (v_nick, crypt(p_password, gen_salt('bf', 8)))
  returning id into v_id;
  return json_build_object('nick', v_nick, 'token', melon_new_session(v_id));
end $$;

-- Ошибку входа возвращаем значением, а не исключением:
-- исключение откатило бы и счётчик неудачных попыток.
create or replace function melon_login(p_nick text, p_password text)
returns json language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_user melon_users;
begin
  select * into v_user from melon_users where lower(nick) = lower(btrim(coalesce(p_nick, '')));
  if v_user.id is null then
    return json_build_object('error', 'bad_login');
  end if;
  if v_user.locked_until > now() then
    return json_build_object('error', 'locked');
  end if;
  if v_user.pass_hash <> crypt(coalesce(p_password, ''), v_user.pass_hash) then
    update melon_users
       set failed = case when failed >= 7 then 0 else failed + 1 end,
           locked_until = case when failed >= 7 then now() + interval '5 minutes' else null end
     where id = v_user.id;
    return json_build_object('error', 'bad_login');
  end if;
  update melon_users set failed = 0, locked_until = null, seen_at = now() where id = v_user.id;
  return json_build_object(
    'nick', v_user.nick,
    'token', melon_new_session(v_user.id),
    'xp', v_user.xp,
    'progress', v_user.progress
  );
end $$;

create or replace function melon_logout(p_token text)
returns void language sql security definer
set search_path = public, extensions
as $$ delete from melon_sessions where token_hash = melon_hash_token(p_token) $$;

create or replace function melon_delete_account(p_token text, p_password text)
returns void language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := melon_uid(p_token);
  v_hash text;
begin
  select pass_hash into v_hash from melon_users where id = v_id;
  if v_hash <> crypt(coalesce(p_password, ''), v_hash) then
    raise exception 'bad_login';
  end if;
  delete from melon_users where id = v_id;
end $$;

-- ---------- Прогресс ----------

-- Лучший результат не уменьшается. Если на сервере прогресса больше,
-- чем на телефоне (новое устройство), он возвращается клиенту.
create or replace function melon_sync(
  p_token text, p_xp int, p_week_key int, p_week_xp int,
  p_words int, p_units int, p_blitz int, p_progress jsonb
)
returns json language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := melon_uid(p_token);
  v_user melon_users;
  v_xp int := least(greatest(coalesce(p_xp, 0), 0), 100000000);
  v_week int := least(greatest(coalesce(p_week_xp, 0), 0), 100000000);
begin
  if octet_length(coalesce(p_progress::text, '')) > 200000 then
    raise exception 'too_big';
  end if;
  select * into v_user from melon_users where id = v_id;
  if v_xp < v_user.xp then
    update melon_users set seen_at = now() where id = v_id;
    return json_build_object('xp', v_user.xp, 'progress', v_user.progress);
  end if;
  update melon_users set
    xp = v_xp,
    week_xp = case
      when p_week_key > week_key then v_week
      when p_week_key = week_key then greatest(week_xp, v_week)
      else week_xp end,
    week_key = greatest(week_key, coalesce(p_week_key, 0)),
    words = greatest(words, least(greatest(coalesce(p_words, 0), 0), 100000)),
    units = greatest(units, least(greatest(coalesce(p_units, 0), 0), 100)),
    blitz = greatest(blitz, least(greatest(coalesce(p_blitz, 0), 0), 1000)),
    progress = coalesce(p_progress, progress),
    seen_at = now()
  where id = v_id;
  return json_build_object('xp', v_xp);
end $$;

-- ---------- Друзья и рейтинг ----------

create or replace function melon_add_friend(p_token text, p_nick text)
returns json language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := melon_uid(p_token);
  v_friend melon_users;
begin
  select * into v_friend from melon_users where lower(nick) = lower(btrim(coalesce(p_nick, '')));
  if v_friend.id is null then
    raise exception 'no_user';
  end if;
  if v_friend.id = v_id then
    raise exception 'self';
  end if;
  if (select count(*) from melon_friends where user_id = v_id) >= 50 then
    raise exception 'too_many';
  end if;
  insert into melon_friends values (v_id, v_friend.id), (v_friend.id, v_id) on conflict do nothing;
  return json_build_object('nick', v_friend.nick);
end $$;

create or replace function melon_remove_friend(p_token text, p_nick text)
returns void language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := melon_uid(p_token);
  v_friend uuid;
begin
  select id into v_friend from melon_users where lower(nick) = lower(btrim(coalesce(p_nick, '')));
  delete from melon_friends
   where (user_id = v_id and friend_id = v_friend) or (user_id = v_friend and friend_id = v_id);
end $$;

create or replace function melon_rating(p_token text, p_week_key int)
returns json language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := melon_uid(p_token);
begin
  return (
    select coalesce(json_agg(row_to_json(r)), '[]'::json) from (
      select u.nick, u.xp,
             case when u.week_key = p_week_key then u.week_xp else 0 end as week_xp,
             u.words, u.units, u.blitz, u.id = v_id as me
        from melon_users u
       where u.id = v_id
          or u.id in (select friend_id from melon_friends where user_id = v_id)
    ) r
  );
end $$;

-- ---------- Доска ----------

create or replace function melon_posts_list(p_token text default null)
returns json language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_admin boolean := false;
begin
  select user_id into v_id from melon_sessions where token_hash = melon_hash_token(p_token);
  if v_id is not null then
    select is_admin into v_admin from melon_users where id = v_id;
  end if;
  return (
    select coalesce(json_agg(row_to_json(r)), '[]'::json) from (
      select p.id, u.nick, p.kind, p.body, p.created_at,
             coalesce(p.user_id = v_id, false) as mine,
             v_admin as can_delete
        from melon_posts p
        join melon_users u on u.id = p.user_id
       where not p.hidden
       order by p.created_at desc
       limit 50
    ) r
  );
end $$;

create or replace function melon_post(p_token text, p_kind text, p_body text)
returns json language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := melon_uid(p_token);
  v_body text := btrim(coalesce(p_body, ''));
  v_new bigint;
begin
  if char_length(v_body) not between 1 and 500 then
    raise exception 'bad_text';
  end if;
  if p_kind is null or p_kind not in ('bug', 'idea', 'chat') then
    raise exception 'bad_text';
  end if;
  if exists (select 1 from melon_posts where user_id = v_id and created_at > now() - interval '20 seconds') then
    raise exception 'too_fast';
  end if;
  if (select count(*) from melon_posts where user_id = v_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too_many';
  end if;
  insert into melon_posts (user_id, kind, body) values (v_id, p_kind, v_body) returning id into v_new;
  return json_build_object('id', v_new);
end $$;

create or replace function melon_post_delete(p_token text, p_id bigint)
returns void language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := melon_uid(p_token);
begin
  delete from melon_posts
   where id = p_id
     and (user_id = v_id or (select is_admin from melon_users where id = v_id));
end $$;

-- Две жалобы от разных людей скрывают сообщение.
create or replace function melon_post_report(p_token text, p_id bigint)
returns void language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := melon_uid(p_token);
begin
  if not exists (select 1 from melon_posts where id = p_id and user_id <> v_id) then
    return;
  end if;
  insert into melon_reports values (p_id, v_id) on conflict do nothing;
  if (select count(*) from melon_reports where post_id = p_id) >= 2 then
    update melon_posts set hidden = true where id = p_id;
  end if;
end $$;

-- ---------- Доступ ----------

do $$
declare
  fn text;
begin
  revoke all on melon_users, melon_sessions, melon_friends, melon_posts, melon_reports from public, anon, authenticated;

  foreach fn in array array[
    'melon_hash_token(text)', 'melon_new_session(uuid)', 'melon_uid(text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
  end loop;

  foreach fn in array array[
    'melon_register(text, text)', 'melon_login(text, text)', 'melon_logout(text)',
    'melon_delete_account(text, text)',
    'melon_sync(text, int, int, int, int, int, int, jsonb)',
    'melon_add_friend(text, text)', 'melon_remove_friend(text, text)', 'melon_rating(text, int)',
    'melon_posts_list(text)', 'melon_post(text, text, text)',
    'melon_post_delete(text, bigint)', 'melon_post_report(text, bigint)'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to anon, authenticated', fn);
  end loop;
end $$;
