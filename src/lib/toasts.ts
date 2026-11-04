/**
 * Toast list helpers (pure, so they are unit-tested).
 *
 * Rewards are merged: XP and coins earned close together are added into ONE toast whose total
 * updates while it is visible. This only changes what is shown: the game state (engine on the
 * device, or the server in cloud mode) is the single source of truth for XP and coins.
 */

export interface Toast {
  id: string;
  text: string;
  emoji?: string;
  tone?: "info" | "success" | "reward" | "error";
  /** Toasts with the same key are merged instead of stacked. */
  key?: string;
  xp?: number;
  coins?: number;
  /** Increases each time a merged toast is updated (drives the little "pop" animation). */
  bump?: number;
}

export const REWARD_KEY = "reward";
export const MAX_TOASTS = 4;
/** How long the reward toast stays after its LAST update. */
export const REWARD_VISIBLE_MS = 2800;
export const TOAST_VISIBLE_MS = 3600;
export const ERROR_VISIBLE_MS = 5000;

export function pushToast(list: Toast[], t: Toast): Toast[] {
  return [...list.slice(-(MAX_TOASTS - 1)), t];
}

/** Add XP/coins to the visible reward toast, or start a new one. Returns the toast id to (re)time. */
export function addReward(list: Toast[], add: { xp?: number; coins?: number }, newId: string): { toasts: Toast[]; id: string } {
  const xp = Math.max(0, Math.round(add.xp ?? 0));
  const coins = Math.max(0, Math.round(add.coins ?? 0));
  const existing = list.find((t) => t.key === REWARD_KEY);
  if (existing) {
    const next: Toast = { ...existing, xp: (existing.xp ?? 0) + xp, coins: (existing.coins ?? 0) + coins, bump: (existing.bump ?? 0) + 1 };
    return { toasts: list.map((t) => (t.id === existing.id ? next : t)), id: existing.id };
  }
  const t: Toast = { id: newId, key: REWARD_KEY, text: "", tone: "reward", xp, coins, bump: 0 };
  return { toasts: pushToast(list, t), id: newId };
}
