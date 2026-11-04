-- Password-reset links that Ewan creates for Isabelle in Espace Ewan (no e-mail needed). Safe to run
-- more than once.
--
-- Server-only, like invitations: Row Level Security is on with no policies, and privileges are revoked
-- from anon and authenticated. Only a SHA-256 hash of each link's token is stored; a link works once,
-- expires after 24 hours and can be revoked.
create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists password_resets_user_idx on public.password_resets (user_id, created_at desc);

alter table public.password_resets enable row level security;
revoke all on public.password_resets from anon, authenticated;
grant all on public.password_resets to service_role;
