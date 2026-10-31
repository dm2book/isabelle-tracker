import { z } from "zod";
import { cloudEnabled } from "@/lib/server/env";
import { getSession } from "@/lib/server/supabase";
import { fail, ok, sameOrigin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!cloudEnabled()) return fail("local_mode", 400);
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const s = await getSession();
  if (!s) return fail("unauthorized", 401);
  const parsed = z.object({ password: z.string().min(8).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("weak", 400);
  const { error } = await s.db.auth.updateUser({ password: parsed.data.password });
  if (error) return fail("error", 400);
  return ok({});
}
