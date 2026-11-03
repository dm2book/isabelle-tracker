// Applies every Supabase migration to real Postgres (PGlite) with a stub of Supabase's auth schema,
// then proves Row Level Security isolates users and keeps server-only tables out of reach.
// Runs twice: with Supabase's default table grants, and without them.
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(__dirname, "../supabase/migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

async function suite(defaultGrants: boolean) {
  const db = new PGlite({ extensions: { pgcrypto } });
  const out: string[] = [];
  const check = (name: string, pass: boolean, detail = "") => out.push(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    ${defaultGrants ? "alter default privileges in schema public grant all on tables to anon, authenticated, service_role; alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;" : ""}
  `);
  for (const f of files) {
    for (const pass of ["applies", "is re-runnable"]) {
      try {
        await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
        check(`migration ${f} ${pass}`, true);
      } catch (e) {
        check(`migration ${f} ${pass}`, false, (e as Error).message);
      }
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function as(role: string, sub: string | null, sql: string): Promise<{ rows: any[]; affected: number; error?: string }> {
    await db.exec(`reset role; set request.jwt.claim.sub = '${sub ?? ""}'; set role ${role};`);
    try {
      const r = await db.query(sql);
      return { rows: r.rows, affected: r.affectedRows ?? 0 };
    } catch (e) {
      return { rows: [], affected: 0, error: (e as Error).message };
    } finally {
      await db.exec("reset role;");
    }
  }
const A = "00000000-0000-0000-0000-00000000000a";
  const B = "00000000-0000-0000-0000-00000000000b";
  await db.exec(`insert into auth.users values ('${A}', 'isabelle@x'), ('${B}', 'other@x');`);
  

  
  // Owner can write and read her own rows
  let r = await as("authenticated", A, `insert into public.food_entries (id, user_id, entry_date, meal, name) values (gen_random_uuid(), '${A}', '2026-11-03', 'lunch', 'Crêpe')`);
  check("owner inserts her food entry", !r.error, r.error);
  r = await as("authenticated", A, `insert into public.food_entries (id, user_id, entry_date, meal, name) values (gen_random_uuid(), '${B}', '2026-11-03', 'lunch', 'Spoof')`);
  check("cannot insert rows for another user", !!r.error);
  r = await as("authenticated", B, `select * from public.food_entries`);
  check("another user cannot read her food diary", !r.error && r.rows.length === 0, `${r.rows?.length} rows`);
  r = await as("authenticated", A, `select * from public.food_entries`);
  check("owner reads her food diary", !r.error && r.rows.length === 1);
  r = await as("anon", null, `select * from public.profiles`);
  check("anonymous visitors get nothing", !!r.error || r.rows.length === 0, r.error ? "permission denied" : "");
  
  // Game economy is read-only for users
  await db.exec(`insert into public.game_states (user_id, state) values ('${A}', '{"coins":100}')`);
  r = await as("authenticated", A, `update public.game_states set state = '{"coins":999999}' where user_id = '${A}'`);
  check("user cannot edit her coins/XP directly", !!r.error || r.affected === 0, r.error ? "permission denied" : `${r.affected} rows`);
  r = await as("authenticated", A, `select state from public.game_states`);
  check("user can read her game state", !r.error && r.rows.length === 1);
  
  // Reward codes are unreachable except for the server
  await db.exec(`insert into public.reward_codes (ciphertext, iv, tag) values ('x','y','z')`);
  r = await as("authenticated", A, `select * from public.reward_codes`);
  check("reward codes unreadable by users", !!r.error, r.error ? "permission denied" : "READABLE!");
  r = await as("anon", null, `select * from public.reward_codes`);
  check("reward codes unreadable anonymously", !!r.error);
  r = await as("service_role", null, `select count(*)::int as n from public.reward_codes`);
  check("server (service role) can read reward codes", !r.error && r.rows[0].n === 1, r.error);
  
  // Gifts: recipient can read, cannot change status
  await db.exec(`insert into public.gift_deliveries (recipient_id, kind, idempotency_key) values ('${A}', 'surprise', 'k1')`);
  r = await as("authenticated", A, `select id, status from public.gift_deliveries`);
  check("recipient sees her gift", !r.error && r.rows.length === 1);
  r = await as("authenticated", B, `select id from public.gift_deliveries`);
  check("others cannot see her gifts", !r.error && r.rows.length === 0);
  r = await as("authenticated", A, `update public.gift_deliveries set status = 'revealed'`);
  check("recipient cannot forge gift status", !!r.error || r.affected === 0);
  
  // Scheduled messages only after delivery time
  await db.exec(`insert into public.scheduled_messages (recipient_id, kind, body, deliver_at) values ('${A}', 'letter', 'past', now() - interval '1 hour'), ('${A}', 'letter', 'future', now() + interval '1 day')`);
  r = await as("authenticated", A, `select body from public.scheduled_messages`);
  check("letters stay hidden until their delivery time", !r.error && r.rows.length === 1 && r.rows[0].body === "past", JSON.stringify(r.rows ?? r.error));
  
  // Notifications: only read_at is writable
  await db.exec(`insert into public.notifications (user_id, kind, title) values ('${A}', 'gift', 'hello')`);
  r = await as("authenticated", A, `update public.notifications set read_at = now()`);
  check("user can mark notifications read", !r.error && r.affected === 1, r.error);
  r = await as("authenticated", A, `update public.notifications set title = 'hacked'`);
  check("user cannot rewrite notification text", !!r.error);
  
  // Admin-only tables
  r = await as("authenticated", A, `select * from public.app_settings`);
  check("app settings unreadable by users", !!r.error);
  r = await as("authenticated", A, `insert into public.admin_audit (admin_email, action) values ('x','y')`);
  check("audit log not writable by users", !!r.error);
  
  
  // Invitations and the import log are server-only
  await db.exec(`insert into public.invitations (email, token_hash, expires_at) values ('isabelle@x', 'h1', now() + interval '7 days')`);
  r = await as("authenticated", A, `select * from public.invitations`);
  check("invitations unreadable by users", !!r.error);
  r = await as("anon", null, `select * from public.invitations`);
  check("invitations unreadable anonymously", !!r.error);
  r = await as("authenticated", A, `insert into public.account_imports (user_id) values ('${A}')`);
  check("users cannot forge import records", !!r.error);
  r = await as("service_role", null, `select count(*)::int as n from public.invitations`);
  check("server can manage invitations", !r.error && r.rows[0].n === 1, r.error);
  
  // Account deletion cascades
  await db.exec(`delete from auth.users where id = '${A}'`);
  const left = await db.query<{ n: number }>(`select (select count(*) from public.food_entries)::int + (select count(*) from public.gift_deliveries)::int + (select count(*) from public.game_states)::int as n`);
  check("deleting the account erases her data (cascade)", left.rows[0].n === 0, `${left.rows[0].n} rows left`);
  
  
  await db.close();
  return out;
}

describe("database security (RLS)", () => {
  for (const grants of [true, false]) {
    it(`isolates users and protects server-only tables (${grants ? "with" : "without"} default grants)`, async () => {
      const out = await suite(grants);
      const failed = out.filter((l) => l.startsWith("FAIL"));
      expect(failed, failed.join("\n")).toEqual([]);
      expect(out.length).toBeGreaterThan(25);
    }, 60_000);
  }
});
