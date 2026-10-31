"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { Companion } from "@/components/companion/Companion";
import { Burst } from "@/components/effects/Burst";
import { play } from "@/lib/sound";

/** "I need a hug 💗" — always reachable from the top bar. */
export function HugOverlay() {
  const open = useWorld((s) => s.overlay.hug);
  const setOverlay = useWorld((s) => s.setOverlay);
  const look = useWorld((s) => s.prefs.companion);
  const track = useWorld((s) => s.track);
  const { t, tl } = useT();
  const [round, setRound] = useState(0);
  const [breathing, setBreathing] = useState(false);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const messages = tl("hug.messages");

  useEffect(() => {
    if (!open) return;
    play("hug");
    track("hug");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOverlay({ hug: false });
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, round, track, setOverlay]);

  useEffect(() => {
    if (!breathing) return;
    const id = setInterval(() => setPhase((p) => (p === "in" ? "out" : "in")), 4000);
    return () => clearInterval(id);
  }, [breathing]);

  const close = () => {
    setOverlay({ hug: false });
    setBreathing(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={t("hug.title")}
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden px-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ background: "radial-gradient(circle at 50% 45%, color-mix(in oklab, var(--c-primary) 45%, var(--c-surface)), color-mix(in oklab, var(--c-accent) 55%, var(--c-bg)) 70%)" }}
        >
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: [0.25, 0.5, 0.25] }}
            transition={{ duration: 4, repeat: Infinity }}
            style={{ background: "radial-gradient(circle at 50% 50%, #fff8, transparent 60%)" }}
          />
          <div className="relative">
            <Burst kind="hearts" count={20} spread={180} burstKey={round} />
            <motion.div
              key={round}
              initial={{ scale: 0.6, y: 60, opacity: 0 }}
              animate={breathing ? { scale: phase === "in" ? 1.12 : 0.94, y: 0, opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
              transition={breathing ? { duration: 4, ease: "easeInOut" } : { type: "spring", stiffness: 120, damping: 14 }}
            >
              <Companion look={look} mood="loving" anim={breathing ? null : "hug"} animKey={round} size={240} />
            </motion.div>
          </div>
          <h2 className="logo-type mt-4 text-3xl">{t("hug.title")}</h2>
          <AnimatePresence mode="wait">
            <motion.p
              key={breathing ? phase : `m${round}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-3 max-w-sm text-lg font-semibold"
            >
              {breathing ? (phase === "in" ? t("hug.inhale") : t("hug.exhale")) : messages[round % messages.length]}
            </motion.p>
          </AnimatePresence>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <button className="btn btn-soft" onClick={() => setBreathing((b) => !b)}>
              🌬️ {t("hug.breathe")}
            </button>
            <button className="btn btn-soft" onClick={() => { setBreathing(false); setRound((r) => r + 1); }}>
              🤗 {t("hug.another")}
            </button>
            <button className="btn btn-primary" onClick={close} data-autofocus>
              💗 {t("hug.better")}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
