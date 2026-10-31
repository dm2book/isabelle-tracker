// Turn game effects into gentle notification entries (same wording on server and device).
import type { AppNotification, Effect, Lang } from "../types";
import { translate } from "../i18n";
import { QUEST_MAP } from "./rules";

export type NewNotification = Omit<AppNotification, "id" | "readAt" | "createdAt">;

export function questName(lang: Lang, questId: string): string {
  const def = QUEST_MAP[questId];
  if (!def) return questId;
  return translate(lang, `quests.names.${def.nameKey}`, { n: def.target });
}

export function notificationsFromEffects(effects: Effect[], lang: Lang): NewNotification[] {
  const out: NewNotification[] = [];
  for (const e of effects) {
    if (e.type === "quest_done") {
      out.push({ kind: "quest", title: translate(lang, "notifications.questDone", { name: questName(lang, e.questId) }), body: translate(lang, "notifications.questDoneBody"), link: "/quests" });
    } else if (e.type === "achievement") {
      out.push({ kind: "quest", title: translate(lang, "notifications.achievement", { name: translate(lang, `quests.ach.${e.id}`) }), body: translate(lang, `quests.achDesc.${e.id}`), link: "/quests" });
    } else if (e.type === "level") {
      out.push({ kind: "event", title: translate(lang, "notifications.levelUp", { level: e.level }), body: translate(lang, "notifications.levelUpBody"), link: "/quests" });
    } else if (e.type === "golden") {
      const key = e.robux === "pending" ? "hearts.goldenPending" : e.robux === "capped" ? "hearts.goldenCapped" : e.robux === "demo" ? "hearts.goldenDemo" : "hearts.goldenDisabled";
      out.push({ kind: "rare", title: translate(lang, "notifications.goldenTitle"), body: translate(lang, key), link: "/surprises" });
    }
  }
  return out;
}
