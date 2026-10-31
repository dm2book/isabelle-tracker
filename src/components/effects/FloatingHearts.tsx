"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import type { HeartTicket } from "@/lib/types";
import { Burst } from "./Burst";
import { play } from "@/lib/sound";

const FILL: Record<HeartTicket["variant"], string> = {
  pink: "#FF8DC0",
  lavender: "#C9B6FF",
  blue: "#9FD3FF",
  rainbow: "url(#hg-rainbow)",
  golden: "url(#hg-gold)",
};

interface Live {
  ticket: HeartTicket;
  x: number;
  dur: number;
  size: number;
}

interface Pop {
  id: string;
  x: number;
  y: number;
  kind: "hearts" | "golden" | "confetti";
}

export function FloatingHearts() {
  const enabled = useWorld((s) => s.prefs.ui.effects.hearts && s.prefs.ui.animations !== "off");
  const level = useWorld((s) => s.prefs.ui.animations);
  const spawnHeart = useWorld((s) => s.spawnHeart);
  const popHeart = useWorld((s) => s.popHeart);
  const reduce = useReducedMotion();
  const { t } = useT();
  const [live, setLive] = useState<Live | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = useRef(false);
  const again = useRef<(first?: boolean) => void>(() => {});

  const schedule = useCallback(
    (first = false) => {
      if (timer.current) clearTimeout(timer.current);
      const base = level === "extra" ? 14 : level === "gentle" ? 45 : 28;
      const wait = first ? 6000 + Math.random() * 6000 : (base + Math.random() * base) * 1000;
      timer.current = setTimeout(async () => {
        if (stopped.current) return;
        if (document.visibilityState !== "visible") return again.current();
        const ticket = await spawnHeart();
        if (!ticket) {
          stopped.current = true; // daily limit reached
          return;
        }
        const golden = ticket.variant === "golden";
        setLive({ ticket, x: 8 + Math.random() * 78, dur: golden ? 24 : ticket.variant === "rainbow" ? 18 : 15, size: golden ? 84 : ticket.variant === "rainbow" ? 72 : 60 });
      }, wait);
    },
    [level, spawnHeart],
  );
  useEffect(() => {
    again.current = schedule;
  }, [schedule]);

  useEffect(() => {
    if (!enabled) return;
    stopped.current = false;
    schedule(true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, schedule]);

  const onGone = () => {
    setLive(null);
    schedule();
  };

  const onPop = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!live) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ticket = live.ticket;
    setLive(null);
    play("pop");
    const id = ticket.id;
    setPops((p) => [...p, { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, kind: ticket.variant === "golden" ? "golden" : ticket.variant === "rainbow" ? "confetti" : "hearts" }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 2200);
    await popHeart(ticket);
    schedule();
  };

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-live="polite">
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="hg-rainbow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FF8DC0" /><stop offset="0.35" stopColor="#FFE08A" /><stop offset="0.65" stopColor="#8FE0BC" /><stop offset="1" stopColor="#B79CFF" />
          </linearGradient>
          <linearGradient id="hg-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFF3B0" /><stop offset="0.5" stopColor="#FFD45E" /><stop offset="1" stopColor="#F2A900" />
          </linearGradient>
        </defs>
      </svg>
      <AnimatePresence>
        {live && (
          <motion.button
            key={live.ticket.id}
            aria-label={live.ticket.variant === "golden" ? t("hearts.golden") : "💗"}
            className="pointer-events-auto absolute"
            style={{ left: `${live.x}vw`, width: live.size, height: live.size }}
            initial={reduce ? { top: "40vh", opacity: 0, scale: 0.6 } : { top: "105vh", opacity: 0 }}
            animate={
              reduce
                ? { opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 0.8] }
                : { top: "-15vh", opacity: [0, 1, 1, 1, 0.9], x: [0, 30, -25, 20, 0] }
            }
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: live.dur, ease: "linear" }}
            onAnimationComplete={onGone}
            onClick={onPop}
          >
            <motion.svg viewBox="-16 -2 32 26" className="h-full w-full drop-shadow-[0_6px_10px_rgba(255,92,138,0.35)]" animate={{ rotate: [-8, 8, -8], scale: [1, 1.08, 1] }} transition={{ duration: 2.2, repeat: Infinity }}>
              {live.ticket.variant === "golden" && <circle cx="0" cy="11" r="15" fill="#FFE9A3" opacity={0.55} />}
              <path d="M0 6 C-6 -2 -16 2 -12 10 C-9 15 0 19 0 22 C0 19 9 15 12 10 C16 2 6 -2 0 6Z" fill={FILL[live.ticket.variant]} stroke="#fff" strokeWidth={1.2} />
              <path d="M-9 6 Q-8 3 -5 3" stroke="#fff" strokeWidth={1.6} fill="none" strokeLinecap="round" />
            </motion.svg>
          </motion.button>
        )}
      </AnimatePresence>
      {pops.map((p) => (
        <div key={p.id} className="absolute h-0 w-0" style={{ left: p.x, top: p.y }}>
          <Burst kind={p.kind} count={p.kind === "golden" ? 30 : 16} spread={p.kind === "golden" ? 160 : 90} />
        </div>
      ))}
    </div>
  );
}
