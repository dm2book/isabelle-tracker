"use client";

import { useMemo } from "react";
import { useWorld } from "@/store/world";
import { useUi } from "@/store/ui";
import { currentSeason } from "@/lib/seasons";
import { dateKey } from "@/lib/time";

const GLYPHS: Record<string, string[]> = {
  snow: ["❄", "•", "❅"],
  leaves: ["🍂", "🍁"],
  petals: ["🌸", "•"],
  bats: ["🦇", "✨", "🎃"],
  hearts: ["💗", "💕"],
  sparkles: ["✨", "⭐"],
  sun: ["✨"],
};

/** Gentle falling particles for the current season (Halloween today, snow in winter…). */
export function SeasonalEffects() {
  const on = useWorld((s) => s.prefs.ui.effects.seasonal && s.prefs.ui.animations !== "off");
  const tz = useWorld((s) => s.prefs.timezone);
  const level = useWorld((s) => s.prefs.ui.animations);
  const reduced = useUi((s) => s.reducedMotion);
  const season = currentSeason(dateKey(new Date(), tz));
  const count = level === "extra" ? 18 : level === "gentle" ? 6 : 11;
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: -Math.random() * 20,
        dur: 14 + Math.random() * 14,
        size: 12 + Math.random() * 14,
        dx: `${(Math.random() - 0.5) * 160}px`,
        rot: `${(Math.random() - 0.5) * 720}deg`,
        i,
      })),
    [count],
  );
  if (!on || reduced || !season?.effect) return null;
  const glyphs = GLYPHS[season.effect] ?? ["✨"];
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {parts.map((p) => (
        <span
          key={p.i}
          className="anim-loop absolute top-0 opacity-70"
          style={{
            left: `${p.left}%`,
            fontSize: p.size,
            color: season.effect === "snow" ? "#ffffff" : undefined,
            textShadow: season.effect === "snow" ? "0 0 6px #9fc9ff" : undefined,
            animation: `fall ${p.dur}s linear ${p.delay}s infinite`,
            ["--dx" as string]: p.dx,
            ["--rot" as string]: p.rot,
          }}
        >
          {glyphs[p.i % glyphs.length]}
        </span>
      ))}
    </div>
  );
}
