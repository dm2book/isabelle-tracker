import type { GameEventType, GameState } from "../types";
import { hashString, seeded, weekKey } from "../time";

// ---------- Levels ----------
/** Total XP needed to reach level n (level 1 = 0 XP). */
export const xpForLevel = (n: number) => 50 * n * (n - 1);

export function levelFromXp(xp: number): number {
  let n = 1;
  while (xpForLevel(n + 1) <= xp) n++;
  return n;
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - base, span: next - base, toNext: next - xp };
}

// ---------- Quests ----------
export interface QuestDef {
  id: string;
  period: "daily" | "weekly";
  event: GameEventType;
  target: number;
  coins: number;
  xp: number;
  emoji: string;
  nameKey: string; // key in quests.names
}

export const DAILY_POOL: QuestDef[] = [
  { id: "d_decorate", period: "daily", event: "decorate", target: 1, coins: 20, xp: 25, emoji: "🛋️", nameKey: "decorate" },
  { id: "d_diary", period: "daily", event: "open_diary", target: 1, coins: 15, xp: 20, emoji: "📔", nameKey: "open_diary" },
  { id: "d_heart", period: "daily", event: "pop_heart", target: 3, coins: 20, xp: 25, emoji: "💗", nameKey: "pop_heart_many" },
  { id: "d_garden", period: "daily", event: "visit_garden", target: 1, coins: 15, xp: 20, emoji: "🌷", nameKey: "visit_garden" },
  { id: "d_memory", period: "daily", event: "write_memory", target: 1, coins: 20, xp: 25, emoji: "✍️", nameKey: "write_memory" },
  { id: "d_task", period: "daily", event: "personal_task", target: 1, coins: 20, xp: 25, emoji: "✅", nameKey: "personal_task" },
  { id: "d_companion", period: "daily", event: "customize_companion", target: 1, coins: 15, xp: 20, emoji: "🎀", nameKey: "customize_companion" },
  { id: "d_hug", period: "daily", event: "hug", target: 1, coins: 10, xp: 15, emoji: "🤗", nameKey: "hug" },
  { id: "d_rooms", period: "daily", event: "visit_room", target: 2, coins: 15, xp: 20, emoji: "🚪", nameKey: "visit_room" },
  { id: "d_studio", period: "daily", event: "change_theme", target: 1, coins: 15, xp: 20, emoji: "🎨", nameKey: "change_theme" },
  { id: "d_map", period: "daily", event: "visit_map", target: 1, coins: 10, xp: 15, emoji: "🗺️", nameKey: "visit_map" },
  { id: "d_photo", period: "daily", event: "photo_room", target: 1, coins: 15, xp: 20, emoji: "📸", nameKey: "photo_room" },
];

export const WEEKLY: QuestDef[] = [
  { id: "w_decorate", period: "weekly", event: "decorate", target: 10, coins: 80, xp: 100, emoji: "🏡", nameKey: "decorate_many" },
  { id: "w_hearts", period: "weekly", event: "pop_heart", target: 15, coins: 80, xp: 100, emoji: "💞", nameKey: "pop_heart_many" },
  { id: "w_memories", period: "weekly", event: "write_memory", target: 3, coins: 70, xp: 90, emoji: "📖", nameKey: "write_many" },
  { id: "w_chests", period: "weekly", event: "open_chest", target: 5, coins: 90, xp: 110, emoji: "🎁", nameKey: "chest_many" },
  { id: "w_tasks", period: "weekly", event: "personal_task", target: 5, coins: 70, xp: 90, emoji: "🌟", nameKey: "task_many" },
];

export const ALL_QUESTS: QuestDef[] = [...DAILY_POOL, ...WEEKLY];
export const QUEST_MAP: Record<string, QuestDef> = Object.fromEntries(ALL_QUESTS.map((q) => [q.id, q]));

/** Four daily quests, chosen deterministically from the date (same on server and device). */
export function dailyQuests(day: string): QuestDef[] {
  const rand = seeded(hashString(`quests:${day}`));
  const pool = [...DAILY_POOL];
  const picked: QuestDef[] = [];
  while (picked.length < 4 && pool.length) {
    const i = Math.floor(rand() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}

export function activeQuests(day: string): { def: QuestDef; key: string }[] {
  const wk = weekKey(day);
  return [
    ...dailyQuests(day).map((def) => ({ def, key: `${def.id}@${day}` })),
    ...WEEKLY.map((def) => ({ def, key: `${def.id}@${wk}` })),
  ];
}

// ---------- Achievements ----------
export interface AchievementDef {
  id: string;
  emoji: string;
  coins: number;
  xp: number;
  test: (g: GameState) => boolean;
}

const stat = (g: GameState, e: GameEventType) => g.stats[e] ?? 0;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_room", emoji: "🏠", coins: 30, xp: 30, test: (g) => stat(g, "decorate") >= 1 },
  { id: "decorator", emoji: "🛋️", coins: 60, xp: 60, test: (g) => stat(g, "decorate") >= 25 },
  { id: "master_decorator", emoji: "🏰", coins: 150, xp: 150, test: (g) => stat(g, "decorate") >= 100 },
  { id: "heart_finder", emoji: "💗", coins: 50, xp: 50, test: (g) => stat(g, "pop_heart") >= 10 },
  { id: "heart_collector", emoji: "💞", coins: 150, xp: 150, test: (g) => stat(g, "pop_heart") >= 100 },
  { id: "memory_keeper", emoji: "📖", coins: 60, xp: 60, test: (g) => stat(g, "write_memory") >= 5 },
  { id: "level_5", emoji: "⭐", coins: 80, xp: 0, test: (g) => g.level >= 5 },
  { id: "level_10", emoji: "🌟", coins: 200, xp: 0, test: (g) => g.level >= 10 },
  { id: "hugs_10", emoji: "🤗", coins: 50, xp: 50, test: (g) => stat(g, "hug") >= 10 },
  { id: "chest_7", emoji: "🎁", coins: 60, xp: 60, test: (g) => stat(g, "open_chest") >= 7 },
  { id: "streak_7", emoji: "📅", coins: 100, xp: 100, test: (g) => g.streak.count >= 7 },
  { id: "collector", emoji: "🧸", coins: 100, xp: 100, test: (g) => Object.keys(g.collectibles).length >= 10 },
  { id: "golden_heart", emoji: "💛", coins: 100, xp: 100, test: (g) => (g.stats.goldenHearts ?? 0) >= 1 },
  { id: "gift_opened", emoji: "💌", coins: 30, xp: 30, test: (g) => stat(g, "open_gift") >= 1 },
  { id: "photographer", emoji: "📸", coins: 50, xp: 50, test: (g) => stat(g, "photo_room") >= 3 },
  { id: "secret_room", emoji: "🌌", coins: 100, xp: 100, test: (g) => stat(g, "secret_found") >= 1 },
  { id: "stylist", emoji: "👗", coins: 50, xp: 50, test: (g) => stat(g, "customize_companion") >= 5 },
];

// ---------- Hearts & chances ----------
export const HEART_ODDS = { golden: 0.01, rainbow: 0.06 } as const;
export const DEFAULT_HEART_CAP = 20;
export const DEFAULT_ROBUX_WEEKLY_CAP = 1;
export const HEART_TICKET_TTL_MS = 5 * 60 * 1000;
export const EVENT_XP_DAILY_CAP = 150;
export const BOTTLE_CHANCE = 0.35;

/** Events the client is allowed to report directly (low value, capped). Others are emitted by the server. */
export const CLIENT_EVENTS: GameEventType[] = [
  "open_diary", "visit_garden", "visit_room", "visit_map", "hug", "secret_found",
];

export const EVENT_XP: Partial<Record<GameEventType, number>> = {
  decorate: 2, open_diary: 3, visit_garden: 3, write_memory: 10, personal_task: 5, customize_companion: 3,
  hug: 2, visit_room: 2, change_theme: 3, visit_map: 2, photo_room: 5, secret_found: 20,
};
