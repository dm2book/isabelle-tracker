import { z } from "zod";
import { cloudEnabled } from "@/lib/server/env";
import { getSession, serviceClient } from "@/lib/server/supabase";
import { fail, ok, sameOrigin } from "@/lib/server/http";
import { decryptCode } from "@/lib/server/crypto";

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

  const db = serviceClient();
  const { data: gift } = await db
    .from("gift_deliveries")
    .select("id, recipient_id, kind, reward_code_id, status, revealed_at, reveal_count")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!gift || gift.recipient_id !== s.user.id) return fail("not_found", 404);
  if (gift.kind !== "robux" || !gift.reward_code_id) return fail("no_code", 400);
  if ((gift.reveal_count ?? 0) >= 25) return fail("rate_limited", 429);

  const { data: codeRow } = await db.from("reward_codes").select("ciphertext, iv, tag").eq("id", gift.reward_code_id).maybeSingle();
  if (!codeRow) return fail("not_found", 404);

  let code: string;
  try {
    code = decryptCode(codeRow);
  } catch {
    console.error("reveal: decryption failed for gift", gift.id);
    return fail("error", 500);
  }

  const now = new Date().toISOString();
  await db
    .from("gift_deliveries")
    .update({ status: "revealed", revealed_at: gift.revealed_at ?? now, opened_at: now, reveal_count: (gift.reveal_count ?? 0) + 1 })
    .eq("id", gift.id);
  if (!gift.revealed_at) await db.from("admin_audit").insert({ admin_email: s.user.email ?? "recipient", action: "gift.revealed_by_recipient", target: gift.id });

  return ok({ code, already: !!gift.revealed_at });
}
