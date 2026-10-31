// "Generate my dream room": builds a fresh layout from Isabelle's favorite colors and unlocked items.
import type { Room, RoomObject } from "../types";
import { ITEMS, type Category, type ItemDef } from "../catalog/furniture";
import { SURFACES } from "../catalog/surfaces";
import { isUnlocked, uid } from "../catalog";
import { dims, newId } from "./layout";
import { lighten, mix } from "../theme/color";

type Rand = () => number;

const pick = <T,>(arr: T[], r: Rand): T => arr[Math.floor(r() * arr.length) % arr.length];

function pool(cats: Category[], owned: string[], place: ItemDef["place"][], outdoor: boolean) {
  return ITEMS.filter(
    (i) => cats.includes(i.cat) && place.includes(i.place) && isUnlocked(uid("item", i.id), owned) && (outdoor || i.cat !== "outdoor"),
  );
}

export function colorPair(colors: string[], r: Rand): [string, string] {
  const a = pick(colors, r);
  const rest = colors.filter((c) => c !== a);
  const b = rest.length ? pick(rest, r) : lighten(a, 0.6);
  return [a, b];
}

export function generateDreamRoom(base: Room, colors: string[], owned: string[], r: Rand = Math.random): Room {
  const palette = colors.length ? colors : ["#FF8DC0", "#C9B6FF", "#A8DAFF", "#FFFFFF"];
  const { w, h, wallH } = dims(base);
  const objs: RoomObject[] = [];
  const add = (item: ItemDef | undefined, fx: number, y: number, s = 1, flip = false) => {
    if (!item) return;
    const [c1, c2] = colorPair(palette, r);
    objs.push({ id: newId(), item: item.id, x: Math.round(fx * w), y: Math.round(y), s, r: 0, flip, z: objs.length + 1, c1, c2 });
  };
  const floorBack = wallH + (h - wallH) * 0.45;
  const floorMid = wallH + (h - wallH) * 0.72;
  const floorFront = h - 6;

  if (base.outdoor) {
    add(pick(pool(["magic"], owned, ["any"], true).filter((i) => i.id === "cloud_float" || i.id === "rainbow_arch"), r), 0.25, wallH * 0.45, 0.8);
    add(pick(pool(["outdoor"], owned, ["floor"], true).filter((i) => i.h > 180), r), 0.14, floorBack + 20);
    add(pick(pool(["outdoor"], owned, ["floor"], true).filter((i) => i.h <= 180), r), 0.55, floorBack);
    add(pick(pool(["flowers"], owned, ["floor", "any"], true), r), 0.82, floorMid, 0.9);
    add(pick(pool(["outdoor", "magic"], owned, ["floor"], true), r), 0.38, floorMid, 0.85);
    add(pick(pool(["plushies", "seasonal"], owned, ["any", "floor"], true), r), 0.68, floorFront, 0.8);
  } else {
    // Wall decorations
    add(pick(pool(["wall", "mirrors"], owned, ["wall"], false), r), 0.2, wallH * 0.62);
    add(pick(pool(["lights"], owned, ["wall"], false), r), 0.5, wallH * 0.24);
    add(pick(pool(["wall", "lamps", "plants"], owned, ["wall"], false), r), 0.8, wallH * 0.6, 0.9);
    // Big furniture at the back
    const hero = pick(pool(["beds", "sofas", "desks"], owned, ["floor"], false), r);
    add(hero, 0.5, floorBack + 30);
    add(pick(pool(["storage", "mirrors"], owned, ["floor"], false), r), 0.86, floorBack + 10, 0.9);
    add(pick(pool(["lamps", "plants"], owned, ["floor"], false), r), 0.12, floorBack + 20, 0.9);
    // Rug and cosy front items
    add(pick(pool(["rugs"], owned, ["floor"], false), r), 0.5, floorFront);
    add(pick(pool(["chairs", "sofas"], owned, ["floor"], false).filter((i) => i.w < 150), r), 0.24, floorMid + 20, 0.85, true);
    add(pick(pool(["plushies"], owned, ["any"], false), r), 0.36, floorFront - 4, 0.8);
    add(pick(pool(["flowers", "decor", "party"], owned, ["any"], false), r), 0.72, floorFront - 4, 0.8);
  }

  const wallPool = SURFACES.filter((s) => s.use.includes(base.outdoor ? "sky" : "wall") && isUnlocked(uid("surface", s.id), owned));
  const floorPool = SURFACES.filter((s) => s.use.includes(base.outdoor ? "ground" : "floor") && isUnlocked(uid("surface", s.id), owned));
  const wallPat = pick(wallPool, r);
  const floorPat = pick(floorPool, r);
  const [wc] = colorPair(palette, r);
  const [fc] = colorPair(palette, r);

  return {
    ...base,
    wall: base.outdoor
      ? { pattern: wallPat.id, c1: wallPat.c1, c2: wallPat.c2 }
      : { pattern: wallPat.id, c1: lighten(wc, 0.72), c2: "#FFFFFF" },
    floor: base.outdoor
      ? { pattern: floorPat.id, c1: floorPat.c1, c2: floorPat.c2 }
      : { pattern: floorPat.id, c1: lighten(mix(fc, "#F3D2B3", 0.6), 0.3), c2: mix(fc, "#E6BC96", 0.6) },
    objects: objs,
    updatedAt: new Date().toISOString(),
  };
}

/** Swap one object for another item from the same category (keeps position). */
export function swapObject(o: RoomObject, owned: string[], r: Rand = Math.random): RoomObject {
  const cur = ITEMS.find((i) => i.id === o.item);
  if (!cur) return o;
  const options = ITEMS.filter((i) => i.cat === cur.cat && i.id !== cur.id && i.place === cur.place && isUnlocked(uid("item", i.id), owned));
  if (!options.length) return o;
  const next = pick(options, r);
  return { ...o, item: next.id, c1: undefined, c2: undefined };
}
