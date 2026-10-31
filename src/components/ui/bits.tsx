"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { normalizeHex } from "@/lib/theme/color";
import { useT } from "@/lib/i18n/use";

export function PageHeader({ title, subtitle, emoji, action }: { title: string; subtitle?: string; emoji?: string; action?: ReactNode }) {
  return (
    <header className="relative z-[1] mb-5 flex items-end gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="logo-type flex items-center gap-2 text-[1.9rem] leading-tight sm:text-4xl">
          {emoji && <span aria-hidden className="text-[0.85em] [-webkit-text-stroke:0]">{emoji}</span>}
          <span className="truncate">{title}</span>
        </h1>
        {subtitle && <p className="mt-1 text-[0.98rem] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  return (
    <label className={`flex min-h-12 cursor-pointer items-center gap-3 py-1.5 ${disabled ? "opacity-50" : ""}`}>
      <span className="flex-1">
        <span className="block font-bold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors ${checked ? "border-transparent bg-primary" : "border-line bg-surface2"}`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-0.5 h-6 w-6 rounded-full bg-surface shadow"
          style={{ left: checked ? "calc(100% - 1.6rem)" : "0.15rem" }}
        />
      </button>
    </label>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: ReactNode }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ColorField({ value, onChange, label, swatches }: { value: string; onChange: (v: string) => void; label: string; swatches?: string[] }) {
  const { t } = useT();
  const [text, setText] = useState(value);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    setText(value);
    setBad(false);
  }, [value]);
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-2">
        <label className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-line shadow-inner" style={{ background: value }}>
          <span className="sr-only">{label}</span>
          <input type="color" value={normalizeHex(value) ?? "#FFFFFF"} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </label>
        <input
          className="field max-w-[8.5rem] font-mono uppercase"
          value={text}
          aria-label={`${label} — ${t("studio.hex")}`}
          aria-invalid={bad}
          maxLength={7}
          onChange={(e) => {
            setText(e.target.value);
            const n = normalizeHex(e.target.value);
            setBad(!n);
            if (n) onChange(n);
          }}
        />
      </div>
      {bad && <p className="mt-1 text-sm text-[#a3123c]">{t("studio.invalidHex")}</p>}
      {swatches && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {swatches.map((c) => (
            <button key={c} type="button" onClick={() => onChange(c)} aria-label={c} className={`h-7 w-7 rounded-full border-2 ${c.toUpperCase() === value.toUpperCase() ? "border-ink" : "border-line"}`} style={{ background: c }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Empty({ emoji, text, action }: { emoji: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <span className="animate-float anim-loop text-5xl" aria-hidden>{emoji}</span>
      <p className="max-w-xs text-muted">{text}</p>
      {action}
    </div>
  );
}

export function Section({ title, children, action, className = "" }: { title?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`card relative z-[1] p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="relative z-[1] mb-3 flex items-center gap-2">
          {title && <h2 className="title flex-1 text-lg">{title}</h2>}
          {action}
        </div>
      )}
      <div className="relative z-[1]">{children}</div>
    </section>
  );
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <motion.div className="h-full rounded-full" style={{ background: color ?? "var(--c-primary)" }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
    </div>
  );
}
