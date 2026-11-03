-- Invitation-only registration and the device-data import log. Safe to run more than once.
--
-- Both tables are server-only: Row Level Security is on and there are no policies, and privileges
-- are revoked from anon and authenticated. Only the server (service role) reads or writes them.

-- Single-use invitation links created by Ewan. Only a SHA-256 hash of the token is stored.
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and char_length(email) <= 200),
  token_hash text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists invitations_email_idx on public.invitations (email);

-- Every import of device data into an account, with a summary of what was accepted or capped.
create table if not exists public.account_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'done')),
  source text not null default 'device' check (source in ('device', 'file')),
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists account_imports_user_idx on public.account_imports (user_id, started_at desc);

alter table public.invitations enable row level security;
alter table public.account_imports enable row level security;

revoke all on public.invitations from anon, authenticated;
revoke all on public.account_imports from anon, authenticated;
grant all on public.invitations to service_role;
grant all on public.account_imports to service_role;
