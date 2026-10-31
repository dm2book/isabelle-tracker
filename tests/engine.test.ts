import { describe, expect, it } from "vitest";
import { applyGameAction, GameError, initialGame, rollHeartVariant, type EngineCtx, type GameAction } from "@/lib/game/engine";
import { activeQuests, dailyQuests, levelFromXp, xpForLevel } from "@/lib/game/rules";
import { dateKey, seeded } from "@/lib/time";
import type { GameState } from "@/lib/types";

const NOW = new Date("2026-10-31T10:00:00Z");
const today = dateKey(NOW, "Europe/Paris");
const ctx = (over: Partial<EngineCtx> = {}): EngineCtx => ({ now: NOW, tz: "Europe/Paris", rand: seeded(42), robux: "disabled", heartCap: 20, ...over });
const run = (g: GameState, a: GameAction, c = ctx()) => applyGameAction(g, a, c);

describe("levels", () => {
  it("has a monotonic XP curve", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(xpForLevel(10))).toBe(10);
  });
});

describe("quests", () => {
  it("picks 4 deterministic daily quests", () => {
    expect(dailyQuests(today)).toHaveLength(4);
    expect(dailyQuests(today).map((q) => q.id)).toEqual(dailyQuests(today).map((q) => q.id));
  });

  it("cannot be claimed before completion, and only once", () => {
    let g = initialGame(today);
    const q = activeQuests(today).find((x) => x.def.period === "weekly" && x.def.event === "decorate")!;
    expect(() => run(g, { type: "claim", questKey: q.key })).toThrow(GameError);
    g = run(g, { type: "track", event: "decorate", amount: q.def.target }).game;
    const coins = g.coins;
    g = run(g, { type: "claim", questKey: q.key }).game;
    expect(g.coins).toBeGreaterThanOrEqual(coins + q.def.coins);
    expect(() => run(g, { type: "claim", questKey: q.key })).toThrow(/already_done/);
  });

  it("rejects forged quest keys", () => {
    const g = initialGame(today);
    expect(() => run(g, { type: "claim", questKey: "w_decorate@1999-W01" })).toThrow(/invalid/);
  });
});

describe("shop", () => {
  it("deducts coins and refuses free/unknown/double purchases", () => {
    let g = initialGame(today);
    g = { ...g, coins: 500 };
    g = run(g, { type: "buy", uid: "item:bed_cloud" }).game;
    expect(g.coins).toBe(420);
    expect(g.owned).toContain("item:bed_cloud");
    expect(() => run(g, { type: "buy", uid: "item:bed_cloud" })).toThrow(/already_owned/);
    expect(() => run(g, { type: "buy", uid: "item:bed_heart" })).toThrow(/invalid/);
    expect(() => run(g, { type: "buy", uid: "item:nope" })).toThrow(/invalid/);
    expect(() => run({ ...g, coins: 1 }, { type: "buy", uid: "theme:galaxy" })).toThrow(/not_enough_coins/);
  });
});

describe("daily chest & surprise", () => {
  it("opens once a day", () => {
    let g = initialGame(today);
    g = run(g, { type: "chest" }).game;
    expect(g.daily.chestOpened).toBe(true);
    expect(() => run(g, { type: "chest" })).toThrow(/already_done/);
    g = run(g, { type: "surprise" }).game;
    expect(() => run(g, { type: "surprise" })).toThrow(/already_done/);
  });

  it("resets the next day", () => {
    let g = run(initialGame(today), { type: "chest" }).game;
    g = run(g, { type: "chest" }, ctx({ now: new Date("2026-11-01T10:00:00Z") })).game;
    expect(g.daily.chestOpened).toBe(true);
  });
});

describe("hearts", () => {
  it("is single-use and capped per day", () => {
    let g = initialGame(today);
    g = run(g, { type: "heart_pop", heartId: "h1", variant: "pink" }).game;
    expect(() => run(g, { type: "heart_pop", heartId: "h1", variant: "pink" })).toThrow(/already_done/);
    for (let i = 2; i <= 3; i++) g = run(g, { type: "heart_pop", heartId: `h${i}`, variant: "blue" }, ctx({ heartCap: 3 })).game;
    expect(() => run(g, { type: "heart_pop", heartId: "h9", variant: "pink" }, ctx({ heartCap: 3 }))).toThrow(/limit/);
  });

  it("golden hearts report the Robux status decided by the server", () => {
    const g = initialGame(today);
    const eligible = run(g, { type: "heart_pop", heartId: "g1", variant: "golden" }, ctx({ robux: "eligible" }));
    expect(eligible.effects).toContainEqual({ type: "golden", robux: "pending" });
    const off = run(g, { type: "heart_pop", heartId: "g2", variant: "golden" }, ctx({ robux: "disabled" }));
    expect(off.effects).toContainEqual({ type: "golden", robux: "disabled" });
    expect(off.game.collectibles.golden_heart ?? off.game.collectibles.golden_crown).toBe(1);
  });

  it("rolls ~1% golden and ~6% rainbow", () => {
    const rand = seeded(7);
    const n = 200_000;
    const counts = { golden: 0, rainbow: 0 } as Record<string, number>;
    for (let i = 0; i < n; i++) {
      const v = rollHeartVariant(rand);
      counts[v] = (counts[v] ?? 0) + 1;
    }
    expect(counts.golden / n).toBeGreaterThan(0.008);
    expect(counts.golden / n).toBeLessThan(0.012);
    expect(counts.rainbow / n).toBeGreaterThan(0.055);
    expect(counts.rainbow / n).toBeLessThan(0.065);
  });
});

describe("activity XP", () => {
  it("caps XP from client-reported activities per day", () => {
    let g = initialGame(today);
    for (let i = 0; i < 200; i++) g = run(g, { type: "track", event: "hug" }).game;
    expect(g.daily.eventXp).toBeLessThanOrEqual(150);
  });

  it("counts each visited room once per day", () => {
    let g = initialGame(today);
    g = run(g, { type: "track", event: "visit_room", meta: "a" }).game;
    g = run(g, { type: "track", event: "visit_room", meta: "a" }).game;
    expect(g.stats.visit_room).toBe(1);
  });
});
