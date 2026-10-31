import { z } from "zod";
import { cloudEnabled } from "@/lib/server/env";
import { userClient } from "@/lib/server/supabase";
import { fail, ok, sameOrigin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!cloudEnabled()) return fail("local_mode", 400);
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const parsed = z.object({ email: z.email().max(200), password: z.string().min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("invalid", 400);
  const db = await userClient();
  const { error } = await db.auth.signInWithPassword({ email: parsed.data.email.trim().toLowerCase(), password: parsed.data.password });
  if (error) return fail("invalid_credentials", 401);
  return ok({});
}
