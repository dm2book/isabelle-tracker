// Validation and safety caps for importing game progress from a device or a backup file.
//
// A device's numbers can't be trusted (anyone can edit localStorage or a JSON file), so every value is
// checked against what can realistically be earned since the app launched, then merged with the
// account's existing progress using max/union. Merging is idempotent: importing the same data twice
// never adds anything.
import type { GameEventType, GameState, RewardLog } from "../types";
import { ACHIEVEMENTS, activeQuests, levelFromXp, QUEST_MAP } from "./rules";
import { COLLECTIBLE_MAP } from "../catalog/collectibles";
import { priceOf } from "../catalog";
import { daysBetween } from "../time";
import { normalizeGame } from "./engine";

/** First production release. Nothing could have been earned before it. */
export const LAUNCH_DATE = "2026-11-03";
export const START_COINS = 100;
export const COINS_PER_DAY = 450; // generous upper bound: quests + chest + hearts + surprises + achievements
export const XP_PER_DAY = 700;
export const MAX_COINS = 20_000;
export const MAX_XP = 60_000;

export interface CapReport {
  capped: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const int = (v: unknown, min: number, max: number) => {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : 0;
  return Math.max(min, Math.min(max, n));
};
const isoOr = (v: unknown, fallback: string) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) && v.length <= 40 ? v : fallback);

const STAT_PER_DAY: Partial<Record<GameEventType, number>> = {
  pop_heart: 60, decorate: 300, open_chest: 1, write_memory: 30, hug: 100, visit_room: 50, visit_garden: 10,
  visit_map: 50, personal_task: 10, customize_companion: 100, change_theme: 100, photo_room: 30, open_diary: 50,
  open_gift: 5, find_bottle: 1, daily_visit: 1, secret_found: 1,
};

export function daysSinceLaunch(today: string) {
  return Math.max(1, daysBetween(LAUNCH_DATE, today) + 1);
}

/** Bring device progress within realistic limits (does not merge). */
export function sanitizeDeviceGame(raw: unknown, today: string, nowIso: string, report: CapReport): GameState {
  const days = daysSinceLaunch(today);
  const src = isObj(raw) ? raw : {};
  const g = normalizeGame(null, today);
  const note = (what: string) => report.capped.includes(what) || report.capped.push(what);

  // Unlocked items: only real, paid shop items
  const owned = Array.isArray(src.owned) ? src.owned.filter((u): u is string => typeof u === "string" && (priceOf(u) ?? 0) > 0) : [];
  const ownedUnique = [...new Set(owned)].slice(0, 300);
  if (Array.isArray(src.owned) && ownedUnique.length !== src.owned.length) note("owned");

  // Coins + everything spent can't exceed what was earnable
  const earnable = Math.min(MAX_COINS, START_COINS + COINS_PER_DAY * days);
  ownedUnique.sort((a, b) => (priceOf(a) ?? 0) - (priceOf(b) ?? 0));
  let spent = ownedUnique.reduce((s, u) => s + (priceOf(u) ?? 0), 0);
  while (spent > earnable && ownedUnique.length) {
    spent -= priceOf(ownedUnique.pop()!) ?? 0;
    note("owned");
  }
  g.owned = ownedUnique;
  const coins = int(src.coins, 0, MAX_COINS);
  g.coins = Math.min(coins, Math.max(0, earnable - spent));
  if (g.coins !== coins) note("coins");

  const xp = int(src.xp, 0, MAX_XP);
  g.xp = Math.min(xp, XP_PER_DAY * days);
  if (g.xp !== xp) note("xp");
  g.level = levelFromXp(g.xp);

  // Collectibles: known ids only; legendary ones (1 % golden hearts) are tightly limited
  if (isObj(src.collectibles)) {
    let legendary = 0;
    const legendaryCap = 2 + Math.floor(days / 10);
    for (const [id, n] of Object.entries(src.collectibles)) {
      const def = COLLECTIBLE_MAP[id];
      if (!def) {
        note("collectibles");
        continue;
      }
      let count = int(n, 0, 99);
      if (def.rarity === "legendary") {
        const allowed = Math.max(0, legendaryCap - legendary);
        if (count > allowed) note("collectibles");
        count = Math.min(count, allowed);
        legendary += count;
      }
      if (count > 0) g.collectibles[id] = count;
    }
  }

  // Activity stats
  if (isObj(src.stats)) {
    for (const [k, per] of Object.entries(STAT_PER_DAY) as [GameEventType, number][]) {
      const v = int(src.stats[k], 0, 1_000_000);
      const capped = Math.min(v, per * days);
      if (capped !== v) note("stats");
      if (capped) g.stats[k] = capped;
    }
    const goldenOwned = (g.collectibles.golden_heart ?? 0) + (g.collectibles.golden_crown ?? 0);
    g.stats.goldenHearts = Math.min(int(src.stats.goldenHearts, 0, 1000), goldenOwned);
  }

  // Streak
  if (isObj(src.streak)) {
    const last = typeof src.streak.last === "string" && /^\d{4}-\d{2}-\d{2}$/.test(src.streak.last) && src.streak.last <= today ? src.streak.last : "";
    g.streak = { last, count: last ? int(src.streak.count, 0, days) : 0 };
  }

  // Quests: only the ones active right now, progress within their target
  if (isObj(src.quests)) {
    for (const { def, key } of activeQuests(today)) {
      const q = src.quests[key];
      if (!isObj(q)) continue;
      g.quests[key] = { progress: int(q.progress, 0, def.target), claimed: q.claimed === true };
    }
  }

  // Today's limits carry over, so chests/surprises/hearts can't be repeated after importing
  if (isObj(src.daily) && src.daily.date === today) {
    const d = src.daily;
    g.daily = {
      ...g.daily,
      chestOpened: d.chestOpened === true,
      surpriseOpened: d.surpriseOpened === true,
      surpriseIndex: int(d.surpriseIndex, -1, 1000),
      heartsPopped: int(d.heartsPopped, 0, 60),
      heartsSpawned: int(d.heartsSpawned, 0, 120),
      bottleChecked: d.bottleChecked === true,
      bottleAvailable: d.bottleAvailable === true,
      bottleOpened: d.bottleOpened === true,
      tasksDone: Array.isArray(d.tasksDone) ? d.tasksDone.filter((x): x is string => typeof x === "string").slice(0, 10) : [],
      tasksCounted: Array.isArray(d.tasksCounted) ? d.tasksCounted.filter((x): x is string => typeof x === "string").slice(0, 10) : [],
      visited: Array.isArray(d.visited) ? d.visited.filter((x): x is string => typeof x === "string" && x.length <= 80).slice(0, 50) : [],
      eventXp: int(d.eventXp, 0, 150),
    };
  }

  // Reward history (used by the calendar): known kinds, bounded numbers
  const KINDS = new Set(["quest", "chest", "heart", "surprise", "achievement", "level", "bottle", "gift", "purchase"]);
  if (Array.isArray(src.history)) {
    g.history = src.history
      .filter(isObj)
      .filter((h) => KINDS.has(String(h.kind)) && typeof h.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.date) && h.date >= LAUNCH_DATE && h.date <= today)
      .slice(-120)
      .map((h) => ({
        at: isoOr(h.at, nowIso),
        date: String(h.date),
        kind: h.kind as RewardLog["kind"],
        label: String(h.label ?? "").slice(0, 60),
        ...(h.coins !== undefined ? { coins: int(h.coins, -1000, 1000) } : {}),
        ...(h.xp !== undefined ? { xp: int(h.xp, 0, 1000) } : {}),
        ...(typeof h.item === "string" ? { item: h.item.slice(0, 60) } : {}),
      }));
  }

  // Achievements: only real ones whose condition is met by the (capped) progress
  if (isObj(src.achievements)) {
    for (const a of ACHIEVEMENTS) {
      if (!src.achievements[a.id]) continue;
      if (a.test(g)) g.achievements[a.id] = isoOr(src.achievements[a.id], nowIso) <= nowIso ? isoOr(src.achievements[a.id], nowIso) : nowIso;
      else note("achievements");
    }
  }
  return g;
}

/** Merge sanitized device progress into the account's progress (max / union — never additive). */
export function mergeGames(cloud: GameState, dev: GameState): GameState {
  const out: GameState = structuredClone(cloud);
  out.coins = Math.max(cloud.coins, dev.coins);
  out.xp = Math.max(cloud.xp, dev.xp);
  out.level = levelFromXp(out.xp);
  out.owned = [...new Set([...cloud.owned, ...dev.owned])];
  for (const [id, n] of Object.entries(dev.collectibles)) out.collectibles[id] = Math.max(out.collectibles[id] ?? 0, n);
  for (const [id, at] of Object.entries(dev.achievements)) {
    const cur = out.achievements[id];
    out.achievements[id] = cur && cur < at ? cur : at;
  }
  for (const [k, v] of Object.entries(dev.stats)) {
    const key = k as keyof GameState["stats"];
    out.stats[key] = Math.max(out.stats[key] ?? 0, v ?? 0);
  }
  for (const [k, q] of Object.entries(dev.quests)) {
    if (!QUEST_MAP[k.split("@")[0]]) continue;
    const cur = out.quests[k];
    out.quests[k] = { progress: Math.max(cur?.progress ?? 0, q.progress), claimed: !!(cur?.claimed || q.claimed) };
  }
  if (dev.streak.count > out.streak.count) out.streak = dev.streak;
  if (dev.daily.date === out.daily.date) {
    const a = out.daily;
    const b = dev.daily;
    out.daily = {
      ...a,
      chestOpened: a.chestOpened || b.chestOpened,
      surpriseOpened: a.surpriseOpened || b.surpriseOpened,
      surpriseIndex: a.surpriseOpened ? a.surpriseIndex : b.surpriseIndex,
      heartsPopped: Math.max(a.heartsPopped, b.heartsPopped),
      heartsSpawned: Math.max(a.heartsSpawned, b.heartsSpawned),
      bottleChecked: a.bottleChecked || b.bottleChecked,
      bottleAvailable: a.bottleAvailable || b.bottleAvailable,
      bottleOpened: a.bottleOpened || b.bottleOpened,
      tasksDone: [...new Set([...a.tasksDone, ...b.tasksDone])].slice(0, 10),
      tasksCounted: [...new Set([...a.tasksCounted, ...b.tasksCounted])].slice(0, 10),
      visited: [...new Set([...a.visited, ...b.visited])].slice(0, 50),
      eventXp: Math.max(a.eventXp, b.eventXp),
    };
  }
  const seen = new Set(out.history.map((h) => `${h.at}|${h.kind}|${h.label}`));
  out.history = [...out.history, ...dev.history.filter((h) => !seen.has(`${h.at}|${h.kind}|${h.label}`))]
    .sort((x, y) => x.at.localeCompare(y.at))
    .slice(-120);
  return out;
}
