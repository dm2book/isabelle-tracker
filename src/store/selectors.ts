"use client";

import { useWorld } from "./world";

const EMPTY: string[] = [];

/** Colors of Isabelle's favorite palette (stable reference for Zustand). */
export function useFavoriteColors(): string[] {
  return useWorld((s) => s.prefs.palettes.find((p) => p.id === s.prefs.favoritePaletteId)?.colors ?? s.prefs.palettes[0]?.colors ?? EMPTY);
}
