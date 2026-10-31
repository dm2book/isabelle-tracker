import "server-only";
import { z } from "zod";
import { CLIENT_EVENTS } from "../game/rules";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeStr = z.string().regex(/^[0-2]\d:[0-5]\d$/);
const fin = (min: number, max: number) => z.number().finite().min(min).max(max);

export const surfaceSchema = z.object({ pattern: z.string().max(30), c1: hex, c2: hex });

export const roomSchema = z.object({
  id: z.uuid(),
  name: z.string().max(60),
  kind: z.enum(["bedroom", "cafe", "reading", "gaming", "garden", "starry", "living", "island", "custom"]),
  emoji: z.string().max(8),
  size: z.enum(["cozy", "standard", "grand"]),
  outdoor: z.boolean(),
  wall: surfaceSchema,
  floor: surfaceSchema,
  secret: z.boolean().optional(),
  objects: z
    .array(
      z.object({
        id: z.string().max(40),
        item: z.string().max(40),
        x: fin(-500, 3000),
        y: fin(-500, 3000),
        s: fin(0.1, 4),
        r: fin(-720, 720),
        flip: z.boolean(),
        z: fin(-10000, 10000),
        c1: hex.optional(),
        c2: hex.optional(),
      }),
    )
    .max(300),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
});

export const foodSchema = z.object({
  id: z.uuid(),
  date: dateStr,
  time: timeStr,
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  name: z.string().min(1).max(120),
  portion: z.string().max(60),
  calories: z.number().int().min(0).max(10000).nullable(),
  notes: z.string().max(500),
  source: z.enum(["manual", "openfoodfacts"]),
  createdAt: z.string().max(40),
});

export const waterSchema = z.object({ id: z.uuid(), date: dateStr, time: timeStr, amountMl: z.number().int().min(1).max(3000), createdAt: z.string().max(40) });

export const diarySchema = z.object({
  date: dateStr,
  text: z.string().max(4000),
  mood: z.enum(["happy", "calm", "tired", "sad", "excited", "loved"]).nullable(),
  updatedAt: z.string().max(40),
});

export const eventSchema = z.object({
  id: z.uuid(),
  date: dateStr,
  title: z.string().min(1).max(80),
  kind: z.enum(["special", "birthday", "milestone", "appointment", "note"]),
  emoji: z.string().max(8),
  notes: z.string().max(500),
});

export const scrapSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["moment", "room", "achievement", "message", "photo", "memory"]),
  title: z.string().max(80),
  body: z.string().max(2000),
  emoji: z.string().max(8),
  color: hex,
  image: z.string().startsWith("data:image/").max(600000).nullable(),
  room: z.unknown().nullable(),
  date: dateStr,
  createdAt: z.string().max(40),
});

export const profileSchema = z.object({
  displayName: z.string().max(60),
  worldName: z.string().max(80),
  birthday: z.string().regex(/^[0-1]\d-[0-3]\d$/).nullable(),
  onboarded: z.boolean(),
});

/** Preferences are a free-form JSON document owned by the user; bound its size and shape loosely. */
export const prefsSchema = z.record(z.string(), z.unknown()).refine((v) => JSON.stringify(v).length < 300_000, "too_large");

export const gameActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("visit") }),
  z.object({ type: z.literal("track"), event: z.enum(CLIENT_EVENTS as [string, ...string[]]), meta: z.string().max(60).optional() }),
  z.object({ type: z.literal("claim"), questKey: z.string().max(40) }),
  z.object({ type: z.literal("buy"), uid: z.string().max(60) }),
  z.object({ type: z.literal("chest") }),
  z.object({ type: z.literal("surprise") }),
  z.object({ type: z.literal("task"), taskId: z.string().max(60), done: z.boolean() }),
  z.object({ type: z.literal("bottle_check") }),
  z.object({ type: z.literal("bottle_open") }),
]);

export const heartTicketSchema = z.object({
  id: z.uuid(),
  variant: z.enum(["pink", "lavender", "blue", "rainbow", "golden"]),
  exp: z.number().int(),
  sig: z.string().max(100),
});

export const pushSubSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});
