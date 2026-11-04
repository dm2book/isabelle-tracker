import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import webpush from "web-push";
import { cloudEnabled, env } from "@/lib/server/env";
import { getSession, serviceClient } from "@/lib/server/supabase";
import { fail, ok, sameOrigin } from "@/lib/server/http";
import { decryptCode, encryptCode, signHeart, verifyHeart } from "@/lib/server/crypto";
import { getAppSettings, saveAppSettings } from "@/lib/server/settings";
import { runEndToEnd } from "@/lib/server/e2eTest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Result = { id: string; ok: boolean; detail?: string };

async function run(id: string, fn: () => Promise<string | void> | string | void): Promise<Result> {
  try {
    const detail = await fn();
    return { id, ok: true, ...(detail ? { detail } : {}) };
  } catch (e) {
    return { id, ok: false, detail: e instanceof Error ? e.message.slice(0, 120) : "failed" };
  }
}

/**
 * Live checks Ewan can run from /setup. Nothing secret is returned: each test reports pass/fail.
 * Admins only (ADMIN_EMAILS + database role).
 */
export async function POST(req: Request) {
  if (!cloudEnabled()) return fail("local_mode", 400);
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const s = await getSession();
  if (!s) return fail("unauthorized", 401);
  if (!s.isAdmin) return fail("forbidden", 403);
  const body = (await req.json().catch(() => null)) as { mode?: string } | null;

  // Full end-to-end run: temporary test accounts, invitation, sign-in, RLS, import and a gift, then clean-up.
  if (body?.mode === "full") {
    try {
      return ok({ results: await runEndToEnd(s) });
    } catch (e) {
      console.error("e2e selftest", e instanceof Error ? e.message : "unknown");
      return fail("error", 500);
    }
  }

  const results: Result[] = [];

  results.push(
    await run("encryption", () => {
      const sample = randomBytes(12).toString("hex");
      if (decryptCode(encryptCode(sample)) !== sample) throw new Error("round-trip mismatch");
    }),
  );

  results.push(
    await run("tickets", () => {
      const t = signHeart("pink", Date.now() + 60_000, s.user.id);
      if (!verifyHeart(t, s.user.id) || verifyHeart({ ...t, variant: "golden" }, s.user.id)) throw new Error("signature check failed");
    }),
  );

  // An anonymous visitor (public key, no session) must not see anything.
  results.push(
    await run("anonLockout", async () => {
      const anon = createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      for (const table of ["reward_codes", "food_entries", "profiles", "gift_deliveries", "invitations"]) {
        const { data, error } = await anon.from(table).select("*").limit(1);
        if (!error && data && data.length > 0) throw new Error(`${table} is readable anonymously`);
      }
    }),
  );

  // As Ewan (his own session, RLS applies) the reward codes table must stay unreachable.
  results.push(
    await run("userLockout", async () => {
      const { data, error } = await s.db.from("reward_codes").select("id").limit(1);
      if (!error && data && data.length > 0) throw new Error("reward codes readable with a user session");
    }),
  );

  results.push(
    await run("serviceAccess", async () => {
      const current = await getAppSettings();
      await saveAppSettings(current);
    }),
  );

  results.push(
    await run("authAdmin", async () => {
      const { data, error } = await serviceClient().auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error || !data) throw new Error("auth admin API unavailable");
    }),
  );

  results.push(
    await run("push", () => {
      if (!env.vapidPublic || !env.vapidPrivate) return "not configured (optional)";
      webpush.setVapidDetails(env.vapidSubject, env.vapidPublic, env.vapidPrivate);
    }),
  );

  return ok({ results });
}
