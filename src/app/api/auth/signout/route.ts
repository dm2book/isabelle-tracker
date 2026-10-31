import { cloudEnabled } from "@/lib/server/env";
import { userClient } from "@/lib/server/supabase";
import { ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST() {
  if (cloudEnabled()) {
    const db = await userClient();
    await db.auth.signOut();
  }
  return ok({});
}
