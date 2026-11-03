import { z, ZodError } from "zod";
import { cloudEnabled, env } from "@/lib/server/env";
import { getSession, serviceClient, type Session } from "@/lib/server/supabase";
import { fail, HttpError, ok, sameOrigin } from "@/lib/server/http";
import { encryptCode } from "@/lib/server/crypto";
import { getAppSettings, saveAppSettings } from "@/lib/server/settings";
import { sendPush } from "@/lib/server/push";
import { translate } from "@/lib/i18n";
import { createInvitation, listInvitations, revokeInvitation } from "@/lib/server/invitations";

export const dynamic = "force-dynamic";

const giftSchema = z.object({
  recipientId: z.uuid(),
  kind: z.enum(["robux", "demo", "surprise"]),
  code: z.string().trim().max(100).optional(),
  title: z.string().trim().max(80),
  message: z.string().trim().max(2000),
  animation: z.enum(["hug", "present", "hearts", "confetti", "rare"]),
  rewardEventId: z.uuid().nullable().optional(),
  idempotencyKey: z.string().min(8).max(80),
});

const messageSchema = z.object({
  recipientId: z.uuid(),
  kind: z.enum(["letter", "bottle"]),
  title: z.string().trim().max(80),
  body: z.string().trim().min(1).max(4000),
  deliverAt: z.iso.datetime({ offset: true }),
});

const settingsSchema = z.object({
  robuxEnabled: z.boolean(),
  robuxWeeklyCap: z.number().int().min(0).max(7),
  heartDailyCap: z.number().int().min(1).max(60),
});

async function audit(s: Session, action: string, target?: string) {
  await serviceClient().from("admin_audit").insert({ admin_email: s.user.email ?? "?", action, target: target ?? null });
}

async function recipients() {
  const db = serviceClient();
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  const users = (data?.users ?? []).filter((u) => !env.adminEmails.includes((u.email ?? "").toLowerCase()));
  const { data: profiles } = await db.from("profiles").select("id, display_name").in("id", users.map((u) => u.id));
  return users.map((u) => ({ id: u.id, email: u.email ?? "", displayName: profiles?.find((p) => p.id === u.id)?.display_name ?? u.email ?? "" }));
}

async function handle(s: Session, op: string, p: unknown, origin: string) {
  const db = serviceClient();
  switch (op) {
    case "overview": {
      const [people, rewardEvents, gifts, messages, settings, auditLog, hearts] = await Promise.all([
        recipients(),
        db.from("reward_events").select("id, user_id, tier, status, created_at").eq("tier", "golden").order("created_at", { ascending: false }).limit(50),
        db.from("gift_deliveries").select("id, recipient_id, kind, title, animation, status, sent_at, opened_at, revealed_at, reward_event_id").order("sent_at", { ascending: false }).limit(50),
        db.from("scheduled_messages").select("id, recipient_id, kind, title, body, deliver_at, opened_at").order("deliver_at", { ascending: false }).limit(50),
        getAppSettings(),
        db.from("admin_audit").select("admin_email, action, target, created_at").order("created_at", { ascending: false }).limit(40),
        db.from("reward_events").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString()),
      ]);
      return {
        recipients: people,
        rewardEvents: rewardEvents.data ?? [],
        gifts: gifts.data ?? [],
        messages: messages.data ?? [],
        settings,
        audit: auditLog.data ?? [],
        stats: { heartsThisWeek: hearts.count ?? 0 },
        encryptionReady: env.rewardKey.length >= 32,
        invitations: await listInvitations(),
        invitableEmails: env.allowedEmails,
      };
    }
    case "gift.send": {
      const g = giftSchema.parse(p);
      const people = await recipients();
      if (!people.some((r) => r.id === g.recipientId)) throw new HttpError("invalid_recipient", 400);
      const dup = await db.from("gift_deliveries").select("id").eq("idempotency_key", g.idempotencyKey).maybeSingle();
      if (dup.data) throw new HttpError("duplicate", 409);
      let codeId: string | null = null;
      if (g.kind === "robux") {
        if (!g.code || g.code.length < 4) throw new HttpError("code_required", 400);
        const enc = encryptCode(g.code);
        const ins = await db.from("reward_codes").insert({ ...enc, platform: "roblox", created_by: s.user.id }).select("id").single();
        if (ins.error) throw new HttpError("db_error", 500);
        codeId = ins.data.id;
      }
      const gift = await db
        .from("gift_deliveries")
        .insert({
          sender_id: s.user.id, recipient_id: g.recipientId, reward_event_id: g.rewardEventId ?? null, reward_code_id: codeId,
          kind: g.kind, title: g.title, message: g.message, animation: g.animation, idempotency_key: g.idempotencyKey,
        })
        .select("id")
        .single();
      if (gift.error) {
        if (codeId) await db.from("reward_codes").delete().eq("id", codeId);
        throw new HttpError(gift.error.code === "23505" ? "duplicate" : "db_error", gift.error.code === "23505" ? 409 : 500);
      }
      if (g.rewardEventId) await db.from("reward_events").update({ status: "fulfilled" }).eq("id", g.rewardEventId).eq("user_id", g.recipientId);
      const { data: prefs } = await db.from("preferences").select("data").eq("user_id", g.recipientId).maybeSingle();
      const lang = ((prefs?.data as { lang?: "fr" | "en" })?.lang ?? "fr") as "fr" | "en";
      await db.from("notifications").insert({ user_id: g.recipientId, kind: "gift", title: translate(lang, "notifications.giftTitle"), body: translate(lang, "notifications.giftBody"), link: "/surprises" });
      await sendPush(g.recipientId, { title: translate(lang, "notifications.giftTitle"), body: translate(lang, "notifications.giftBody"), url: "/home", tag: "gift" });
      await audit(s, `gift.send:${g.kind}`, gift.data.id);
      return { id: gift.data.id };
    }
    case "reward.dismiss": {
      const { id } = z.object({ id: z.uuid() }).parse(p);
      await db.from("reward_events").update({ status: "dismissed" }).eq("id", id).eq("status", "pending");
      await audit(s, "reward.dismiss", id);
      return {};
    }
    case "message.schedule": {
      const m = messageSchema.parse(p);
      const people = await recipients();
      if (!people.some((r) => r.id === m.recipientId)) throw new HttpError("invalid_recipient", 400);
      const ins = await db.from("scheduled_messages").insert({ sender_id: s.user.id, recipient_id: m.recipientId, kind: m.kind, title: m.title, body: m.body, deliver_at: m.deliverAt }).select("id").single();
      if (ins.error) throw new HttpError("db_error", 500);
      await audit(s, `message.schedule:${m.kind}`, ins.data.id);
      return { id: ins.data.id };
    }
    case "message.delete": {
      const { id } = z.object({ id: z.uuid() }).parse(p);
      await db.from("scheduled_messages").delete().eq("id", id);
      await audit(s, "message.delete", id);
      return {};
    }
    case "invite.create": {
      const { email } = z.object({ email: z.email().max(200) }).parse(p);
      const { token, expiresAt } = await createInvitation(email, s.user.id);
      await audit(s, "invite.create", email.toLowerCase());
      // The link is shown once to Ewan and never stored: only its hash is kept.
      return { link: `${origin}/join?token=${token}`, expiresAt };
    }
    case "invite.revoke": {
      const { id } = z.object({ id: z.uuid() }).parse(p);
      await revokeInvitation(id);
      await audit(s, "invite.revoke", id);
      return {};
    }
    case "settings.save": {
      const st = settingsSchema.parse(p);
      await saveAppSettings(st);
      await audit(s, `settings.save:robux=${st.robuxEnabled}:cap=${st.robuxWeeklyCap}:hearts=${st.heartDailyCap}`);
      return st;
    }
    default:
      throw new HttpError("unknown_op", 400);
  }
}

export async function POST(req: Request) {
  if (!cloudEnabled()) return fail("local_mode", 400);
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const s = await getSession();
  if (!s) return fail("unauthorized", 401);
  if (!s.isAdmin) return fail("forbidden", 403);
  const body = (await req.json().catch(() => null)) as { op?: string; payload?: unknown } | null;
  if (!body?.op) return fail("invalid", 400);
  try {
    return ok(await handle(s, body.op, body.payload ?? {}, new URL(req.url).origin));
  } catch (e) {
    if (e instanceof HttpError) return fail(e.code, e.status);
    if (e instanceof ZodError) return fail("invalid", 400);
    console.error("admin error", body.op, e instanceof Error ? e.message : "unknown");
    return fail("error", 500);
  }
}
