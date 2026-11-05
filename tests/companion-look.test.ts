import { describe, expect, it } from "vitest";
import { defaultPrefs, emptySnapshot, LEGACY_COMPANION, mergePrefs } from "@/lib/defaults";

describe("Mimi 2.0 keeps every existing look", () => {
  it("new worlds start with vanilla fur and the star clip", () => {
    const c = emptySnapshot("fr").prefs.companion;
    expect(c).toMatchObject({ name: "Mimi", fur: "#FFF4E6", bow: "star", bowColor: "#FF8DC0", outfit: null, accessory: null });
  });

  it("an existing world keeps its fur, bow, colors, outfit and accessory exactly", () => {
    const saved = { ...defaultPrefs("fr"), companion: { name: "Mimi", fur: "#FFFFFF", bowColor: "#FF5C8A", bow: "classic", outfit: "tutu", outfitColor: "#C9B6FF", accessory: "beret" } };
    const merged = mergePrefs(JSON.parse(JSON.stringify(saved)));
    expect(merged.companion).toEqual(saved.companion);
  });

  it("an older save missing a field gets the original look, not the new defaults", () => {
    const old = { companion: { name: "Choupette", outfit: null, outfitColor: null, accessory: null } } as never;
    const merged = mergePrefs(old);
    expect(merged.companion).toMatchObject({ name: "Choupette", ...LEGACY_COMPANION });
  });

  it("no saved companion at all means a new world: new defaults", () => {
    expect(mergePrefs({}).companion.fur).toBe("#FFF4E6");
  });
});
