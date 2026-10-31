import type { Lang, Room, RoomKind, RoomObject, RoomSize } from "../types";
import { DEFAULT_SURFACES, KIND_EMOJI, OUTDOOR_KINDS, ROOM_DIMS, WALL_RATIO, uuid, newId } from "./layout";
import { translate } from "../i18n";

// Template objects use relative coordinates: fx = fraction of width, fy = fraction of height.
type T = [item: string, fx: number, fy: number, s?: number, c1?: string, c2?: string, flip?: boolean];

const TEMPLATES: Record<RoomKind, T[]> = {
  bedroom: [
    ["window_round", 0.2, 0.36], ["fairy_lights", 0.5, 0.12], ["poster_heart", 0.78, 0.38],
    ["bed_heart", 0.48, 0.8], ["dresser", 0.82, 0.74], ["lamp_table", 0.82, 0.55, 0.8],
    ["rug_round", 0.5, 0.95], ["plush_bear", 0.3, 0.92, 0.8], ["plant_monstera", 0.1, 0.84, 0.9],
  ],
  cafe: [
    ["bunting", 0.5, 0.1], ["clock_cloud", 0.82, 0.3], ["shelf_wall", 0.22, 0.34],
    ["table_round", 0.3, 0.86], ["chair_bow", 0.18, 0.88, 0.9], ["chair_bow", 0.42, 0.88, 0.9, undefined, undefined, true],
    ["table_round", 0.72, 0.9], ["cake_stand", 0.72, 0.62, 0.8], ["tea_set", 0.3, 0.62, 0.8], ["macaron_tower", 0.9, 0.86, 0.9],
  ],
  reading: [
    ["window_round", 0.5, 0.34], ["lamp_moon", 0.82, 0.24, 0.8], ["bookshelf", 0.14, 0.82],
    ["armchair", 0.52, 0.86], ["lamp_floor", 0.74, 0.86, 0.9], ["books_stack", 0.86, 0.92, 0.9],
    ["rug_cloud", 0.52, 0.97], ["plush_bunny", 0.36, 0.95, 0.7], ["teacup_big", 0.64, 0.97, 0.6],
  ],
  gaming: [
    ["star_lights", 0.2, 0.06], ["poster_rainbow", 0.8, 0.32], ["desk_gaming", 0.5, 0.8],
    ["gaming_chair", 0.5, 0.95, 0.85], ["beanbag", 0.15, 0.92], ["plush_star", 0.85, 0.92, 0.9], ["rug_stripes", 0.5, 0.99],
  ],
  garden: [
    ["cloud_float", 0.2, 0.2], ["cloud_float", 0.78, 0.14, 0.7], ["tree_cherry", 0.15, 0.82], ["fence", 0.62, 0.7],
    ["bench", 0.5, 0.86], ["rose_bush", 0.86, 0.84], ["stool_mushroom", 0.3, 0.92, 0.8], ["sunflower", 0.72, 0.9, 0.8],
    ["pond", 0.6, 0.98, 0.9], ["mailbox_post", 0.92, 0.95, 0.8],
  ],
  starry: [
    ["star_lights", 0.5, 0.06], ["lamp_moon", 0.18, 0.3], ["bed_cloud", 0.5, 0.82], ["crystal_ball", 0.82, 0.86],
    ["plush_star", 0.24, 0.92], ["lantern", 0.9, 0.7, 0.9], ["rug_round", 0.5, 0.97, 1, "#5A4D99", "#C9B6FF"],
  ],
  living: [
    ["window_round", 0.2, 0.34], ["frame_photo", 0.62, 0.3], ["bow_wall", 0.86, 0.3, 0.8],
    ["sofa_round", 0.5, 0.82], ["table_coffee", 0.5, 0.95], ["lamp_floor", 0.12, 0.84], ["plant_monstera", 0.88, 0.85, 0.9], ["pouf", 0.78, 0.96, 0.8],
  ],
  island: [
    ["rainbow_arch", 0.5, 0.52, 1.2], ["tree_cherry", 0.12, 0.86, 0.9], ["picnic", 0.45, 0.95], ["beach_ball", 0.72, 0.94],
    ["fountain", 0.82, 0.86, 0.8], ["plush_strawberry", 0.32, 0.92, 0.7],
  ],
  custom: [],
};

export function buildRoom(kind: RoomKind, size: RoomSize, lang: Lang, blank = false, name?: string): Room {
  const { w, h } = ROOM_DIMS[size];
  const surfaces = DEFAULT_SURFACES[kind];
  const now = new Date().toISOString();
  const objects: RoomObject[] = blank
    ? []
    : TEMPLATES[kind].map(([item, fx, fy, s = 1, c1, c2, flip = false], i) => ({
        id: newId(), item, x: Math.round(fx * w), y: Math.round(fy * h), s, r: 0, flip, z: i + 1,
        ...(c1 ? { c1 } : {}), ...(c2 ? { c2 } : {}),
      }));
  return {
    id: uuid(),
    name: name ?? translate(lang, `rooms.kinds.${kind}`),
    kind,
    emoji: KIND_EMOJI[kind],
    size,
    outdoor: OUTDOOR_KINDS.includes(kind),
    wall: { ...surfaces.wall },
    floor: { ...surfaces.floor },
    objects,
    secret: kind === "starry" ? true : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function starterRooms(lang: Lang): Room[] {
  return [buildRoom("bedroom", "standard", lang), buildRoom("garden", "standard", lang), buildRoom("cafe", "cozy", lang)];
}

export function secretRoom(lang: Lang): Room {
  return { ...buildRoom("starry", "cozy", lang), secret: true };
}

export const wallHeight = (size: RoomSize) => Math.round(ROOM_DIMS[size].h * WALL_RATIO);
