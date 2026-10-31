"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, parseKey, weekDays } from "@/lib/time";
import { useT } from "@/lib/i18n/use";

export function formatDay(key: string, lang: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", { ...opts, timeZone: "UTC" }).format(parseKey(key));
}

/** Week strip with previous/next and a dot on days that have data. */
export function DayNav({ day, today, onChange, marks }: { day: string; today: string; onChange: (d: string) => void; marks?: (d: string) => boolean }) {
  const { t, lang } = useT();
  const days = weekDays(day);
  return (
    <div className="card p-3">
      <div className="relative z-[1] mb-2 flex items-center gap-2">
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onChange(addDays(day, -7))} aria-label="−7"><ChevronLeft size={18} /></button>
        <p className="title flex-1 text-center capitalize">{day === today ? t("common.today") : formatDay(day, lang)}</p>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onChange(addDays(day, 7))} aria-label="+7" disabled={addDays(day, 7) > addDays(today, 6)}><ChevronRight size={18} /></button>
      </div>
      <div className="relative z-[1] grid grid-cols-7 gap-1">
        {days.map((d) => {
          const active = d === day;
          const future = d > today;
          return (
            <button
              key={d}
              disabled={future}
              onClick={() => onChange(d)}
              aria-pressed={active}
              aria-label={formatDay(d, lang)}
              className={`flex flex-col items-center rounded-2xl py-1.5 text-xs font-bold transition-colors ${active ? "bg-primary text-on-primary" : d === today ? "bg-surface2" : ""} ${future ? "opacity-35" : ""}`}
            >
              <span className="capitalize">{formatDay(d, lang, { weekday: "short" }).slice(0, 3)}</span>
              <span className="text-base">{Number(d.slice(8))}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${marks?.(d) ? (active ? "bg-on-primary" : "bg-primary") : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Minimal accessible bar chart: one series, direct labels, no legend. */
export function MiniBars({ data, color = "var(--c-primary)", unit = "" }: { data: { label: string; value: number; highlight?: boolean }[]; color?: string; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-36 items-end gap-1.5" role="list">
      {data.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" role="listitem" aria-label={`${d.label}: ${d.value}${unit}`}>
          <span className="text-[0.62rem] font-bold text-muted">{d.value ? d.value : ""}</span>
          <div className="w-full rounded-t-lg rounded-b-md transition-all" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 6 : 2, background: d.value ? color : "var(--c-border)", opacity: d.highlight ? 1 : 0.75 }} />
          <span className={`text-[0.7rem] font-bold capitalize ${d.highlight ? "text-ink" : "text-muted"}`}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}
