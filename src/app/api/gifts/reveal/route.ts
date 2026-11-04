import { z } from "zod";
import { cloudEnabled } from "@/lib/server/env";
import { getSession, serviceClient } from "@/lib/server/supabase";
import { fail, HttpError, ok, sameOrigin } from "@/lib/server/http";
import { revealGiftFor } from "@/lib/server/gifts";

export const dynamic = "force-dynamic";

/**
 * Reveal a real reward code. Only the authenticated recipient can do this, only for her own gift.
 * The code is decrypted in memory and returned with no-store headers; it is never logged or stored in plain text.
 */
export async function POST(req: Request) {
  if (!cloudEnabled()) return fail("local_mode", 400);
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const s = await getSession();
  if (!s) return fail("unauthorized", 401);
  const parsed = z.object({ id: z.uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("invalid", 400);

  try {
    const r = await revealGiftFor(s.user.id, parsed.data.id);
    if (r.firstReveal) await serviceClient().from("admin_audit").insert({ admin_email: s.user.email ?? "recipient", action: "gift.revealed_by_recipient", target: parsed.data.id });
    return ok({ code: r.code, already: r.already });
  } catch (e) {
    if (e instanceof HttpError) return fail(e.code, e.status);
    return fail("error", 500);
  }
}
