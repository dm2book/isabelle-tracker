"use client";

import { useEffect, useRef } from "react";
import { useWorld } from "@/store/world";
import { dateKey, inQuietHours, timeKey } from "@/lib/time";
import { translate } from "@/lib/i18n";
import type { ReminderSlot } from "@/lib/types";

const KEYS: Record<ReminderSlot, string> = {
  morning: "notifications.reminderMorning",
  afternoon: "notifications.reminderAfternoon",
  evening: "notifications.reminderEvening",
};

/** In-app reminders while the app is open (push reminders are sent by the server, see /api/cron/dispatch). */
export function Reminders() {
  const fired = useRef<Set<string>>(new Set());
  useEffect(() => {
    const check = () => {
      const s = useWorld.getState();
      const n = s.prefs.notifications;
      if (!n.kinds.reminder) return;
      const now = new Date();
      const tz = s.prefs.timezone;
      if (n.quietHours.enabled && inQuietHours(now, tz, n.quietHours.start, n.quietHours.end)) return;
      const hhmm = timeKey(now, tz);
      const day = dateKey(now, tz);
      for (const slot of Object.keys(n.reminders) as ReminderSlot[]) {
        const r = n.reminders[slot];
        const key = `${day}:${slot}`;
        if (r.enabled && r.time === hhmm && !fired.current.has(key)) {
          fired.current.add(key);
          s.toast({ text: translate(s.prefs.lang, KEYS[slot]), emoji: "🔔", tone: "info" });
          s.cue("wave");
        }
      }
      const breakKey = `${day}:break`;
      if (n.breakReminder && hhmm === "16:30" && !fired.current.has(breakKey)) {
        fired.current.add(breakKey);
        s.toast({ text: translate(s.prefs.lang, "notifications.breakReminder"), emoji: "🍵", tone: "info" });
      }
    };
    const id = setInterval(check, 20_000);
    return () => clearInterval(id);
  }, []);
  return null;
}
