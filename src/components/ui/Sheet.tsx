"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n/use";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** "sheet" slides from the bottom on phones and is a centered dialog on larger screens */
  variant?: "sheet" | "center";
}

export function Sheet({ open, onClose, title, children, footer, wide, variant = "sheet" }: SheetProps) {
  const { t } = useT();
  const panel = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  // Keep the latest onClose without re-running the open/close effect (parents often pass inline functions).
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => {
      // Never steal focus from a field the person is already using.
      if (panel.current?.contains(document.activeElement)) return;
      const target = panel.current?.querySelector<HTMLElement>("[data-autofocus], input, textarea, select") ?? panel.current;
      target?.focus();
    }, 60);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      lastFocus.current?.focus?.();
    };
  }, [open]);

  if (typeof document === "undefined") return null;
  const center = variant === "center";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button aria-label={t("common.close")} className="absolute inset-0 bg-[#2a1530]/35 backdrop-blur-[2px]" onClick={onClose} tabIndex={-1} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            tabIndex={-1}
            className={`card relative flex max-h-[92dvh] w-full flex-col outline-none ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"} ${center ? "mx-4 mb-[max(1rem,env(safe-area-inset-bottom))] sm:mb-0" : "rounded-b-none sm:rounded-b-[var(--r)]"}`}
            initial={{ y: center ? 30 : "100%", opacity: center ? 0 : 1, scale: center ? 0.96 : 1 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: center ? 30 : "100%", opacity: center ? 0 : 1 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            {!center && <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-line sm:hidden" aria-hidden />}
            {(title || true) && (
              <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                <h2 className="title flex-1 text-xl">{title}</h2>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label={t("common.close")}>
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="relative z-[1] flex-1 overflow-y-auto px-5 pb-5">{children}</div>
            {footer && <div className="relative z-[1] flex flex-wrap justify-end gap-2 border-t-2 border-dashed border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
