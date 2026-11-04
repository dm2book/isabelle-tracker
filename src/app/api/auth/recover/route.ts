import { z } from "zod";
import { cloudEnabled } from "@/lib/server/env";
import { serviceClient, userClient } from "@/lib/server/supabase";
import { fail, HttpError, ok, sameOrigin } from "@/lib/server/http";
import { maskEmail } from "@/lib/server/invitations";
import { acceptReset, findReset } from "@/lib/server/passwordResets";

export const dynamic = "force-dynamic";

const attempts = new Map<string, { n: number; t: number }>();
function limited(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const a = attempts.get(ip);
  const next = a && now - a.t < 15 * 60_000 ? { n: a.n + 1, t: a.t } : { n: 1, t: now };
  attempts.set(ip, next);
  return next.n > 20;
}

/** Check a reset link before showing the "new password" form. Reading never uses the link up. */
export async function GET(req: Request) {
  if (!cloudEnabled()) return fail("local_mode", 400);
  if (limited(req)) return fail("rate_limited", 429);
  const r = await findReset(new URL(req.url).searchParams.get("token") ?? "");
  if (!r) return fail("invalid_reset", 404);
  return ok({ email: maskEmail(r.email), expiresAt: r.expiresAt });
}

/** Set the new password (link used once), sign her in here and sign out her other sessions. */
export async function POST(req: Request) {
  if (!cloudEnabled()) return fail("local_mode", 400);
  if (!sameOrigin(req)) return fail("forbidden", 403);
  if (limited(req)) return fail("rate_limited", 429);
  const parsed = z.object({ token: z.string().max(80), password: z.string().min(8).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("weak", 400);

  let email: string;
  try {
    ({ email } = await acceptReset(parsed.data.token, parsed.data.password));
  } catch (e) {
    const code = e instanceof HttpError ? e.code : "error";
    if (e instanceof HttpError && e.detail) console.warn("recover: password not changed", code, e.detail);
    return fail(code, code === "invalid_reset" ? 404 : code === "weak" ? 400 : 500);
  }
  const db = await userClient();
  const signIn = await db.auth.signInWithPassword({ email, password: parsed.data.password });
  if (signIn.error || !signIn.data.session) return fail("signin_failed", 400);
  await serviceClient().auth.admin.signOut(signIn.data.session.access_token, "others").catch(() => {});
  return ok({});
}
