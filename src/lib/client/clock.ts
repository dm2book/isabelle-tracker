"use client";

import { useSyncExternalStore } from "react";
import { dateKey, dayPeriod, type DayPeriod } from "@/lib/time";

/*
 * The current day and time of day as live values. They update by themselves (every 30 s, and when
 * the app comes back to the foreground), so a page left open overnight moves to the new day.
 * On the server they return an empty / neutral value.
 */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
const notify = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    timer = setInterval(notify, 30_000);
    document.addEventListener("visibilitychange", notify);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", notify);
    }
  };
}

/** Today's date key ("2026-11-04") in the given time zone. */
export function useToday(tz: string) {
  return useSyncExternalStore(subscribe, () => dateKey(new Date(), tz), () => "");
}

/** Morning / afternoon / evening / night in the given time zone. */
export function usePeriod(tz: string, fallback: DayPeriod = "afternoon") {
  return useSyncExternalStore(subscribe, () => dayPeriod(new Date(), tz), () => fallback);
}
