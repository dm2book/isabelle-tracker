"use client";

import { useEffect } from "react";
import { useWorld } from "@/store/world";
import { useUi } from "@/store/ui";
import { THEME_CACHE_KEY, themeVars } from "@/lib/theme/apply";

/** Applies the active theme (colors, fonts, shapes, animation level) to <html> as CSS variables. */
export function ThemeRuntime() {
  const prefs = useWorld((s) => s.prefs);
  const status = useWorld((s) => s.status);
  const preview = useUi((s) => s.previewTokens);
  const systemDark = useUi((s) => s.systemDark);
  const setSystemDark = useUi((s) => s.setSystemDark);
  const setReducedMotion = useUi((s) => s.setReducedMotion);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setSystemDark(mq.matches);
      setReducedMotion(rm.matches);
    };
    update();
    mq.addEventListener("change", update);
    rm.addEventListener("change", update);
    return () => {
      mq.removeEventListener("change", update);
      rm.removeEventListener("change", update);
    };
  }, [setSystemDark, setReducedMotion]);

  useEffect(() => {
    if (status === "boot") return;
    const { vars, attrs } = themeVars(prefs, systemDark, preview);
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    for (const [k, v] of Object.entries(attrs)) root.setAttribute(k, v);
    root.lang = prefs.lang;
    const meta = document.querySelector('meta[name="theme-color"]:not([media])') ?? (() => {
      const m = document.createElement("meta");
      m.name = "theme-color";
      document.head.appendChild(m);
      return m;
    })();
    meta.setAttribute("content", vars["--c-bg"]);
    if (!preview) {
      try {
        localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({ vars, attrs, lang: prefs.lang }));
      } catch {
        /* ignore */
      }
    }
  }, [prefs, systemDark, preview, status]);

  return null;
}
