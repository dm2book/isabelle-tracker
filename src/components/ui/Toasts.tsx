"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { translate } from "@/lib/i18n";
import { COLLECTIBLE_MAP } from "@/lib/catalog/collectibles";
import { questName } from "@/lib/game/notify";
import { play } from "@/lib/sound";
import type { Effect, Lang } from "@/lib/types";

const ERROR_KEYS: Record<string, string> = {
  not_enough_coins: "inventory.notEnough",
  already_owned: "inventory.allOwned",
  limit: "hearts.limit",
  network: "errors.network",
  unauthorized: "errors.unauthorized",
  rate_limited: "errors.rateLimited",
  invalid: "errors.invalid",
  not_found: "errors.notFound",
};

function textOf(lang: Lang, text: string, tone?: string) {
  if (tone === "error" && ERROR_KEYS[text]) return translate(lang, ERROR_KEYS[text]);
  if (/^[a-z]+\.[A-Za-z0-9_.]+$/.test(text)) {
    const tr = translate(lang, text);
    if (tr !== text) return tr;
  }
  if (tone === "error" && !text.includes(" ")) return translate(lang, "common.error");
  return text;
}

/** Turns game effects into toasts, sounds, companion reactions and overlays. */
function useEffectsProcessor() {
  const pending = useWorld((s) => s.pendingEffects.length);
  const { tl } = useT();
  useEffect(() => {
    if (!pending) return;
    const st = useWorld.getState();
    const effects: Effect[] = st.consumeEffects();
    const lang = st.prefs.lang;
    let coins = 0;
    let xp = 0;
    for (const e of effects) {
      if (e.type === "coins") coins += e.amount;
      else if (e.type === "xp") xp += e.amount;
      else if (e.type === "level") {
        st.setOverlay({ levelUp: e.level });
        play("levelup");
      } else if (e.type === "collectible") {
        const c = COLLECTIBLE_MAP[e.id];
        st.toast({ text: translate(lang, "hearts.collectible", { name: c?.name[lang] ?? e.id }), emoji: c?.emoji ?? "✨", tone: "reward" });
      } else if (e.type === "quest_done") {
        st.toast({ text: translate(lang, "notifications.questDone", { name: questName(lang, e.questId) }), emoji: "⭐", tone: "success" });
        play("chime");
      } else if (e.type === "achievement") {
        st.toast({ text: translate(lang, "notifications.achievement", { name: translate(lang, `quests.ach.${e.id}`) }), emoji: "🏆", tone: "success" });
      } else if (e.type === "item") {
        st.toast({ text: translate(lang, "inventory.bought"), emoji: "🎀", tone: "reward" });
      } else if (e.type === "golden") {
        st.setOverlay({ golden: e });
        play("gift");
      } else if (e.type === "message" && e.key === "heart") {
        const msgs = tl("hearts.messages");
        const i = Number(e.params?.i ?? 0);
        st.cue("celebrate", msgs[i % msgs.length]);
      }
    }
    if (coins || xp) {
      const parts = [coins ? translate(lang, "hearts.coins", { n: coins }) : "", xp ? translate(lang, "hearts.xp", { n: xp }) : ""].filter(Boolean);
      st.toast({ text: parts.join(" · "), emoji: coins ? "🪙" : "✨", tone: "reward" });
      play("coin");
    }
  }, [pending, tl]);
}

export function Toasts() {
  const toasts = useWorld((s) => s.toasts);
  const dismiss = useWorld((s) => s.dismissToast);
  const lang = useWorld((s) => s.prefs.lang);
  useEffectsProcessor();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[95] flex flex-col items-center gap-2 px-4" aria-live="polite" role="status">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-full px-4 py-2.5 text-left font-bold shadow-lg ${
              t.tone === "error" ? "bg-[#FFE1E6] text-[#7A1230]" : t.tone === "reward" ? "bg-primary text-on-primary" : "bg-surface text-ink"
            }`}
          >
            {t.emoji && <span aria-hidden className="text-lg">{t.emoji}</span>}
            <span className="text-sm">{textOf(lang, t.text, t.tone)}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
