import { z } from "zod";
import { cloudEnabled } from "@/lib/server/env";
import { userClient } from "@/lib/server/supabase";
import { fail, ok, sameOrigin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!cloudEnabled()) return fail("local_mode", 400);
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const parsed = z.object({ email: z.email().max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("invalid", 400);
  const origin = new URL(req.url).origin;
  const db = await userClient();
  // Same answer whether or not the account exists.
  await db.auth.resetPasswordForEmail(parsed.data.email.trim().toLowerCase(), { redirectTo: `${origin}/auth/callback?next=/login?reset=1` });
  return ok({});
}
