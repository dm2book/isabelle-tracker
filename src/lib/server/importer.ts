import "server-only";
import { z } from "zod";
import { serviceClient, type Session } from "./supabase";
import { HttpError } from "./http";
import { diarySchema, eventSchema, foodSchema, prefsSchema, profileSchema, roomSchema, scrapSchema, waterSchema } from "./schemas";
import { diaryToRow, eventToRow, foodToRow, roomToRow, scrapToRow, waterToRow } from "./mappers";
import { loadGame } from "./game";
import { mergePrefs } from "../defaults";
import { mergeGames, sanitizeDeviceGame, type CapReport } from "../game/importCaps";
import { dateKey } from "../time";
import type { Preferences, Room } from "../types";

/** Importing a device world into an account: validated, capped, idempotent, resumable. */
// Per-account limits for imported records (far above normal use, low enough to stop abuse).
const LIMITS = { rooms: 40, food: 6000, water: 12000, diary: 1500, events: 1500, scrapbook: 300 } as const;
const BATCH = { food: 500, water: 1000, diary: 300, events: 300, scrapbook: 4 } as const;
const MAX_IMPORTS = 10;
const MIN_DATE = "2020-01-01";

type BatchKind = keyof typeof BATCH;

/** Accept valid items, silently drop invalid ones and count them. */
function validList<T>(schema: z.ZodType<T>, items: unknown, max: number, report: { dropped: number }) {
  const list = Array.isArray(items) ? items.slice(0, max) : [];
  if (Array.isArray(items) && items.length > max) report.dropped += items.length - max;
  const out: T[] = [];
  for (const it of list) {
    const r = schema.safeParse(it);
    if (r.success) out.push(r.data);
    else report.dropped++;
  }
  return out;
}

async function currentImport(s: Pick<Session, "user" | "db">, id: string) {
  const { data } = await serviceClient().from("account_imports").select("id, status, summary, started_at").eq("id", id).eq("user_id", s.user.id).maybeSingle();
  if (!data || data.status !== "in_progress") throw new HttpError("import_not_found", 404);
  if (Date.now() - Date.parse(data.started_at) > 24 * 3600_000) throw new HttpError("import_expired", 410);
  return data as { id: string; status: string; summary: Record<string, number> };
}

export async function importBegin(s: Pick<Session, "user" | "db">, p: Record<string, unknown>) {
  const db = serviceClient();
  const { count } = await db.from("account_imports").select("id", { count: "exact", head: true }).eq("user_id", s.user.id);
  if ((count ?? 0) >= MAX_IMPORTS) throw new HttpError("import_limit", 429);
  const source = p.source === "file" ? "file" : "device";
  const report = { dropped: 0 };

  // Rooms: drop the untouched starter rooms created at first sign-in (they carry `starter: true`
  // until edited), then add hers. Upserts by id, so importing again never duplicates a room.
  const rooms = validList(roomSchema, p.rooms, LIMITS.rooms, report) as Room[];
  if (rooms.length) {
    const { data: existing } = await s.db.from("rooms").select("id, data");
    const starters = (existing ?? []).filter((r) => (r.data as { starter?: boolean })?.starter === true).map((r) => r.id);
    if (starters.length) await s.db.from("rooms").delete().in("id", starters);
    const { error } = await s.db.from("rooms").upsert(rooms.map((r) => roomToRow(r, s.user.id)));
    if (error) throw new HttpError("db_error", 500);
  }

  // Profile and personal settings (world name, themes, palettes, companion, reminders…)
  const prof = profileSchema.safeParse(p.profile);
  if (prof.success) {
    await s.db.from("profiles").upsert({ id: s.user.id, display_name: prof.data.displayName, world_name: prof.data.worldName, birthday: prof.data.birthday, onboarded: true, updated_at: new Date().toISOString() });
  } else report.dropped++;
  const prefsParsed = prefsSchema.safeParse(p.prefs);
  if (prefsParsed.success) {
    const pr = mergePrefs(prefsParsed.data as Partial<Preferences>);
    pr.customThemes = pr.customThemes.slice(0, 30);
    pr.palettes = pr.palettes.slice(0, 30);
    pr.roomPresets = pr.roomPresets.slice(0, 30);
    pr.tasks = pr.tasks.slice(0, 50);
    pr.favoriteItems = pr.favoriteItems.slice(0, 200);
    await s.db.from("preferences").upsert({ user_id: s.user.id, data: pr, updated_at: new Date().toISOString() });
  } else report.dropped++;

  const { data, error } = await db
    .from("account_imports")
    .insert({ user_id: s.user.id, source, summary: { rooms: rooms.length, dropped: report.dropped } })
    .select("id")
    .single();
  if (error) throw new HttpError("db_error", 500);
  return { importId: data.id, rooms: rooms.length };
}

export async function importBatch(s: Pick<Session, "user" | "db">, p: Record<string, unknown>) {
  const imp = await currentImport(s, String(p.importId ?? ""));
  const kind = String(p.kind) as BatchKind;
  if (!(kind in BATCH)) throw new HttpError("invalid", 400);
  const summary = { ...(imp.summary ?? {}) } as Record<string, number>;
  const done = summary[kind] ?? 0;
  const room = Math.max(0, Math.min(BATCH[kind], LIMITS[kind] - done));
  const report = { dropped: 0 };
  const today = dateKey(new Date());
  const inRange = (d: string) => d >= MIN_DATE && d <= today;
  let rows: Record<string, unknown>[] = [];
  let table = "";
  let onConflict = "id";
  if (kind === "food") {
    table = "food_entries";
    rows = validList(foodSchema, p.items, room, report).filter((e) => inRange(e.date)).map((e) => foodToRow(e, s.user.id));
  } else if (kind === "water") {
    table = "water_entries";
    rows = validList(waterSchema, p.items, room, report).filter((e) => inRange(e.date)).map((e) => waterToRow(e, s.user.id));
  } else if (kind === "diary") {
    table = "diary_entries";
    onConflict = "user_id,entry_date";
    rows = validList(diarySchema, p.items, room, report).filter((e) => inRange(e.date)).map((e) => diaryToRow(e, s.user.id));
  } else if (kind === "events") {
    table = "calendar_events";
    rows = validList(eventSchema, p.items, room, report).map((e) => eventToRow(e, s.user.id));
  } else {
    table = "scrapbook_entries";
    rows = validList(scrapSchema, p.items, room, report).map((e) => scrapToRow({ ...e, room: null } as never, s.user.id));
  }
  if (rows.length) {
    // RLS applies (user session): a row id that belongs to someone else is rejected, never overwritten.
    const { error } = await s.db.from(table).upsert(rows, { onConflict });
    if (error) throw new HttpError("db_error", 500);
  }
  summary[kind] = done + rows.length;
  summary.dropped = (summary.dropped ?? 0) + report.dropped;
  await serviceClient().from("account_imports").update({ summary }).eq("id", imp.id);
  return { accepted: rows.length, dropped: report.dropped };
}

export async function importFinish(s: Pick<Session, "user" | "db">, p: Record<string, unknown>) {
  const imp = await currentImport(s, String(p.importId ?? ""));
  const db = serviceClient();
  const { data: prefRow } = await s.db.from("preferences").select("data").eq("user_id", s.user.id).maybeSingle();
  const tz = mergePrefs(prefRow?.data as Partial<Preferences>).timezone;
  const today = dateKey(new Date(), tz);
  const report: CapReport = { capped: [] };
  const device = sanitizeDeviceGame(p.game, today, new Date().toISOString(), report);

  // Coins can be spent, so they are carried over only by the FIRST completed import. Otherwise
  // re-importing the same device data after spending would hand the coins back.
  const { count: previous } = await db.from("account_imports").select("id", { count: "exact", head: true }).eq("user_id", s.user.id).eq("status", "done");
  if ((previous ?? 0) > 0) {
    device.coins = 0;
    report.capped.push("coins_already_imported");
  }

  // Merge into her account's progress with optimistic concurrency (max/union: never additive).
  let merged = null;
  for (let attempt = 0; attempt < 5 && !merged; attempt++) {
    const { state, version } = await loadGame(s.user.id, tz);
    const next = mergeGames(state, device);
    const { data } = await db
      .from("game_states")
      .update({ state: next, version: version + 1, updated_at: new Date().toISOString() })
      .eq("user_id", s.user.id)
      .eq("version", version)
      .select("version");
    if (data?.length) merged = next;
  }
  if (!merged) throw new HttpError("conflict", 409);

  const summary = { ...(imp.summary ?? {}), capped: report.capped, coins: merged.coins, xp: merged.xp, items: merged.owned.length, collectibles: Object.keys(merged.collectibles).length, achievements: Object.keys(merged.achievements).length };
  await db.from("account_imports").update({ status: "done", finished_at: new Date().toISOString(), summary }).eq("id", imp.id);
  return { game: merged, summary };
}

