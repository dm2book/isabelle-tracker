-- Isabelle's Hello Kitty World — initial schema
-- Run this once in the Supabase SQL editor (or with `supabase db push`).
--
-- Security model
--  * Every personal table has Row Level Security: a signed-in user can only see her own rows.
--  * The game economy (coins, XP, inventory, quests) lives in game_states and is READ-ONLY for users:
--    only the server (service role) can change it, after validating each action.
--  * Real reward codes live in reward_codes, encrypted (AES-256-GCM) by the server. That table has RLS
--    enabled and NO policies, so it is unreachable with the public anon key or a user session.
--  * Admin rights are granted by the ADMIN_EMAILS server variable, never by a database column a user could edit.

create extension if not exists pgcrypto;

-- ---------- Profiles & preferences ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Isabelle' check (char_length(display_name) <= 60),
  world_name text not null default 'Le Petit Monde d’Isabelle' check (char_length(world_name) <= 80),
  birthday text check (birthday is null or birthday ~ '^[0-1][0-9]-[0-3][0-9]$'),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 400000),
  updated_at timestamptz not null default now()
);

-- ---------- Rooms ----------
create table if not exists public.rooms (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) <= 60),
  kind text not null,
  data jsonb not null check (pg_column_size(data) < 300000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rooms_user_idx on public.rooms (user_id);

-- ---------- Wellness (sensitive: never shared, never in notifications) ----------
create table if not exists public.food_entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  entry_time text not null default '12:00' check (entry_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null check (char_length(name) between 1 and 120),
  portion text not null default '' check (char_length(portion) <= 60),
  calories integer check (calories is null or calories between 0 and 10000),
  notes text not null default '' check (char_length(notes) <= 500),
  source text not null default 'manual' check (source in ('manual', 'openfoodfacts')),
  created_at timestamptz not null default now()
);
create index if not exists food_user_date_idx on public.food_entries (user_id, entry_date);

create table if not exists public.water_entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  entry_time text not null default '12:00' check (entry_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  amount_ml integer not null check (amount_ml between 1 and 3000),
  created_at timestamptz not null default now()
);
create index if not exists water_user_date_idx on public.water_entries (user_id, entry_date);

-- ---------- Diary, calendar, scrapbook ----------
create table if not exists public.diary_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  text text not null default '' check (char_length(text) <= 4000),
  mood text check (mood is null or mood in ('happy', 'calm', 'tired', 'sad', 'excited', 'loved')),
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);

create table if not exists public.calendar_events (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_date date not null,
  title text not null check (char_length(title) between 1 and 80),
  kind text not null check (kind in ('special', 'birthday', 'milestone', 'appointment', 'note')),
  emoji text not null default '✨' check (char_length(emoji) <= 8),
  notes text not null default '' check (char_length(notes) <= 500)
);
create index if not exists events_user_date_idx on public.calendar_events (user_id, event_date);

create table if not exists public.scrapbook_entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('moment', 'room', 'achievement', 'message', 'photo', 'memory')),
  title text not null default '' check (char_length(title) <= 80),
  body text not null default '' check (char_length(body) <= 2000),
  emoji text not null default '💗' check (char_length(emoji) <= 8),
  color text not null default '#FFD1E2' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  image text check (image is null or (image like 'data:image/%' and char_length(image) < 600000)),
  room jsonb,
  entry_date date not null,
  created_at timestamptz not null default now()
);
create index if not exists scrap_user_idx on public.scrapbook_entries (user_id, created_at desc);

-- ---------- Game economy (server-authoritative) ----------
create table if not exists public.game_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  version integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  heart_id text unique,
  tier text not null check (tier in ('pink', 'lavender', 'blue', 'rainbow', 'golden')),
  status text not null default 'none' check (status in ('none', 'pending', 'fulfilled', 'dismissed', 'capped', 'disabled')),
  created_at timestamptz not null default now()
);
create index if not exists reward_events_user_idx on public.reward_events (user_id, created_at desc);

-- Encrypted real reward codes. RLS on + no policies = only the server's service role can read/write.
create table if not exists public.reward_codes (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'roblox',
  ciphertext text not null,
  iv text not null,
  tag text not null,
  key_version integer not null default 1,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.gift_deliveries (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users (id) on delete set null,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  reward_event_id uuid references public.reward_events (id) on delete set null,
  reward_code_id uuid references public.reward_codes (id) on delete set null,
  kind text not null check (kind in ('robux', 'demo', 'surprise')),
  title text not null default '' check (char_length(title) <= 80),
  message text not null default '' check (char_length(message) <= 2000),
  animation text not null default 'present' check (animation in ('hug', 'present', 'hearts', 'confetti', 'rare')),
  status text not null default 'sent' check (status in ('sent', 'opened', 'revealed')),
  idempotency_key text not null unique,
  reveal_count integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  revealed_at timestamptz
);
create index if not exists gifts_recipient_idx on public.gift_deliveries (recipient_id, sent_at desc);

-- ---------- Messages, notifications, push ----------
create table if not exists public.scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users (id) on delete set null,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('letter', 'bottle')),
  title text not null default '' check (char_length(title) <= 80),
  body text not null check (char_length(body) between 1 and 4000),
  deliver_at timestamptz not null,
  opened_at timestamptz,
  notified_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_recipient_idx on public.scheduled_messages (recipient_id, deliver_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('reminder', 'message', 'gift', 'quest', 'event', 'rare', 'birthday')),
  title text not null check (char_length(title) <= 160),
  body text not null default '' check (char_length(body) <= 400),
  link text check (link is null or link like '/%'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reminder_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  slot text not null,
  day date not null,
  primary key (user_id, slot, day)
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit (
  id bigserial primary key,
  admin_email text not null,
  action text not null,
  target text,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.rooms enable row level security;
alter table public.food_entries enable row level security;
alter table public.water_entries enable row level security;
alter table public.diary_entries enable row level security;
alter table public.calendar_events enable row level security;
alter table public.scrapbook_entries enable row level security;
alter table public.game_states enable row level security;
alter table public.reward_events enable row level security;
alter table public.reward_codes enable row level security;
alter table public.gift_deliveries enable row level security;
alter table public.scheduled_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_log enable row level security;
alter table public.app_settings enable row level security;
alter table public.admin_audit enable row level security;

-- Owner-only CRUD on personal tables
do $$
declare t text;
begin
  foreach t in array array['rooms', 'food_entries', 'water_entries', 'diary_entries', 'calendar_events', 'scrapbook_entries', 'push_subscriptions'] loop
    execute format('drop policy if exists "%1$s owner select" on public.%1$I', t);
    execute format('drop policy if exists "%1$s owner insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s owner update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s owner delete" on public.%1$I', t);
    execute format('create policy "%1$s owner select" on public.%1$I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "%1$s owner insert" on public.%1$I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s owner update" on public.%1$I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s owner delete" on public.%1$I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

drop policy if exists "profiles owner select" on public.profiles;
drop policy if exists "profiles owner insert" on public.profiles;
drop policy if exists "profiles owner update" on public.profiles;
create policy "profiles owner select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles owner insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles owner update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "preferences owner select" on public.preferences;
drop policy if exists "preferences owner insert" on public.preferences;
drop policy if exists "preferences owner update" on public.preferences;
create policy "preferences owner select" on public.preferences for select to authenticated using (user_id = auth.uid());
create policy "preferences owner insert" on public.preferences for insert to authenticated with check (user_id = auth.uid());
create policy "preferences owner update" on public.preferences for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Read-only for the owner (server writes)
drop policy if exists "game owner read" on public.game_states;
create policy "game owner read" on public.game_states for select to authenticated using (user_id = auth.uid());
drop policy if exists "reward events owner read" on public.reward_events;
create policy "reward events owner read" on public.reward_events for select to authenticated using (user_id = auth.uid());
drop policy if exists "gifts recipient read" on public.gift_deliveries;
create policy "gifts recipient read" on public.gift_deliveries for select to authenticated using (recipient_id = auth.uid());
drop policy if exists "messages recipient read delivered" on public.scheduled_messages;
create policy "messages recipient read delivered" on public.scheduled_messages for select to authenticated using (recipient_id = auth.uid() and deliver_at <= now());

drop policy if exists "notifications owner read" on public.notifications;
drop policy if exists "notifications owner mark read" on public.notifications;
create policy "notifications owner read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications owner mark read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Users may only change read_at on their notifications.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Never reachable from the browser, whatever the policies say.
revoke all on public.reward_codes from anon, authenticated;
revoke all on public.reminder_log from anon, authenticated;
revoke all on public.app_settings from anon, authenticated;
revoke all on public.admin_audit from anon, authenticated;
revoke insert, update, delete on public.game_states from anon, authenticated;
revoke insert, update, delete on public.reward_events from anon, authenticated;
revoke insert, update, delete on public.gift_deliveries from anon, authenticated;
revoke insert, update, delete on public.scheduled_messages from anon, authenticated;
revoke insert, delete on public.notifications from anon, authenticated;
revoke all on all tables in schema public from anon;

insert into public.app_settings (key, value)
values ('rewards', '{"robuxEnabled": false, "robuxWeeklyCap": 1, "heartDailyCap": 20}'::jsonb)
on conflict (key) do nothing;
