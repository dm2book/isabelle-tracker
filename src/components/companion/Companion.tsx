"use client";

/* Original companion character: a round white kitten with sparkly eyes and a bow.
   Not Sanrio artwork. A licensed skin can replace this component later (see lib/companion/skins.ts). */
import { motion, useReducedMotion, type TargetAndTransition, type Transition } from "motion/react";
import { useId, useMemo } from "react";
import type { BowId, CompanionLook } from "@/lib/types";
import type { CompanionAnim } from "@/store/world";
import { darken, lighten, mix } from "@/lib/theme/color";
import { WEARABLE_MAP } from "@/lib/catalog/wardrobe";

export type Mood = "happy" | "excited" | "sleepy" | "relaxed" | "hungry" | "celebrating" | "loving";

interface Props {
  look: CompanionLook;
  mood?: Mood;
  anim?: CompanionAnim | null;
  animKey?: number;
  size?: number;
  className?: string;
  onClick?: () => void;
  label?: string;
  still?: boolean;
}

const INK = "#5A2149";

type AnimSpec = { body?: TargetAndTransition; armL?: TargetAndTransition; armR?: TargetAndTransition; t?: Transition };

const ANIMS: Record<CompanionAnim, AnimSpec> = {
  wave: { armR: { rotate: [0, -150, -115, -150, -115, -150, 0] }, body: { rotate: [0, -3, 2, -3, 0] }, t: { duration: 1.8 } },
  dance: { body: { rotate: [0, -10, 10, -10, 10, 0], y: [0, -10, 0, -10, 0, 0] }, armL: { rotate: [0, 60, 0, 60, 0] }, armR: { rotate: [0, -60, 0, -60, 0] }, t: { duration: 1.8 } },
  kiss: { body: { rotate: [0, -6, -6, 0], y: [0, -4, -4, 0] }, armR: { rotate: [0, -95, -95, 0] }, t: { duration: 1.6 } },
  hug: { armL: { rotate: [0, 125, 125, 40, 40, 0] }, armR: { rotate: [0, -125, -125, -40, -40, 0] }, body: { scale: [1, 1.03, 1.03, 1.08, 1.08, 1] }, t: { duration: 2.6 } },
  celebrate: { body: { y: [0, -34, 0, -26, 0, -14, 0] }, armL: { rotate: [0, 140, 30, 140, 30, 0] }, armR: { rotate: [0, -140, -30, -140, -30, 0] }, t: { duration: 1.6 } },
  sleep: { body: { scaleY: [1, 1.035, 1], y: [0, 1, 0] }, t: { duration: 4, repeat: Infinity } },
  eat: { body: { y: [0, -3, 0, -3, 0] }, armL: { rotate: [0, 70, 55, 70, 0] }, armR: { rotate: [0, -70, -55, -70, 0] }, t: { duration: 1.8 } },
  drink: { body: { rotate: [0, -4, -4, 0] }, armL: { rotate: [0, 70, 70, 0] }, armR: { rotate: [0, -70, -70, 0] }, t: { duration: 1.8 } },
  present: { body: { y: [0, -6, 0] }, armL: { rotate: [0, 60, 60, 60] }, armR: { rotate: [0, -60, -60, -60] }, t: { duration: 1.2 } },
  play: { body: { rotate: [0, 8, -8, 8, 0], y: [0, -12, 0, -12, 0] }, armL: { rotate: [0, 90, 20, 90, 0] }, t: { duration: 1.6 } },
  poke: { body: { scaleY: [1, 0.84, 1.1, 0.97, 1], scaleX: [1, 1.12, 0.94, 1.02, 1] }, t: { duration: 0.6 } },
};

function Bow({ kind, color }: { kind: BowId; color: string }) {
  const ink = darken(color, 0.35);
  const s = { stroke: ink, strokeWidth: 3, strokeLinejoin: "round" as const };
  switch (kind) {
    case "none":
      return null;
    case "big":
      return (
        <g transform="translate(46 30) rotate(-18)" {...s}>
          <path d="M0 0 C-30 -32 -52 -6 -40 14 C-30 30 -10 18 0 6Z" fill={color} />
          <path d="M0 0 C30 -32 52 -6 40 14 C30 30 10 18 0 6Z" fill={color} />
          <ellipse cx="0" cy="3" rx="10" ry="11" fill={lighten(color, 0.15)} />
          <path d="M-22 -6 Q-28 2 -26 8" stroke={lighten(color, 0.6)} strokeWidth={4} fill="none" />
        </g>
      );
    case "flower":
      return (
        <g transform="translate(48 30)" {...s} strokeWidth={2.5}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-13" rx="9" ry="13" fill={color} transform={`rotate(${a})`} />
          ))}
          <circle r="8" fill="#FFE08A" />
        </g>
      );
    case "heart":
      return (
        <g transform="translate(46 26) rotate(-14) scale(1.4)" {...s} strokeWidth={2}>
          <path d="M0 4 C-5 -4 -16 -1 -12 8 C-9 13 0 18 0 20 C0 18 9 13 12 8 C16 -1 5 -4 0 4Z" fill={color} />
        </g>
      );
    case "star":
      return (
        <g transform="translate(46 30) rotate(-12)" {...s} strokeWidth={2.5}>
          <polygon points="0,-20 6,-6 21,-6 9,3 13,18 0,9 -13,18 -9,3 -21,-6 -6,-6" fill={color} />
        </g>
      );
    case "crown":
      return (
        <g transform="translate(100 14)" {...s} strokeWidth={2.5}>
          <path d="M-26 14 L-30 -10 L-14 2 L0 -16 L14 2 L30 -10 L26 14Z" fill={color} />
          <circle cx="0" cy="4" r="4" fill="#FFFFFF" />
          <circle cx="-16" cy="8" r="3" fill="#FFFFFF" />
          <circle cx="16" cy="8" r="3" fill="#FFFFFF" />
        </g>
      );
    default:
      return (
        <g transform="translate(46 32) rotate(-20)" {...s}>
          <path d="M0 0 C-22 -24 -40 -4 -30 12 C-22 24 -8 14 0 4Z" fill={color} />
          <path d="M0 0 C22 -24 40 -4 30 12 C22 24 8 14 0 4Z" fill={color} />
          <ellipse cx="0" cy="2" rx="8" ry="9" fill={lighten(color, 0.12)} />
          <path d="M-17 -6 Q-22 0 -20 5" stroke={lighten(color, 0.6)} strokeWidth={3.5} fill="none" />
        </g>
      );
  }
}

function Eyes({ mood, closed }: { mood: Mood; closed: boolean }) {
  if (closed || mood === "sleepy") {
    return (
      <g stroke={INK} strokeWidth={4} strokeLinecap="round" fill="none">
        <path d="M58 92 Q70 100 82 92" />
        <path d="M118 92 Q130 100 142 92" />
      </g>
    );
  }
  if (mood === "celebrating" || mood === "relaxed") {
    return (
      <g stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none">
        <path d="M58 96 Q70 82 82 96" />
        <path d="M118 96 Q130 82 142 96" />
      </g>
    );
  }
  if (mood === "loving") {
    return (
      <g fill="#FF5C8A" stroke={INK} strokeWidth={2}>
        <path transform="translate(70 84) scale(0.9)" d="M0 6 C-6 -2 -16 2 -12 10 C-9 15 0 19 0 22 C0 19 9 15 12 10 C16 2 6 -2 0 6Z" />
        <path transform="translate(130 84) scale(0.9)" d="M0 6 C-6 -2 -16 2 -12 10 C-9 15 0 19 0 22 C0 19 9 15 12 10 C16 2 6 -2 0 6Z" />
      </g>
    );
  }
  const r = mood === "excited" ? 12 : 10.5;
  return (
    <g>
      {[70, 130].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy={92} rx={r} ry={r * 1.12} fill={INK} />
          <circle cx={cx + 3.5} cy={87} r={r * 0.36} fill="#FFFFFF" />
          <circle cx={cx - 3.5} cy={97} r={r * 0.17} fill="#FFFFFF" />
          {mood === "excited" && (
            <path d={`M${cx - 4} ${92} l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2z`} fill="#FFE08A" transform={`translate(${cx * 0.02} 0)`} />
          )}
        </g>
      ))}
    </g>
  );
}

function Mouth({ mood, anim }: { mood: Mood; anim: CompanionAnim | null }) {
  if (anim === "kiss") return <path d="M94 112 Q100 106 106 112 Q100 118 94 112Z" fill="#FF5C8A" stroke={INK} strokeWidth={2} />;
  if (mood === "hungry" || anim === "eat") return <ellipse cx="100" cy="114" rx="5" ry="6" fill="#FF8FA8" stroke={INK} strokeWidth={2.5} />;
  if (mood === "celebrating" || mood === "excited") return <path d="M90 110 Q100 124 110 110 Z" fill="#FF8FA8" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />;
  if (mood === "sleepy") return <path d="M96 113 Q100 116 104 113" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />;
  return <path d="M91 110 Q95.5 116 100 110 Q104.5 116 109 110" fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />;
}

function Outfit({ id, color, clip }: { id: string; color: string; clip: string }) {
  const ink = mix(darken(color, 0.4), INK, 0.4);
  const s = { stroke: ink, strokeWidth: 3, strokeLinejoin: "round" as const };
  const light = lighten(color, 0.5);
  switch (id) {
    case "dress":
      return (
        <g {...s}>
          <path d="M70 146 Q100 138 130 146 L148 196 Q100 210 52 196Z" fill={color} />
          <path d="M52 196 Q60 204 68 198 Q76 206 84 199 Q92 207 100 200 Q108 207 116 199 Q124 206 132 198 Q140 204 148 196" fill={light} />
          <circle cx="100" cy="160" r="4" fill={light} />
        </g>
      );
    case "mariniere":
      return (
        <g clipPath={`url(#${clip})`}>
          <rect x="40" y="136" width="120" height="60" fill="#FFFFFF" />
          {[146, 160, 174, 188].map((y) => <rect key={y} x="40" y={y} width="120" height="6" fill={color} />)}
        </g>
      );
    case "overalls":
      return (
        <g {...s}>
          <path d="M68 168 L132 168 L138 204 L62 204Z" fill={color} />
          <rect x="80" y="150" width="40" height="22" rx="4" fill={color} />
          <path d="M80 152 L70 138 M120 152 L130 138" stroke={color} strokeWidth={6} />
          <circle cx="86" cy="157" r="3" fill="#FFE08A" /><circle cx="114" cy="157" r="3" fill="#FFE08A" />
        </g>
      );
    case "sweater":
    case "pajamas_stars":
    case "pajamas_clouds":
    case "swimsuit":
      return (
        <g>
          <g clipPath={`url(#${clip})`}>
            <rect x="40" y="136" width="120" height="70" fill={color} />
            {id === "sweater" && <path transform="translate(100 160) scale(0.9)" d="M0 6 C-6 -2 -16 2 -12 10 C-9 15 0 19 0 22 C0 19 9 15 12 10 C16 2 6 -2 0 6Z" fill={light} />}
            {id === "pajamas_stars" && [[78, 156], [118, 150], [96, 178], [126, 184], [70, 186]].map(([x, y], i) => (
              <polygon key={i} transform={`translate(${x} ${y})`} points="0,-6 2,-2 6,-2 3,1 4,6 0,3 -4,6 -3,1 -6,-2 -2,-2" fill="#FFF4C2" />
            ))}
            {id === "pajamas_clouds" && [[80, 158], [118, 176]].map(([x, y], i) => (
              <path key={i} transform={`translate(${x} ${y})`} d="M-12 4 C-18 4 -18 -4 -12 -3 C-12 -10 -2 -11 0 -5 C4 -10 13 -7 11 0 C17 0 17 4 11 4Z" fill="#FFFFFF" />
            ))}
            {id === "swimsuit" && [[78, 150], [100, 162], [122, 150], [86, 182], [114, 184]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4} fill="#FFFFFF" />)}
            {id === "sweater" && <rect x="40" y="194" width="120" height="10" fill={light} />}
          </g>
        </g>
      );
    case "apron":
      return (
        <g {...s}>
          <path d="M76 148 L124 148 L132 200 L68 200Z" fill={color} />
          <path d="M76 150 L60 142 M124 150 L140 142" stroke={ink} strokeWidth={2} />
          <rect x="88" y="168" width="24" height="18" rx="5" fill={lighten(color, 0.3)} />
          <path transform="translate(100 171) scale(0.4)" d="M0 6 C-6 -2 -16 2 -12 10 C-9 15 0 19 0 22 C0 19 9 15 12 10 C16 2 6 -2 0 6Z" fill="#FF8FB5" stroke="none" />
        </g>
      );
    case "raincoat":
    case "coat":
      return (
        <g {...s}>
          <path d="M62 146 Q100 132 138 146 L146 202 L54 202Z" fill={color} />
          <path d="M100 140 L100 202" />
          {[158, 174, 190].map((y) => <circle key={y} cx="108" cy={y} r="3.5" fill={id === "coat" ? "#FFFFFF" : darken(color, 0.25)} />)}
          {id === "coat" && <path d="M74 142 Q100 160 126 142 Q100 150 74 142Z" fill={light} />}
        </g>
      );
    case "tutu":
      return (
        <g {...s}>
          <path d="M72 150 Q100 142 128 150 L128 170 L72 170Z" fill={lighten(color, 0.2)} />
          <path d="M40 182 Q60 160 100 166 Q140 160 160 182 Q140 196 100 190 Q60 196 40 182Z" fill={color} />
          <path d="M48 180 Q70 168 100 172 Q130 168 152 180" fill="none" stroke={light} strokeWidth={3} />
        </g>
      );
    case "princess":
      return (
        <g {...s}>
          <path d="M72 146 Q100 138 128 146 L160 212 Q100 224 40 212Z" fill={color} />
          <path d="M58 180 Q100 192 142 180" fill="none" stroke={light} strokeWidth={4} />
          {[[80, 196], [118, 200], [100, 176]].map(([x, y], i) => (
            <polygon key={i} transform={`translate(${x} ${y})`} points="0,-5 1.5,-1.5 5,-1.5 2,1 3,5 0,3 -3,5 -2,1 -5,-1.5 -1.5,-1.5" fill="#FFF4C2" stroke="none" />
          ))}
        </g>
      );
    case "witch":
      return (
        <g {...s}>
          <path d="M66 142 Q100 132 134 142 L156 206 Q100 196 44 206Z" fill={color} />
          <path d="M76 140 L100 156 L124 140" fill={lighten(color, 0.3)} />
          <circle cx="100" cy="154" r="4" fill="#FFE08A" />
        </g>
      );
    case "santa":
      return (
        <g {...s}>
          <path d="M64 146 Q100 134 136 146 L144 200 L56 200Z" fill="#FF6F8E" />
          <rect x="58" y="172" width="84" height="10" fill="#5A2149" stroke="none" />
          <rect x="94" y="170" width="12" height="14" rx="2" fill="#FFE08A" />
          <path d="M56 198 L144 198" stroke="#FFFFFF" strokeWidth={8} />
          <path d="M76 142 Q100 154 124 142" stroke="#FFFFFF" strokeWidth={7} fill="none" />
        </g>
      );
    default:
      return null;
  }
}

function Accessory({ id, color }: { id: string; color: string }) {
  const ink = mix(darken(color, 0.45), INK, 0.4);
  const s = { stroke: ink, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  switch (id) {
    case "beret":
      return (
        <g {...s} transform="rotate(-10 120 30)">
          <ellipse cx="118" cy="32" rx="44" ry="16" fill={color} />
          <path d="M118 16 L120 8" strokeWidth={4} />
        </g>
      );
    case "glasses_heart":
      return (
        <g {...s} fill="none" stroke={color} strokeWidth={4}>
          {[70, 130].map((x) => (
            <path key={x} transform={`translate(${x} 82) scale(1.35)`} d="M0 6 C-6 -2 -16 2 -12 10 C-9 15 0 19 0 22 C0 19 9 15 12 10 C16 2 6 -2 0 6Z" fill={lighten(color, 0.7)} fillOpacity={0.45} />
          ))}
          <path d="M86 94 Q100 88 114 94" />
        </g>
      );
    case "sunglasses":
      return (
        <g {...s} stroke={INK}>
          <rect x="50" y="80" width="40" height="26" rx="10" fill={color} />
          <rect x="110" y="80" width="40" height="26" rx="10" fill={color} />
          <path d="M90 90 Q100 84 110 90" fill="none" />
          <path d="M56 86 L66 84" stroke="#FFFFFF" strokeWidth={3} />
        </g>
      );
    case "flower_crown":
      return (
        <g>
          <path d="M44 42 Q100 14 156 42" fill="none" stroke="#7CCB7A" strokeWidth={5} strokeLinecap="round" />
          {[[50, 40, "#FF8FB5"], [72, 28, "#FFE08A"], [100, 24, "#C9B6FF"], [128, 28, "#A8DAFF"], [150, 40, "#FF8FB5"]].map(([x, y, c], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-6" rx="4.5" ry="6.5" fill={c as string} stroke={INK} strokeWidth={1.4} transform={`rotate(${a})`} />)}
              <circle r="3.4" fill="#FFF4D6" stroke={INK} strokeWidth={1.2} />
            </g>
          ))}
        </g>
      );
    case "headphones":
      return (
        <g {...s}>
          <path d="M34 80 Q34 6 100 6 Q166 6 166 80" fill="none" stroke={color} strokeWidth={10} />
          <rect x="22" y="70" width="24" height="36" rx="10" fill={color} />
          <rect x="154" y="70" width="24" height="36" rx="10" fill={color} />
        </g>
      );
    case "scarf":
      return (
        <g {...s}>
          <path d="M62 136 Q100 152 138 136 L140 148 Q100 164 60 148Z" fill={color} />
          <path d="M120 148 L128 178 L114 176 L110 150Z" fill={color} />
        </g>
      );
    case "wand":
      return (
        <g {...s}>
          <path d="M44 176 L22 128" stroke="#C9B6FF" strokeWidth={5} />
          <polygon transform="translate(20 122)" points="0,-14 4,-4 14,-4 6,2 9,12 0,6 -9,12 -6,2 -14,-4 -4,-4" fill={color} />
        </g>
      );
    case "nightcap":
      return (
        <g {...s}>
          <path d="M50 44 Q90 -4 150 30 Q180 50 176 80 L150 44Z" fill={color} />
          <path d="M46 46 Q100 26 154 46" fill="none" stroke="#FFFFFF" strokeWidth={8} />
          <circle cx="176" cy="84" r="10" fill="#FFFFFF" />
        </g>
      );
    case "witch_hat":
      return (
        <g {...s}>
          <ellipse cx="100" cy="36" rx="66" ry="12" fill={color} />
          <path d="M66 36 L96 -30 Q104 -36 108 -26 L134 36Z" fill={color} />
          <path d="M70 28 Q100 34 130 28" stroke="#FFE08A" strokeWidth={6} fill="none" />
        </g>
      );
    case "santa_hat":
      return (
        <g {...s}>
          <path d="M50 42 Q86 -18 150 26 Q166 40 160 70 L148 40Z" fill="#FF6F8E" />
          <path d="M46 44 Q100 22 154 44" fill="none" stroke="#FFFFFF" strokeWidth={10} />
          <circle cx="160" cy="74" r="10" fill="#FFFFFF" />
        </g>
      );
    case "earmuffs":
      return (
        <g {...s}>
          <path d="M30 70 Q40 10 100 10 Q160 10 170 70" fill="none" stroke="#FFB3D1" strokeWidth={6} />
          <circle cx="30" cy="78" r="18" fill={color} />
          <circle cx="170" cy="78" r="18" fill={color} />
        </g>
      );
    case "bunny_ears":
      return (
        <g {...s}>
          <ellipse cx="74" cy="0" rx="14" ry="36" fill={color} transform="rotate(-12 74 0)" />
          <ellipse cx="126" cy="0" rx="14" ry="36" fill={color} transform="rotate(12 126 0)" />
          <ellipse cx="74" cy="2" rx="6" ry="24" fill="#FFB3D1" stroke="none" transform="rotate(-12 74 0)" />
          <ellipse cx="126" cy="2" rx="6" ry="24" fill="#FFB3D1" stroke="none" transform="rotate(12 126 0)" />
        </g>
      );
    default:
      return null;
  }
}

function Held({ anim }: { anim: CompanionAnim | null }) {
  if (anim === "eat")
    return (
      <g transform="translate(100 150)" stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
        <path d="M0 -4 C-16 -6 -18 16 0 26 C18 16 16 -6 0 -4Z" fill="#FF6F8E" />
        <path d="M-8 -4 Q-4 -14 0 -6 Q4 -14 8 -4 Q0 0 -8 -4Z" fill="#7CCB7A" />
      </g>
    );
  if (anim === "drink")
    return (
      <g transform="translate(100 146)" stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
        <path d="M-14 -6 L14 -6 L10 26 L-10 26Z" fill="#E9F6FF" />
        <path d="M-12 6 L12 6 L10 26 L-10 26Z" fill="#8CCBFF" stroke="none" />
        <path d="M6 -6 L14 -22" stroke="#FF8FB5" strokeWidth={3} />
      </g>
    );
  if (anim === "present")
    return (
      <g transform="translate(100 156)" stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
        <rect x="-26" y="-10" width="52" height="38" rx="6" fill="#C9B6FF" />
        <rect x="-30" y="-18" width="60" height="12" rx="4" fill="#DCCEFF" />
        <rect x="-5" y="-18" width="10" height="46" fill="#FF8FB5" />
        <path d="M0 -18 C-12 -34 -24 -24 -14 -18Z M0 -18 C12 -34 24 -24 14 -18Z" fill="#FF8FB5" />
      </g>
    );
  if (anim === "play")
    return (
      <g transform="translate(52 150)" stroke={INK} strokeWidth={2.2}>
        <polygon points="0,-16 5,-5 17,-5 7,2 11,14 0,7 -11,14 -7,2 -17,-5 -5,-5" fill="#FFE08A" />
      </g>
    );
  return null;
}

export function Companion({ look, mood = "happy", anim = null, animKey = 0, size = 180, className, onClick, label, still }: Props) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const clip = `body-${uid}`;
  const fur = look.fur || "#FFFFFF";
  const furInk = mix(darken(fur, 0.5), INK, 0.6);
  const sleeping = anim === "sleep" || mood === "sleepy";
  const outfit = look.outfit ? WEARABLE_MAP[look.outfit] : null;
  const accessory = look.accessory ? WEARABLE_MAP[look.accessory] : null;
  const outfitColor = look.outfitColor ?? outfit?.color ?? "#FF8DC0";
  const accColor = accessory?.colorable ? (look.outfitColor ?? accessory.color) : accessory?.color ?? "#FF8DC0";
  const hatOn = accessory && ["witch_hat", "santa_hat", "nightcap", "beret", "flower_crown"].includes(accessory.id);

  const spec = anim && !reduce && !still ? ANIMS[anim] : null;
  const idle: TargetAndTransition = reduce || still ? {} : { y: [0, -3, 0], scaleY: [1, 1.012, 1] };
  const t: Transition = spec?.t ?? { duration: 3.2, repeat: Infinity, ease: "easeInOut" };

  const blink = useMemo<TargetAndTransition>(() => (reduce || still ? {} : { scaleY: [1, 1, 0.08, 1, 1] }), [reduce, still]);

  return (
    <svg
      viewBox="-10 -40 220 260"
      width={size}
      height={(size * 260) / 220}
      className={className}
      role={onClick ? "button" : "img"}
      aria-label={label ?? look.name}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{ cursor: onClick ? "pointer" : undefined, overflow: "visible", touchAction: "manipulation" }}
    >
      <defs>
        <clipPath id={clip}>
          <ellipse cx="100" cy="172" rx="46" ry="38" />
        </clipPath>
        <radialGradient id={`shade-${uid}`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor={lighten(fur, 0.6)} />
          <stop offset="1" stopColor={mix(fur, "#F3DDEA", 0.35)} />
        </radialGradient>
      </defs>
      {/* ground shadow */}
      <ellipse cx="100" cy="214" rx="54" ry="8" fill="#5A2149" opacity={0.12} />
      <motion.g
        key={`${anim ?? "idle"}-${animKey}`}
        animate={spec?.body ?? idle}
        transition={t}
        style={{ originX: 0.5, originY: 1 }}
      >
        {/* tail */}
        <path d="M140 190 Q176 186 172 156 Q170 140 182 136" fill="none" stroke={furInk} strokeWidth={14} strokeLinecap="round" />
        <path d="M140 190 Q176 186 172 156 Q170 140 182 136" fill="none" stroke={fur} strokeWidth={9} strokeLinecap="round" />
        {outfit?.id === "witch" && <Outfit id="witch" color={outfitColor} clip={clip} />}
        {/* body */}
        <ellipse cx="100" cy="172" rx="46" ry="38" fill={`url(#shade-${uid})`} stroke={furInk} strokeWidth={3.5} />
        {outfit && outfit.id !== "witch" && <Outfit id={outfit.id} color={outfitColor} clip={clip} />}
        {/* feet */}
        <ellipse cx="80" cy="208" rx="16" ry="9" fill={fur} stroke={furInk} strokeWidth={3} />
        <ellipse cx="120" cy="208" rx="16" ry="9" fill={fur} stroke={furInk} strokeWidth={3} />
        {/* arms */}
        <motion.g key={`al-${anim}-${animKey}`} animate={spec?.armL ?? {}} transition={t} style={{ originX: 0.85, originY: 0.12 }}>
          <ellipse cx="60" cy="168" rx="13" ry="22" fill={fur} stroke={furInk} strokeWidth={3} transform="rotate(18 60 168)" />
        </motion.g>
        <motion.g key={`ar-${anim}-${animKey}`} animate={spec?.armR ?? {}} transition={t} style={{ originX: 0.15, originY: 0.12 }}>
          <ellipse cx="140" cy="168" rx="13" ry="22" fill={fur} stroke={furInk} strokeWidth={3} transform="rotate(-18 140 168)" />
        </motion.g>
        <Held anim={anim} />
        {accessory?.id === "scarf" && <Accessory id="scarf" color={accColor} />}
        {/* head */}
        <g>
          <path d="M40 66 L36 14 Q38 6 46 10 L86 36Z" fill={fur} stroke={furInk} strokeWidth={3.5} strokeLinejoin="round" />
          <path d="M160 66 L164 14 Q162 6 154 10 L114 36Z" fill={fur} stroke={furInk} strokeWidth={3.5} strokeLinejoin="round" />
          <path d="M46 46 L44 22 L66 38Z" fill="#FFC2D9" />
          <path d="M154 46 L156 22 L134 38Z" fill="#FFC2D9" />
          <ellipse cx="100" cy="88" rx="74" ry="60" fill={`url(#shade-${uid})`} stroke={furInk} strokeWidth={3.5} />
          {accessory && ["headphones", "earmuffs"].includes(accessory.id) && <Accessory id={accessory.id} color={accColor} />}
          {/* face */}
          <motion.g animate={sleeping ? {} : blink} transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1] }} style={{ originX: 0.5, originY: 0.5 }}>
            <Eyes mood={sleeping ? "sleepy" : mood} closed={sleeping} />
          </motion.g>
          <ellipse cx="54" cy="110" rx="12" ry="7" fill="#FF8FB5" opacity={0.55} />
          <ellipse cx="146" cy="110" rx="12" ry="7" fill="#FF8FB5" opacity={0.55} />
          <ellipse cx="100" cy="104" rx="5" ry="3.6" fill="#FFC44D" stroke={INK} strokeWidth={2} />
          <Mouth mood={mood} anim={anim} />
          <g stroke={furInk} strokeWidth={2.6} strokeLinecap="round">
            <path d="M18 92 L40 96" /><path d="M16 106 L40 104" /><path d="M182 92 L160 96" /><path d="M184 106 L160 104" />
          </g>
          {accessory && ["glasses_heart", "sunglasses"].includes(accessory.id) && <Accessory id={accessory.id} color={accColor} />}
          {!hatOn && <Bow kind={look.bow} color={look.bowColor} />}
          {accessory && hatOn && <Accessory id={accessory.id} color={accColor} />}
          {hatOn && accessory?.id === "flower_crown" && <Bow kind={look.bow} color={look.bowColor} />}
          {accessory?.id === "bunny_ears" && <Accessory id="bunny_ears" color={accColor} />}
        </g>
        {accessory?.id === "wand" && <Accessory id="wand" color={accColor} />}
      </motion.g>
      {/* Extras floating outside the body */}
      {anim === "sleep" || (sleeping && !still) ? (
        <g fill="#8C7CC9" fontFamily="var(--font-fredoka)" fontWeight={700}>
          {[0, 1, 2].map((i) => (
            <motion.text
              key={i}
              x={160 + i * 10}
              y={20 - i * 16}
              fontSize={16 + i * 5}
              initial={{ opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 0.8 } : { opacity: [0, 1, 0], y: [10, -14] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}
            >
              z
            </motion.text>
          ))}
        </g>
      ) : null}
      {anim === "kiss" && !reduce && (
        <motion.path
          d="M0 6 C-6 -2 -16 2 -12 10 C-9 15 0 19 0 22 C0 19 9 15 12 10 C16 2 6 -2 0 6Z"
          fill="#FF5C8A"
          initial={{ x: 112, y: 100, scale: 0.4, opacity: 0 }}
          animate={{ x: [112, 150, 175], y: [100, 60, 20], scale: [0.4, 1, 1.3], opacity: [0, 1, 0] }}
          transition={{ duration: 1.6 }}
        />
      )}
      {anim === "hug" && !reduce && (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <motion.path
              key={i}
              d="M0 6 C-6 -2 -16 2 -12 10 C-9 15 0 19 0 22 C0 19 9 15 12 10 C16 2 6 -2 0 6Z"
              fill={["#FF8FB5", "#FFB3D1", "#C9B6FF", "#FF5C8A"][i]}
              initial={{ x: 100, y: 140, scale: 0, opacity: 0 }}
              animate={{ x: 100 + (i - 1.5) * 50, y: [140, 40 - i * 8], scale: [0, 1.1], opacity: [0, 1, 0] }}
              transition={{ duration: 2.2, delay: 0.8 + i * 0.15 }}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
