import { describe, expect, it } from "vitest";
import { fr } from "@/lib/i18n/fr";
import { en } from "@/lib/i18n/en";
import { BUILT_IN_THEMES, themeFromColors } from "@/lib/theme/themes";
import { contrast } from "@/lib/theme/color";
import { zonedToUtc, dateKey, weekKey, inQuietHours } from "@/lib/time";

function shape(o: unknown, p = ""): string[] {
  if (Array.isArray(o)) return [`${p}[]`];
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => shape(v, p ? `${p}.${k}` : k));
  return [p];
}

describe("translations", () => {
  it("French and English have exactly the same keys", () => {
    expect(shape(en).sort()).toEqual(shape(fr).sort());
  });
  it("placeholders match between languages", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    const walk = (a: unknown, b: unknown, path: string) => {
      if (typeof a === "string") return expect(ph(b as string), path).toBe(ph(a));
      if (Array.isArray(a)) return;
      for (const k of Object.keys(a as object)) walk((a as never)[k], (b as never)[k], `${path}.${k}`);
    };
    walk(fr, en, "");
  });
});

describe("themes are readable", () => {
  for (const th of BUILT_IN_THEMES) {
    for (const mode of ["light", "dark"] as const) {
      it(`${th.name} (${mode})`, () => {
        const t = th[mode];
        expect(contrast(t.text, t.surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.text, t.bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.onPrimary, t.primary)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.muted, t.surface)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
  it("custom themes are auto-adjusted to stay readable", () => {
    const th = themeFromColors("x", "x", "💖", { bg: "#FFFF00", primary: "#FFEE00", accent: "#00FF00", accent2: "#00FFFF", text: "#FFFF88" });
    expect(contrast(th.light.text, th.light.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(th.light.onPrimary, th.light.primary)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("time", () => {
  it("uses Paris local time", () => {
    expect(dateKey(new Date("2026-10-31T23:30:00Z"), "Europe/Paris")).toBe("2026-11-01");
    expect(zonedToUtc("2026-12-24T20:00", "Europe/Paris")).toBe("2026-12-24T19:00:00.000Z");
    expect(zonedToUtc("2026-07-14T09:00", "Europe/Paris")).toBe("2026-07-14T07:00:00.000Z");
    expect(weekKey("2026-10-31")).toBe("2026-W44");
  });
  it("handles quiet hours across midnight", () => {
    expect(inQuietHours(new Date("2026-10-31T22:00:00Z"), "Europe/Paris", "22:30", "08:00")).toBe(true);
    expect(inQuietHours(new Date("2026-10-31T12:00:00Z"), "Europe/Paris", "22:30", "08:00")).toBe(false);
  });
});
