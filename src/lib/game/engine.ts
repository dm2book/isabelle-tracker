// The game engine: pure functions shared by the server (authoritative in cloud mode)
// and the device (local mode). Randomness is always injected by the caller.
import type { Effect, GameEventType, GameResult, GameState, HeartVariant, RewardLog } from "../types";
import { addDays, dateKey, weekKey } from "../time";
import {
  ACHIEVEMENTS, BOTTLE_CHANCE, EVENT_XP, EVENT_XP_DAILY_CAP, HEART_ODDS, QUEST_MAP,
  activeQuests, levelFromXp,
} from "./rules";
import { COLLECTIBLES, RARITY_WEIGHT, type CollectibleDef } from "../catalog/collectibles";
import { SHOP, isUnlocked, priceOf } from "../catalog";

export type Rand = () => number; // [0,1)

export type RobuxStatus = "eligible" | "disabled" | "capped" | "demo";

export interface EngineCtx {
  now: Date;
  tz: string;
  rand: Rand;
  robux: RobuxStatus;
  heartCap: number;
}

export type GameAction =
  | { type: "visit" }
  | { type: "track"; event: GameEventType; amount?: number; meta?: string }
  | { type: "claim"; questKey: string }
  | { type: "buy"; uid: string }
  | { type: "chest" }
  | { type: "surprise" }
  | { type: "task"; taskId: string; done: boolean }
  | { type: "heart_spawn" }
  | { type: "heart_pop"; heartId: string; variant: HeartVariant }
  | { type: "bottle_check" }
  | { type: "bottle_open" };

export class GameError extends Error {
  constructor(public code: "not_enough_coins" | "already_owned" | "invalid" | "already_done" | "limit" | "not_ready") {
    super(code);
  }
}

export function initialGame(today: string): GameState {
  return {
    coins: 100,
    xp: 0,
    level: 1,
    owned: [],
    collectibles: {},
    quests: {},
    achievements: {},
    stats: {},
    daily: freshDaily(today),
    streak: { last: "", count: 0 },
    recentHearts: [],
    history: [],
  };
}

function freshDaily(date: string): GameState["daily"] {
  return {
    date, chestOpened: false, surpriseOpened: false, surpriseIndex: -1, heartsPopped: 0, heartsSpawned: 0,
    bottleChecked: false, bottleAvailable: false, bottleOpened: false, tasksDone: [], tasksCounted: [], visited: [], eventXp: 0,
  };
}

/** Make a structurally-complete copy (defensive against older saved shapes). */
export function normalizeGame(g: Partial<GameState> | null | undefined, today: string): GameState {
  const base = initialGame(today);
  if (!g) return base;
  const out: GameState = {
    ...base,
    ...g,
    owned: [...(g.owned ?? [])],
    collectibles: { ...(g.collectibles ?? {}) },
    quests: { ...(g.quests ?? {}) },
    achievements: { ...(g.achievements ?? {}) },
    stats: { ...(g.stats ?? {}) },
    daily: { ...base.daily, ...(g.daily ?? {}) },
    streak: { ...base.streak, ...(g.streak ?? {}) },
    recentHearts: [...(g.recentHearts ?? [])],
    history: [...(g.history ?? [])],
  };
  if (out.daily.date !== today) out.daily = freshDaily(today);
  out.level = levelFromXp(out.xp);
  return out;
}

function prune(g: GameState, today: string) {
  const oldestDay = addDays(today, -10);
  const thisWeek = weekKey(today);
  const lastWeek = weekKey(addDays(today, -7));
  for (const k of Object.keys(g.quests)) {
    const period = k.split("@")[1] ?? "";
    if (period.includes("W")) {
      if (period !== thisWeek && period !== lastWeek) delete g.quests[k];
    } else if (period < oldestDay) delete g.quests[k];
  }
  if (g.history.length > 120) g.history = g.history.slice(-120);
  if (g.recentHearts.length > 80) g.recentHearts = g.recentHearts.slice(-80);
}

class Tx {
  effects: Effect[] = [];
  constructor(public g: GameState, public ctx: EngineCtx, public today: string) {}

  log(entry: Omit<RewardLog, "at" | "date">) {
    this.g.history.push({ ...entry, at: this.ctx.now.toISOString(), date: this.today });
  }

  coins(n: number) {
    if (!n) return;
    this.g.coins = Math.max(0, this.g.coins + n);
    if (n > 0) this.effects.push({ type: "coins", amount: n });
  }

  xp(n: number) {
    if (n <= 0) return;
    const before = this.g.level;
    this.g.xp += n;
    this.effects.push({ type: "xp", amount: n });
    const after = levelFromXp(this.g.xp);
    this.g.level = after;
    for (let l = before + 1; l <= after; l++) {
      this.effects.push({ type: "level", level: l });
      this.coins(25);
      this.log({ kind: "level", label: `level:${l}`, coins: 25 });
    }
  }

  collectible(c: CollectibleDef) {
    this.g.collectibles[c.id] = (this.g.collectibles[c.id] ?? 0) + 1;
    this.effects.push({ type: "collectible", id: c.id });
  }

  event(event: GameEventType, amount = 1, meta?: string) {
    if (amount <= 0) return;
    this.g.stats[event] = (this.g.stats[event] ?? 0) + amount;
    // Small XP for activities, capped per day so nothing can be farmed.
    const per = EVENT_XP[event] ?? 0;
    if (per) {
      const room = Math.max(0, EVENT_XP_DAILY_CAP - this.g.daily.eventXp);
      const gain = Math.min(room, per * Math.min(amount, 10));
      if (gain > 0) {
        this.g.daily.eventXp += gain;
        this.xp(gain);
      }
    }
    for (const { def, key } of activeQuests(this.today)) {
      if (def.event !== event) continue;
      const q = this.g.quests[key] ?? { progress: 0, claimed: false };
      if (q.progress >= def.target) continue;
      q.progress = Math.min(def.target, q.progress + amount);
      this.g.quests[key] = q;
      if (q.progress >= def.target) this.effects.push({ type: "quest_done", questId: def.id });
    }
    void meta;
    this.achievements();
  }

  achievements() {
    for (const a of ACHIEVEMENTS) {
      if (this.g.achievements[a.id]) continue;
      if (a.test(this.g)) {
        this.g.achievements[a.id] = this.ctx.now.toISOString();
        this.effects.push({ type: "achievement", id: a.id });
        this.log({ kind: "achievement", label: a.id, coins: a.coins, xp: a.xp });
        this.coins(a.coins);
        this.xp(a.xp);
      }
    }
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.ctx.rand() * arr.length) % arr.length];
  }

  range(min: number, max: number) {
    return min + Math.floor(this.ctx.rand() * (max - min + 1));
  }

  rollCollectible(minRarity: "common" | "rare" = "common"): CollectibleDef {
    const pool = COLLECTIBLES.filter((c) => c.rarity !== "legendary" && (minRarity === "common" || c.rarity !== "common"));
    const total = pool.reduce((s, c) => s + RARITY_WEIGHT[c.rarity], 0);
    let r = this.ctx.rand() * total;
    for (const c of pool) {
      r -= RARITY_WEIGHT[c.rarity];
      if (r < 0) return c;
    }
    return pool[0];
  }
}

export function applyGameAction(state: GameState, action: GameAction, ctx: EngineCtx): GameResult {
  const today = dateKey(ctx.now, ctx.tz);
  const g = normalizeGame(structuredClone(state), today);
  const tx = new Tx(g, ctx, today);

  switch (action.type) {
    case "visit": {
      if (g.streak.last !== today) {
        g.streak.count = g.streak.last === addDays(today, -1) ? g.streak.count + 1 : 1;
        g.streak.last = today;
        tx.achievements();
      }
      break;
    }
    case "track": {
      const amount = Math.max(1, Math.min(20, Math.floor(action.amount ?? 1)));
      if (action.event === "visit_room" || action.event === "visit_garden") {
        const tag = `${action.event}:${action.meta ?? ""}`;
        if (g.daily.visited.includes(tag)) break; // count distinct places per day
        g.daily.visited.push(tag);
      }
      if (action.event === "secret_found" && (g.stats.secret_found ?? 0) >= 1) break;
      tx.event(action.event, amount, action.meta);
      break;
    }
    case "claim": {
      const [qid, period] = action.questKey.split("@");
      const def = QUEST_MAP[qid];
      const valid = activeQuests(today).some((q) => q.key === action.questKey);
      if (!def || !period || !valid) throw new GameError("invalid");
      const q = g.quests[action.questKey];
      if (!q || q.progress < def.target) throw new GameError("not_ready");
      if (q.claimed) throw new GameError("already_done");
      q.claimed = true;
      tx.log({ kind: "quest", label: def.id, coins: def.coins, xp: def.xp });
      tx.coins(def.coins);
      tx.xp(def.xp);
      break;
    }
    case "buy": {
      const price = priceOf(action.uid);
      if (price === null || price <= 0) throw new GameError("invalid");
      if (isUnlocked(action.uid, g.owned)) throw new GameError("already_owned");
      if (g.coins < price) throw new GameError("not_enough_coins");
      g.coins -= price;
      g.owned.push(action.uid);
      tx.effects.push({ type: "item", item: action.uid });
      tx.log({ kind: "purchase", label: action.uid, coins: -price, item: action.uid });
      break;
    }
    case "chest": {
      if (g.daily.chestOpened) throw new GameError("already_done");
      g.daily.chestOpened = true;
      const r = ctx.rand();
      if (r < 0.06) {
        const locked = SHOP.filter((s) => s.price <= 90 && !g.owned.includes(s.uid));
        if (locked.length) {
          const prize = tx.pick(locked);
          g.owned.push(prize.uid);
          tx.effects.push({ type: "item", item: prize.uid });
          tx.log({ kind: "chest", label: "rare_decor", item: prize.uid });
        } else tx.coins(80);
      } else if (r < 0.32) {
        const c = tx.rollCollectible();
        tx.collectible(c);
        tx.coins(25);
        tx.log({ kind: "chest", label: "collectible", coins: 25, item: c.id });
      } else {
        const n = tx.range(25, 60);
        tx.coins(n);
        tx.log({ kind: "chest", label: "coins", coins: n });
      }
      tx.xp(15);
      tx.event("open_chest");
      break;
    }
    case "surprise": {
      if (g.daily.surpriseOpened) throw new GameError("already_done");
      g.daily.surpriseOpened = true;
      g.daily.surpriseIndex = Math.floor(ctx.rand() * 1000);
      tx.coins(10);
      if (ctx.rand() < 0.2) tx.collectible(tx.rollCollectible());
      tx.effects.push({ type: "message", key: "compliment", params: { i: g.daily.surpriseIndex } });
      tx.log({ kind: "surprise", label: "daily", coins: 10 });
      break;
    }
    case "task": {
      if (action.done) {
        if (!g.daily.tasksDone.includes(action.taskId)) g.daily.tasksDone.push(action.taskId);
        if (!g.daily.tasksCounted.includes(action.taskId) && g.daily.tasksCounted.length < 10) {
          g.daily.tasksCounted.push(action.taskId);
          tx.event("personal_task");
        }
      } else {
        g.daily.tasksDone = g.daily.tasksDone.filter((t) => t !== action.taskId);
      }
      break;
    }
    case "heart_spawn": {
      if (g.daily.heartsSpawned >= ctx.heartCap * 2 || g.daily.heartsPopped >= ctx.heartCap) throw new GameError("limit");
      g.daily.heartsSpawned += 1;
      break;
    }
    case "heart_pop": {
      if (g.daily.heartsPopped >= ctx.heartCap) throw new GameError("limit");
      if (g.recentHearts.includes(action.heartId)) throw new GameError("already_done");
      g.recentHearts.push(action.heartId);
      g.daily.heartsPopped += 1;
      popHeart(tx, action.variant);
      tx.event("pop_heart");
      break;
    }
    case "bottle_check": {
      if (!g.daily.bottleChecked) {
        g.daily.bottleChecked = true;
        g.daily.bottleAvailable = ctx.rand() < BOTTLE_CHANCE;
      }
      break;
    }
    case "bottle_open": {
      if (!g.daily.bottleAvailable || g.daily.bottleOpened) throw new GameError("not_ready");
      g.daily.bottleOpened = true;
      tx.coins(15);
      tx.xp(10);
      tx.effects.push({ type: "message", key: "bottle", params: { i: Math.floor(ctx.rand() * 1000) } });
      tx.log({ kind: "bottle", label: "bottle", coins: 15 });
      break;
    }
  }

  prune(g, today);
  return { game: g, effects: tx.effects };
}

function popHeart(tx: Tx, variant: HeartVariant) {
  const g = tx.g;
  if (variant === "golden") {
    g.stats.goldenHearts = (g.stats.goldenHearts ?? 0) + 1;
    const c = COLLECTIBLES.find((x) => x.id === (tx.ctx.rand() < 0.5 ? "golden_heart" : "golden_crown"))!;
    tx.collectible(c);
    tx.coins(100);
    tx.xp(50);
    const status = tx.ctx.robux === "eligible" ? "pending" : tx.ctx.robux;
    tx.effects.push({ type: "golden", robux: status });
    tx.log({ kind: "heart", label: `golden:${status}`, coins: 100, item: c.id });
    return;
  }
  if (variant === "rainbow") {
    const c = tx.rollCollectible("rare");
    tx.collectible(c);
    tx.coins(10);
    tx.xp(15);
    tx.log({ kind: "heart", label: "rainbow", coins: 10, item: c.id });
    return;
  }
  const r = tx.ctx.rand();
  if (r < 0.55) {
    const n = tx.range(3, 8);
    tx.coins(n);
    tx.log({ kind: "heart", label: "coins", coins: n });
  } else if (r < 0.85) {
    const n = tx.range(5, 10);
    tx.xp(n);
    tx.log({ kind: "heart", label: "xp", xp: n });
  } else if (r < 0.95) {
    tx.coins(2);
    tx.log({ kind: "heart", label: "message", coins: 2 });
  } else {
    const c = tx.rollCollectible();
    tx.collectible(c);
    tx.log({ kind: "heart", label: "collectible", item: c.id });
  }
  tx.effects.push({ type: "message", key: "heart", params: { i: Math.floor(tx.ctx.rand() * 1000) } });
}

/** Roll a heart variant at spawn time (1% golden, 6% rainbow, rest cosmetic soft colors). */
export function rollHeartVariant(rand: Rand): HeartVariant {
  const r = rand();
  if (r < HEART_ODDS.golden) return "golden";
  if (r < HEART_ODDS.golden + HEART_ODDS.rainbow) return "rainbow";
  const soft: HeartVariant[] = ["pink", "lavender", "blue"];
  return soft[Math.floor(rand() * soft.length) % soft.length];
}
