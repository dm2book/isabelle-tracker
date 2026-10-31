"use client";

import { useMemo } from "react";
import { useWorld } from "@/store/world";
import { makeT } from "./index";

export function useT() {
  const lang = useWorld((s) => s.prefs.lang);
  return useMemo(() => makeT(lang), [lang]);
}
