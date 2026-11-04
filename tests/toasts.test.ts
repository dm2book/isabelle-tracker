import { describe, expect, it } from "vitest";
import { addReward, MAX_TOASTS, pushToast, REWARD_KEY, type Toast } from "@/lib/toasts";
import { applyGameAction, initialGame, type EngineCtx, type GameAction } from "@/lib/game/engine";
import { activeQuests } from "@/lib/game/rules";
import { dateKey, seeded } from "@/lib/time";

describe("merged XP toasts", () => {
  it("adds rewards that arrive close together into one toast", () => {
    let list: Toast[] = [];
    let id = "";
    for (const [i, xp] of [5, 10, 10, 15, 5].entries()) {
      const r = addReward(list, { xp }, `id-${i}`);
      list = r.toasts;
      id = r.id;
    }
    const rewards = list.filter((t) => t.key === REWARD_KEY);
    expect(rewards).toHaveLength(1);
    expect(rewards[0]).toMatchObject({ id: "id-0", xp: 45, coins: 0, bump: 4 });
    expect(id).toBe("id-0");
  });

  it("keeps coins and XP totals separately and ignores negative amounts", () => {
    let list = addReward([], { xp: 10, coins: 5 }, "a").toasts;
    list = addReward(list, { xp: 20, coins: -3 }, "b").toasts;
    expect(list[0]).toMatchObject({ xp: 30, coins: 5 });
  });

  it("starts a fresh toast once the previous one has gone", () => {
    const first = addReward([], { xp: 10 }, "a").toasts;
    const afterDismiss = first.filter((t) => t.id !== "a");
    const second = addReward(afterDismiss, { xp: 7 }, "b");
    expect(second.id).toBe("b");
    expect(second.toasts[0]).toMatchObject({ xp: 7, bump: 0 });
  });

  it("leaves other toasts alone and caps the stack", () => {
    let list: Toast[] = [];
    for (let i = 0; i < 6; i++) list = pushToast(list, { id: `t${i}`, text: "x" });
    expect(list).toHaveLength(MAX_TOASTS);
    list = addReward(list, { xp: 3 }, "r").toasts;
    expect(list).toHaveLength(MAX_TOASTS);
    expect(list.filter((t) => t.key === REWARD_KEY)).toHaveLength(1);
  });

  it("shows exactly the XP the game stored (no XP lost by merging)", () => {
    const now = new Date("2026-11-04T10:00:00Z");
    const today = dateKey(now, "Europe/Paris");
    const ctx: EngineCtx = { now, tz: "Europe/Paris", rand: seeded(7), robux: "disabled", heartCap: 20 };
    let g = initialGame(today);
    const startXp = g.xp;
    let list: Toast[] = [];
    const quests = activeQuests(today);
    const actions: GameAction[] = [];
    for (const q of quests) actions.push({ type: "track", event: q.def.event, amount: q.def.target });
    for (const q of quests) actions.push({ type: "claim", questKey: q.key });
    actions.push({ type: "visit" });
    for (const a of actions) {
      try {
        const r = applyGameAction(g, a, ctx);
        g = r.game;
        const xp = r.effects.filter((e) => e.type === "xp").reduce((s, e) => s + (e.type === "xp" ? e.amount : 0), 0);
        list = addReward(list, { xp }, `id-${list.length}`).toasts;
      } catch {
        /* some quests may not be claimable for this event mix: that is fine */
      }
    }
    const shown = list.find((t) => t.key === REWARD_KEY)?.xp ?? 0;
    expect(g.xp - startXp).toBeGreaterThan(0);
    expect(shown).toBe(g.xp - startXp);
  });
});
