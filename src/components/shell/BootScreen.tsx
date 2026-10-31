"use client";

import { motion } from "motion/react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { Companion } from "@/components/companion/Companion";

export function BootScreen({ error }: { error?: boolean }) {
  const look = useWorld((s) => s.prefs.companion);
  const boot = useWorld((s) => s.boot);
  const { t } = useT();
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 px-6 text-center" role="status" aria-live="polite">
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
        <Companion look={look} mood="sleepy" anim="sleep" size={150} />
      </motion.div>
      <p className="title text-xl">{error ? t("common.error") : t("welcome.loadingWorld")}</p>
      {!error && (
        <div className="flex gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="h-3 w-3 rounded-full bg-primary" animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </div>
      )}
      {error && <button className="btn btn-primary" onClick={() => boot()}>{t("common.retry")}</button>}
    </div>
  );
}
