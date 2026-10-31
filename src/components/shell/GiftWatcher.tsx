"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";

/** Polls for new gifts/letters (cloud mode) and shows a gentle "a gift is waiting" banner. */
export function GiftWatcher() {
  const gift = useWorld((s) => s.gifts.find((g) => g.status === "sent"));
  const overlayGift = useWorld((s) => s.overlay.gift);
  const setOverlay = useWorld((s) => s.setOverlay);
  const refresh = useWorld((s) => s.refresh);
  const mode = useWorld((s) => s.mode);
  const { t } = useT();

  useEffect(() => {
    if (mode !== "cloud") return;
    const id = setInterval(refresh, 60_000);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mode, refresh]);

  return (
    <AnimatePresence>
      {gift && !overlayGift && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed inset-x-0 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1.25rem)] z-[45] flex justify-center px-4 lg:bottom-6"
        >
          <button onClick={() => setOverlay({ gift, giftPreview: false })} className="card flex items-center gap-3 px-5 py-3 text-left">
            <span className="animate-wiggle anim-loop relative z-[1] text-3xl [animation-iteration-count:infinite]" aria-hidden>🎁</span>
            <span className="relative z-[1]">
              <span className="title block">{t("home.giftWaiting")}</span>
              <span className="text-sm font-bold text-muted">{t("gift.from")}</span>
            </span>
            <span className="btn btn-primary btn-sm relative z-[1] ml-2">{t("home.openGift")}</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
