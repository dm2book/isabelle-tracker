import { z } from "zod";
import { cloudEnabled } from "@/lib/server/env";
import { userClient } from "@/lib/server/supabase";
import { fail, HttpError, ok, sameOrigin } from "@/lib/server/http";
import { acceptInvitation, findInvitation, maskEmail } from "@/lib/server/invitations";

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

/** Check an invitation link before showing the "create your password" form. */
export async function GET(req: Request) {
  if (!cloudEnabled()) return fail("local_mode", 400);
  if (limited(req)) return fail("rate_limited", 429);
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const inv = await findInvitation(token);
  if (!inv) return fail("invalid_invitation", 404);
  return ok({ email: maskEmail(inv.email), expiresAt: inv.expires_at });
}

/** Create Isabelle's account from a valid, unused invitation. */
export async function POST(req: Request) {
  if (!cloudEnabled()) return fail("local_mode", 400);
  if (!sameOrigin(req)) return fail("forbidden", 403);
  if (limited(req)) return fail("rate_limited", 429);
  const parsed = z.object({ token: z.string().max(80), password: z.string().min(8).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("weak", 400);

  let email: string;
  try {
    ({ email } = await acceptInvitation(parsed.data.token, parsed.data.password));
  } catch (e) {
    const code = e instanceof HttpError ? e.code : "error";
    if (e instanceof HttpError && e.detail) console.warn("join: account not created", code, e.detail);
    return fail(code, code === "invalid_invitation" ? 404 : code === "weak" ? 400 : 409);
  }
  const db = await userClient();
  const signIn = await db.auth.signInWithPassword({ email, password: parsed.data.password });
  if (signIn.error) return fail("error", 400);
  return ok({});
}
