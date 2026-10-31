"use client";

import { create } from "zustand";
import type { ThemeTokens } from "@/lib/types";

interface UiState {
  previewTokens: ThemeTokens | null;
  setPreview: (t: ThemeTokens | null) => void;
  moreOpen: boolean;
  setMoreOpen: (v: boolean) => void;
  systemDark: boolean;
  setSystemDark: (v: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
}

export const useUi = create<UiState>()((set) => ({
  previewTokens: null,
  setPreview: (t) => set({ previewTokens: t }),
  moreOpen: false,
  setMoreOpen: (v) => set({ moreOpen: v }),
  systemDark: false,
  setSystemDark: (v) => set({ systemDark: v }),
  reducedMotion: false,
  setReducedMotion: (v) => set({ reducedMotion: v }),
}));
