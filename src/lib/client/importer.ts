"use client";

import { apiPost } from "./api";
import type { WorldSnapshot } from "../types";

export const LOCAL_WORLD_KEY = "ihkw:world:v1";
const doneKey = (email: string) => `ihkw:imported:${email.toLowerCase()}`;

type Partial = Pick<WorldSnapshot, "profile" | "prefs" | "rooms" | "food" | "water" | "diary" | "events" | "scrapbook" | "game">;

/** The world saved on this device in device mode (never modified or deleted by the import). */
export function readDeviceWorld(): Partial | null {
  try {
    const raw = localStorage.getItem(LOCAL_WORLD_KEY);
    if (!raw) return null;
    const w = JSON.parse(raw) as Partial;
    return isWorld(w) ? w : null;
  } catch {
    return null;
  }
}

export function isWorld(w: unknown): w is Partial {
  const o = w as Partial | null;
  return !!o && typeof o === "object" && !!o.profile && !!o.prefs && Array.isArray(o.rooms) && !!o.game;
}

/** True when the device world holds something worth importing (she went through onboarding). */
export function hasMeaningfulWorld(w: Partial | null): boolean {
  return !!w && Boolean(w.profile?.onboarded || w.food?.length || w.scrapbook?.length || (w.game?.xp ?? 0) > 0);
}

export function importedAt(email: string | null): string | null {
  if (!email) return null;
  try {
    return localStorage.getItem(doneKey(email));
  } catch {
    return null;
  }
}

export function markImported(email: string | null) {
  if (!email) return;
  try {
    localStorage.setItem(doneKey(email), new Date().toISOString());
  } catch {
    /* ignore */
  }
}

export function downloadBackup(w: Partial) {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...w }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `monde-isabelle-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export interface ImportSummary {
  rooms?: number;
  food?: number;
  water?: number;
  diary?: number;
  events?: number;
  scrapbook?: number;
  dropped?: number;
  capped?: string[];
  coins?: number;
  xp?: number;
}

const chunks = <T,>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

/**
 * Send the world to the server in small validated steps. Every write is an upsert by id, so a retry
 * after a failure (or importing twice) never duplicates anything.
 */
export async function runImport(w: Partial, source: "device" | "file", onProgress: (n: number, total: number) => void): Promise<ImportSummary> {
  const groups: { kind: "food" | "water" | "diary" | "events" | "scrapbook"; size: number; items: unknown[] }[] = [
    { kind: "food", size: 500, items: w.food ?? [] },
    { kind: "water", size: 1000, items: w.water ?? [] },
    { kind: "diary", size: 300, items: w.diary ?? [] },
    { kind: "events", size: 300, items: w.events ?? [] },
    { kind: "scrapbook", size: 4, items: w.scrapbook ?? [] },
  ];
  const batches = groups.flatMap((g) => chunks(g.items, g.size).map((items) => ({ kind: g.kind, items })));
  const total = batches.length + 2;
  let n = 0;
  onProgress(n, total);
  const begin = await apiPost<{ importId: string }>("/api/account/import", { step: "begin", source, profile: w.profile, prefs: w.prefs, rooms: w.rooms });
  onProgress(++n, total);
  for (const b of batches) {
    let attempt = 0;
    for (;;) {
      try {
        await apiPost("/api/account/import", { step: "batch", importId: begin.importId, kind: b.kind, items: b.items });
        break;
      } catch (e) {
        if (++attempt >= 3) throw e;
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
    onProgress(++n, total);
  }
  const fin = await apiPost<{ summary: ImportSummary }>("/api/account/import", { step: "finish", importId: begin.importId, game: w.game });
  onProgress(++n, total);
  return fin.summary;
}
