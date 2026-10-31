import { z } from "zod";
import { cloudEnabled, isAllowedEmail } from "@/lib/server/env";
import { serviceClient, userClient } from "@/lib/server/supabase";
import { fail, ok, sameOrigin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Invite-only sign-up: only addresses listed in ALLOWED_EMAILS / ADMIN_EMAILS can create an account.
 * (Also disable public sign-ups in Supabase → Authentication → Providers → Email.)
 */
export async function POST(req: Request) {
  if (!cloudEnabled()) return fail("local_mode", 400);
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const parsed = z.object({ email: z.email().max(200), password: z.string().min(8).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("weak", 400);
  const email = parsed.data.email.trim().toLowerCase();
  if (!isAllowedEmail(email)) return fail("not_allowed", 403);
  const { error } = await serviceClient().auth.admin.createUser({ email, password: parsed.data.password, email_confirm: true });
  if (error && !/already/i.test(error.message)) return fail("error", 400);
  if (error) return fail("exists", 409);
  const db = await userClient();
  const signIn = await db.auth.signInWithPassword({ email, password: parsed.data.password });
  if (signIn.error) return fail("error", 400);
  return ok({});
}
