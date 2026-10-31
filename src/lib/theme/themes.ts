import type { Palette, Theme, ThemeTokens } from "../types";
import { darken, ensureContrast, lighten, mix, readableOn } from "./color";

type T = ThemeTokens;
const t = (
  bg: string, bg2: string, surface: string, surface2: string, text: string, muted: string,
  primary: string, onPrimary: string, accent: string, accent2: string, border: string,
): T => ({ bg, bg2, surface, surface2, text, muted, primary, onPrimary, accent, accent2, border });

export const BUILT_IN_THEMES: Theme[] = [
  {
    id: "rose", name: "Rose Kawaii", emoji: "🎀", builtIn: true,
    light: t("#FFF0F6", "#FDE6F3", "#FFFFFF", "#FFF6FA", "#5A2149", "#87506F", "#FF8DC0", "#4A0F36", "#C9B6FF", "#A8DAFF", "#F8C9DE"),
    dark: t("#2A1530", "#1E1029", "#3A2142", "#452A4E", "#FFE8F3", "#DDB5CF", "#FF8DC0", "#3A0A2A", "#B9A2FF", "#7FC4F5", "#5C3A63"),
  },
  {
    id: "lavender", name: "Lavender Dreams", emoji: "💜", builtIn: true,
    light: t("#F5F0FF", "#EDE4FF", "#FFFFFF", "#F8F4FF", "#3E2A66", "#6A5996", "#B79CFF", "#2A1452", "#FFB3D6", "#A8E6E0", "#DCCEFF"),
    dark: t("#1F1A33", "#171328", "#2C2547", "#362E55", "#F1EBFF", "#C4B8EA", "#B79CFF", "#1E0F40", "#FF9FCB", "#7FD3CB", "#4A4070"),
  },
  {
    id: "babyblue", name: "Baby Blue", emoji: "🩵", builtIn: true,
    light: t("#EFF8FF", "#E3F1FF", "#FFFFFF", "#F5FAFF", "#1F3D5C", "#4F6F8E", "#8CCBFF", "#0E2C4A", "#FFC2DD", "#FFE7A3", "#C7E3FA"),
    dark: t("#13243A", "#0E1B2D", "#1E3352", "#26405F", "#E8F4FF", "#AFC9E2", "#8CCBFF", "#0A2238", "#FF9FC8", "#F2D27A", "#34507A"),
  },
  {
    id: "mint", name: "Mint Garden", emoji: "🌿", builtIn: true,
    light: t("#EFFBF5", "#E2F6EC", "#FFFFFF", "#F4FCF8", "#1F4A3A", "#4F7668", "#8FE0BC", "#0F3A2A", "#FFB8C9", "#FFE29A", "#C4EBD8"),
    dark: t("#12291F", "#0D1F17", "#1C3A2D", "#244636", "#E6FBF1", "#A9D8C3", "#8FE0BC", "#0A2C1F", "#FF9EB5", "#EBCB76", "#2F5A47"),
  },
  {
    id: "strawberry", name: "Strawberry Milk", emoji: "🍓", builtIn: true,
    light: t("#FFF3F3", "#FFE6EA", "#FFFFFF", "#FFF7F7", "#5C1F2A", "#894C5D", "#FF8A9E", "#4A0D1B", "#FFD1DC", "#9EDC9A", "#FFCCD5"),
    dark: t("#2B1418", "#210E12", "#3D1E24", "#4A262D", "#FFE9EC", "#E3AFBA", "#FF8A9E", "#3D0814", "#F5A9BA", "#7FC27B", "#63343D"),
  },
  {
    id: "peach", name: "Peach Paradise", emoji: "🍑", builtIn: true,
    light: t("#FFF5EE", "#FFEADB", "#FFFFFF", "#FFF8F2", "#5A2E1C", "#875845", "#FFB38A", "#4A1E08", "#FF9EBB", "#FFE08A", "#FFD8C2"),
    dark: t("#2B1A12", "#20130C", "#3D271C", "#4A3123", "#FFEFE6", "#E6BDA9", "#FFB38A", "#3D1704", "#F58BAD", "#EBC66A", "#634333"),
  },
  {
    id: "sakura", name: "Cherry Blossom", emoji: "🌸", builtIn: true,
    light: t("#FFF5F8", "#F7EAF6", "#FFFFFF", "#FFF9FB", "#4F2440", "#7F5675", "#F7A8C8", "#451535", "#C2E0A8", "#D8C2FF", "#F3D2E2"),
    dark: t("#241722", "#1A1019", "#36222F", "#422A3A", "#FFEEF5", "#DAB7CB", "#F7A8C8", "#3A0F2C", "#A6CC88", "#BFA6F2", "#573A4D"),
  },
  {
    id: "rainbow", name: "Rainbow Magic", emoji: "🌈", builtIn: true, price: 150,
    light: t("#FFF7FB", "#EEF4FF", "#FFFFFF", "#FFFAF2", "#3D2A5C", "#6C5D90", "#FF9ED2", "#3D0A2E", "#9EE6FF", "#FFE680", "#E7DAFF"),
    dark: t("#1D1833", "#241230", "#2B2447", "#362C55", "#FFF2FB", "#C9BCEA", "#FF9ED2", "#33072A", "#7AD3F2", "#F2D35C", "#4C4073"),
  },
  {
    id: "autumn", name: "Cozy Autumn", emoji: "🍂", builtIn: true,
    light: t("#FFF6EC", "#FBEBDD", "#FFFDF9", "#FFF6EE", "#4E2C1E", "#80594A", "#F2A97E", "#3E1A08", "#E8B4B8", "#C9C27A", "#F0D5BF"),
    dark: t("#261A14", "#1C130E", "#382820", "#433027", "#FFF1E6", "#DDBCA7", "#F2A97E", "#331405", "#D79BA0", "#B5AE62", "#5A4234"),
  },
  {
    id: "winter", name: "Winter Wonderland", emoji: "❄️", builtIn: true,
    light: t("#F2F7FF", "#EAF0FC", "#FFFFFF", "#F7FAFF", "#24345C", "#56668F", "#A9C8FF", "#13244A", "#FFC9E0", "#CDEFFF", "#D4E1F8"),
    dark: t("#141C33", "#0F1527", "#1F2A47", "#283556", "#EEF4FF", "#B3C2E3", "#A9C8FF", "#0D1A38", "#F2A9C9", "#9FD9F2", "#3A4870"),
  },
  {
    id: "galaxy", name: "Midnight Galaxy", emoji: "🌌", builtIn: true, price: 200,
    light: t("#F3EEFF", "#E6E9FF", "#FFFFFF", "#F7F5FF", "#2A1F52", "#5F578C", "#9F8CFF", "#1A1040", "#FF9FD8", "#8FE3FF", "#D8D0FF"),
    dark: t("#120E2A", "#1F1245", "#221A45", "#2C2257", "#F3EEFF", "#BDB3EA", "#B4A3FF", "#150B38", "#FF9FD8", "#8FE3FF", "#3D3270"),
  },
];

export const DEFAULT_THEME_ID = "rose";

export const DEFAULT_PALETTES: Palette[] = [
  { id: "pal-isabelle", name: "Mes couleurs", colors: ["#FF8DC0", "#C9B6FF", "#A8DAFF", "#FFF4D6", "#FF5C8A"] },
  { id: "pal-fraise", name: "Fraise & crème", colors: ["#FF8A9E", "#FFD1DC", "#FFF7F0", "#9EDC9A", "#E85A71"] },
  { id: "pal-nuage", name: "Nuage pastel", colors: ["#BFE3FF", "#E8DEFF", "#FFFFFF", "#FFE3EE", "#9FB8FF"] },
];

export function findTheme(id: string, custom: Theme[]): Theme {
  return (
    custom.find((x) => x.id === id) ??
    BUILT_IN_THEMES.find((x) => x.id === id) ??
    BUILT_IN_THEMES[0]
  );
}

/** Build a complete, accessible theme from a few chosen colors. */
export function themeFromColors(
  id: string,
  name: string,
  emoji: string,
  c: { bg: string; primary: string; accent: string; accent2: string; text?: string; surface?: string },
): Theme {
  const text = ensureContrast(c.text ?? darken(c.primary, 0.7), c.bg, 7);
  const surface = c.surface ?? lighten(c.bg, 0.6);
  const light: ThemeTokens = {
    bg: c.bg.toUpperCase(),
    bg2: mix(c.bg, c.accent, 0.18),
    surface,
    surface2: mix(surface, c.bg, 0.5),
    text,
    muted: ensureContrast(mix(text, c.bg, 0.4), surface, 4.6),
    primary: c.primary.toUpperCase(),
    onPrimary: readableOn(c.primary, text),
    accent: c.accent.toUpperCase(),
    accent2: c.accent2.toUpperCase(),
    border: mix(c.primary, c.bg, 0.6),
  };
  return { id, name, emoji, light, dark: deriveDark(light) };
}

export function deriveDark(l: ThemeTokens): ThemeTokens {
  const base = darken(mix(l.primary, "#1A1030", 0.75), 0.35);
  const surface = mix(base, l.primary, 0.12);
  const text = ensureContrast(lighten(l.bg, 0.4), base, 10);
  return {
    bg: base,
    bg2: darken(mix(l.accent, base, 0.8), 0.2),
    surface,
    surface2: mix(surface, l.primary, 0.1),
    text,
    muted: ensureContrast(mix(text, surface, 0.35), surface, 4.6),
    primary: l.primary,
    onPrimary: readableOn(l.primary, l.text),
    accent: l.accent,
    accent2: l.accent2,
    border: mix(surface, l.primary, 0.3),
  };
}

/** Repair tokens so that body text and button labels stay readable. */
export function fixContrast(tk: ThemeTokens): ThemeTokens {
  return {
    ...tk,
    text: ensureContrast(tk.text, tk.surface, 7),
    muted: ensureContrast(tk.muted, tk.surface, 4.6),
    onPrimary: ensureContrast(tk.onPrimary, tk.primary, 4.5),
  };
}
