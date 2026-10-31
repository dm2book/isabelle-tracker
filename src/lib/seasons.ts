import { parseKey } from "./time";

export type SeasonId =
  | "halloween"
  | "winter"
  | "christmas"
  | "newyear"
  | "valentine"
  | "spring"
  | "summer"
  | "autumn";

export interface SeasonDef {
  id: SeasonId;
  emoji: string;
  // inclusive month-day ranges, "MM-DD"
  from: string;
  to: string;
  effect: "snow" | "leaves" | "petals" | "bats" | "sparkles" | "hearts" | "sun" | null;
  colors: [string, string];
}

// Order matters: first match wins (specific events before broad seasons).
export const SEASONS: SeasonDef[] = [
  { id: "halloween", emoji: "🎃", from: "10-20", to: "11-01", effect: "bats", colors: ["#FFB37A", "#B79CFF"] },
  { id: "christmas", emoji: "🎄", from: "12-10", to: "12-27", effect: "snow", colors: ["#FF8FA3", "#9EE6C8"] },
  { id: "newyear", emoji: "🎆", from: "12-28", to: "01-03", effect: "sparkles", colors: ["#FFE08A", "#C9B6FF"] },
  { id: "valentine", emoji: "💝", from: "02-07", to: "02-15", effect: "hearts", colors: ["#FF7EB3", "#FFC2D9"] },
  { id: "winter", emoji: "❄️", from: "12-01", to: "02-28", effect: "snow", colors: ["#BFE3FF", "#E8DEFF"] },
  { id: "spring", emoji: "🌸", from: "03-20", to: "06-20", effect: "petals", colors: ["#FFC2D9", "#C8F2D8"] },
  { id: "summer", emoji: "🌞", from: "06-21", to: "09-21", effect: "sun", colors: ["#FFE08A", "#A8E6FF"] },
  { id: "autumn", emoji: "🍂", from: "09-22", to: "11-30", effect: "leaves", colors: ["#FFC48A", "#F2A7A7"] },
];

function md(key: string) {
  const d = parseKey(key);
  return (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function mdOf(s: string) {
  const [m, d] = s.split("-").map(Number);
  return m * 100 + d;
}

export function inRange(key: string, from: string, to: string) {
  const v = md(key);
  const a = mdOf(from);
  const b = mdOf(to);
  return a <= b ? v >= a && v <= b : v >= a || v <= b;
}

export function activeSeasons(key: string): SeasonDef[] {
  return SEASONS.filter((s) => inRange(key, s.from, s.to));
}

export function currentSeason(key: string): SeasonDef | null {
  return activeSeasons(key)[0] ?? null;
}

export function isBirthday(key: string, birthday: string | null) {
  if (!birthday) return false;
  return key.slice(5) === birthday;
}
