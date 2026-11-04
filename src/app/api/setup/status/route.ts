import { cloudEnabled, env, pushConfigured } from "@/lib/server/env";
import { getSession, hasAdminRole, serviceClient } from "@/lib/server/supabase";
import { ok } from "@/lib/server/http";
import { looksPublic, looksSecret, supabasePublicKeySource, supabaseSecretKeySource, supabaseUrlSource } from "@/lib/supabaseConfig";

export const dynamic = "force-dynamic";

const TABLES = [
  "profiles", "preferences", "rooms", "food_entries", "water_entries", "diary_entries", "calendar_events", "scrapbook_entries",
  "game_states", "reward_events", "reward_codes", "gift_deliveries", "scheduled_messages", "notifications", "push_subscriptions",
  "reminder_log", "app_settings", "admin_audit", "invitations", "account_imports", "password_resets",
] as const;

type Check = { id: string; ok: boolean; detail?: string };

// Details name the variable that was found (or expected) — never its value.
function urlCheck(): Check {
  const ok = /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/i.test(env.supabaseUrl);
  if (!supabaseUrlSource.name) return { id: "supabaseUrl", ok, detail: "not found in this environment (expected NEXT_PUBLIC_SUPABASE_URL)" };
  if (!ok) return { id: "supabaseUrl", ok, detail: `${supabaseUrlSource.name} is set but is not an https:// project address` };
  return { id: "supabaseUrl", ok, detail: supabaseUrlSource.name === "NEXT_PUBLIC_SUPABASE_URL" ? undefined : `found as ${supabaseUrlSource.name}` };
}
function keyCheck(): Check {
  const { name, value } = supabasePublicKeySource;
  if (!name) return { id: "publicKey", ok: false, detail: "not found in this environment (expected NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)" };
  if (looksSecret(value)) return { id: "publicKey", ok: false, detail: `${name} holds the SECRET key: use the anon / publishable key here` };
  if (value.length <= 20) return { id: "publicKey", ok: false, detail: `${name} is set but too short` };
  const standard = name === "NEXT_PUBLIC_SUPABASE_ANON_KEY" || name === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
  return { id: "publicKey", ok: true, detail: standard ? undefined : `found as ${name}` };
}
function secretKeyCheck(): Check {
  const { name, value } = supabaseSecretKeySource;
  const pub = supabasePublicKeySource;
  if (!name) return { id: "secretKey", ok: false, detail: "not found in this environment (expected SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY)" };
  if (pub.name && value === pub.value) return { id: "secretKey", ok: false, detail: `${name} and ${pub.name} hold the same key: ${pub.name} must get the publishable (anon) key, ${name} the secret key` };
  if (looksPublic(value)) return { id: "secretKey", ok: false, detail: `${name} holds the public key: use the secret (service_role) key here` };
  if (value.length <= 20) return { id: "secretKey", ok: false, detail: `${name} is set but too short` };
  return { id: "secretKey", ok: true };
}

/**
 * Setup checklist for Ewan. Reports only whether things are configured (true/false), never a value.
 * Account details are shown only to a signed-in address listed in ADMIN_EMAILS.
 */
export async function GET() {
  const hasDb = Boolean(env.supabaseUrl && env.supabaseAnonKey && env.serviceRoleKey);
  const envChecks: Check[] = [
    urlCheck(),
    keyCheck(),
    secretKeyCheck(),
    { id: "appSecret", ok: env.appSecret.length >= 32 },
    { id: "rewardKey", ok: env.rewardKey.length >= 32 },
    { id: "adminEmails", ok: env.adminEmails.length > 0 },
    { id: "allowedEmails", ok: env.allowedEmails.length > 0 && env.allowedEmails.every((e) => !env.adminEmails.includes(e)) },
    { id: "cronSecret", ok: env.cronSecret.length >= 24 },
    { id: "vapid", ok: Boolean(env.vapidPublic && env.vapidPrivate) },
  ];

  const dbChecks: Check[] = [];
  if (hasDb) {
    const db = serviceClient();
    const missing: string[] = [];
    await Promise.all(
      TABLES.map(async (t) => {
        const { error } = await db.from(t).select("*", { head: true, count: "exact" }).limit(1);
        if (error) missing.push(t);
      }),
    );
    // Name the migration file to run for whatever is missing.
    const fileOf = (t: string) => (t === "password_resets" ? "0004" : t === "invitations" || t === "account_imports" ? "0003" : "0001");
    const files = [...new Set(missing.map(fileOf))].sort();
    dbChecks.push({ id: "tables", ok: missing.length === 0, detail: missing.length ? `missing: ${missing.sort().join(", ")} → run migration ${files.join(", ")} in the Supabase SQL Editor` : undefined });
    try {
      const res = await fetch(`${env.supabaseUrl}/auth/v1/settings`, { headers: { apikey: env.supabaseAnonKey }, cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (!res.ok) {
        dbChecks.push({ id: "signups", ok: false, detail: `Supabase Auth answered HTTP ${res.status} (check the public key)` });
      } else {
        const settings = (await res.json()) as { disable_signup?: boolean };
        dbChecks.push({
          id: "signups",
          ok: settings.disable_signup === true,
          detail: settings.disable_signup === true ? undefined : "sign-ups are still open: Supabase → Authentication → Sign In / Providers → turn off “Allow new users to sign up”",
        });
      }
    } catch {
      dbChecks.push({ id: "signups", ok: false, detail: "Supabase Auth unreachable" });
    }
  }

  // Account details: only for an address in ADMIN_EMAILS that is signed in
  let accounts: Check[] | null = null;
  let adminSql: string | null = null;
  let viewer: "anonymous" | "admin" | "admin_candidate" | "user" = "anonymous";
  if (cloudEnabled()) {
    const s = await getSession();
    if (s) viewer = s.isAdmin ? "admin" : s.isAdminCandidate ? "admin_candidate" : "user";
    if (s?.isAdminCandidate) {
      const { data } = await serviceClient().auth.admin.listUsers({ page: 1, perPage: 200 });
      const users = data?.users ?? [];
      const adminsWithRole = users.filter((u) => hasAdminRole(u)).length;
      const isabelleAccounts = users.filter((u) => u.email && env.allowedEmails.includes(u.email.toLowerCase())).length;
      accounts = [
        { id: "adminAccount", ok: users.some((u) => u.email && env.adminEmails.includes(u.email.toLowerCase())) },
        { id: "adminRole", ok: adminsWithRole > 0 },
        { id: "isabelleAccount", ok: isabelleAccounts > 0 },
      ];
      if (!s.isAdmin && s.user.email) {
        const email = s.user.email.toLowerCase().replace(/'/g, "''");
        adminSql = `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb where lower(email) = '${email}';`;
      }
    }
  }

  return ok({
    mode: cloudEnabled() ? "cloud" : "local",
    pushReady: pushConfigured(),
    env: envChecks,
    database: dbChecks,
    accounts,
    adminSql,
    viewer,
  });
}
