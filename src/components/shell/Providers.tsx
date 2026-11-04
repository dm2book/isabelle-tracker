"use client";

import { MotionConfig } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { useWorld } from "@/store/world";
import { useUi } from "@/store/ui";
import { ThemeRuntime } from "./ThemeRuntime";
import { Toasts } from "@/components/ui/Toasts";
import { ConnectionStatus } from "./ConnectionStatus";
import { HugOverlay } from "@/components/overlays/HugOverlay";
import { LevelUpOverlay, GoldenOverlay } from "@/components/overlays/Celebrations";
import { GiftExperience } from "@/components/overlays/GiftExperience";
import { configureSound } from "@/lib/sound";

export function Providers({ children }: { children: ReactNode }) {
  const boot = useWorld((s) => s.boot);
  const anim = useWorld((s) => s.prefs.ui.animations);
  const sound = useWorld((s) => s.prefs.ui.sound);
  const reduced = useUi((s) => s.reducedMotion);

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    configureSound(sound.enabled, sound.volume);
  }, [sound.enabled, sound.volume]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
  }, []);

  return (
    <MotionConfig reducedMotion={anim === "off" || reduced ? "always" : "never"}>
      <ThemeRuntime />
      {children}
      <Toasts />
      <ConnectionStatus />
      <HugOverlay />
      <LevelUpOverlay />
      <GoldenOverlay />
      <GiftExperience />
    </MotionConfig>
  );
}
