// Which game events a data change produces. Shared by the server and the device so both
// count decorating, memories and styling the same way.
import type { DiaryEntry, GameEventType, Preferences, Room } from "../types";

export interface DerivedEvent {
  event: GameEventType;
  amount: number;
  meta?: string;
}

export function roomEvents(prev: Room | undefined, next: Room): DerivedEvent[] {
  const before = new Set((prev?.objects ?? []).map((o) => o.id));
  const added = next.objects.filter((o) => !before.has(o.id)).length;
  return added > 0 ? [{ event: "decorate", amount: Math.min(added, 20) }] : [];
}

export function prefsEvents(prev: Preferences | undefined, next: Preferences): DerivedEvent[] {
  if (!prev) return [];
  const out: DerivedEvent[] = [];
  if (JSON.stringify(prev.companion) !== JSON.stringify(next.companion)) out.push({ event: "customize_companion", amount: 1 });
  const look = (p: Preferences) => JSON.stringify([p.themeId, p.mode, p.customThemes, p.palettes, p.ui.font, p.ui.buttonStyle, p.ui.cardStyle, p.ui.pattern, p.ui.radius]);
  if (look(prev) !== look(next)) out.push({ event: "change_theme", amount: 1 });
  return out;
}

export function diaryEvents(prev: DiaryEntry | undefined, next: DiaryEntry): DerivedEvent[] {
  const had = (prev?.text ?? "").trim().length >= 3;
  const has = next.text.trim().length >= 3;
  return !had && has ? [{ event: "write_memory", amount: 1 }] : [];
}

export function scrapEvents(isNew: boolean, kind: string): DerivedEvent[] {
  if (!isNew) return [];
  if (kind === "photo" || kind === "room") return [{ event: "photo_room", amount: 1 }];
  return [{ event: "write_memory", amount: 1 }];
}
