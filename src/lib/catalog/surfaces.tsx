import type { ReactNode } from "react";
import { darken, lighten } from "../theme/color";

export type SurfaceUse = "wall" | "floor" | "sky" | "ground";

export interface SurfaceDef {
  id: string;
  use: SurfaceUse[];
  price: number;
  c1: string;
  c2: string;
}

export const SURFACES: SurfaceDef[] = [
  { id: "plain", use: ["wall", "floor", "sky", "ground"], price: 0, c1: "#FFE3EE", c2: "#FFFFFF" },
  { id: "stripes", use: ["wall", "floor"], price: 0, c1: "#FFE3EE", c2: "#FFFFFF" },
  { id: "dots", use: ["wall", "floor"], price: 0, c1: "#E8DEFF", c2: "#FFFFFF" },
  { id: "hearts", use: ["wall"], price: 0, c1: "#FFD1E2", c2: "#FFFFFF" },
  { id: "stars", use: ["wall", "sky"], price: 0, c1: "#DCEFFF", c2: "#FFFFFF" },
  { id: "gingham", use: ["wall", "floor"], price: 0, c1: "#FFC2D9", c2: "#FFFFFF" },
  { id: "clouds", use: ["wall", "sky"], price: 0, c1: "#BFE3FF", c2: "#FFFFFF" },
  { id: "diamonds", use: ["wall", "floor"], price: 30, c1: "#FFE8C2", c2: "#FFFFFF" },
  { id: "scallop", use: ["wall"], price: 30, c1: "#C9F0DD", c2: "#FFFFFF" },
  { id: "flowers", use: ["wall", "ground"], price: 40, c1: "#FFF4D6", c2: "#FF9EBB" },
  { id: "wood", use: ["floor"], price: 0, c1: "#F3D2B3", c2: "#E6BC96" },
  { id: "tiles", use: ["floor"], price: 0, c1: "#FFFFFF", c2: "#FFD1E2" },
  { id: "checker", use: ["floor"], price: 0, c1: "#FFFFFF", c2: "#C9B6FF" },
  { id: "carpet", use: ["floor"], price: 0, c1: "#FFC2D9", c2: "#FFB0CC" },
  { id: "grass", use: ["floor", "ground"], price: 0, c1: "#B8EBC0", c2: "#9FDDAA" },
  { id: "sand", use: ["floor", "ground"], price: 0, c1: "#FFEBC2", c2: "#F7D9A0" },
  { id: "sky", use: ["wall", "sky"], price: 0, c1: "#BFE3FF", c2: "#FFFFFF" },
  { id: "sunset", use: ["wall", "sky"], price: 40, c1: "#FFB3C7", c2: "#FFE0A3" },
  { id: "night", use: ["wall", "sky"], price: 60, c1: "#2C2257", c2: "#FFE08A" },
  { id: "water", use: ["ground", "floor"], price: 0, c1: "#A8DAFF", c2: "#E9F6FF" },
];

export const SURFACE_MAP: Record<string, SurfaceDef> = Object.fromEntries(SURFACES.map((s) => [s.id, s]));

/** Returns an SVG <pattern> (or gradient) definition with the given element id. */
export function surfaceDef(elId: string, pattern: string, c1: string, c2: string, height = 400): ReactNode {
  switch (pattern) {
    case "stripes":
      return (
        <pattern id={elId} width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="48" fill={c1} />
          <rect width="24" height="48" fill={c2} />
        </pattern>
      );
    case "dots":
      return (
        <pattern id={elId} width="44" height="44" patternUnits="userSpaceOnUse">
          <rect width="44" height="44" fill={c1} />
          <circle cx="11" cy="11" r="5" fill={c2} />
          <circle cx="33" cy="33" r="5" fill={c2} />
        </pattern>
      );
    case "hearts":
      return (
        <pattern id={elId} width="70" height="70" patternUnits="userSpaceOnUse">
          <rect width="70" height="70" fill={c1} />
          <path d="M17 14 C14 9 6 10 7 17 C8 21 14 24 17 27 C20 24 26 21 27 17 C28 10 20 9 17 14Z" fill={c2} />
          <path d="M52 49 C49 44 41 45 42 52 C43 56 49 59 52 62 C55 59 61 56 62 52 C63 45 55 44 52 49Z" fill={c2} />
        </pattern>
      );
    case "stars":
      return (
        <pattern id={elId} width="80" height="80" patternUnits="userSpaceOnUse">
          <rect width="80" height="80" fill={c1} />
          <polygon points="20,8 23,17 32,17 25,22 28,31 20,25 12,31 15,22 8,17 17,17" fill={c2} />
          <circle cx="60" cy="56" r="3" fill={c2} />
          <circle cx="44" cy="30" r="2" fill={c2} />
        </pattern>
      );
    case "gingham":
      return (
        <pattern id={elId} width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill={c2} />
          <rect width="20" height="40" fill={c1} opacity={0.55} />
          <rect width="40" height="20" fill={c1} opacity={0.55} />
        </pattern>
      );
    case "clouds":
      return (
        <pattern id={elId} width="160" height="110" patternUnits="userSpaceOnUse">
          <rect width="160" height="110" fill={c1} />
          <path d="M20 40 C8 40 8 26 20 27 C20 14 40 12 44 22 C52 12 70 18 66 30 C78 30 78 40 66 40Z" fill={c2} />
          <path d="M100 92 C90 92 90 80 100 81 C100 70 116 68 119 77 C126 69 140 74 137 84 C147 84 147 92 137 92Z" fill={c2} />
        </pattern>
      );
    case "diamonds":
      return (
        <pattern id={elId} width="50" height="50" patternUnits="userSpaceOnUse">
          <rect width="50" height="50" fill={c2} />
          <polygon points="25,0 50,25 25,50 0,25" fill={c1} />
        </pattern>
      );
    case "scallop":
      return (
        <pattern id={elId} width="40" height="30" patternUnits="userSpaceOnUse">
          <rect width="40" height="30" fill={c2} />
          <path d="M0 30 A20 20 0 0 1 40 30Z" fill={c1} />
          <path d="M-20 15 A20 20 0 0 1 20 15 A20 20 0 0 1 60 15" fill="none" stroke={c1} strokeWidth={3} />
        </pattern>
      );
    case "flowers":
      return (
        <pattern id={elId} width="70" height="70" patternUnits="userSpaceOnUse">
          <rect width="70" height="70" fill={c1} />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="20" cy="13" rx="5" ry="7" fill={c2} transform={`rotate(${a} 20 20)`} />
          ))}
          <circle cx="20" cy="20" r="4" fill="#FFE08A" />
          <circle cx="54" cy="52" r="4" fill={c2} />
        </pattern>
      );
    case "wood":
      return (
        <pattern id={elId} width="120" height="40" patternUnits="userSpaceOnUse">
          <rect width="120" height="40" fill={c1} />
          <rect y="19" width="120" height="2" fill={c2} />
          <rect x="60" y="0" width="2" height="20" fill={c2} />
          <rect x="20" y="20" width="2" height="20" fill={c2} />
          <path d="M8 10 Q20 6 34 10" stroke={c2} strokeWidth={1.5} fill="none" />
        </pattern>
      );
    case "tiles":
      return (
        <pattern id={elId} width="60" height="60" patternUnits="userSpaceOnUse">
          <rect width="60" height="60" fill={c1} />
          <rect x="2" y="2" width="56" height="56" rx="8" fill={c1} stroke={c2} strokeWidth={3} />
          <circle cx="30" cy="30" r="5" fill={c2} />
        </pattern>
      );
    case "checker":
      return (
        <pattern id={elId} width="60" height="60" patternUnits="userSpaceOnUse">
          <rect width="60" height="60" fill={c1} />
          <rect width="30" height="30" fill={c2} />
          <rect x="30" y="30" width="30" height="30" fill={c2} />
        </pattern>
      );
    case "carpet":
      return (
        <pattern id={elId} width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill={c1} />
          <circle cx="6" cy="6" r="1.6" fill={c2} />
          <circle cx="18" cy="18" r="1.6" fill={c2} />
        </pattern>
      );
    case "grass":
      return (
        <pattern id={elId} width="60" height="40" patternUnits="userSpaceOnUse">
          <rect width="60" height="40" fill={c1} />
          <path d="M8 30 L11 20 L14 30 M38 14 L41 4 L44 14 M50 36 L52 28 L54 36" stroke={c2} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </pattern>
      );
    case "sand":
      return (
        <pattern id={elId} width="50" height="50" patternUnits="userSpaceOnUse">
          <rect width="50" height="50" fill={c1} />
          <circle cx="10" cy="12" r="1.5" fill={c2} /><circle cx="34" cy="20" r="1.5" fill={c2} /><circle cx="22" cy="40" r="1.5" fill={c2} />
        </pattern>
      );
    case "water":
      return (
        <pattern id={elId} width="80" height="30" patternUnits="userSpaceOnUse">
          <rect width="80" height="30" fill={c1} />
          <path d="M0 15 Q20 5 40 15 T80 15" stroke={c2} strokeWidth={3} fill="none" />
        </pattern>
      );
    case "sky":
      return (
        <linearGradient id={elId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={darken(c1, 0.06)} />
          <stop offset="1" stopColor={lighten(c1, 0.6)} />
        </linearGradient>
      );
    case "sunset":
      return (
        <linearGradient id={elId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      );
    case "night":
      return (
        <pattern id={elId} width="120" height={Math.max(120, height)} patternUnits="userSpaceOnUse">
          <rect width="120" height={Math.max(120, height)} fill={c1} />
          <circle cx="20" cy="30" r="2" fill={c2} /><circle cx="80" cy="16" r="1.5" fill={c2} />
          <circle cx="60" cy="70" r="2.5" fill={c2} /><circle cx="100" cy="100" r="1.5" fill={c2} />
          <circle cx="36" cy="110" r="1.5" fill={c2} />
        </pattern>
      );
    default:
      return (
        <pattern id={elId} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill={c1} />
        </pattern>
      );
  }
}
