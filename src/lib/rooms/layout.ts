import type { Room, RoomKind, RoomObject, RoomSize, Surface } from "../types";
import { ITEM_MAP } from "../catalog/furniture";

export const ROOM_DIMS: Record<RoomSize, { w: number; h: number }> = {
  cozy: { w: 800, h: 560 },
  standard: { w: 1000, h: 620 },
  grand: { w: 1200, h: 680 },
};

export const WALL_RATIO = 0.56;

export function dims(room: Pick<Room, "size">) {
  const d = ROOM_DIMS[room.size] ?? ROOM_DIMS.standard;
  return { ...d, wallH: Math.round(d.h * WALL_RATIO) };
}

export const KIND_EMOJI: Record<RoomKind, string> = {
  bedroom: "🛏️", cafe: "☕", reading: "📚", gaming: "🎮", garden: "🌷", starry: "🌌", living: "🛋️", island: "🏝️", custom: "✨",
};

export const OUTDOOR_KINDS: RoomKind[] = ["garden", "island"];

export const DEFAULT_SURFACES: Record<RoomKind, { wall: Surface; floor: Surface }> = {
  bedroom: { wall: { pattern: "hearts", c1: "#FFE3EE", c2: "#FFFFFF" }, floor: { pattern: "wood", c1: "#F6DCC4", c2: "#EBC7A6" } },
  cafe: { wall: { pattern: "stripes", c1: "#FFE3EE", c2: "#FFFFFF" }, floor: { pattern: "checker", c1: "#FFFFFF", c2: "#FFC2D9" } },
  reading: { wall: { pattern: "dots", c1: "#EDE4FF", c2: "#FFFFFF" }, floor: { pattern: "carpet", c1: "#F3D2B3", c2: "#E6BC96" } },
  gaming: { wall: { pattern: "stars", c1: "#2C2257", c2: "#FF9FD8" }, floor: { pattern: "tiles", c1: "#FFE3EE", c2: "#FF9FD8" } },
  garden: { wall: { pattern: "sky", c1: "#BFE3FF", c2: "#FFFFFF" }, floor: { pattern: "grass", c1: "#B8EBC0", c2: "#9FDDAA" } },
  starry: { wall: { pattern: "night", c1: "#231B4D", c2: "#FFE08A" }, floor: { pattern: "carpet", c1: "#3D3270", c2: "#5A4D99" } },
  living: { wall: { pattern: "gingham", c1: "#FFD1E2", c2: "#FFFFFF" }, floor: { pattern: "wood", c1: "#F3D2B3", c2: "#E6BC96" } },
  island: { wall: { pattern: "sunset", c1: "#FFB3C7", c2: "#FFE0A3" }, floor: { pattern: "sand", c1: "#FFEBC2", c2: "#F7D9A0" } },
  custom: { wall: { pattern: "plain", c1: "#FFF0F6", c2: "#FFFFFF" }, floor: { pattern: "wood", c1: "#F6DCC4", c2: "#EBC7A6" } },
};

let counter = 0;
export function newId(prefix = "o"): string {
  counter = (counter + 1) % 100000;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Clamp an object so it stays inside the room bounds. */
export function clampObject(room: Room, o: RoomObject): RoomObject {
  const { w, h } = dims(room);
  const def = ITEM_MAP[o.item];
  const halfW = def ? (def.w * o.s) / 2 : 40;
  const itemH = def ? def.h * o.s : 80;
  return {
    ...o,
    x: Math.max(halfW * 0.4, Math.min(w - halfW * 0.4, o.x)),
    y: Math.max(itemH * 0.4, Math.min(h, o.y)),
    s: Math.max(0.3, Math.min(3, o.s)),
    r: ((o.r % 360) + 360) % 360,
  };
}

export function sortedObjects(objs: RoomObject[]) {
  return [...objs].sort((a, b) => a.z - b.z);
}

export function nextZ(objs: RoomObject[]) {
  return objs.reduce((m, o) => Math.max(m, o.z), 0) + 1;
}
