"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

const HEART = "M0 6 C-6 -2 -16 2 -12 10 C-9 15 0 19 0 22 C0 19 9 15 12 10 C16 2 6 -2 0 6Z";
const STAR = "M0 -10 L3 -3 L10 -3 L4 2 L6 10 L0 5 L-6 10 L-4 2 L-10 -3 L-3 -3Z";

export type BurstKind = "hearts" | "confetti" | "sparkles" | "golden";

const PALETTES: Record<BurstKind, string[]> = {
  hearts: ["#FF5C8A", "#FF8DC0", "#FFB3D1", "#C9B6FF"],
  confetti: ["#FF8DC0", "#C9B6FF", "#A8DAFF", "#FFE08A", "#8FE0BC", "#FFB38A"],
  sparkles: ["#FFE08A", "#FFFFFF", "#FFC2D9"],
  golden: ["#FFD45E", "#FFE9A3", "#FFB800", "#FFFFFF"],
};

/** A one-shot particle burst, centered in its (relative) parent. */
export function Burst({ kind = "hearts", count = 18, spread = 160, burstKey = 0, className = "" }: { kind?: BurstKind; count?: number; spread?: number; burstKey?: number; className?: string }) {
  const reduce = useReducedMotion();
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const d = spread * (0.5 + Math.random() * 0.6);
        return {
          x: Math.cos(a) * d,
          y: Math.sin(a) * d - spread * 0.3,
          r: Math.random() * 360,
          s: 0.6 + Math.random() * 0.8,
          c: PALETTES[kind][i % PALETTES[kind].length],
          shape: kind === "confetti" ? (i % 3 === 0 ? "rect" : i % 3 === 1 ? "heart" : "star") : kind === "hearts" ? "heart" : "star",
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, spread, kind, burstKey],
  );
  if (reduce) return null;
  return (
    <div className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className}`} aria-hidden>
      <svg width="1" height="1" className="overflow-visible">
        {parts.map((p, i) => (
          <motion.g
            key={`${burstKey}-${i}`}
            initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
            animate={{ x: p.x, y: [0, p.y, p.y + 60], scale: [0, p.s, p.s * 0.8], rotate: p.r, opacity: [1, 1, 0] }}
            transition={{ duration: 1.4 + Math.random() * 0.6, ease: "easeOut" }}
          >
            {p.shape === "rect" ? <rect x={-5} y={-3} width={10} height={6} rx={2} fill={p.c} /> : <path d={p.shape === "heart" ? HEART : STAR} fill={p.c} />}
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
