/* Original kawaii furniture illustrations. Each item draws inside a (0,0)-(w,h) box;
   the room canvas anchors it at bottom-center. c1 = main color, c2 = secondary color. */
import type { ReactNode } from "react";
import type { SeasonId } from "../seasons";
import { darken, lighten, mix } from "../theme/color";

export type Category =
  | "beds" | "sofas" | "chairs" | "desks" | "tables" | "storage" | "rugs" | "lamps" | "mirrors"
  | "plants" | "flowers" | "plushies" | "wall" | "lights" | "party" | "decor" | "seasonal" | "outdoor" | "magic";

export const CATEGORIES: { id: Category; emoji: string }[] = [
  { id: "beds", emoji: "🛏️" }, { id: "sofas", emoji: "🛋️" }, { id: "chairs", emoji: "🪑" },
  { id: "desks", emoji: "💻" }, { id: "tables", emoji: "☕" }, { id: "storage", emoji: "📚" },
  { id: "rugs", emoji: "🧶" }, { id: "lamps", emoji: "💡" }, { id: "mirrors", emoji: "🪞" },
  { id: "plants", emoji: "🪴" }, { id: "flowers", emoji: "🌷" }, { id: "plushies", emoji: "🧸" },
  { id: "wall", emoji: "🖼️" }, { id: "lights", emoji: "✨" }, { id: "party", emoji: "🎈" },
  { id: "decor", emoji: "🎀" }, { id: "seasonal", emoji: "🎃" }, { id: "outdoor", emoji: "⛲" },
  { id: "magic", emoji: "🔮" },
];

export interface ArtProps { c1: string; c2: string; ink: string; hi: string }

export interface ItemDef {
  id: string;
  cat: Category;
  name: { fr: string; en: string };
  w: number;
  h: number;
  place: "floor" | "wall" | "any";
  price: number;
  c1: string;
  c2: string;
  tags: string;
  season?: SeasonId;
  outdoorOnly?: boolean;
  art: (p: ArtProps) => ReactNode;
}

export function artProps(c1: string, c2: string): ArtProps {
  return { c1, c2, ink: mix(darken(c1, 0.45), "#5A2149", 0.45), hi: lighten(c1, 0.55) };
}

const S = (ink: string) => ({ stroke: ink, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const });

function Face({ x, y, ink, s = 1 }: { x: number; y: number; ink: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx={-7} cy={0} r={2.6} fill={ink} />
      <circle cx={7} cy={0} r={2.6} fill={ink} />
      <path d="M-3 4 Q0 7 3 4" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />
      <ellipse cx={-12} cy={5} rx={3.5} ry={2} fill="#FF8FB5" opacity={0.6} />
      <ellipse cx={12} cy={5} rx={3.5} ry={2} fill="#FF8FB5" opacity={0.6} />
    </g>
  );
}

function Heart({ x, y, s, fill, ink }: { x: number; y: number; s: number; fill: string; ink?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 6 C-6 -2 -16 2 -12 10 C-9 16 0 20 0 24 C0 20 9 16 12 10 C16 2 6 -2 0 6Z"
      fill={fill}
      {...(ink ? S(ink) : {})}
      strokeWidth={ink ? 3 / s : 0}
    />
  );
}

function Star({ x, y, r, fill, ink }: { x: number; y: number; r: number; fill: string; ink?: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.48 : r;
    return `${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`;
  }).join(" ");
  return <polygon points={pts} fill={fill} {...(ink ? S(ink) : {})} strokeWidth={ink ? 2.5 : 0} />;
}

function Leaf({ x, y, r, s = 1, fill, ink }: { x: number; y: number; r: number; s?: number; fill: string; ink: string }) {
  return <path transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} d="M0 0 C10 -6 22 -4 28 0 C22 6 10 8 0 0Z" fill={fill} {...S(ink)} strokeWidth={2.5} />;
}

const P = "#FF8FB5";

export const ITEMS: ItemDef[] = [
  // ---------------- Beds ----------------
  {
    id: "bed_heart", cat: "beds", name: { fr: "Lit cœur", en: "Heart bed" }, w: 260, h: 170, place: "floor", price: 0,
    c1: "#FFB3D1", c2: "#FFFFFF", tags: "lit bed coeur heart chambre",
    art: ({ c1, c2, ink, hi }) => (
      <g {...S(ink)}>
        <path d="M30 70 C10 20 70 0 90 40 C110 0 170 20 150 70 Z" fill={c1} transform="translate(-10 -10) scale(1.1)" />
        <rect x="14" y="78" width="232" height="58" rx="22" fill={c2} />
        <rect x="14" y="100" width="232" height="44" rx="18" fill={c1} />
        <rect x="26" y="70" width="70" height="30" rx="14" fill={c2} />
        <path d="M120 100 Q180 88 240 102 L240 128 Q180 116 120 128Z" fill={hi} strokeWidth={2} />
        <rect x="20" y="140" width="16" height="26" rx="6" fill={c1} />
        <rect x="224" y="140" width="16" height="26" rx="6" fill={c1} />
        <Heart x={70} y={22} s={0.9} fill={c2} />
      </g>
    ),
  },
  {
    id: "bed_canopy", cat: "beds", name: { fr: "Lit à baldaquin", en: "Canopy bed" }, w: 270, h: 280, place: "floor", price: 0,
    c1: "#C9B6FF", c2: "#FFE3F0", tags: "lit bed baldaquin canopy princesse princess",
    art: ({ c1, c2, ink, hi }) => (
      <g {...S(ink)}>
        <rect x="22" y="30" width="12" height="236" rx="6" fill={c1} />
        <rect x="236" y="30" width="12" height="236" rx="6" fill={c1} />
        <path d="M14 34 Q135 -10 256 34 Q236 60 214 40 Q190 66 160 42 Q135 70 110 42 Q80 66 56 40 Q34 60 14 34Z" fill={c2} />
        <path d="M34 44 Q40 150 60 200 L34 200Z" fill={c2} opacity={0.85} />
        <path d="M236 44 Q230 150 210 200 L236 200Z" fill={c2} opacity={0.85} />
        <rect x="26" y="170" width="218" height="60" rx="22" fill={hi} />
        <rect x="26" y="196" width="218" height="46" rx="18" fill={c1} />
        <rect x="40" y="160" width="64" height="30" rx="14" fill="#FFFFFF" />
        <Star x={135} y={18} r={10} fill="#FFE08A" />
      </g>
    ),
  },
  {
    id: "bed_cloud", cat: "beds", name: { fr: "Lit nuage", en: "Cloud bed" }, w: 270, h: 160, place: "floor", price: 80,
    c1: "#FFFFFF", c2: "#BFE3FF", tags: "lit bed nuage cloud reve dream",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M30 120 C0 120 0 70 36 72 C30 30 90 20 104 52 C118 14 180 18 182 58 C214 30 270 56 248 96 C276 104 264 140 236 136 Z" fill={c1} />
        <rect x="30" y="104" width="214" height="34" rx="16" fill={c2} />
        <Face x={135} y={78} ink={ink} />
        <rect x="44" y="136" width="14" height="20" rx="6" fill={c2} />
        <rect x="214" y="136" width="14" height="20" rx="6" fill={c2} />
      </g>
    ),
  },
  {
    id: "pet_bed", cat: "beds", name: { fr: "Panier douillet", en: "Cozy pet bed" }, w: 130, h: 70, place: "floor", price: 0,
    c1: "#FF9EBB", c2: "#FFF4D6", tags: "panier pet bed chat cat coussin",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <ellipse cx="65" cy="46" rx="60" ry="22" fill={c1} />
        <ellipse cx="65" cy="40" rx="44" ry="14" fill={c2} />
        <Heart x={65} y={44} s={0.45} fill={c1} />
      </g>
    ),
  },
  // ---------------- Sofas ----------------
  {
    id: "sofa_round", cat: "sofas", name: { fr: "Canapé bonbon", en: "Candy sofa" }, w: 240, h: 140, place: "floor", price: 0,
    c1: "#FF9EC7", c2: "#FFFFFF", tags: "canape sofa salon living",
    art: ({ c1, c2, ink, hi }) => (
      <g {...S(ink)}>
        <rect x="26" y="14" width="188" height="78" rx="38" fill={c1} />
        <rect x="6" y="54" width="54" height="70" rx="26" fill={c1} />
        <rect x="180" y="54" width="54" height="70" rx="26" fill={c1} />
        <rect x="48" y="72" width="144" height="46" rx="18" fill={hi} />
        <circle cx="90" cy="44" r="5" fill={c2} /><circle cx="150" cy="44" r="5" fill={c2} /><circle cx="120" cy="40" r="5" fill={c2} />
        <rect x="30" y="122" width="14" height="16" rx="5" fill={ink} stroke="none" />
        <rect x="196" y="122" width="14" height="16" rx="5" fill={ink} stroke="none" />
      </g>
    ),
  },
  {
    id: "sofa_heart", cat: "sofas", name: { fr: "Causeuse cœur", en: "Heart loveseat" }, w: 210, h: 150, place: "floor", price: 60,
    c1: "#FF7EA8", c2: "#FFD1E2", tags: "canape sofa coeur heart loveseat",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M105 40 C80 -8 10 8 18 66 L192 66 C200 8 130 -8 105 40Z" fill={c1} />
        <rect x="10" y="62" width="190" height="56" rx="24" fill={c2} />
        <rect x="10" y="90" width="190" height="34" rx="16" fill={c1} />
        <rect x="26" y="124" width="12" height="22" rx="5" fill={c1} />
        <rect x="172" y="124" width="12" height="22" rx="5" fill={c1} />
      </g>
    ),
  },
  {
    id: "pouf", cat: "sofas", name: { fr: "Pouf guimauve", en: "Marshmallow pouf" }, w: 100, h: 74, place: "floor", price: 0,
    c1: "#C9B6FF", c2: "#FFFFFF", tags: "pouf siege seat guimauve",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="6" y="14" width="88" height="56" rx="26" fill={c1} />
        <ellipse cx="50" cy="20" rx="42" ry="12" fill={c2} />
        <circle cx="50" cy="20" r="4" fill={c1} />
      </g>
    ),
  },
  {
    id: "beanbag", cat: "sofas", name: { fr: "Pouf poire fraise", en: "Strawberry beanbag" }, w: 130, h: 120, place: "floor", price: 40,
    c1: "#FF6F8E", c2: "#7CCB7A", tags: "beanbag pouf fraise strawberry",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M65 26 C10 26 0 90 20 110 Q65 124 110 110 C130 90 120 26 65 26Z" fill={c1} />
        {[[40, 60], [70, 50], [90, 75], [50, 90], [80, 98]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx={3} ry={4.5} fill="#FFF4D6" stroke="none" />
        ))}
        <path d="M45 28 Q55 6 65 22 Q75 4 86 28 Q66 38 45 28Z" fill={c2} />
      </g>
    ),
  },
  // ---------------- Chairs ----------------
  {
    id: "chair_bow", cat: "chairs", name: { fr: "Chaise nœud", en: "Bow chair" }, w: 90, h: 150, place: "floor", price: 0,
    c1: "#FFFFFF", c2: "#FF8DC0", tags: "chaise chair noeud bow",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="14" y="10" width="62" height="70" rx="22" fill={c1} />
        <path d="M45 34 L22 22 L22 46Z M45 34 L68 22 L68 46Z" fill={c2} />
        <circle cx="45" cy="34" r="6" fill={c2} />
        <rect x="8" y="78" width="74" height="18" rx="9" fill={c2} />
        <rect x="16" y="96" width="9" height="50" rx="4" fill={c1} />
        <rect x="65" y="96" width="9" height="50" rx="4" fill={c1} />
      </g>
    ),
  },
  {
    id: "armchair", cat: "chairs", name: { fr: "Fauteuil moelleux", en: "Fluffy armchair" }, w: 140, h: 140, place: "floor", price: 0,
    c1: "#A8DAFF", c2: "#FFFFFF", tags: "fauteuil armchair lecture reading",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="22" y="8" width="96" height="90" rx="40" fill={c1} />
        <rect x="4" y="56" width="38" height="66" rx="18" fill={c1} />
        <rect x="98" y="56" width="38" height="66" rx="18" fill={c1} />
        <rect x="34" y="78" width="72" height="34" rx="14" fill={c2} />
        <rect x="24" y="120" width="10" height="16" rx="4" fill={ink} stroke="none" />
        <rect x="106" y="120" width="10" height="16" rx="4" fill={ink} stroke="none" />
      </g>
    ),
  },
  {
    id: "stool_mushroom", cat: "chairs", name: { fr: "Tabouret champignon", en: "Mushroom stool" }, w: 90, h: 90, place: "floor", price: 0,
    c1: "#FF7E9E", c2: "#FFF4D6", tags: "tabouret stool champignon mushroom jardin",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="30" y="40" width="30" height="46" rx="12" fill={c2} />
        <path d="M6 44 C6 6 84 6 84 44 Z" fill={c1} />
        <circle cx="30" cy="26" r="6" fill="#FFFFFF" stroke="none" /><circle cx="56" cy="20" r="5" fill="#FFFFFF" stroke="none" /><circle cx="66" cy="36" r="4" fill="#FFFFFF" stroke="none" />
        <Face x={45} y={62} ink={ink} s={0.7} />
      </g>
    ),
  },
  {
    id: "gaming_chair", cat: "chairs", name: { fr: "Fauteuil gamer kawaii", en: "Kawaii gaming chair" }, w: 110, h: 190, place: "floor", price: 90,
    c1: "#FF8DC0", c2: "#FFFFFF", tags: "gaming gamer chaise chair jeu",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <circle cx="30" cy="14" r="12" fill={c1} /><circle cx="80" cy="14" r="12" fill={c1} />
        <rect x="22" y="10" width="66" height="100" rx="26" fill={c1} />
        <rect x="36" y="26" width="38" height="70" rx="16" fill={c2} />
        <rect x="14" y="100" width="82" height="22" rx="10" fill={c1} />
        <rect x="50" y="122" width="10" height="40" fill={ink} stroke="none" />
        <path d="M20 176 L55 160 L90 176" fill="none" strokeWidth={6} />
        <circle cx="20" cy="180" r="6" fill={c2} /><circle cx="90" cy="180" r="6" fill={c2} /><circle cx="55" cy="182" r="6" fill={c2} />
      </g>
    ),
  },
  // ---------------- Desks ----------------
  {
    id: "desk_vanity", cat: "desks", name: { fr: "Coiffeuse", en: "Vanity desk" }, w: 180, h: 220, place: "floor", price: 0,
    c1: "#FFFFFF", c2: "#FFB3D1", tags: "coiffeuse vanity bureau desk miroir mirror",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <ellipse cx="90" cy="56" rx="50" ry="52" fill={c2} />
        <ellipse cx="90" cy="56" rx="38" ry="40" fill="#E9F6FF" />
        <path d="M66 40 L80 30 M64 56 L92 34" stroke="#FFFFFF" strokeWidth={5} />
        <rect x="10" y="110" width="160" height="22" rx="10" fill={c1} />
        <rect x="16" y="132" width="60" height="40" rx="8" fill={c2} />
        <circle cx="46" cy="152" r="4" fill={c1} />
        <rect x="18" y="172" width="10" height="44" rx="4" fill={c1} />
        <rect x="152" y="132" width="10" height="84" rx="4" fill={c1} />
        <rect x="120" y="92" width="14" height="20" rx="4" fill="#C9B6FF" /><circle cx="148" cy="104" r="8" fill="#FFE08A" />
      </g>
    ),
  },
  {
    id: "desk_study", cat: "desks", name: { fr: "Bureau d’études", en: "Study desk" }, w: 200, h: 150, place: "floor", price: 0,
    c1: "#FFE3C4", c2: "#C9B6FF", tags: "bureau desk ordinateur laptop etude study",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M70 40 L130 40 L136 80 L64 80Z" fill={c2} />
        <rect x="74" y="44" width="52" height="30" rx="4" fill="#E9F6FF" />
        <Heart x={100} y={50} s={0.4} fill={P} />
        <rect x="56" y="78" width="88" height="8" rx="4" fill={c2} />
        <rect x="6" y="84" width="188" height="20" rx="9" fill={c1} />
        <rect x="14" y="104" width="10" height="42" rx="4" fill={c1} />
        <rect x="176" y="104" width="10" height="42" rx="4" fill={c1} />
        <rect x="120" y="104" width="50" height="30" rx="6" fill={c1} />
        <rect x="20" y="62" width="14" height="22" rx="3" fill="#FF9EBB" /><rect x="36" y="58" width="12" height="26" rx="3" fill="#A8DAFF" />
      </g>
    ),
  },
  {
    id: "desk_gaming", cat: "desks", name: { fr: "Bureau gaming rose", en: "Pink gaming desk" }, w: 230, h: 170, place: "floor", price: 120,
    c1: "#FFFFFF", c2: "#FF8DC0", tags: "gaming jeu desk bureau ecran monitor console",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="50" y="10" width="130" height="78" rx="10" fill={c2} />
        <rect x="58" y="18" width="114" height="62" rx="6" fill="#2D2547" />
        <Star x={115} y={48} r={14} fill="#FFE08A" />
        <circle cx="86" cy="36" r="4" fill="#8FE3FF" stroke="none" /><circle cx="148" cy="62" r="4" fill="#FF9FD8" stroke="none" />
        <rect x="106" y="88" width="18" height="14" fill={c2} />
        <rect x="6" y="100" width="218" height="22" rx="10" fill={c1} />
        <rect x="60" y="94" width="60" height="8" rx="4" fill="#C9B6FF" />
        <rect x="140" y="92" width="34" height="10" rx="5" fill={c2} />
        <rect x="14" y="122" width="12" height="44" rx="4" fill={c1} />
        <rect x="204" y="122" width="12" height="44" rx="4" fill={c1} />
      </g>
    ),
  },
  // ---------------- Tables ----------------
  {
    id: "table_round", cat: "tables", name: { fr: "Table de café", en: "Café table" }, w: 140, h: 120, place: "floor", price: 0,
    c1: "#FFFFFF", c2: "#FF9EBB", tags: "table cafe ronde round",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <ellipse cx="70" cy="30" rx="64" ry="18" fill={c1} />
        <path d="M10 32 Q70 60 130 32" fill="none" stroke={c2} strokeWidth={6} />
        <rect x="62" y="44" width="16" height="60" rx="6" fill={c2} />
        <ellipse cx="70" cy="110" rx="40" ry="8" fill={c2} />
      </g>
    ),
  },
  {
    id: "table_coffee", cat: "tables", name: { fr: "Table basse", en: "Coffee table" }, w: 180, h: 80, place: "floor", price: 0,
    c1: "#FFE3C4", c2: "#FFFFFF", tags: "table basse coffee salon",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="6" y="14" width="168" height="22" rx="11" fill={c1} />
        <rect x="18" y="36" width="12" height="40" rx="5" fill={c1} />
        <rect x="150" y="36" width="12" height="40" rx="5" fill={c1} />
        <rect x="30" y="52" width="120" height="8" rx="4" fill={c2} />
      </g>
    ),
  },
  {
    id: "tea_set", cat: "tables", name: { fr: "Service à thé", en: "Tea set" }, w: 110, h: 70, place: "any", price: 30,
    c1: "#FFFFFF", c2: "#FF9EBB", tags: "the tea theiere teapot tasse cup",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M10 30 Q10 64 38 64 Q66 64 66 30 Z" fill={c1} />
        <path d="M66 36 Q82 30 76 48" fill="none" />
        <path d="M10 36 L0 26" />
        <ellipse cx="38" cy="28" rx="26" ry="6" fill={c2} />
        <circle cx="38" cy="18" r="6" fill={c2} />
        <Heart x={38} y={38} s={0.45} fill={c2} />
        <path d="M80 48 Q80 64 94 64 Q108 64 108 48Z" fill={c1} />
        <ellipse cx="94" cy="48" rx="14" ry="4" fill="#E8B07A" />
      </g>
    ),
  },
  {
    id: "cake_stand", cat: "tables", name: { fr: "Présentoir à gâteaux", en: "Cake stand" }, w: 100, h: 120, place: "any", price: 0,
    c1: "#FFFFFF", c2: "#FF9EBB", tags: "gateau cake cupcake patisserie macaron",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="47" y="10" width="6" height="104" fill={c1} />
        <ellipse cx="50" cy="56" rx="40" ry="8" fill={c1} />
        <ellipse cx="50" cy="104" rx="46" ry="9" fill={c1} />
        <path d="M30 52 Q30 34 40 34 Q50 34 50 52Z" fill={c2} /><path d="M54 52 Q54 34 64 34 Q74 34 74 52Z" fill="#C9B6FF" />
        <ellipse cx="34" cy="96" rx="12" ry="7" fill="#A8E6C8" /><ellipse cx="62" cy="96" rx="12" ry="7" fill={c2} />
        <circle cx="50" cy="10" r="5" fill={c2} />
      </g>
    ),
  },
  // ---------------- Storage ----------------
  {
    id: "wardrobe", cat: "storage", name: { fr: "Armoire princesse", en: "Princess wardrobe" }, w: 160, h: 250, place: "floor", price: 0,
    c1: "#FFFFFF", c2: "#FFB3D1", tags: "armoire wardrobe rangement vetements",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M12 40 Q80 0 148 40 L148 236 L12 236Z" fill={c1} />
        <path d="M24 48 Q50 32 76 30 L76 220 L24 220Z" fill={c2} />
        <path d="M84 30 Q110 32 136 48 L136 220 L84 220Z" fill={c2} />
        <circle cx="70" cy="130" r="5" fill={c1} /><circle cx="90" cy="130" r="5" fill={c1} />
        <Heart x={80} y={6} s={0.7} fill={c2} />
        <rect x="18" y="236" width="14" height="12" rx="4" fill={c1} /><rect x="128" y="236" width="14" height="12" rx="4" fill={c1} />
      </g>
    ),
  },
  {
    id: "bookshelf", cat: "storage", name: { fr: "Bibliothèque", en: "Bookshelf" }, w: 150, h: 220, place: "floor", price: 0,
    c1: "#FFE3C4", c2: "#FF9EBB", tags: "bibliotheque bookshelf livres books lecture reading",
    art: ({ c1, ink }) => {
      const books = ["#FF9EBB", "#C9B6FF", "#A8DAFF", "#FFE08A", "#A8E6C8", "#FFB38A"];
      return (
        <g {...S(ink)}>
          <rect x="6" y="6" width="138" height="208" rx="12" fill={c1} />
          {[0, 1, 2].map((r) => (
            <g key={r}>
              <rect x="16" y={18 + r * 64} width="118" height="54" rx="4" fill={mix(c1, "#000000", 0.08)} />
              {books.slice(r, r + 4).map((b, i) => (
                <rect key={i} x={22 + i * 24} y={26 + r * 64 + (i % 2) * 6} width="18" height={46 - (i % 2) * 6} rx="3" fill={b} strokeWidth={2} />
              ))}
            </g>
          ))}
          <circle cx="122" cy="44" r="7" fill="#FFFFFF" strokeWidth={2} />
        </g>
      );
    },
  },
  {
    id: "dresser", cat: "storage", name: { fr: "Commode", en: "Dresser" }, w: 160, h: 120, place: "floor", price: 0,
    c1: "#C9B6FF", c2: "#FFFFFF", tags: "commode dresser tiroirs drawers",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="8" y="8" width="144" height="100" rx="14" fill={c1} />
        {[0, 1, 2].map((r) => (
          <g key={r}>
            <rect x="18" y={16 + r * 30} width="124" height="24" rx="8" fill={lighten(c1, 0.3)} />
            <Heart x={80} y={20 + r * 30} s={0.35} fill={c2} />
          </g>
        ))}
        <rect x="16" y="106" width="12" height="12" rx="4" fill={c1} /><rect x="132" y="106" width="12" height="12" rx="4" fill={c1} />
      </g>
    ),
  },
  {
    id: "toy_chest", cat: "storage", name: { fr: "Coffre à jouets", en: "Toy chest" }, w: 130, h: 90, place: "floor", price: 0,
    c1: "#FFB38A", c2: "#FFE08A", tags: "coffre chest jouets toys",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="6" y="30" width="118" height="56" rx="10" fill={c1} />
        <path d="M6 36 Q6 6 65 6 Q124 6 124 36Z" fill={lighten(c1, 0.2)} />
        <rect x="56" y="28" width="18" height="22" rx="4" fill={c2} />
        <Star x={30} y={60} r={9} fill={c2} /><Star x={100} y={60} r={9} fill={c2} />
      </g>
    ),
  },
  // ---------------- Rugs ----------------
  {
    id: "rug_round", cat: "rugs", name: { fr: "Tapis rond", en: "Round rug" }, w: 240, h: 70, place: "floor", price: 0,
    c1: "#FFD1E2", c2: "#FFFFFF", tags: "tapis rug rond round",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)} strokeWidth={2.5}>
        <ellipse cx="120" cy="35" rx="116" ry="31" fill={c1} />
        <ellipse cx="120" cy="35" rx="84" ry="21" fill={c2} />
        <ellipse cx="120" cy="35" rx="50" ry="12" fill={c1} />
      </g>
    ),
  },
  {
    id: "rug_heart", cat: "rugs", name: { fr: "Tapis cœur", en: "Heart rug" }, w: 200, h: 80, place: "floor", price: 0,
    c1: "#FF9EBB", c2: "#FFE3EE", tags: "tapis rug coeur heart",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)} strokeWidth={2.5}>
        <path d="M100 22 C80 0 10 6 12 36 C14 60 70 72 100 78 C130 72 186 60 188 36 C190 6 120 0 100 22Z" fill={c1} />
        <path d="M100 30 C86 16 40 20 40 38 C40 52 80 60 100 64 C120 60 160 52 160 38 C160 20 114 16 100 30Z" fill={c2} />
      </g>
    ),
  },
  {
    id: "rug_cloud", cat: "rugs", name: { fr: "Tapis nuage", en: "Cloud rug" }, w: 230, h: 70, place: "floor", price: 0,
    c1: "#E9F6FF", c2: "#BFE3FF", tags: "tapis rug nuage cloud",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)} strokeWidth={2.5}>
        <path d="M30 60 C0 60 4 30 30 32 C30 10 70 4 84 22 C100 2 140 4 148 22 C170 6 214 16 204 38 C230 40 228 64 200 64Z" fill={c1} />
        <path d="M60 50 Q115 40 170 50" fill="none" stroke={c2} strokeWidth={6} />
      </g>
    ),
  },
  {
    id: "rug_stripes", cat: "rugs", name: { fr: "Tapis rayé", en: "Striped rug" }, w: 230, h: 64, place: "floor", price: 20,
    c1: "#C9B6FF", c2: "#FFFFFF", tags: "tapis rug rayures stripes",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)} strokeWidth={2.5}>
        <path d="M20 6 L210 6 L226 58 L4 58Z" fill={c1} />
        {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${46 + i * 36} 6 L${40 + i * 38} 58`} stroke={c2} strokeWidth={8} />)}
        <path d="M20 6 L210 6 L226 58 L4 58Z" fill="none" />
      </g>
    ),
  },
  // ---------------- Lamps ----------------
  {
    id: "lamp_floor", cat: "lamps", name: { fr: "Lampadaire tulipe", en: "Tulip floor lamp" }, w: 90, h: 220, place: "floor", price: 0,
    c1: "#FFB3D1", c2: "#FFF4D6", tags: "lampe lamp lampadaire lumiere light",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <circle cx="45" cy="44" r="40" fill={c2} opacity={0.35} stroke="none" />
        <path d="M14 56 Q10 14 45 10 Q80 14 76 56 Z" fill={c1} />
        <path d="M14 56 Q30 46 45 56 Q60 46 76 56" fill="none" />
        <rect x="41" y="56" width="8" height="150" rx="4" fill={c2} />
        <ellipse cx="45" cy="210" rx="30" ry="8" fill={c1} />
      </g>
    ),
  },
  {
    id: "lamp_table", cat: "lamps", name: { fr: "Lampe de chevet", en: "Bedside lamp" }, w: 70, h: 100, place: "any", price: 0,
    c1: "#C9B6FF", c2: "#FFE08A", tags: "lampe lamp chevet bedside",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <circle cx="35" cy="34" r="30" fill={c2} opacity={0.35} stroke="none" />
        <path d="M10 46 L18 10 L52 10 L60 46Z" fill={c2} />
        <rect x="31" y="46" width="8" height="30" fill={c1} />
        <ellipse cx="35" cy="84" rx="22" ry="12" fill={c1} />
      </g>
    ),
  },
  {
    id: "lamp_moon", cat: "lamps", name: { fr: "Veilleuse lune", en: "Moon night light" }, w: 90, h: 90, place: "wall", price: 40,
    c1: "#FFE08A", c2: "#FFFFFF", tags: "lune moon veilleuse nightlight etoile",
    art: ({ c1, ink }) => (
      <g {...S(ink)}>
        <circle cx="45" cy="45" r="44" fill={c1} opacity={0.25} stroke="none" />
        <path d="M58 10 A36 36 0 1 0 80 62 A28 28 0 1 1 58 10Z" fill={c1} />
        <g transform="translate(38 50)"><circle cx="-6" cy="0" r="2.4" fill={ink} stroke="none" /><path d="M2 -1 Q5 2 8 -1" fill="none" strokeWidth={2} /></g>
      </g>
    ),
  },
  {
    id: "lamp_mushroom", cat: "lamps", name: { fr: "Lampe champignon", en: "Mushroom lamp" }, w: 70, h: 80, place: "any", price: 0,
    c1: "#FFB3D1", c2: "#FFF4D6", tags: "lampe lamp champignon mushroom",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <circle cx="35" cy="30" r="34" fill="#FFE08A" opacity={0.3} stroke="none" />
        <rect x="26" y="34" width="18" height="40" rx="8" fill={c2} />
        <path d="M4 38 C4 4 66 4 66 38Z" fill={c1} />
        <circle cx="22" cy="24" r="4" fill="#FFFFFF" stroke="none" /><circle cx="44" cy="18" r="3" fill="#FFFFFF" stroke="none" />
      </g>
    ),
  },
  // ---------------- Mirrors ----------------
  {
    id: "mirror_heart", cat: "mirrors", name: { fr: "Miroir cœur", en: "Heart mirror" }, w: 110, h: 100, place: "wall", price: 0,
    c1: "#FFB3D1", c2: "#E9F6FF", tags: "miroir mirror coeur heart",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M55 24 C40 0 0 6 4 40 C8 68 44 86 55 96 C66 86 102 68 106 40 C110 6 70 0 55 24Z" fill={c1} />
        <path d="M55 34 C44 16 16 22 18 44 C20 62 46 76 55 82 C64 76 90 62 92 44 C94 22 66 16 55 34Z" fill={c2} />
        <path d="M32 36 L44 28 M30 50 L50 32" stroke="#FFFFFF" strokeWidth={4} />
      </g>
    ),
  },
  {
    id: "mirror_oval", cat: "mirrors", name: { fr: "Grand miroir", en: "Standing mirror" }, w: 90, h: 200, place: "floor", price: 30,
    c1: "#FFE08A", c2: "#E9F6FF", tags: "miroir mirror grand standing",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <ellipse cx="45" cy="84" rx="40" ry="78" fill={c1} />
        <ellipse cx="45" cy="84" rx="30" ry="66" fill={c2} />
        <path d="M28 50 L40 40 M26 70 L48 48" stroke="#FFFFFF" strokeWidth={4} />
        <path d="M20 190 L45 160 L70 190" fill="none" strokeWidth={5} />
        <Heart x={45} y={0} s={0.5} fill="#FF8FB5" />
      </g>
    ),
  },
  // ---------------- Plants ----------------
  {
    id: "plant_monstera", cat: "plants", name: { fr: "Grande plante", en: "Big plant" }, w: 120, h: 170, place: "floor", price: 0,
    c1: "#8FD6A8", c2: "#FFB3D1", tags: "plante plant monstera vert green",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M60 110 Q40 60 14 40" fill="none" strokeWidth={4} /><path d="M60 110 Q64 50 60 14" fill="none" strokeWidth={4} /><path d="M60 110 Q86 60 108 46" fill="none" strokeWidth={4} />
        <ellipse cx="22" cy="44" rx="20" ry="14" fill={c1} transform="rotate(-30 22 44)" />
        <ellipse cx="60" cy="22" rx="16" ry="22" fill={c1} />
        <ellipse cx="100" cy="50" rx="20" ry="14" fill={c1} transform="rotate(30 100 50)" />
        <ellipse cx="40" cy="78" rx="16" ry="11" fill={c1} transform="rotate(-20 40 78)" />
        <ellipse cx="82" cy="80" rx="16" ry="11" fill={c1} transform="rotate(20 82 80)" />
        <path d="M26 108 L94 108 L84 166 L36 166Z" fill={c2} />
        <Face x={60} y={134} ink={ink} s={0.8} />
      </g>
    ),
  },
  {
    id: "plant_cactus", cat: "plants", name: { fr: "Petit cactus", en: "Little cactus" }, w: 70, h: 100, place: "any", price: 0,
    c1: "#A8E6C8", c2: "#C9B6FF", tags: "cactus plante plant",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="22" y="10" width="28" height="64" rx="14" fill={c1} />
        <path d="M22 46 Q8 46 8 30" fill="none" stroke={c1} strokeWidth={10} />
        <path d="M50 38 Q62 38 62 24" fill="none" stroke={c1} strokeWidth={10} />
        <circle cx="36" cy="10" r="6" fill="#FF8FB5" />
        <Face x={36} y={40} ink={ink} s={0.6} />
        <path d="M12 70 L60 70 L54 96 L18 96Z" fill={c2} />
      </g>
    ),
  },
  {
    id: "plant_hanging", cat: "plants", name: { fr: "Plante suspendue", en: "Hanging plant" }, w: 90, h: 140, place: "wall", price: 20,
    c1: "#8FD6A8", c2: "#FFE3C4", tags: "plante suspendue hanging plant",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M45 0 L20 60 M45 0 L70 60" fill="none" strokeWidth={2} />
        <path d="M18 58 L72 58 Q70 84 45 84 Q20 84 18 58Z" fill={c2} />
        {[20, 34, 56, 70].map((x, i) => (
          <path key={i} d={`M${x} 70 Q${x - 8} ${100 + i * 8} ${x + 2} ${120 + (i % 2) * 14}`} fill="none" stroke={c1} strokeWidth={6} />
        ))}
        <ellipse cx="45" cy="56" rx="26" ry="8" fill={c1} />
      </g>
    ),
  },
  // ---------------- Flowers ----------------
  {
    id: "vase_tulips", cat: "flowers", name: { fr: "Vase de tulipes", en: "Tulip vase" }, w: 80, h: 120, place: "any", price: 0,
    c1: "#FF8FB5", c2: "#BFE3FF", tags: "fleurs flowers tulipes tulips vase",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        {[[24, 20], [40, 10], [56, 22]].map(([x, y], i) => (
          <g key={i}>
            <path d={`M${x} ${y + 14} L40 76`} fill="none" stroke="#7CCB7A" strokeWidth={4} />
            <path d={`M${x - 10} ${y} L${x - 5} ${y + 16} Q${x} ${y + 22} ${x + 5} ${y + 16} L${x + 10} ${y} L${x + 4} ${y + 6} L${x} ${y - 2} L${x - 4} ${y + 6}Z`} fill={i === 1 ? "#FFE08A" : c1} />
          </g>
        ))}
        <path d="M22 72 Q14 116 40 116 Q66 116 58 72Z" fill={c2} />
      </g>
    ),
  },
  {
    id: "pot_daisy", cat: "flowers", name: { fr: "Pot de marguerites", en: "Daisy pot" }, w: 80, h: 90, place: "any", price: 0,
    c1: "#FFFFFF", c2: "#FFB38A", tags: "marguerite daisy fleur flower pot",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        {[[22, 26], [56, 20], [40, 40]].map(([x, y], i) => (
          <g key={i}>
            {Array.from({ length: 8 }).map((_, k) => (
              <ellipse key={k} cx={x} cy={y - 9} rx={4} ry={8} fill={c1} transform={`rotate(${k * 45} ${x} ${y})`} strokeWidth={1.5} />
            ))}
            <circle cx={x} cy={y} r={5} fill="#FFE08A" strokeWidth={1.5} />
          </g>
        ))}
        <path d="M14 56 L66 56 L58 88 L22 88Z" fill={c2} />
      </g>
    ),
  },
  {
    id: "sunflower", cat: "flowers", name: { fr: "Tournesol", en: "Sunflower" }, w: 80, h: 160, place: "floor", price: 20,
    c1: "#FFD45E", c2: "#8B5A3C", tags: "tournesol sunflower fleur ete summer jardin",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M40 60 L40 158" fill="none" stroke="#7CCB7A" strokeWidth={6} />
        <Leaf x={40} y={110} r={-20} fill="#8FD6A8" ink={ink} />
        <Leaf x={40} y={124} r={200} fill="#8FD6A8" ink={ink} />
        {Array.from({ length: 12 }).map((_, k) => (
          <ellipse key={k} cx={40} cy={18} rx={7} ry={14} fill={c1} transform={`rotate(${k * 30} 40 38)`} strokeWidth={2} />
        ))}
        <circle cx="40" cy="38" r="15" fill={c2} />
        <Face x={40} y={36} ink="#FFF4D6" s={0.6} />
      </g>
    ),
  },
  {
    id: "rose_bush", cat: "flowers", name: { fr: "Rosier", en: "Rose bush" }, w: 140, h: 110, place: "floor", price: 0,
    c1: "#8FD6A8", c2: "#FF7EA8", tags: "rosier rose bush jardin garden",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M14 104 C0 60 30 30 60 40 C70 10 120 14 122 50 C146 56 140 104 126 104Z" fill={c1} />
        {[[40, 60], [76, 44], [104, 66], [62, 82], [96, 92]].map(([x, y], i) => (
          <g key={i}><circle cx={x} cy={y} r={11} fill={c2} /><path d={`M${x - 5} ${y} Q${x} ${y - 6} ${x + 5} ${y} Q${x} ${y + 5} ${x - 3} ${y + 1}`} fill="none" strokeWidth={2} /></g>
        ))}
      </g>
    ),
  },
  // ---------------- Plushies ----------------
  {
    id: "plush_bear", cat: "plushies", name: { fr: "Nounours", en: "Teddy bear" }, w: 90, h: 100, place: "any", price: 0,
    c1: "#FFD8B8", c2: "#FF8FB5", tags: "peluche plush ours bear nounours teddy",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <circle cx="22" cy="16" r="12" fill={c1} /><circle cx="68" cy="16" r="12" fill={c1} />
        <ellipse cx="45" cy="76" rx="32" ry="24" fill={c1} />
        <circle cx="45" cy="40" r="30" fill={c1} />
        <ellipse cx="45" cy="50" rx="12" ry="9" fill={lighten(c1, 0.5)} />
        <Face x={45} y={40} ink={ink} s={0.8} />
        <path d="M45 66 L32 58 L32 74Z M45 66 L58 58 L58 74Z" fill={c2} />
      </g>
    ),
  },
  {
    id: "plush_bunny", cat: "plushies", name: { fr: "Lapin doudou", en: "Bunny plush" }, w: 80, h: 120, place: "any", price: 0,
    c1: "#FFFFFF", c2: "#FFB3D1", tags: "peluche plush lapin bunny",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <ellipse cx="26" cy="30" rx="11" ry="28" fill={c1} /><ellipse cx="54" cy="30" rx="11" ry="28" fill={c1} />
        <ellipse cx="26" cy="32" rx="5" ry="18" fill={c2} stroke="none" /><ellipse cx="54" cy="32" rx="5" ry="18" fill={c2} stroke="none" />
        <ellipse cx="40" cy="98" rx="28" ry="20" fill={c1} />
        <circle cx="40" cy="70" r="26" fill={c1} />
        <Face x={40} y={70} ink={ink} s={0.75} />
      </g>
    ),
  },
  {
    id: "plush_cat", cat: "plushies", name: { fr: "Mini chaton", en: "Mini kitten plush" }, w: 80, h: 80, place: "any", price: 0,
    c1: "#FFFFFF", c2: "#FF7EB6", tags: "peluche plush chat cat chaton kitten",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M12 30 L16 4 L34 20Z" fill={c1} /><path d="M68 30 L64 4 L46 20Z" fill={c1} />
        <ellipse cx="40" cy="44" rx="34" ry="28" fill={c1} />
        <path d="M58 16 L50 8 L50 24Z M58 16 L66 8 L66 24Z" fill={c2} /><circle cx="58" cy="16" r="4" fill={c2} />
        <circle cx="29" cy="44" r="3.4" fill={ink} stroke="none" /><circle cx="51" cy="44" r="3.4" fill={ink} stroke="none" />
        <ellipse cx="40" cy="51" rx="3" ry="2" fill="#FFC44D" strokeWidth={1.5} />
        <path d="M6 44 L18 46 M6 52 L18 50 M74 44 L62 46 M74 52 L62 50" strokeWidth={2} />
      </g>
    ),
  },
  {
    id: "plush_strawberry", cat: "plushies", name: { fr: "Coussin fraise", en: "Strawberry cushion" }, w: 80, h: 84, place: "any", price: 0,
    c1: "#FF6F8E", c2: "#7CCB7A", tags: "fraise strawberry coussin cushion peluche",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M40 18 C4 14 0 60 40 82 C80 60 76 14 40 18Z" fill={c1} />
        {[[24, 40], [56, 40], [40, 62], [30, 56], [50, 54]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={2} ry={3} fill="#FFF4D6" stroke="none" />)}
        <path d="M22 20 Q30 2 40 14 Q50 2 58 20 Q40 28 22 20Z" fill={c2} />
        <Face x={40} y={42} ink={ink} s={0.6} />
      </g>
    ),
  },
  {
    id: "plush_star", cat: "plushies", name: { fr: "Étoile câline", en: "Cuddly star" }, w: 90, h: 86, place: "any", price: 20,
    c1: "#FFE08A", c2: "#FF8FB5", tags: "etoile star peluche plush",
    art: ({ c1, ink }) => (
      <g>
        <Star x={45} y={46} r={42} fill={c1} ink={ink} />
        <Face x={45} y={48} ink={ink} s={0.8} />
      </g>
    ),
  },
  // ---------------- Wall decor ----------------
  {
    id: "poster_heart", cat: "wall", name: { fr: "Affiche cœur", en: "Heart poster" }, w: 90, h: 120, place: "wall", price: 0,
    c1: "#FFFFFF", c2: "#FF8FB5", tags: "affiche poster coeur heart",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="4" y="4" width="82" height="112" rx="6" fill={c1} />
        <Heart x={45} y={32} s={1.6} fill={c2} />
        <path d="M24 98 L66 98" strokeWidth={4} />
      </g>
    ),
  },
  {
    id: "poster_rainbow", cat: "wall", name: { fr: "Affiche arc-en-ciel", en: "Rainbow poster" }, w: 110, h: 90, place: "wall", price: 0,
    c1: "#FFF8E7", c2: "#FF8FB5", tags: "arc-en-ciel rainbow affiche poster",
    art: ({ c1, ink }) => (
      <g {...S(ink)}>
        <rect x="4" y="4" width="102" height="82" rx="8" fill={c1} />
        {["#FF8FB5", "#FFB38A", "#FFE08A", "#A8E6C8", "#A8DAFF", "#C9B6FF"].map((c, i) => (
          <path key={i} d={`M${20 + i * 6} 70 A${35 - i * 6} ${35 - i * 6} 0 0 1 ${90 - i * 6} 70`} fill="none" stroke={c} strokeWidth={6} />
        ))}
        <ellipse cx="22" cy="72" rx="12" ry="7" fill="#FFFFFF" /><ellipse cx="88" cy="72" rx="12" ry="7" fill="#FFFFFF" />
      </g>
    ),
  },
  {
    id: "frame_photo", cat: "wall", name: { fr: "Cadre photo", en: "Photo frame" }, w: 90, h: 80, place: "wall", price: 0,
    c1: "#FFE08A", c2: "#BFE3FF", tags: "cadre frame photo",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="4" y="4" width="82" height="72" rx="10" fill={c1} />
        <rect x="16" y="16" width="58" height="48" rx="4" fill={c2} />
        <path d="M16 56 L34 40 L48 52 L58 44 L74 58 L74 64 L16 64Z" fill="#A8E6C8" strokeWidth={2} />
        <circle cx="60" cy="28" r="6" fill="#FFF4D6" strokeWidth={2} />
      </g>
    ),
  },
  {
    id: "window_round", cat: "wall", name: { fr: "Fenêtre ronde", en: "Round window" }, w: 130, h: 130, place: "wall", price: 0,
    c1: "#FFFFFF", c2: "#BFE3FF", tags: "fenetre window ciel sky",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <circle cx="65" cy="65" r="60" fill={c1} />
        <circle cx="65" cy="65" r="48" fill={c2} />
        <ellipse cx="50" cy="76" rx="18" ry="9" fill="#FFFFFF" stroke="none" /><ellipse cx="82" cy="54" rx="14" ry="7" fill="#FFFFFF" stroke="none" />
        <path d="M65 17 L65 113 M17 65 L113 65" stroke={c1} strokeWidth={6} />
      </g>
    ),
  },
  {
    id: "clock_cloud", cat: "wall", name: { fr: "Horloge nuage", en: "Cloud clock" }, w: 100, h: 80, place: "wall", price: 20,
    c1: "#FFFFFF", c2: "#FF8FB5", tags: "horloge clock nuage cloud",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M20 72 C0 72 0 44 20 44 C18 16 52 6 62 26 C78 12 104 28 92 50 C104 56 98 74 84 72Z" fill={c1} />
        <circle cx="54" cy="48" r="18" fill="#FFF8E7" />
        <path d="M54 48 L54 36 M54 48 L62 52" stroke={c2} strokeWidth={3} />
      </g>
    ),
  },
  {
    id: "shelf_wall", cat: "wall", name: { fr: "Étagère murale", en: "Wall shelf" }, w: 150, h: 70, place: "wall", price: 0,
    c1: "#FFE3C4", c2: "#FF8FB5", tags: "etagere shelf mur wall",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="4" y="52" width="142" height="12" rx="5" fill={c1} />
        <path d="M20 64 L20 68 M130 64 L130 68" />
        <rect x="16" y="22" width="14" height="30" rx="3" fill="#C9B6FF" strokeWidth={2} /><rect x="32" y="28" width="12" height="24" rx="3" fill="#A8DAFF" strokeWidth={2} />
        <path d="M66 52 Q66 30 80 30 Q94 30 94 52Z" fill={c2} strokeWidth={2} />
        <circle cx="122" cy="40" r="12" fill="#A8E6C8" strokeWidth={2} />
      </g>
    ),
  },
  {
    id: "bow_wall", cat: "wall", name: { fr: "Nœud géant", en: "Giant bow" }, w: 140, h: 90, place: "wall", price: 0,
    c1: "#FF8DC0", c2: "#FFFFFF", tags: "noeud bow ruban ribbon",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M70 42 C40 4 4 10 8 40 C10 70 44 74 70 48Z" fill={c1} />
        <path d="M70 42 C100 4 136 10 132 40 C130 70 96 74 70 48Z" fill={c1} />
        <path d="M60 52 L44 88 L58 82 L64 88Z M80 52 L96 88 L82 82 L76 88Z" fill={c1} />
        <ellipse cx="70" cy="45" rx="13" ry="15" fill={c1} />
        <path d="M24 30 Q36 22 46 34" fill="none" stroke={c2} strokeWidth={4} /><path d="M116 30 Q104 22 94 34" fill="none" stroke={c2} strokeWidth={4} />
      </g>
    ),
  },
  // ---------------- Lights ----------------
  {
    id: "fairy_lights", cat: "lights", name: { fr: "Guirlande lumineuse", en: "Fairy lights" }, w: 300, h: 60, place: "wall", price: 0,
    c1: "#FFE08A", c2: "#FF8FB5", tags: "guirlande fairy lights lumieres",
    art: ({ c1, c2, ink }) => (
      <g>
        <path d="M4 10 Q75 50 150 14 Q225 50 296 10" fill="none" stroke={ink} strokeWidth={2.5} />
        {Array.from({ length: 11 }).map((_, i) => {
          const x = 14 + i * 27;
          const y = 10 + Math.sin((i / 10) * Math.PI * 2 - Math.PI / 2) * -14 + 18;
          const c = [c1, c2, "#A8DAFF", "#C9B6FF"][i % 4];
          return (
            <g key={i}>
              <circle cx={x} cy={y + 12} r={12} fill={c} opacity={0.3} />
              <ellipse cx={x} cy={y + 10} rx={6} ry={8} fill={c} stroke={ink} strokeWidth={2} />
            </g>
          );
        })}
      </g>
    ),
  },
  {
    id: "star_lights", cat: "lights", name: { fr: "Rideau d’étoiles", en: "Star curtain" }, w: 200, h: 150, place: "wall", price: 40,
    c1: "#FFE08A", c2: "#FFFFFF", tags: "etoiles stars rideau curtain lumieres lights",
    art: ({ c1, ink }) => (
      <g>
        <path d="M4 6 L196 6" stroke={ink} strokeWidth={3} strokeLinecap="round" />
        {[20, 52, 84, 116, 148, 180].map((x, i) => {
          const len = 60 + ((i * 37) % 70);
          return (
            <g key={i}>
              <path d={`M${x} 6 L${x} ${len}`} stroke={ink} strokeWidth={1.5} />
              <Star x={x} y={len} r={11} fill={c1} ink={ink} />
              <Star x={x} y={len / 2 + 6} r={6} fill={c1} />
            </g>
          );
        })}
      </g>
    ),
  },
  {
    id: "lantern", cat: "lights", name: { fr: "Lanterne", en: "Lantern" }, w: 60, h: 100, place: "any", price: 0,
    c1: "#FFB3D1", c2: "#FFE08A", tags: "lanterne lantern lumiere light",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M30 4 L30 14" />
        <circle cx="30" cy="54" r="30" fill={c2} opacity={0.3} stroke="none" />
        <rect x="16" y="14" width="28" height="10" rx="4" fill={c1} />
        <rect x="10" y="24" width="40" height="60" rx="16" fill={c2} />
        <path d="M18 30 L18 78 M30 26 L30 82 M42 30 L42 78" stroke={c1} strokeWidth={2} />
        <rect x="16" y="84" width="28" height="10" rx="4" fill={c1} />
      </g>
    ),
  },
  // ---------------- Party ----------------
  {
    id: "balloons", cat: "party", name: { fr: "Bouquet de ballons", en: "Balloon bunch" }, w: 110, h: 200, place: "any", price: 0,
    c1: "#FF8FB5", c2: "#C9B6FF", tags: "ballons balloons fete party anniversaire",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M55 196 Q50 150 30 80 M55 196 Q56 140 58 60 M55 196 Q66 150 84 84" fill="none" strokeWidth={1.8} />
        <ellipse cx="30" cy="56" rx="26" ry="30" fill={c1} />
        <ellipse cx="82" cy="60" rx="24" ry="28" fill={c2} />
        <ellipse cx="58" cy="32" rx="26" ry="30" fill="#A8DAFF" />
        <path d="M22 44 Q24 36 30 34" fill="none" stroke="#FFFFFF" strokeWidth={4} /><path d="M50 20 Q52 12 58 10" fill="none" stroke="#FFFFFF" strokeWidth={4} />
      </g>
    ),
  },
  {
    id: "balloon_heart", cat: "party", name: { fr: "Ballon cœur", en: "Heart balloon" }, w: 70, h: 150, place: "any", price: 0,
    c1: "#FF6F9E", c2: "#FFFFFF", tags: "ballon balloon coeur heart",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M35 66 Q30 110 38 146" fill="none" strokeWidth={1.8} />
        <path d="M35 18 C24 -2 -4 6 2 32 C6 50 26 60 35 68 C44 60 64 50 68 32 C74 6 46 -2 35 18Z" fill={c1} />
        <path d="M14 22 Q18 14 26 14" fill="none" stroke={c2} strokeWidth={4} />
      </g>
    ),
  },
  {
    id: "birthday_cake", cat: "party", name: { fr: "Gâteau d’anniversaire", en: "Birthday cake" }, w: 110, h: 110, place: "any", price: 0,
    c1: "#FFFFFF", c2: "#FF8FB5", tags: "gateau cake anniversaire birthday fete",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        {[30, 55, 80].map((x) => (
          <g key={x}><rect x={x - 3} y="14" width="6" height="22" rx="2" fill="#A8DAFF" /><path d={`M${x} 2 Q${x + 6} 10 ${x} 14 Q${x - 6} 10 ${x} 2Z`} fill="#FFC44D" /></g>
        ))}
        <rect x="16" y="36" width="78" height="30" rx="10" fill={c2} />
        <path d="M16 46 Q26 56 36 46 Q46 56 56 46 Q66 56 76 46 Q86 56 94 46" fill="none" stroke={c1} strokeWidth={4} />
        <rect x="6" y="64" width="98" height="38" rx="12" fill={c1} />
        <path d="M6 76 Q18 88 30 76 Q42 88 55 76 Q68 88 80 76 Q92 88 104 76" fill="none" stroke={c2} strokeWidth={4} />
      </g>
    ),
  },
  {
    id: "gift_box", cat: "party", name: { fr: "Boîte cadeau", en: "Gift box" }, w: 90, h: 90, place: "any", price: 0,
    c1: "#C9B6FF", c2: "#FF8FB5", tags: "cadeau gift present boite box",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="8" y="36" width="74" height="50" rx="8" fill={c1} />
        <rect x="4" y="24" width="82" height="18" rx="6" fill={lighten(c1, 0.25)} />
        <rect x="38" y="24" width="14" height="62" fill={c2} />
        <path d="M45 24 C30 2 12 12 24 24Z M45 24 C60 2 78 12 66 24Z" fill={c2} />
      </g>
    ),
  },
  {
    id: "bunting", cat: "party", name: { fr: "Fanions", en: "Bunting" }, w: 260, h: 60, place: "wall", price: 0,
    c1: "#FF8FB5", c2: "#A8DAFF", tags: "fanions bunting fete party",
    art: ({ c1, c2, ink }) => (
      <g>
        <path d="M4 8 Q130 30 256 8" fill="none" stroke={ink} strokeWidth={2.5} />
        {Array.from({ length: 8 }).map((_, i) => {
          const x = 16 + i * 31;
          const y = 8 + Math.sin((x / 260) * Math.PI) * 18;
          return <path key={i} d={`M${x} ${y} L${x + 24} ${y} L${x + 12} ${y + 30}Z`} fill={[c1, c2, "#FFE08A", "#C9B6FF"][i % 4]} stroke={ink} strokeWidth={2} strokeLinejoin="round" />;
        })}
      </g>
    ),
  },
  // ---------------- Decorations ----------------
  {
    id: "candle", cat: "decor", name: { fr: "Bougie parfumée", en: "Scented candle" }, w: 50, h: 70, place: "any", price: 0,
    c1: "#FFD1E2", c2: "#FFE08A", tags: "bougie candle",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <circle cx="25" cy="16" r="16" fill={c2} opacity={0.3} stroke="none" />
        <path d="M25 4 Q32 14 25 22 Q18 14 25 4Z" fill={c2} />
        <rect x="8" y="26" width="34" height="40" rx="8" fill={c1} />
        <Heart x={25} y={36} s={0.4} fill="#FF8FB5" />
      </g>
    ),
  },
  {
    id: "macaron_tower", cat: "decor", name: { fr: "Tour de macarons", en: "Macaron tower" }, w: 90, h: 120, place: "any", price: 30,
    c1: "#FF9EBB", c2: "#A8E6C8", tags: "macaron paris patisserie sweet",
    art: ({ c1, c2, ink }) => {
      const cols = [c1, c2, "#C9B6FF", "#FFE08A", "#A8DAFF"];
      const rows = [[45], [33, 57], [21, 45, 69]];
      return (
        <g {...S(ink)} strokeWidth={2}>
          {rows.map((r, ri) => r.map((x, i) => {
            const y = 22 + ri * 30;
            const c = cols[(ri + i) % cols.length];
            return (
              <g key={`${ri}-${i}`}>
                <ellipse cx={x} cy={y} rx={12} ry={6} fill={c} />
                <rect x={x - 11} y={y + 2} width={22} height={4} fill="#FFF8E7" />
                <ellipse cx={x} cy={y + 9} rx={12} ry={6} fill={c} />
              </g>
            );
          }))}
          <ellipse cx="45" cy="112" rx="40" ry="6" fill="#FFFFFF" strokeWidth={2.5} />
        </g>
      );
    },
  },
  {
    id: "books_stack", cat: "decor", name: { fr: "Pile de livres", en: "Book stack" }, w: 90, h: 70, place: "any", price: 0,
    c1: "#A8DAFF", c2: "#FF9EBB", tags: "livres books lecture reading",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="6" y="46" width="78" height="18" rx="4" fill={c1} />
        <rect x="12" y="28" width="70" height="18" rx="4" fill={c2} />
        <rect x="8" y="12" width="66" height="16" rx="4" fill="#FFE08A" />
        <path d="M60 4 L60 18 L66 14 L72 18 L72 4" fill="#FF8FB5" strokeWidth={2} />
      </g>
    ),
  },
  {
    id: "music_box", cat: "decor", name: { fr: "Boîte à musique", en: "Music box" }, w: 80, h: 90, place: "any", price: 50,
    c1: "#FFD1E2", c2: "#FFE08A", tags: "musique music boite box danseuse",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M14 34 Q40 4 66 34" fill={lighten(c1, 0.3)} />
        <rect x="8" y="34" width="64" height="48" rx="10" fill={c1} />
        <rect x="8" y="50" width="64" height="8" fill={c2} />
        <Heart x={40} y={58} s={0.45} fill={c2} />
        <path d="M60 14 L60 4 L70 2 L70 12" fill="none" strokeWidth={2} /><circle cx="58" cy="14" r="3" fill={ink} stroke="none" /><circle cx="68" cy="12" r="3" fill={ink} stroke="none" />
      </g>
    ),
  },
  {
    id: "teacup_big", cat: "decor", name: { fr: "Tasse géante", en: "Giant teacup" }, w: 90, h: 70, place: "any", price: 0,
    c1: "#FFFFFF", c2: "#FF8FB5", tags: "tasse cup the tea chocolat",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M64 30 Q90 26 82 46 Q76 56 62 50" fill="none" strokeWidth={5} />
        <path d="M8 22 Q8 62 38 62 Q68 62 68 22Z" fill={c1} />
        <ellipse cx="38" cy="22" rx="30" ry="7" fill="#C89A72" />
        <Heart x={38} y={34} s={0.55} fill={c2} />
        <ellipse cx="38" cy="64" rx="34" ry="5" fill={c2} />
        <path d="M30 12 Q26 6 30 0 M44 12 Q40 6 44 0" fill="none" strokeWidth={2} opacity={0.5} />
      </g>
    ),
  },
  // ---------------- Seasonal ----------------
  {
    id: "pumpkin", cat: "seasonal", season: "halloween", name: { fr: "Citrouille mignonne", en: "Cute pumpkin" }, w: 100, h: 84, place: "any", price: 0,
    c1: "#FFB37A", c2: "#7CCB7A", tags: "citrouille pumpkin halloween automne",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M50 20 Q52 6 60 4" fill="none" stroke={c2} strokeWidth={6} />
        <ellipse cx="30" cy="52" rx="26" ry="28" fill={c1} />
        <ellipse cx="70" cy="52" rx="26" ry="28" fill={c1} />
        <ellipse cx="50" cy="52" rx="24" ry="30" fill={lighten(c1, 0.12)} />
        <Face x={50} y={52} ink={ink} />
      </g>
    ),
  },
  {
    id: "ghost_plush", cat: "seasonal", season: "halloween", name: { fr: "Petit fantôme câlin", en: "Cuddly ghost" }, w: 80, h: 100, place: "any", price: 0,
    c1: "#FFFFFF", c2: "#C9B6FF", tags: "fantome ghost halloween peluche",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M10 96 L10 44 C10 8 70 8 70 44 L70 96 L60 86 L50 96 L40 86 L30 96 L20 86Z" fill={c1} />
        <Face x={40} y={46} ink={ink} s={0.8} />
        <path d="M54 22 L46 14 L46 30Z M54 22 L62 14 L62 30Z" fill={c2} />
      </g>
    ),
  },
  {
    id: "xmas_tree", cat: "seasonal", season: "christmas", name: { fr: "Sapin de Noël", en: "Christmas tree" }, w: 140, h: 200, place: "floor", price: 0,
    c1: "#8FD6A8", c2: "#FF8FB5", tags: "sapin noel christmas tree hiver",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="60" y="168" width="20" height="26" rx="4" fill="#C89A72" />
        <path d="M70 30 L130 170 L10 170Z" fill={c1} />
        <path d="M70 30 L116 120 L24 120Z" fill={lighten(c1, 0.15)} />
        <path d="M28 150 Q70 130 112 150" fill="none" stroke="#FFE08A" strokeWidth={4} />
        {[[50, 100], [92, 110], [60, 140], [98, 154], [40, 160], [76, 80]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={7} fill={[c2, "#A8DAFF", "#FFE08A"][i % 3]} />)}
        <Star x={70} y={24} r={18} fill="#FFE08A" ink={ink} />
      </g>
    ),
  },
  {
    id: "snowman", cat: "seasonal", season: "winter", name: { fr: "Bonhomme de neige", en: "Snowman" }, w: 100, h: 140, place: "floor", price: 0,
    c1: "#FFFFFF", c2: "#FF8FB5", tags: "bonhomme neige snowman hiver winter",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <circle cx="50" cy="100" r="36" fill={c1} />
        <circle cx="50" cy="44" r="28" fill={c1} />
        <Face x={50} y={44} ink={ink} s={0.8} />
        <path d="M24 64 Q50 76 76 64 L80 74 Q50 86 20 74Z" fill={c2} />
        <path d="M70 70 L78 92 L66 90Z" fill={c2} />
        <path d="M30 22 Q50 4 70 22Z" fill="#C9B6FF" /><circle cx="50" cy="8" r="6" fill={c2} />
      </g>
    ),
  },
  {
    id: "heart_arch", cat: "seasonal", season: "valentine", name: { fr: "Arche de cœurs", en: "Heart arch" }, w: 220, h: 200, place: "floor", price: 0,
    c1: "#FF8FB5", c2: "#FFD1E2", tags: "arche arch coeur heart saint valentin",
    art: ({ c1, c2 }) => (
      <g>
        {Array.from({ length: 13 }).map((_, i) => {
          const a = Math.PI - (Math.PI * i) / 12;
          const x = 110 + Math.cos(a) * 92;
          const y = 190 - Math.sin(a) * 170;
          return <Heart key={i} x={x} y={y - 12} s={0.85} fill={i % 2 ? c1 : c2} ink="#C2507F" />;
        })}
      </g>
    ),
  },
  {
    id: "sakura_branch", cat: "seasonal", season: "spring", name: { fr: "Branche de cerisier", en: "Cherry branch" }, w: 180, h: 90, place: "wall", price: 0,
    c1: "#FFC2D9", c2: "#8B5A3C", tags: "cerisier sakura cherry blossom printemps spring",
    art: ({ c1, c2, ink }) => (
      <g>
        <path d="M4 20 Q60 40 100 30 Q140 22 176 50" fill="none" stroke={c2} strokeWidth={6} strokeLinecap="round" />
        <path d="M80 34 Q90 60 112 70" fill="none" stroke={c2} strokeWidth={4} strokeLinecap="round" />
        {[[30, 28], [62, 36], [100, 26], [140, 34], [168, 50], [110, 68], [90, 50]].map(([x, y], i) => (
          <g key={i}>
            {Array.from({ length: 5 }).map((_, k) => (
              <ellipse key={k} cx={x} cy={y - 7} rx={5} ry={7} fill={c1} stroke={ink} strokeWidth={1.2} transform={`rotate(${k * 72} ${x} ${y})`} />
            ))}
            <circle cx={x} cy={y} r={3} fill="#FFE08A" />
          </g>
        ))}
      </g>
    ),
  },
  {
    id: "beach_ball", cat: "seasonal", season: "summer", name: { fr: "Ballon de plage", en: "Beach ball" }, w: 70, h: 70, place: "floor", price: 0,
    c1: "#FF8FB5", c2: "#A8DAFF", tags: "ballon plage beach ball ete summer",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <circle cx="35" cy="35" r="32" fill="#FFFFFF" />
        <path d="M35 3 Q10 35 35 67 Q20 35 35 3Z" fill={c1} />
        <path d="M35 3 Q60 35 35 67 Q50 35 35 3Z" fill={c2} />
        <path d="M3 35 Q35 50 67 35" fill="none" stroke="#FFE08A" strokeWidth={6} />
        <circle cx="35" cy="35" r="32" fill="none" />
      </g>
    ),
  },
  {
    id: "leaf_pile", cat: "seasonal", season: "autumn", name: { fr: "Tas de feuilles", en: "Leaf pile" }, w: 130, h: 60, place: "floor", price: 0,
    c1: "#FFB37A", c2: "#F2A7A7", tags: "feuilles leaves automne autumn",
    art: ({ c1, c2, ink }) => (
      <g>
        <path d="M6 56 Q20 10 65 14 Q110 10 124 56Z" fill={c1} stroke={ink} strokeWidth={3} strokeLinejoin="round" />
        <Leaf x={20} y={40} r={-30} fill={c2} ink={ink} />
        <Leaf x={60} y={24} r={10} fill="#FFE08A" ink={ink} />
        <Leaf x={86} y={44} r={-60} fill={c2} ink={ink} />
      </g>
    ),
  },
  // ---------------- Outdoor ----------------
  {
    id: "fountain", cat: "outdoor", name: { fr: "Fontaine", en: "Fountain" }, w: 170, h: 150, place: "floor", price: 60,
    c1: "#FFFFFF", c2: "#A8DAFF", tags: "fontaine fountain jardin garden eau water",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M85 20 Q60 40 50 70 M85 20 Q110 40 120 70" fill="none" stroke={c2} strokeWidth={4} />
        <circle cx="85" cy="16" r="8" fill={c2} />
        <rect x="76" y="40" width="18" height="60" rx="6" fill={c1} />
        <ellipse cx="85" cy="70" rx="40" ry="10" fill={c1} />
        <path d="M6 110 Q6 146 85 146 Q164 146 164 110Z" fill={c1} />
        <ellipse cx="85" cy="110" rx="79" ry="16" fill={c2} />
      </g>
    ),
  },
  {
    id: "bench", cat: "outdoor", name: { fr: "Banc de jardin", en: "Garden bench" }, w: 180, h: 110, place: "floor", price: 0,
    c1: "#FFFFFF", c2: "#FF8FB5", tags: "banc bench jardin garden",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M14 20 Q90 0 166 20 L166 50 L14 50Z" fill={c1} />
        <Heart x={90} y={14} s={0.6} fill={c2} />
        <rect x="6" y="56" width="168" height="16" rx="8" fill={c1} />
        <path d="M20 72 L14 106 M160 72 L166 106 M20 50 L20 56 M160 50 L160 56" strokeWidth={6} />
      </g>
    ),
  },
  {
    id: "swing", cat: "outdoor", name: { fr: "Balançoire fleurie", en: "Flower swing" }, w: 120, h: 220, place: "floor", price: 50,
    c1: "#FFE3C4", c2: "#FF8FB5", tags: "balancoire swing jardin garden",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M20 0 L20 170 M100 0 L100 170" strokeWidth={3} />
        {[30, 70, 110, 150].map((y) => <circle key={y} cx="20" cy={y} r={6} fill={c2} strokeWidth={2} />)}
        {[50, 90, 130].map((y) => <circle key={y} cx="100" cy={y} r={6} fill="#FFE08A" strokeWidth={2} />)}
        <rect x="8" y="168" width="104" height="16" rx="8" fill={c1} />
        <path d="M20 184 L20 216 M100 184 L100 216" opacity={0} />
      </g>
    ),
  },
  {
    id: "picnic", cat: "outdoor", name: { fr: "Pique-nique", en: "Picnic blanket" }, w: 200, h: 80, place: "floor", price: 0,
    c1: "#FF8FB5", c2: "#FFFFFF", tags: "pique-nique picnic jardin garden panier basket",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)} strokeWidth={2.5}>
        <path d="M24 30 L176 30 L196 76 L4 76Z" fill={c2} />
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${40 + i * 40} 30 L${30 + i * 46} 76`} stroke={c1} strokeWidth={8} />)}
        <path d="M14 52 L186 52" stroke={c1} strokeWidth={8} opacity={0.7} />
        <path d="M120 20 Q120 0 146 0 Q172 0 172 20" fill="none" strokeWidth={4} />
        <rect x="116" y="18" width="60" height="30" rx="8" fill="#E8C49A" />
      </g>
    ),
  },
  {
    id: "fence", cat: "outdoor", name: { fr: "Barrière blanche", en: "Picket fence" }, w: 220, h: 80, place: "floor", price: 0,
    c1: "#FFFFFF", c2: "#FFD1E2", tags: "barriere fence jardin garden",
    art: ({ c1, ink }) => (
      <g {...S(ink)}>
        <rect x="4" y="30" width="212" height="10" rx="4" fill={c1} /><rect x="4" y="56" width="212" height="10" rx="4" fill={c1} />
        {Array.from({ length: 8 }).map((_, i) => <path key={i} d={`M${12 + i * 27} 76 L${12 + i * 27} 14 L${22 + i * 27} 4 L${32 + i * 27} 14 L${32 + i * 27} 76Z`} fill={c1} />)}
      </g>
    ),
  },
  {
    id: "mailbox_post", cat: "outdoor", name: { fr: "Boîte aux lettres", en: "Mailbox" }, w: 70, h: 130, place: "floor", price: 0,
    c1: "#FF8FB5", c2: "#FFFFFF", tags: "boite lettres mailbox courrier",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="30" y="56" width="10" height="72" fill="#E8C49A" />
        <path d="M6 60 L6 30 Q6 6 35 6 Q64 6 64 30 L64 60Z" fill={c1} />
        <Heart x={35} y={26} s={0.6} fill={c2} />
        <path d="M64 20 L64 4 L50 4 L50 14Z" fill="#FFE08A" />
      </g>
    ),
  },
  {
    id: "lamp_post", cat: "outdoor", name: { fr: "Réverbère", en: "Lamp post" }, w: 60, h: 220, place: "floor", price: 0,
    c1: "#C9B6FF", c2: "#FFE08A", tags: "reverbere lampadaire lamp post jardin",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <circle cx="30" cy="34" r="30" fill={c2} opacity={0.3} stroke="none" />
        <path d="M14 16 L46 16 L42 50 L18 50Z" fill={c2} />
        <path d="M10 16 Q30 0 50 16Z" fill={c1} />
        <rect x="26" y="50" width="8" height="160" fill={c1} />
        <rect x="16" y="206" width="28" height="12" rx="4" fill={c1} />
      </g>
    ),
  },
  {
    id: "tree_cherry", cat: "outdoor", name: { fr: "Cerisier en fleurs", en: "Blossom tree" }, w: 200, h: 240, place: "floor", price: 0,
    c1: "#FFC2D9", c2: "#B98A6A", tags: "arbre tree cerisier cherry sakura jardin",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M86 236 L92 140 Q70 120 60 100 M92 150 Q120 120 140 110 M100 236 L104 140" fill={c2} strokeWidth={10} />
        <path d="M84 236 L94 130 L110 130 L116 236Z" fill={c2} />
        <path d="M30 120 C0 110 6 60 40 64 C34 20 90 6 104 36 C120 4 180 18 172 64 C204 70 196 122 160 120 C150 140 50 140 30 120Z" fill={c1} />
        {[[50, 80], [90, 54], [140, 70], [120, 104], [70, 110]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5} fill="#FFFFFF" stroke="none" />)}
      </g>
    ),
  },
  {
    id: "rainbow_arch", cat: "outdoor", name: { fr: "Arc-en-ciel", en: "Rainbow arch" }, w: 260, h: 150, place: "any", price: 80,
    c1: "#FF8FB5", c2: "#FFFFFF", tags: "arc-en-ciel rainbow magie magic",
    art: ({ c2, ink }) => (
      <g>
        {["#FF8FB5", "#FFB38A", "#FFE08A", "#A8E6C8", "#A8DAFF", "#C9B6FF"].map((c, i) => (
          <path key={i} d={`M${14 + i * 12} 140 A${116 - i * 12} ${116 - i * 12} 0 0 1 ${246 - i * 12} 140`} fill="none" stroke={c} strokeWidth={13} />
        ))}
        <path d="M2 146 C-4 120 28 112 40 124 C50 106 84 118 78 140 Z" fill={c2} stroke={ink} strokeWidth={3} />
        <path d="M258 146 C264 120 232 112 220 124 C210 106 176 118 182 140 Z" fill={c2} stroke={ink} strokeWidth={3} />
      </g>
    ),
  },
  {
    id: "pond", cat: "outdoor", outdoorOnly: false, name: { fr: "Petit étang", en: "Little pond" }, w: 200, h: 70, place: "floor", price: 0,
    c1: "#A8DAFF", c2: "#8FD6A8", tags: "etang pond eau water nenuphar",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)} strokeWidth={2.5}>
        <ellipse cx="100" cy="38" rx="96" ry="30" fill={c1} />
        <path d="M40 34 Q60 28 80 34 M110 46 Q130 40 150 46" fill="none" stroke="#FFFFFF" strokeWidth={3} />
        <ellipse cx="140" cy="30" rx="16" ry="7" fill={c2} /><circle cx="144" cy="26" r="5" fill="#FF8FB5" />
        <ellipse cx="60" cy="48" rx="12" ry="5" fill={c2} />
      </g>
    ),
  },
  // ---------------- Magic ----------------
  {
    id: "crystal_ball", cat: "magic", name: { fr: "Boule de cristal", en: "Crystal ball" }, w: 80, h: 90, place: "any", price: 60,
    c1: "#C9B6FF", c2: "#FFE08A", tags: "cristal crystal magie magic boule",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <circle cx="40" cy="38" r="36" fill={c1} opacity={0.3} stroke="none" />
        <circle cx="40" cy="38" r="30" fill={lighten(c1, 0.4)} />
        <Star x={34} y={34} r={8} fill={c2} /><Star x={52} y={46} r={5} fill="#FFFFFF" />
        <path d="M22 26 Q26 16 36 14" fill="none" stroke="#FFFFFF" strokeWidth={4} />
        <path d="M14 86 L22 64 L58 64 L66 86Z" fill={c2} />
      </g>
    ),
  },
  {
    id: "wishing_well", cat: "magic", name: { fr: "Puits à vœux", en: "Wishing well" }, w: 150, h: 170, place: "floor", price: 100,
    c1: "#FFD1E2", c2: "#C9B6FF", tags: "puits well voeux wish magie jardin",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M10 40 L75 6 L140 40Z" fill={c2} />
        <path d="M24 40 L24 110 M126 40 L126 110" strokeWidth={6} />
        <path d="M60 60 L90 60 L86 84 L64 84Z" fill="#E8C49A" />
        <path d="M75 40 L75 60" />
        <rect x="10" y="104" width="130" height="60" rx="16" fill={c1} />
        {[[30, 124], [64, 120], [100, 126], [46, 146], [86, 148], [118, 146]].map(([x, y], i) => <rect key={i} x={x - 12} y={y - 7} width={24} height={14} rx={5} fill={lighten(c1, 0.3)} strokeWidth={2} />)}
        <Star x={75} y={24} r={7} fill="#FFE08A" />
      </g>
    ),
  },
  {
    id: "moon_swing", cat: "magic", name: { fr: "Balançoire lune", en: "Moon swing" }, w: 150, h: 200, place: "any", price: 120,
    c1: "#FFE08A", c2: "#C9B6FF", tags: "lune moon balancoire swing etoile nuit",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M44 0 L54 110 M106 0 L96 110" strokeWidth={2} />
        <path d="M20 110 A60 60 0 0 0 130 110 A48 48 0 0 1 20 110Z" fill={c1} transform="rotate(0)" />
        <Star x={30} y={40} r={8} fill={c2} /><Star x={120} y={60} r={6} fill={c2} /><Star x={75} y={190} r={7} fill={c2} />
      </g>
    ),
  },
  {
    id: "castle_mini", cat: "magic", name: { fr: "Petit château", en: "Tiny castle" }, w: 160, h: 180, place: "floor", price: 150,
    c1: "#FFD1E2", c2: "#C9B6FF", tags: "chateau castle princesse princess",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <rect x="20" y="70" width="120" height="104" rx="6" fill={c1} />
        <rect x="6" y="50" width="34" height="124" rx="4" fill={c1} /><rect x="120" y="50" width="34" height="124" rx="4" fill={c1} />
        <path d="M2 52 L23 10 L44 52Z M116 52 L137 10 L158 52Z" fill={c2} />
        <path d="M50 72 L80 24 L110 72Z" fill={c2} />
        <path d="M62 174 L62 130 Q80 110 98 130 L98 174Z" fill={c2} />
        <circle cx="23" cy="86" r="7" fill="#FFF8E7" /><circle cx="137" cy="86" r="7" fill="#FFF8E7" />
        <Heart x={80} y={78} s={0.6} fill="#FF8FB5" />
        <path d="M23 10 L23 0 L34 4 L23 8" fill="#FF8FB5" strokeWidth={2} />
      </g>
    ),
  },
  {
    id: "cloud_float", cat: "magic", name: { fr: "Nuage flottant", en: "Floating cloud" }, w: 160, h: 80, place: "any", price: 0,
    c1: "#FFFFFF", c2: "#BFE3FF", tags: "nuage cloud ciel sky",
    art: ({ c1, c2, ink }) => (
      <g {...S(ink)}>
        <path d="M24 74 C0 74 0 44 24 46 C22 16 64 4 76 28 C92 4 140 12 134 44 C162 44 162 74 136 74Z" fill={c1} />
        <path d="M30 60 Q80 50 130 60" fill="none" stroke={c2} strokeWidth={4} />
        <Face x={80} y={50} ink={ink} s={0.8} />
      </g>
    ),
  },
];

export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
