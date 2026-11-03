-- Explicit table privileges.
-- 0001 relied on Supabase's default grants. Projects created with "automatically expose new tables"
-- turned off do not have them, and every query would fail with "permission denied". These grants make
-- the schema work either way. Row Level Security (0001) still decides WHICH rows each user can touch.
-- Safe to run more than once.

grant usage on schema public to authenticated, service_role;

-- Personal data the signed-in user manages herself (RLS limits it to her own rows)
grant select, insert, update, delete on
  public.rooms, public.food_entries, public.water_entries, public.diary_entries,
  public.calendar_events, public.scrapbook_entries
to authenticated;
grant select, insert, update on public.profiles, public.preferences to authenticated;
grant select, delete on public.push_subscriptions to authenticated;

-- Read-only for the user: only the server changes these
grant select on public.game_states, public.reward_events, public.gift_deliveries, public.scheduled_messages, public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- The server (service role) manages everything, including the encrypted reward codes
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Anonymous visitors get nothing, whatever the project defaults are
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
