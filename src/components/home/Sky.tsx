"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import type { DayPeriod } from "@/lib/time";

const SKIES: Record<DayPeriod, [string, string, string]> = {
  morning: ["#FFD9E6", "#FFE9D6", "#E3F1FF"],
  afternoon: ["#BFE3FF", "#E3F1FF", "#FFF0F6"],
  evening: ["#FFB3C7", "#FFC9A8", "#C9B6FF"],
  night: ["#1F1A45", "#2C2257", "#4A3D7A"],
};

function Cloud({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 200 90" className={className} style={style} aria-hidden>
      <path d="M30 80 C0 80 0 46 30 48 C28 18 74 6 88 32 C104 6 156 12 152 44 C186 42 192 80 160 80 Z" fill="#FFFFFF" opacity={0.92} />
    </svg>
  );
}

/** Layered, time-of-day sky with drifting clouds, a sun or moon, and twinkling stars at night. */
export function Sky({ period, className = "", children }: { period: DayPeriod; className?: string; children?: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [a, b, c] = SKIES[period];
  const stars = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 60, s: 2 + (i % 3), d: (i % 7) * 0.4 })), []);
  const night = period === "night";
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      data-sky={night ? "dark" : "light"}
      // Text placed directly on the sky (class "on-sky") follows the sky, not the light/dark theme:
      // pastel skies get dark ink, the night sky gets white.
      style={{
        background: `linear-gradient(180deg, ${a}, ${b} 55%, ${c})`,
        ["--sky-ink" as string]: night ? "#FFFFFF" : "#3F1F38",
        ["--sky-ink-soft" as string]: night ? "rgba(255,255,255,0.9)" : "#5E3555",
        ["--sky-stroke" as string]: night ? "#1F1A45" : "#FFFFFF",
      }}
    >
      {night &&
        stars.map((s, i) => (
          <span key={i} className="animate-twinkle anim-loop absolute rounded-full bg-[#FFF4C2]" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} aria-hidden />
        ))}
      {/* sun / moon */}
      <motion.div
        aria-hidden
        className="absolute"
        style={{ right: period === "evening" ? "8%" : "3%", top: period === "evening" ? "40%" : "4%" }}
        animate={reduce ? {} : { y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
      >
        {night ? (
          <svg width="74" height="74" viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="#FFF4C2" opacity="0.18" /><path d="M52 10 A30 30 0 1 0 70 56 A24 24 0 1 1 52 10Z" fill="#FFF1B0" /></svg>
        ) : (
          <svg width="72" height="72" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="42" fill={period === "evening" ? "#FF9EAE" : "#FFE9A3"} opacity="0.35" />
            <circle cx="45" cy="45" r="26" fill={period === "evening" ? "#FFB38A" : "#FFD45E"} />
            <circle cx="37" cy="44" r="2.6" fill="#8A4A2E" /><circle cx="53" cy="44" r="2.6" fill="#8A4A2E" />
            <path d="M40 51 Q45 55 50 51" stroke="#8A4A2E" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </svg>
        )}
      </motion.div>
      {!night && (
        <>
          <Cloud className="anim-loop absolute w-40 opacity-90" style={{ top: "12%", left: "-10%", animation: reduce ? undefined : "drift-x 60s linear infinite" }} />
          <Cloud className="anim-loop absolute w-28 opacity-80" style={{ top: "34%", left: "40%", animation: reduce ? undefined : "drift-x 80s linear -30s infinite" }} />
          <Cloud className="anim-loop absolute w-52 opacity-70" style={{ top: "6%", left: "60%", animation: reduce ? undefined : "drift-x 95s linear -60s infinite" }} />
        </>
      )}
      <style>{`@keyframes drift-x { from { transform: translateX(-30vw) } to { transform: translateX(110vw) } }`}</style>
      {children}
    </div>
  );
}
