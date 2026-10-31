import "server-only";
import { z } from "zod";
import type { Session } from "./supabase";
import { serviceClient } from "./supabase";
import { env } from "./env";
import { HttpError } from "./http";
import { runEvents, runGame, type RunCtx, type RunResult } from "./game";
import { getAppSettings } from "./settings";
import { secureRand, signHeart, verifyHeart } from "./crypto";
import { sendPush } from "./push";
import {
  diarySchema, eventSchema, foodSchema, gameActionSchema, heartTicketSchema, prefsSchema, profileSchema, pushSubSchema, roomSchema, scrapSchema, waterSchema,
} from "./schemas";
import { diaryToRow, eventToRow, foodToRow, roomFromRow, roomToRow, scrapToRow, waterToRow } from "./mappers";
import { diaryEvents, prefsEvents, roomEvents, scrapEvents } from "../game/derive";
import { mergePrefs } from "../defaults";
import { rollHeartVariant, type GameAction } from "../game/engine";
import { HEART_TICKET_TTL_MS } from "../game/rules";
import { translate } from "../i18n";
import type { Lang, Preferences, Room } from "../types";

type OpResult = Partial<RunResult> | Record<string, unknown> | null;

async function userPrefs(s: Session): Promise<Preferences> {
  const { data } = await s.db.from("preferences").select("data").eq("user_id", s.user.id).maybeSingle();
  return mergePrefs((data?.data as Partial<Preferences>) ?? null);
}

function must<T>(r: { error: unknown; data?: T }) {
  if (r.error) {
    console.error("db error", (r.error as { message?: string }).message);
    throw new HttpError("db_error", 500);
  }
  return r.data as T;
}

const idOnly = z.object({ id: z.string().max(60) });

async function adminUserIds(): Promise<string[]> {
  if (!env.adminEmails.length) return [];
  const { data } = await serviceClient().auth.admin.listUsers({ page: 1, perPage: 200 });
  return (data?.users ?? []).filter((u) => u.email && env.adminEmails.includes(u.email.toLowerCase())).map((u) => u.id);
}

async function robuxStatusFor(userId: string) {
  const settings = await getAppSettings();
  if (!settings.robuxEnabled) return { status: "disabled" as const, settings };
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { count } = await serviceClient()
    .from("reward_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("tier", "golden")
    .in("status", ["pending", "fulfilled"])
    .gte("created_at", since);
  return { status: (count ?? 0) >= settings.robuxWeeklyCap ? ("capped" as const) : ("eligible" as const), settings };
}

export async function handleOp(s: Session, op: string, payload: unknown): Promise<OpResult> {
  const uid = s.user.id;
  const p = (payload ?? {}) as Record<string, unknown>;
  const prefs = await userPrefs(s);
  const ctx: RunCtx = { tz: prefs.timezone, lang: prefs.lang as Lang };

  switch (op) {
    case "profile.update": {
      const pr = profileSchema.parse(p.profile);
      must(await s.db.from("profiles").upsert({ id: uid, display_name: pr.displayName, world_name: pr.worldName, birthday: pr.birthday, onboarded: pr.onboarded, updated_at: new Date().toISOString() }));
      return null;
    }
    case "prefs.save": {
      const next = mergePrefs(prefsSchema.parse(p.prefs) as Partial<Preferences>);
      must(await s.db.from("preferences").upsert({ user_id: uid, data: next, updated_at: new Date().toISOString() }));
      return runEvents(uid, prefsEvents(prefs, next), { ...ctx, lang: next.lang, tz: next.timezone });
    }
    case "room.save": {
      const room = roomSchema.parse(p.room) as Room;
      const prevRow = (await s.db.from("rooms").select("*").eq("id", room.id).maybeSingle()).data;
      must(await s.db.from("rooms").upsert(roomToRow(room, uid)));
      return runEvents(uid, roomEvents(prevRow ? roomFromRow(prevRow) : undefined, room), ctx);
    }
    case "room.delete": {
      must(await s.db.from("rooms").delete().eq("id", idOnly.parse(p).id));
      return null;
    }
    case "food.save": {
      must(await s.db.from("food_entries").upsert(foodToRow(foodSchema.parse(p.entry), uid)));
      return null;
    }
    case "food.delete": {
      must(await s.db.from("food_entries").delete().eq("id", idOnly.parse(p).id));
      return null;
    }
    case "water.save": {
      must(await s.db.from("water_entries").upsert(waterToRow(waterSchema.parse(p.entry), uid)));
      return null;
    }
    case "water.delete": {
      must(await s.db.from("water_entries").delete().eq("id", idOnly.parse(p).id));
      return null;
    }
    case "diary.save": {
      const entry = diarySchema.parse(p.entry);
      const prev = (await s.db.from("diary_entries").select("text").eq("entry_date", entry.date).maybeSingle()).data;
      must(await s.db.from("diary_entries").upsert(diaryToRow(entry, uid)));
      return runEvents(uid, diaryEvents(prev ? { date: entry.date, text: prev.text, mood: null, updatedAt: "" } : undefined, entry), ctx);
    }
    case "event.save": {
      must(await s.db.from("calendar_events").upsert(eventToRow(eventSchema.parse(p.event), uid)));
      return null;
    }
    case "event.delete": {
      must(await s.db.from("calendar_events").delete().eq("id", idOnly.parse(p).id));
      return null;
    }
    case "scrap.save": {
      const entry = scrapSchema.parse(p.entry);
      const exists = (await s.db.from("scrapbook_entries").select("id").eq("id", entry.id).maybeSingle()).data;
      must(await s.db.from("scrapbook_entries").upsert(scrapToRow(entry as never, uid)));
      return runEvents(uid, scrapEvents(!exists, entry.kind), ctx);
    }
    case "scrap.delete": {
      must(await s.db.from("scrapbook_entries").delete().eq("id", idOnly.parse(p).id));
      return null;
    }
    case "game.action": {
      const action = gameActionSchema.parse(p.action) as GameAction;
      const settings = await getAppSettings();
      return runGame(uid, [action], { ...ctx, heartCap: settings.heartDailyCap });
    }
    case "heart.spawn": {
      const settings = await getAppSettings();
      await runGame(uid, [{ type: "heart_spawn" }], { ...ctx, heartCap: settings.heartDailyCap });
      return signHeart(rollHeartVariant(secureRand), Date.now() + HEART_TICKET_TTL_MS, uid) as unknown as Record<string, unknown>;
    }
    case "heart.pop": {
      const ticket = heartTicketSchema.parse(p.ticket);
      if (!verifyHeart(ticket, uid)) throw new HttpError("expired", 400);
      const golden = ticket.variant === "golden";
      const { status, settings } = golden ? await robuxStatusFor(uid) : { status: "disabled" as const, settings: await getAppSettings() };
      // Claim the ticket first: the unique heart_id makes every heart single-use.
      const ins = await serviceClient()
        .from("reward_events")
        .insert({ user_id: uid, heart_id: ticket.id, tier: ticket.variant, status: golden ? (status === "eligible" ? "pending" : status) : "none" })
        .select("id")
        .single();
      if (ins.error) throw new HttpError(ins.error.code === "23505" ? "already_done" : "db_error", ins.error.code === "23505" ? 409 : 500);
      const res = await runGame(uid, [{ type: "heart_pop", heartId: ticket.id, variant: ticket.variant }], { ...ctx, robux: status, heartCap: settings.heartDailyCap });
      if (golden && status === "eligible") {
        const admins = await adminUserIds();
        for (const a of admins) {
          await serviceClient().from("notifications").insert({ user_id: a, kind: "rare", title: "💛 Cœur d’or trouvé !", body: "Une récompense attend ta préparation dans l’Espace Ewan.", link: "/admin" });
          await sendPush(a, { title: "💛 Cœur d’or", body: "Une récompense attend ta préparation.", url: "/admin", tag: "golden" });
        }
      }
      return res;
    }
    case "notif.read": {
      must(await s.db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", idOnly.parse(p).id).is("read_at", null));
      return null;
    }
    case "notif.readAll": {
      must(await s.db.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", uid).is("read_at", null));
      return null;
    }
    case "letter.open": {
      must(await serviceClient().from("scheduled_messages").update({ opened_at: new Date().toISOString() }).eq("id", idOnly.parse(p).id).eq("recipient_id", uid).lte("deliver_at", new Date().toISOString()).is("opened_at", null));
      return null;
    }
    case "gift.open": {
      const { data } = await serviceClient()
        .from("gift_deliveries")
        .update({ status: "opened", opened_at: new Date().toISOString() })
        .eq("id", idOnly.parse(p).id)
        .eq("recipient_id", uid)
        .eq("status", "sent")
        .select("id");
      if (data?.length) return runGame(uid, [{ type: "track", event: "open_gift" }], ctx);
      return null;
    }
    case "push.subscribe": {
      const sub = pushSubSchema.parse(p.subscription);
      must(await serviceClient().from("push_subscriptions").upsert({ user_id: uid, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: "endpoint" }));
      return null;
    }
    case "push.unsubscribe": {
      const endpoint = z.object({ endpoint: z.string().max(1000) }).parse(p).endpoint;
      must(await s.db.from("push_subscriptions").delete().eq("endpoint", endpoint));
      return null;
    }
    case "push.test": {
      const n = await sendPush(uid, { title: "🎀 " + translate(ctx.lang ?? "fr", "app.short"), body: translate(ctx.lang ?? "fr", "settings.pushTestSent"), tag: "test" });
      if (!n) throw new HttpError("push_unavailable", 400);
      return { sent: n };
    }
    case "account.delete": {
      z.object({ confirm: z.literal(true) }).parse(p);
      // Deleting the auth user cascades to every row that belongs to her (ON DELETE CASCADE).
      const { error } = await serviceClient().auth.admin.deleteUser(uid);
      if (error) throw new HttpError("db_error", 500);
      await s.db.auth.signOut().catch(() => {});
      return null;
    }
    default:
      throw new HttpError("unknown_op", 400);
  }
}
