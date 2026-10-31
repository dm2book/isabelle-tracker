"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useWorld, type CompanionAnim } from "@/store/world";
import { Companion } from "./Companion";
import { moodFor } from "@/lib/companion/mood";
import { dayPeriod } from "@/lib/time";
import { useT } from "@/lib/i18n/use";
import { play } from "@/lib/sound";

/** The companion connected to the world: reacts to cues (meals, water, hearts…) and to taps. */
export function LiveCompanion({ size = 190, idleSay, className = "" }: { size?: number; idleSay?: string; className?: string }) {
  const look = useWorld((s) => s.prefs.companion);
  const tz = useWorld((s) => s.prefs.timezone);
  const cue = useWorld((s) => s.companionCue);
  const { t, tl } = useT();
  const [anim, setAnim] = useState<CompanionAnim | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const [period, setPeriod] = useState(() => dayPeriod(new Date(), tz));

  useEffect(() => {
    const id = setInterval(() => setPeriod(dayPeriod(new Date(), tz)), 60_000);
    return () => clearInterval(id);
  }, [tz]);

  useEffect(() => {
    if (!cue.key) return;
    setAnim(cue.anim);
    setSay(cue.say);
    setKey((k) => k + 1);
    const tm = setTimeout(() => {
      setAnim(null);
      setSay(null);
    }, 3200);
    return () => clearTimeout(tm);
  }, [cue]);

  const idleAnim: CompanionAnim | null = period === "night" ? "sleep" : null;

  const onTap = () => {
    const options: CompanionAnim[] = ["poke", "wave", "dance", "kiss", "play"];
    const a = options[Math.floor(Math.random() * options.length)];
    const lines = [t("companion.says.poke"), t("companion.says.wave"), t("companion.says.dance"), ...tl("compliments").slice(0, 6)];
    setAnim(a);
    setSay(lines[Math.floor(Math.random() * lines.length)]);
    setKey((k) => k + 1);
    play("tap");
    setTimeout(() => {
      setAnim(null);
      setSay(null);
    }, 3000);
  };

  const bubble = say ?? idleSay ?? null;

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <AnimatePresence mode="wait">
        {bubble && (
          <motion.div
            key={bubble}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            className="relative z-[2] mb-2 max-w-[16rem] rounded-[1.4rem] bg-surface px-4 py-2.5 text-center text-[0.95rem] font-bold text-ink shadow-[0_6px_0_var(--shadow-tint)]"
            role="status"
          >
            {bubble}
            <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-surface" aria-hidden />
          </motion.div>
        )}
      </AnimatePresence>
      <Companion look={look} mood={moodFor(period, anim)} anim={anim ?? idleAnim} animKey={key} size={size} onClick={onTap} label={`${look.name} — ${t("home.pokeHint")}`} />
    </div>
  );
}
