"use client";

import { useEffect, useMemo, useState } from "react";
import { useToday } from "@/lib/client/clock";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { PageHeader, Section, Seg, Toggle, Empty } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/Sheet";
import { DayNav, MiniBars, formatDay } from "@/components/ui/DayNav";
import { apiGet } from "@/lib/client/api";
import { monthGrid, timeKey, weekDays } from "@/lib/time";
import { uuid } from "@/lib/rooms/layout";
import { play } from "@/lib/sound";
import type { FoodEntry, MealType } from "@/lib/types";

const MEALS: { id: MealType; emoji: string }[] = [
  { id: "breakfast", emoji: "🥐" },
  { id: "lunch", emoji: "🥗" },
  { id: "dinner", emoji: "🍝" },
  { id: "snack", emoji: "🍓" },
];

interface OffItem { code: string; name: string; brand: string; kcal100: number | null }

function FoodSearch({ onUse }: { onUse: (name: string, portion: string, kcal: number | null) => void }) {
  const { t, lang } = useT();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<OffItem[] | null>(null);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<OffItem | null>(null);
  const [grams, setGrams] = useState("100");

  const short = q.trim().length < 2;
  useEffect(() => {
    if (short) return;
    let alive = true; // ignore answers to an older search that arrive late
    const tm = setTimeout(async () => {
      setBusy(true);
      setErr(false);
      try {
        const found = await apiGet<OffItem[]>(`/api/food/search?q=${encodeURIComponent(q)}&lang=${lang}`);
        if (alive) setItems(found);
      } catch {
        if (alive) setErr(true);
      } finally {
        if (alive) setBusy(false);
      }
    }, 450);
    return () => {
      alive = false;
      clearTimeout(tm);
    };
  }, [q, lang, short]);
  const results = short ? null : items;

  const g = Number(grams);
  const kcal = pick?.kcal100 != null && g > 0 ? Math.round((pick.kcal100 * g) / 100) : null;

  return (
    <div className="card-flat space-y-3 p-3">
      <p className="title text-sm">🔎 {t("food.searchTitle")}</p>
      <label className="relative block">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
        <input className="field pl-9" value={q} onChange={(e) => { setQ(e.target.value); setPick(null); }} placeholder={t("food.searchPlaceholder")} aria-label={t("food.searchTitle")} />
      </label>
      <p className="text-xs text-muted">{t("food.searchHint")}</p>
      {busy && !short && <div className="skeleton h-10" />}
      {err && !short && <p className="text-sm text-muted">{t("food.searchUnavailable")}</p>}
      {pick ? (
        <div className="space-y-2">
          <p className="font-bold">{pick.name} {pick.brand && <span className="text-muted">· {pick.brand}</span>}</p>
          <p className="text-sm">{pick.kcal100 != null ? t("food.per100", { kcal: pick.kcal100 }) : t("food.noKcal")}</p>
          <label className="flex items-center gap-2">
            <span className="text-sm font-bold">{t("food.grams")}</span>
            <input className="field max-w-28" inputMode="numeric" value={grams} onChange={(e) => setGrams(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} />
            {kcal != null && <span className="chip">≈ {kcal} {t("food.kcal")}</span>}
          </label>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setPick(null)}>{t("common.back")}</button>
            <button className="btn btn-primary btn-sm" onClick={() => onUse(pick.brand ? `${pick.name} (${pick.brand})` : pick.name, `${g || 100} g`, kcal)}>{t("food.useResult")}</button>
          </div>
          <p className="text-[0.7rem] text-muted">{t("food.source")}</p>
        </div>
      ) : (
        results && (
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {results.length === 0 && <li className="text-sm text-muted">{t("editor.noResults")}</li>}
            {results.map((it) => (
              <li key={`${it.code}-${it.name}`}>
                <button className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-surface" onClick={() => setPick(it)}>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{it.name}{it.brand && <span className="font-normal text-muted"> · {it.brand}</span>}</span>
                  <span className="shrink-0 text-xs text-muted">{it.kcal100 != null ? `${it.kcal100} kcal/100g` : "—"}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

function EntrySheet({ open, onClose, initial, day }: { open: boolean; onClose: () => void; initial: Partial<FoodEntry> | null; day: string }) {
  const { t } = useT();
  const saveFood = useWorld((s) => s.saveFood);
  const cue = useWorld((s) => s.cue);
  const toast = useWorld((s) => s.toast);
  const showCalories = useWorld((s) => s.prefs.wellness.showCalories);
  const tz = useWorld((s) => s.prefs.timezone);
  const [e, setE] = useState<Partial<FoodEntry>>({});
  const [searching, setSearching] = useState(false);

  // Fresh form each time the sheet opens (every open passes a new `initial` object).
  const [openedWith, setOpenedWith] = useState<Partial<FoodEntry> | null>(null);
  if (open && initial !== openedWith) {
    setOpenedWith(initial);
    setE({ meal: "lunch", name: "", portion: "", calories: null, notes: "", time: timeKey(new Date(), tz), source: "manual", ...initial });
    setSearching(false);
  }

  const valid = (e.name ?? "").trim().length > 0;
  const save = async () => {
    if (!valid) return;
    const entry: FoodEntry = {
      id: e.id ?? uuid(),
      date: e.date ?? day,
      time: e.time ?? "12:00",
      meal: (e.meal as MealType) ?? "lunch",
      name: (e.name ?? "").trim().slice(0, 120),
      portion: (e.portion ?? "").trim().slice(0, 60),
      calories: e.calories != null && Number.isFinite(e.calories) ? Math.max(0, Math.min(10000, Math.round(e.calories))) : null,
      notes: (e.notes ?? "").trim().slice(0, 500),
      source: e.source ?? "manual",
      createdAt: e.createdAt ?? new Date().toISOString(),
    };
    onClose();
    await saveFood(entry);
    toast({ text: t("food.saved"), emoji: "🍓", tone: "success" });
    cue("eat", t("companion.says.ate"));
    play("chime");
  };

  return (
    <Sheet open={open} onClose={onClose} title={e.id ? t("food.editEntry") : t("food.newEntry")} footer={<><button className="btn btn-ghost" onClick={onClose}>{t("common.cancel")}</button><button className="btn btn-primary" disabled={!valid} onClick={save}>{t("common.save")}</button></>}>
      <div className="space-y-4">
        <Seg<MealType> label={t("food.meal")} value={(e.meal as MealType) ?? "lunch"} onChange={(meal) => setE((x) => ({ ...x, meal }))} options={MEALS.map((m) => ({ id: m.id, label: `${m.emoji} ${t(`food.meals.${m.id}`)}` }))} />
        {!e.id && (searching ? (
          <FoodSearch onUse={(name, portion, kcal) => { setE((x) => ({ ...x, name, portion, calories: kcal, source: "openfoodfacts" })); setSearching(false); }} />
        ) : (
          <button className="btn btn-soft btn-sm" onClick={() => setSearching(true)}><Search size={16} /> {t("food.searchTitle")}</button>
        ))}
        <label className="block">
          <span className="label">{t("food.foodName")}</span>
          <input className="field" value={e.name ?? ""} maxLength={120} onChange={(ev) => setE((x) => ({ ...x, name: ev.target.value }))} data-autofocus />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">{t("food.portion")}</span>
            <input className="field" value={e.portion ?? ""} placeholder={t("food.portionHint")} maxLength={60} onChange={(ev) => setE((x) => ({ ...x, portion: ev.target.value }))} />
          </label>
          <label className="block">
            <span className="label">{t("common.time")}</span>
            <input className="field" type="time" value={e.time ?? ""} onChange={(ev) => setE((x) => ({ ...x, time: ev.target.value }))} />
          </label>
        </div>
        {showCalories && (
          <label className="block">
            <span className="label">{t("food.calories")} <span className="font-normal text-muted">({t("food.caloriesHint")})</span></span>
            <input className="field" inputMode="numeric" value={e.calories ?? ""} onChange={(ev) => { const v = ev.target.value.replace(/[^0-9]/g, "").slice(0, 5); setE((x) => ({ ...x, calories: v === "" ? null : Number(v) })); }} />
          </label>
        )}
        <label className="block">
          <span className="label">{t("common.notes")}</span>
          <textarea className="field min-h-20" value={e.notes ?? ""} maxLength={500} onChange={(ev) => setE((x) => ({ ...x, notes: ev.target.value }))} />
        </label>
      </div>
    </Sheet>
  );
}

export default function FoodPage() {
  const { t, lang } = useT();
  const prefs = useWorld((s) => s.prefs);
  const food = useWorld((s) => s.food);
  const deleteFood = useWorld((s) => s.deleteFood);
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const today = useToday(prefs.timezone);
  const [picked, setDay] = useState<string | null>(null);
  const day = picked ?? today;
  const [sheet, setSheet] = useState<Partial<FoodEntry> | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, FoodEntry[]>();
    for (const f of food) m.set(f.date, [...(m.get(f.date) ?? []), f]);
    return m;
  }, [food]);

  if (!prefs.wellness.foodEnabled) {
    return (
      <div>
        <PageHeader title={t("food.title")} emoji="🍓" />
        <div className="card"><Empty emoji="🍓" text={t("food.hidden")} action={<button className="btn btn-primary" onClick={() => updatePrefs((p) => ({ ...p, wellness: { ...p.wellness, foodEnabled: true } }))}>{t("food.enable")}</button>} /></div>
      </div>
    );
  }
  if (!day) return null;

  const entries = (byDay.get(day) ?? []).sort((a, b) => a.time.localeCompare(b.time));
  const total = entries.reduce((s, e) => s + (e.calories ?? 0), 0);
  const hasCal = entries.some((e) => e.calories != null);
  const ref = prefs.wellness.calorieReference;
  const show = prefs.wellness.showCalories;
  const week = weekDays(day);
  const [y, m] = day.split("-").map(Number);
  const grid = monthGrid(y, m);
  const monthEntries = food.filter((f) => f.date.startsWith(day.slice(0, 7)));
  const daysLogged = new Set(monthEntries.map((f) => f.date)).size;
  const monthCal = monthEntries.filter((f) => f.calories != null);
  const avg = daysLogged && monthCal.length ? Math.round(monthCal.reduce((s, f) => s + (f.calories ?? 0), 0) / new Set(monthCal.map((f) => f.date)).size) : null;

  return (
    <div className="space-y-4">
      <PageHeader title={t("food.title")} subtitle={t("food.subtitle")} emoji="🍓" action={<button className="btn btn-primary" onClick={() => setSheet({ date: day })}><Plus size={18} /> {t("food.add")}</button>} />
      <DayNav day={day} today={today} onChange={setDay} marks={(d) => byDay.has(d)} />

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="relative z-[1] text-sm font-bold text-muted">{t("food.mealsLogged")}</p>
          <p className="title relative z-[1] text-3xl">{entries.length}</p>
        </div>
        {show && (
          <div className="card flex items-center gap-3 p-4">
            {ref ? (
              <svg viewBox="0 0 44 44" className="relative z-[1] h-14 w-14 shrink-0 -rotate-90" aria-hidden>
                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--c-surface2)" strokeWidth="6" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--c-accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${Math.min(1, total / ref) * 113} 113`} />
              </svg>
            ) : null}
            <div className="relative z-[1]">
              <p className="text-sm font-bold text-muted">{t("food.dayTotal")}</p>
              <p className="title text-2xl">{hasCal ? total : "—"} <span className="text-sm">{t("food.kcal")}</span></p>
              {ref ? <p className="text-xs text-muted">{t("food.reference")} : {ref}</p> : null}
            </div>
          </div>
        )}
      </div>

      {MEALS.map((meal) => {
        const list = entries.filter((e) => e.meal === meal.id);
        return (
          <Section key={meal.id} title={<span>{meal.emoji} {t(`food.meals.${meal.id}`)}</span>} action={<button className="btn btn-soft btn-sm" onClick={() => setSheet({ date: day, meal: meal.id })} aria-label={t("food.addTo", { meal: t(`food.meals.${meal.id}`) })}><Plus size={16} /> {t("food.add")}</button>}>
            {list.length === 0 ? (
              <p className="text-sm text-muted">{t("food.empty")}</p>
            ) : (
              <ul className="space-y-2">
                {list.map((e) => (
                  <li key={e.id} className="card-flat flex items-start gap-3 p-3">
                    <span className="mt-0.5 text-xs font-bold text-muted">{e.time}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold break-words">{e.name}</p>
                      <p className="text-sm text-muted">{[e.portion, show && e.calories != null ? `${e.calories} ${t("food.kcal")}` : ""].filter(Boolean).join(" · ")}</p>
                      {e.notes && <p className="mt-1 text-sm whitespace-pre-wrap">{e.notes}</p>}
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSheet(e)} aria-label={t("common.edit")}><Pencil size={16} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteFood(e.id)} aria-label={t("common.delete")}><Trash2 size={16} /></button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        );
      })}

      <div className="grid gap-4 md:grid-cols-2">
        <Section title={t("food.week")}>
          <MiniBars
            data={week.map((d) => {
              const list = byDay.get(d) ?? [];
              return { label: formatDay(d, lang, { weekday: "short" }).slice(0, 2), value: show ? list.reduce((s, e) => s + (e.calories ?? 0), 0) : list.length, highlight: d === day };
            })}
            color="var(--c-accent)"
            unit={show ? " kcal" : ""}
          />
          <p className="mt-2 text-xs text-muted">{show ? t("food.dayTotal") : t("food.mealsLogged")}</p>
        </Section>
        <Section title={t("food.month")}>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {grid.map((d, i) =>
              d ? (
                <button key={d} disabled={d > today} onClick={() => setDay(d)} className={`aspect-square rounded-lg font-bold ${d === day ? "bg-primary text-on-primary" : byDay.has(d) ? "bg-accent/40" : "bg-surface2"} ${d > today ? "opacity-60" : ""}`} aria-label={formatDay(d, lang)}>
                  {Number(d.slice(8))}
                </button>
              ) : (
                <span key={`e${i}`} />
              ),
            )}
          </div>
          <div className="mt-3 flex gap-4 text-sm">
            <p><span className="font-bold">{daysLogged}</span> {t("food.daysLogged")}</p>
            {show && avg != null && <p><span className="font-bold">{avg}</span> kcal · {t("food.avgDay")}</p>}
          </div>
        </Section>
      </div>

      <Section title={t("food.reference")}>
        <p className="mb-3 text-sm text-muted">{t("food.referenceHint")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="field max-w-40"
            inputMode="numeric"
            placeholder={t("food.noReference")}
            value={ref ?? ""}
            onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 5); updatePrefs((p) => ({ ...p, wellness: { ...p.wellness, calorieReference: v ? Number(v) : null } })); }}
            aria-label={t("food.reference")}
          />
          {ref ? <button className="btn btn-ghost btn-sm" onClick={() => updatePrefs((p) => ({ ...p, wellness: { ...p.wellness, calorieReference: null } }))}>{t("food.noReference")}</button> : null}
        </div>
        <div className="mt-2"><Toggle label={t("settings.showCalories")} checked={show} onChange={(v) => updatePrefs((p) => ({ ...p, wellness: { ...p.wellness, showCalories: v } }))} /></div>
      </Section>

      <p className="px-2 text-center text-sm text-muted">💗 {t("food.gentle")}</p>
      <EntrySheet open={!!sheet} onClose={() => setSheet(null)} initial={sheet} day={day} />
    </div>
  );
}
