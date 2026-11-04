"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { useOnline } from "@/lib/client/online";

/**
 * A small pill while the connection is lost, and a short "back online" when it returns.
 * In online (cloud) mode the world is refreshed on reconnect so nothing stays out of date.
 */
export function ConnectionStatus() {
  const { t } = useT();
  const online = useOnline();
  const mode = useWorld((s) => s.mode);
  const [back, setBack] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    const st = useWorld.getState();
    if (st.mode === "cloud") {
      if (st.status === "error") st.boot();
      else st.refresh();
    }
    // Shown once per reconnect; the state change is the point of this effect.
    setBack(true);
    const timer = setTimeout(() => setBack(false), 2500);
    return () => clearTimeout(timer);
  }, [online]);

  const show = !online || back;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[94] flex justify-center px-4 md:bottom-6" aria-live="polite">
      <AnimatePresence>
        {show && (
          <motion.p
            key={online ? "on" : "off"}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`rounded-full px-4 py-2 text-sm font-bold shadow-lg ${online ? "bg-primary text-on-primary" : "bg-surface text-ink"}`}
          >
            {online ? `✨ ${t("offline.back")}` : `📡 ${mode === "cloud" ? t("offline.pillCloud") : t("offline.pillLocal")}`}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
