import { timingSafeEqual } from "node:crypto";
import { cloudEnabled, env, pushConfigured } from "@/lib/server/env";
import { serviceClient } from "@/lib/server/supabase";
import { fail, ok } from "@/lib/server/http";
import { sendPush } from "@/lib/server/push";
import { mergePrefs } from "@/lib/defaults";
import { dateKey, inQuietHours, minutesOf, zonedParts } from "@/lib/time";
import { isBirthday } from "@/lib/seasons";
import { translate } from "@/lib/i18n";
import type { Preferences, ReminderSlot } from "@/lib/types";

export const dynamic = "force-dynamic";

const SLOT_KEYS: Record<ReminderSlot, string> = {
  morning: "notifications.reminderMorning",
  afternoon: "notifications.reminderAfternoon",
  evening: "notifications.reminderEvening",
};

function authorized(req: Request) {
  if (!env.cronSecret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.cronSecret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Sends opt-in push notifications: reminders at Isabelle's chosen times (her time zone, quiet hours respected),
 * new letters from Ewan, and a birthday wish. Call it every hour (GitHub Action or any scheduler) with
 * `Authorization: Bearer $CRON_SECRET`. Vercel Cron (once a day on the Hobby plan) also calls it.
 */
async function run(req: Request) {
  if (!authorized(req)) return fail("unauthorized", 401);
  if (!cloudEnabled() || !pushConfigured()) return ok({ skipped: "push_not_configured" });
  const db = serviceClient();
  const now = new Date();
  const { data: subs } = await db.from("push_subscriptions").select("user_id");
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id as string))];
  let sent = 0;

  for (const userId of userIds) {
    const { data: prefRow } = await db.from("preferences").select("data").eq("user_id", userId).maybeSingle();
    const prefs: Preferences = mergePrefs(prefRow?.data as Partial<Preferences>);
    const n = prefs.notifications;
    const tz = prefs.timezone;
    const day = dateKey(now, tz);
    const quiet = n.quietHours.enabled && inQuietHours(now, tz, n.quietHours.start, n.quietHours.end);
    const p = zonedParts(now, tz);
    const minutes = p.hour * 60 + p.minute;
    const claim = async (slot: string) => !(await db.from("reminder_log").insert({ user_id: userId, slot, day })).error;

    if (!quiet && n.kinds.reminder) {
      for (const slot of Object.keys(n.reminders) as ReminderSlot[]) {
        const r = n.reminders[slot];
        const delta = minutes - minutesOf(r.time);
        if (r.enabled && delta >= 0 && delta < 180 && (await claim(slot))) {
          sent += await sendPush(userId, { title: "🎀 " + translate(prefs.lang, "app.short"), body: translate(prefs.lang, SLOT_KEYS[slot]), tag: `reminder-${slot}` });
        }
      }
      const breakDelta = minutes - minutesOf("16:30");
      if (n.breakReminder && breakDelta >= 0 && breakDelta < 120 && (await claim("break"))) {
        sent += await sendPush(userId, { title: "🍵", body: translate(prefs.lang, "notifications.breakReminder"), tag: "break" });
      }
    }

    if (!quiet && n.kinds.message) {
      const { data: due } = await db.from("scheduled_messages").select("id").eq("recipient_id", userId).lte("deliver_at", now.toISOString()).is("pushed_at", null);
      if (due?.length) {
        await db.from("scheduled_messages").update({ pushed_at: now.toISOString() }).in("id", due.map((m) => m.id));
        sent += await sendPush(userId, { title: translate(prefs.lang, "notifications.letterTitle"), body: translate(prefs.lang, "notifications.letterBody"), url: "/surprises", tag: "letter" });
      }
    }

    if (!quiet && n.kinds.birthday) {
      const { data: profile } = await db.from("profiles").select("display_name, birthday").eq("id", userId).maybeSingle();
      if (profile && isBirthday(day, profile.birthday) && (await claim("birthday"))) {
        const title = translate(prefs.lang, "home.birthday", { name: profile.display_name });
        await db.from("notifications").insert({ user_id: userId, kind: "birthday", title, body: translate(prefs.lang, "home.birthdaySub"), link: "/surprises" });
        sent += await sendPush(userId, { title: `🎂 ${title}`, body: translate(prefs.lang, "home.birthdaySub"), url: "/surprises", tag: "birthday" });
      }
    }
  }
  return ok({ users: userIds.length, sent });
}

export const GET = run;
export const POST = run;
