import type { FontId, Preferences, ThemeTokens } from "../types";
import { findTheme } from "./themes";
import { mix } from "./color";

export const FONT_VARS: Record<FontId, { cssVar: string; label: string }> = {
  nunito: { cssVar: "--font-nunito", label: "Nunito" },
  quicksand: { cssVar: "--font-quicksand", label: "Quicksand" },
  baloo: { cssVar: "--font-baloo", label: "Baloo 2" },
  comfortaa: { cssVar: "--font-comfortaa", label: "Comfortaa" },
  atkinson: { cssVar: "--font-atkinson", label: "Atkinson Hyperlegible" },
  patrick: { cssVar: "--font-patrick", label: "Patrick Hand" },
  lexend: { cssVar: "--font-lexend", label: "Lexend" },
};

export function resolveTokens(prefs: Preferences, systemDark: boolean, override?: ThemeTokens | null) {
  const theme = findTheme(prefs.themeId, prefs.customThemes);
  const dark = prefs.mode === "dark" || (prefs.mode === "auto" && systemDark);
  const tokens = override ?? (dark ? theme.dark : theme.light);
  return { tokens, dark, theme };
}

export function tokenVars(t: ThemeTokens): Record<string, string> {
  return {
    "--c-bg": t.bg,
    "--c-bg2": t.bg2,
    "--c-surface": t.surface,
    "--c-surface2": t.surface2,
    "--c-text": t.text,
    "--c-muted": t.muted,
    "--c-primary": t.primary,
    "--c-on-primary": t.onPrimary,
    "--c-accent": t.accent,
    "--c-accent2": t.accent2,
    "--c-border": t.border,
    "--primary-deep": mix(t.primary, "#3A0A2A", 0.32),
  };
}

export function themeVars(prefs: Preferences, systemDark: boolean, override?: ThemeTokens | null) {
  const { tokens, dark } = resolveTokens(prefs, systemDark, override);
  const vars: Record<string, string> = {
    ...tokenVars(tokens),
    "--r": `${prefs.ui.radius}px`,
    "--app-font": `var(${FONT_VARS[prefs.ui.font]?.cssVar ?? "--font-nunito"}), ui-rounded, system-ui, sans-serif`,
  };
  const attrs: Record<string, string> = {
    "data-mode": dark ? "dark" : "light",
    "data-card": prefs.ui.cardStyle,
    "data-button": prefs.ui.buttonStyle,
    "data-pattern": prefs.ui.pattern,
    "data-anim": prefs.ui.animations,
    "data-icons": prefs.ui.iconStyle,
  };
  return { vars, attrs, dark, tokens };
}

export const THEME_CACHE_KEY = "ihkw:theme-cache";

/** Inline script (runs before paint) that restores the last theme to avoid a flash of default colors. */
export const NO_FLASH_SCRIPT = `(function(){try{var c=JSON.parse(localStorage.getItem('${THEME_CACHE_KEY}')||'null');if(!c)return;var d=document.documentElement;for(var k in c.vars)d.style.setProperty(k,c.vars[k]);for(var a in c.attrs)d.setAttribute(a,c.attrs[a]);if(c.lang)d.lang=c.lang;}catch(e){}})();`;
