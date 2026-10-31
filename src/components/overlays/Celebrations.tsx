"use client";

import { AnimatePresence, motion } from "motion/react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { Companion } from "@/components/companion/Companion";
import { Burst } from "@/components/effects/Burst";

export function LevelUpOverlay() {
  const level = useWorld((s) => s.overlay.levelUp);
  const setOverlay = useWorld((s) => s.setOverlay);
  const look = useWorld((s) => s.prefs.companion);
  const { t } = useT();
  return (
    <AnimatePresence>
      {level !== null && (
        <motion.div
          className="fixed inset-0 z-[88] flex items-center justify-center bg-[#2a1530]/40 px-6 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setOverlay({ levelUp: null })}
          role="dialog" aria-modal="true" aria-label={t("notifications.levelUp", { level })}
        >
          <motion.div className="card relative w-full max-w-sm p-6 text-center" initial={{ scale: 0.7, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 16 }}>
            <Burst kind="confetti" count={28} spread={200} />
            <div className="relative z-[1]">
              <Companion look={look} mood="celebrating" anim="celebrate" size={150} className="mx-auto" />
              <p className="title mt-2 text-sm text-muted">{t("common.level")}</p>
              <p className="logo-type text-7xl">{level}</p>
              <p className="mt-2 font-semibold">{t("notifications.levelUpBody")}</p>
              <button className="btn btn-primary mt-5 w-full" data-autofocus onClick={() => setOverlay({ levelUp: null })}>
                {t("common.ok")} ✨
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function GoldenOverlay() {
  const golden = useWorld((s) => s.overlay.golden);
  const setOverlay = useWorld((s) => s.setOverlay);
  const { t } = useT();
  const status = golden?.type === "golden" ? golden.robux : "disabled";
  const key = status === "pending" ? "hearts.goldenPending" : status === "capped" ? "hearts.goldenCapped" : status === "demo" ? "hearts.goldenDemo" : "hearts.goldenDisabled";
  return (
    <AnimatePresence>
      {golden && (
        <motion.div
          className="fixed inset-0 z-[89] flex items-center justify-center px-6"
          style={{ background: "radial-gradient(circle, #FFF3C4cc, #FFB80055 50%, #2a153088)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          role="dialog" aria-modal="true" aria-label={t("hearts.golden")}
        >
          <div className="relative text-center">
            <Burst kind="golden" count={36} spread={240} />
            <motion.svg
              viewBox="-20 -6 40 32" width={180} height={150}
              initial={{ scale: 0, rotate: -30 }} animate={{ scale: [0, 1.25, 1], rotate: 0 }} transition={{ duration: 0.9 }}
              className="mx-auto drop-shadow-[0_0_30px_#FFD45E]"
            >
              <defs>
                <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFF1A8" /><stop offset="0.5" stopColor="#FFD45E" /><stop offset="1" stopColor="#F2A900" />
                </linearGradient>
              </defs>
              <path d="M0 6 C-6 -2 -16 2 -12 10 C-9 15 0 19 0 22 C0 19 9 15 12 10 C16 2 6 -2 0 6Z" fill="url(#gold)" stroke="#B57A00" strokeWidth={0.8} />
              <path d="M-9 6 Q-8 3 -5 3" stroke="#fff" strokeWidth={1.4} fill="none" strokeLinecap="round" />
            </motion.svg>
            <p className="logo-type mt-2 text-4xl">{t("hearts.golden")}</p>
            <p className="card mx-auto mt-4 max-w-xs p-4 font-bold">{t(key as never)}</p>
            <button className="btn btn-primary mt-5" data-autofocus onClick={() => setOverlay({ golden: null })}>
              💛 {t("common.ok")}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
