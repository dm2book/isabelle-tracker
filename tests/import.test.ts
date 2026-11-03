import { describe, expect, it } from "vitest";
import { mergeGames, sanitizeDeviceGame, daysSinceLaunch, COINS_PER_DAY, START_COINS, XP_PER_DAY } from "@/lib/game/importCaps";
import { initialGame } from "@/lib/game/engine";
import { activeQuests } from "@/lib/game/rules";

const TODAY = "2026-11-10"; // 8 days after launch
const NOW = "2026-11-10T12:00:00.000Z";
const days = daysSinceLaunch(TODAY);
const clean = (raw: unknown) => {
  const report = { capped: [] as string[] };
  return { g: sanitizeDeviceGame(raw, TODAY, NOW, report), capped: report.capped };
};

describe("import caps", () => {
  it("keeps realistic progress exactly", () => {
    const q = activeQuests(TODAY).find((x) => x.def.period === "weekly")!;
    const device = {
      ...initialGame(TODAY),
      coins: 640, xp: 900,
      owned: ["item:bed_cloud", "wear:tutu", "theme:rainbow"],
      collectibles: { macaron: 3, rose: 1, golden_heart: 1 },
      stats: { decorate: 40, pop_heart: 30, goldenHearts: 1 },
      achievements: { first_room: "2026-11-04T10:00:00.000Z", decorator: "2026-11-06T10:00:00.000Z", golden_heart: "2026-11-07T10:00:00.000Z" },
      quests: { [q.key]: { progress: 2, claimed: false } },
      streak: { last: "2026-11-10", count: 6 },
    };
    const { g, capped } = clean(device);
    expect(capped).toEqual([]);
    expect(g.coins).toBe(640);
    expect(g.xp).toBe(900);
    expect(g.owned.sort()).toEqual(["item:bed_cloud", "theme:rainbow", "wear:tutu"]);
    expect(g.collectibles).toEqual({ macaron: 3, rose: 1, golden_heart: 1 });
    expect(Object.keys(g.achievements).sort()).toEqual(["decorator", "first_room", "golden_heart"]);
    expect(g.quests[q.key]).toEqual({ progress: 2, claimed: false });
    expect(g.streak.count).toBe(6);
  });

  it("caps inflated coins, XP and unknown items", () => {
    const { g, capped } = clean({ coins: 9_999_999, xp: 9_999_999, owned: ["item:bed_cloud", "item:hacked", "item:bed_heart", 42] });
    expect(g.coins).toBeLessThanOrEqual(START_COINS + COINS_PER_DAY * days - 80);
    expect(g.xp).toBe(XP_PER_DAY * days);
    expect(g.owned).toEqual(["item:bed_cloud"]);
    expect(capped).toEqual(expect.arrayContaining(["coins", "xp", "owned"]));
  });

  it("counts coins already spent on items against the limit", () => {
    const every = ["item:bed_cloud", "item:castle_mini", "item:moon_swing", "item:wishing_well", "theme:galaxy", "theme:rainbow", "wear:princess", "item:desk_gaming"];
    const { g } = clean({ coins: 50_000, owned: every });
    const spent = g.owned.length; // sanity: items kept
    expect(spent).toBeGreaterThan(0);
    const total = g.coins + g.owned.reduce((s, u) => s + ({ "item:bed_cloud": 80, "item:castle_mini": 150, "item:moon_swing": 120, "item:wishing_well": 100, "theme:galaxy": 200, "theme:rainbow": 150, "wear:princess": 120, "item:desk_gaming": 120 } as Record<string, number>)[u], 0);
    expect(total).toBeLessThanOrEqual(START_COINS + COINS_PER_DAY * days);
  });

  it("limits ultra-rare collectibles and drops unknown ones", () => {
    const { g, capped } = clean({ collectibles: { golden_heart: 50, golden_crown: 50, fake_item: 3, rose: 500 } });
    expect((g.collectibles.golden_heart ?? 0) + (g.collectibles.golden_crown ?? 0)).toBeLessThanOrEqual(2 + Math.floor(days / 10));
    expect(g.collectibles.rose).toBe(99);
    expect(g.collectibles.fake_item).toBeUndefined();
    expect(capped).toContain("collectibles");
  });

  it("drops achievements whose condition isn't met", () => {
    const { g, capped } = clean({ xp: 100, achievements: { level_10: NOW, master_decorator: NOW, not_real: NOW } });
    expect(g.achievements).toEqual({});
    expect(capped).toContain("achievements");
  });

  it("only imports quests active right now, within their target", () => {
    const active = activeQuests(TODAY)[0];
    const { g } = clean({ quests: { [active.key]: { progress: 999, claimed: false }, "d_heart@2020-01-01": { progress: 3, claimed: false } } });
    expect(g.quests[active.key].progress).toBe(active.def.target);
    expect(g.quests["d_heart@2020-01-01"]).toBeUndefined();
  });
});

describe("merging into the account", () => {
  it("never lowers what the account already has", () => {
    const cloud = { ...initialGame(TODAY), coins: 800, xp: 2000, owned: ["item:tea_set"], collectibles: { rose: 5 } };
    const { g } = clean({ coins: 300, xp: 500, owned: ["item:bed_cloud"], collectibles: { rose: 2, tulip: 1 } });
    const m = mergeGames(cloud, g);
    expect(m.coins).toBe(800);
    expect(m.xp).toBe(2000);
    expect(m.owned.sort()).toEqual(["item:bed_cloud", "item:tea_set"]);
    expect(m.collectibles).toEqual({ rose: 5, tulip: 1 });
  });

  it("is idempotent: importing the same data twice adds nothing", () => {
    const cloud = initialGame(TODAY);
    const { g } = clean({ coins: 500, xp: 700, owned: ["wear:tutu"], collectibles: { macaron: 2 }, stats: { decorate: 10 } });
    const once = mergeGames(cloud, g);
    const twice = mergeGames(once, g);
    expect(twice).toEqual(once);
  });

  it("keeps today's chest and surprise as already opened", () => {
    const cloud = initialGame(TODAY);
    const dev = initialGame(TODAY);
    dev.daily.chestOpened = true;
    dev.daily.heartsPopped = 7;
    const { g } = clean(dev);
    const m = mergeGames(cloud, g);
    expect(m.daily.chestOpened).toBe(true);
    expect(m.daily.heartsPopped).toBe(7);
  });
});
