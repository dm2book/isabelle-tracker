import "server-only";
import { serviceClient } from "./supabase";
import { secureRand } from "./crypto";
import { applyGameAction, initialGame, normalizeGame, type GameAction, type RobuxStatus } from "../game/engine";
import { notificationsFromEffects } from "../game/notify";
import { dateKey, DEFAULT_TZ } from "../time";
import { notifFromRow } from "./mappers";
import { HttpError } from "./http";
import type { AppNotification, Effect, GameState, Lang } from "../types";
import type { DerivedEvent } from "../game/derive";

export interface RunCtx {
  tz?: string;
  lang?: Lang;
  robux?: RobuxStatus;
  heartCap?: number;
}

export interface RunResult {
  game: GameState;
  effects: Effect[];
  notifications: AppNotification[];
}

export async function loadGame(userId: string, tz = DEFAULT_TZ): Promise<{ state: GameState; version: number }> {
  const db = serviceClient();
  const { data } = await db.from("game_states").select("state, version").eq("user_id", userId).maybeSingle();
  if (data) return { state: normalizeGame(data.state as GameState, dateKey(new Date(), tz)), version: data.version };
  const state = initialGame(dateKey(new Date(), tz));
  await db.from("game_states").upsert({ user_id: userId, state, version: 0 }, { onConflict: "user_id", ignoreDuplicates: true });
  const again = await db.from("game_states").select("state, version").eq("user_id", userId).single();
  return { state: again.data!.state as GameState, version: again.data!.version };
}

/** Apply actions atomically with optimistic concurrency. The browser never decides coins, XP or items. */
export async function runGame(userId: string, actions: GameAction[], ctx: RunCtx = {}): Promise<RunResult> {
  const db = serviceClient();
  const tz = ctx.tz ?? DEFAULT_TZ;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { state, version } = await loadGame(userId, tz);
    let game = state;
    const effects: Effect[] = [];
    for (const action of actions) {
      const r = applyGameAction(game, action, { now: new Date(), tz, rand: secureRand, robux: ctx.robux ?? "disabled", heartCap: ctx.heartCap ?? 20 });
      game = r.game;
      effects.push(...r.effects);
    }
    const { data: updated, error } = await db
      .from("game_states")
      .update({ state: game, version: version + 1, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("version", version)
      .select("version");
    if (error) throw error;
    if (updated && updated.length) {
      const notes = notificationsFromEffects(effects, ctx.lang ?? "fr");
      let notifications: AppNotification[] = [];
      if (notes.length) {
        const { data: rows } = await db.from("notifications").insert(notes.map((n) => ({ ...n, user_id: userId }))).select("*");
        notifications = (rows ?? []).map(notifFromRow);
      }
      return { game, effects, notifications };
    }
  }
  throw new HttpError("conflict", 409);
}

export async function runEvents(userId: string, events: DerivedEvent[], ctx: RunCtx = {}): Promise<RunResult | null> {
  if (!events.length) return null;
  return runGame(userId, events.map((e) => ({ type: "track", event: e.event, amount: e.amount, meta: e.meta })), ctx);
}
