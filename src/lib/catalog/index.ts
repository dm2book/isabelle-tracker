import { ITEM_MAP, ITEMS } from "./furniture";
import { SURFACE_MAP, SURFACES } from "./surfaces";
import { WEARABLE_MAP, WEARABLES } from "./wardrobe";
import { BUILT_IN_THEMES } from "../theme/themes";
import type { Lang } from "../types";

export type UnlockKind = "item" | "surface" | "wear" | "theme";

export interface Unlockable {
  uid: string;
  kind: UnlockKind;
  id: string;
  price: number;
  name: (lang: Lang) => string;
}

export const uid = (kind: UnlockKind, id: string) => `${kind}:${id}`;

export function priceOf(unlockId: string): number | null {
  const [kind, id] = unlockId.split(":");
  switch (kind) {
    case "item":
      return ITEM_MAP[id]?.price ?? null;
    case "surface":
      return SURFACE_MAP[id]?.price ?? null;
    case "wear":
      return WEARABLE_MAP[id]?.price ?? null;
    case "theme": {
      const t = BUILT_IN_THEMES.find((x) => x.id === id);
      return t ? t.price ?? 0 : null;
    }
    default:
      return null;
  }
}

export function isUnlocked(unlockId: string, owned: string[]): boolean {
  const p = priceOf(unlockId);
  if (p === null) return false;
  return p === 0 || owned.includes(unlockId);
}

export const SHOP: Unlockable[] = [
  ...ITEMS.filter((i) => i.price > 0).map<Unlockable>((i) => ({
    uid: uid("item", i.id), kind: "item", id: i.id, price: i.price, name: (l) => i.name[l],
  })),
  ...SURFACES.filter((s) => s.price > 0).map<Unlockable>((s) => ({
    uid: uid("surface", s.id), kind: "surface", id: s.id, price: s.price, name: () => s.id,
  })),
  ...WEARABLES.filter((w) => w.price > 0).map<Unlockable>((w) => ({
    uid: uid("wear", w.id), kind: "wear", id: w.id, price: w.price, name: (l) => w.name[l],
  })),
  ...BUILT_IN_THEMES.filter((t) => (t.price ?? 0) > 0).map<Unlockable>((t) => ({
    uid: uid("theme", t.id), kind: "theme", id: t.id, price: t.price ?? 0, name: () => t.name,
  })),
].sort((a, b) => a.price - b.price);

export { ITEMS, ITEM_MAP, SURFACES, SURFACE_MAP, WEARABLES, WEARABLE_MAP };
