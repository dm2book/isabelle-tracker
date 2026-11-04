import "server-only";
import { serviceClient } from "./supabase";
import { decryptCode, encryptCode } from "./crypto";
import { HttpError } from "./http";
import { sendPush } from "./push";
import { translate } from "../i18n";
import type { GiftAnimation, GiftKind } from "../types";

export interface GiftInput {
  recipientId: string;
  kind: GiftKind;
  code?: string;
  title: string;
  message: string;
  animation: GiftAnimation;
  rewardEventId?: string | null;
  idempotencyKey: string;
}

/**
 * Store and deliver a gift. A real code is encrypted (AES-256-GCM) before it is stored; the recipient
 * is notified without the code. The idempotency key makes a double send impossible.
 */
export async function deliverGift(senderId: string, g: GiftInput, opts: { notify?: boolean } = { notify: true }) {
  const db = serviceClient();
  const dup = await db.from("gift_deliveries").select("id").eq("idempotency_key", g.idempotencyKey).maybeSingle();
  if (dup.data) throw new HttpError("duplicate", 409);
  let codeId: string | null = null;
  if (g.kind === "robux") {
    if (!g.code || g.code.length < 4) throw new HttpError("code_required", 400);
    const enc = encryptCode(g.code);
    const ins = await db.from("reward_codes").insert({ ...enc, platform: "roblox", created_by: senderId }).select("id").single();
    if (ins.error) throw new HttpError("db_error", 500);
    codeId = ins.data.id;
  }
  const gift = await db
    .from("gift_deliveries")
    .insert({
      sender_id: senderId, recipient_id: g.recipientId, reward_event_id: g.rewardEventId ?? null, reward_code_id: codeId,
      kind: g.kind, title: g.title, message: g.message, animation: g.animation, idempotency_key: g.idempotencyKey,
    })
    .select("id")
    .single();
  if (gift.error) {
    if (codeId) await db.from("reward_codes").delete().eq("id", codeId);
    throw new HttpError(gift.error.code === "23505" ? "duplicate" : "db_error", gift.error.code === "23505" ? 409 : 500);
  }
  if (g.rewardEventId) await db.from("reward_events").update({ status: "fulfilled" }).eq("id", g.rewardEventId).eq("user_id", g.recipientId);
  if (opts.notify !== false) {
    const { data: prefs } = await db.from("preferences").select("data").eq("user_id", g.recipientId).maybeSingle();
    const lang = ((prefs?.data as { lang?: "fr" | "en" })?.lang ?? "fr") as "fr" | "en";
    await db.from("notifications").insert({ user_id: g.recipientId, kind: "gift", title: translate(lang, "notifications.giftTitle"), body: translate(lang, "notifications.giftBody"), link: "/surprises" });
    await sendPush(g.recipientId, { title: translate(lang, "notifications.giftTitle"), body: translate(lang, "notifications.giftBody"), url: "/home", tag: "gift" });
  }
  return { id: gift.data.id as string, codeId };
}

/** Decrypt a gift's code for its recipient only. Never logged, never stored in plain text. */
export async function revealGiftFor(userId: string, giftId: string) {
  const db = serviceClient();
  const { data: gift } = await db.from("gift_deliveries").select("id, recipient_id, kind, reward_code_id, revealed_at, reveal_count").eq("id", giftId).maybeSingle();
  if (!gift || gift.recipient_id !== userId) throw new HttpError("not_found", 404);
  if (gift.kind !== "robux" || !gift.reward_code_id) throw new HttpError("no_code", 400);
  if ((gift.reveal_count ?? 0) >= 25) throw new HttpError("rate_limited", 429);
  const { data: codeRow } = await db.from("reward_codes").select("ciphertext, iv, tag").eq("id", gift.reward_code_id).maybeSingle();
  if (!codeRow) throw new HttpError("not_found", 404);
  let code: string;
  try {
    code = decryptCode(codeRow);
  } catch {
    console.error("reveal: decryption failed for gift", gift.id);
    throw new HttpError("error", 500);
  }
  const now = new Date().toISOString();
  await db.from("gift_deliveries").update({ status: "revealed", revealed_at: gift.revealed_at ?? now, opened_at: now, reveal_count: (gift.reveal_count ?? 0) + 1 }).eq("id", gift.id);
  return { code, already: !!gift.revealed_at, firstReveal: !gift.revealed_at };
}
