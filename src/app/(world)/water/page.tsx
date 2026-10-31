"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { PageHeader, Section, Empty, Toggle } from "@/components/ui/bits";
import { DayNav, MiniBars, formatDay } from "@/components/ui/DayNav";
import { Burst } from "@/components/effects/Burst";
import { dateKey, timeKey, weekDays } from "@/lib/time";
import { uuid } from "@/lib/rooms/layout";
import { play } from "@/lib/sound";
import type { WaterEntry } from "@/lib/types";

function Bottle({ pct }: { pct: number }) {
  const reduce = useReducedMotion();
  const level = 300 - 250 * Math.min(1, pct); // y of water surface inside 300px body
  return (
    <svg viewBox="0 0 200 330" className="mx-auto h-72 w-auto" role="img" aria-label={`${Math.round(pct * 100)}%`}>
      <defs>
        <clipPath id="bottle-clip">
          <path d="M70 40 L130 40 L130 70 Q170 90 170 140 L170 290 Q170 316 144 316 L56 316 Q30 316 30 290 L30 140 Q30 90 70 70Z" />
        </clipPath>
        <linearGradient id="water-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9FD8FF" />
          <stop offset="1" stopColor="#6FB8F5" />
        </linearGradient>
      </defs>
      <rect x="74" y="8" width="52" height="34" rx="10" fill="#FF8DC0" stroke="#5A2149" strokeWidth={4} />
      <path d="M70 40 L130 40 L130 70 Q170 90 170 140 L170 290 Q170 316 144 316 L56 316 Q30 316 30 290 L30 140 Q30 90 70 70Z" fill="#F2FAFF" />
      <g clipPath="url(#bottle-clip)">
        <motion.g animate={{ y: level }} initial={{ y: 300 }} transition={{ type: "spring", stiffness: 60, damping: 14 }}>
          <motion.path
            d="M-200 10 Q-150 -2 -100 10 T0 10 T100 10 T200 10 T300 10 T400 10 L400 400 L-200 400Z"
            fill="url(#water-g)"
            animate={reduce ? {} : { x: [0, 100] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M-200 16 Q-150 6 -100 16 T0 16 T100 16 T200 16 T300 16 T400 16 L400 400 L-200 400Z"
            fill="#8CCBFF"
            opacity={0.6}
            animate={reduce ? {} : { x: [100, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        </motion.g>
        {!reduce && pct > 0 &&
          [50, 80, 110, 140].map((x, i) => (
            <motion.circle key={x} cx={x} r={4 + (i % 2) * 2} fill="#FFFFFF" opacity={0.7} initial={{ cy: 310 }} animate={{ cy: [310, Math.max(level + 30, 120)], opacity: [0, 0.8, 0] }} transition={{ duration: 2.4 + i * 0.4, repeat: Infinity, delay: i * 0.6 }} />
          ))}
      </g>
      <path d="M70 40 L130 40 L130 70 Q170 90 170 140 L170 290 Q170 316 144 316 L56 316 Q30 316 30 290 L30 140 Q30 90 70 70Z" fill="none" stroke="#5A2149" strokeWidth={5} strokeLinejoin="round" />
      <path d="M50 140 Q50 110 72 96" stroke="#FFFFFF" strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.9} />
      <g transform="translate(100 210)">
        <circle cx="-14" cy="0" r="4.5" fill="#5A2149" /><circle cx="14" cy="0" r="4.5" fill="#5A2149" />
        <path d="M-6 8 Q0 14 6 8" stroke="#5A2149" strokeWidth={3.5} fill="none" strokeLinecap="round" />
        <ellipse cx="-24" cy="9" rx="7" ry="4" fill="#FF8FB5" opacity={0.6} /><ellipse cx="24" cy="9" rx="7" ry="4" fill="#FF8FB5" opacity={0.6} />
      </g>
    </svg>
  );
}

export default function WaterPage() {
  const { t, lang } = useT();
  const prefs = useWorld((s) => s.prefs);
  const water = useWorld((s) => s.water);
  const saveWater = useWorld((s) => s.saveWater);
  const deleteWater = useWorld((s) => s.deleteWater);
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const cue = useWorld((s) => s.cue);
  const toast = useWorld((s) => s.toast);
  const [today, setToday] = useState("");
  const [day, setDay] = useState("");
  const [custom, setCustom] = useState("");
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const k = dateKey(new Date(), prefs.timezone);
    setToday(k);
    setDay(k);
  }, [prefs.timezone]);

  const byDay = useMemo(() => {
    const m = new Map<string, WaterEntry[]>();
    for (const w of water) m.set(w.date, [...(m.get(w.date) ?? []), w]);
    return m;
  }, [water]);

  if (!prefs.wellness.waterEnabled) {
    return (
      <div>
        <PageHeader title={t("water.title")} emoji="💧" />
        <div className="card"><Empty emoji="💧" text={t("water.hidden")} action={<button className="btn btn-primary" onClick={() => updatePrefs((p) => ({ ...p, wellness: { ...p.wellness, waterEnabled: true } }))}>{t("water.enable")}</button>} /></div>
      </div>
    );
  }
  if (!day) return null;

  const goal = prefs.wellness.waterGoalMl;
  const entries = (byDay.get(day) ?? []).sort((a, b) => a.time.localeCompare(b.time));
  const total = entries.reduce((s, e) => s + e.amountMl, 0);
  const pct = total / (goal || 2000);

  const add = async (ml: number) => {
    if (!ml || ml <= 0) return;
    const before = total;
    const entry: WaterEntry = { id: uuid(), date: day, time: day === today ? timeKey(new Date(), prefs.timezone) : "12:00", amountMl: Math.min(3000, Math.round(ml)), createdAt: new Date().toISOString() };
    await saveWater(entry);
    play("water");
    setBurst((b) => b + 1);
    if (goal && before < goal && before + entry.amountMl >= goal) {
      cue("celebrate", t("water.reached"));
      toast({ text: t("water.reached"), emoji: "💧", tone: "success" });
    } else cue("drink", t("companion.says.drank"));
  };

  const hours = Array.from({ length: 9 }, (_, i) => 6 + i * 2);
  const week = weekDays(day);

  return (
    <div className="space-y-4">
      <PageHeader title={t("water.title")} subtitle={t("water.subtitle")} emoji="💧" />
      <DayNav day={day} today={today} onChange={setDay} marks={(d) => byDay.has(d)} />
      <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
        <div className="card relative p-5 text-center">
          <div className="relative z-[1]">
            <div className="relative"><Bottle pct={pct} /><Burst kind="sparkles" count={10} spread={90} burstKey={burst} /></div>
            <p className="title mt-2 text-3xl">{t("water.drunk", { ml: total })}</p>
            {goal ? <p className="font-bold text-muted">{t("water.ofGoal", { goal })}</p> : null}
            {goal && total >= goal ? <p className="chip mt-2">🎉 {t("water.reached")}</p> : null}
          </div>
        </div>
        <div className="space-y-4">
          <Section title={t("water.glass")}>
            <div className="grid grid-cols-2 gap-2">
              {prefs.wellness.glassSizes.map((ml) => (
                <button key={ml} className="btn btn-soft flex-col py-3" style={{ minHeight: 72 }} onClick={() => add(ml)} aria-label={t("water.add", { ml })}>
                  <span className="text-2xl" aria-hidden>{ml <= 150 ? "🥛" : ml <= 250 ? "🥤" : ml <= 330 ? "🧃" : "🍶"}</span>
                  <span>+{ml} ml</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input className="field" inputMode="numeric" placeholder={t("water.custom")} value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} aria-label={t("water.custom")} />
              <button className="btn btn-primary shrink-0" disabled={!custom} onClick={() => { add(Number(custom)); setCustom(""); }}>{t("common.add")}</button>
            </div>
          </Section>
          <Section title={t("water.goal")}>
            <p className="mb-2 text-sm text-muted">{t("water.goalHint")}</p>
            <Toggle label={t("water.goal")} checked={goal !== null} onChange={(v) => updatePrefs((p) => ({ ...p, wellness: { ...p.wellness, waterGoalMl: v ? 1500 : null } }))} />
            {goal !== null && (
              <label className="mt-2 flex items-center gap-3">
                <input type="range" className="range" min={500} max={3500} step={50} value={goal} onChange={(e) => updatePrefs((p) => ({ ...p, wellness: { ...p.wellness, waterGoalMl: Number(e.target.value) } }))} aria-label={t("water.goal")} />
                <span className="w-20 text-right font-bold">{goal} ml</span>
              </label>
            )}
          </Section>
        </div>
      </div>

      <Section title={t("water.entries")}>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">{t("water.empty")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {entries.map((e) => (
              <li key={e.id} className="card-flat flex items-center gap-2 py-1.5 pr-1.5 pl-3">
                <span className="text-sm font-bold">💧 {e.amountMl} ml</span>
                <span className="text-xs text-muted">{e.time}</span>
                <button className="btn btn-ghost btn-icon btn-sm min-h-8 min-w-8" onClick={() => deleteWater(e.id)} aria-label={`${t("common.delete")} ${e.amountMl} ml`}><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title={t("water.timeline")}>
          <MiniBars data={hours.map((h) => ({ label: `${h}h`, value: entries.filter((e) => { const hh = Number(e.time.slice(0, 2)); return hh >= h && hh < h + 2; }).reduce((s, e) => s + e.amountMl, 0) }))} color="#8CCBFF" unit=" ml" />
        </Section>
        <Section title={t("water.week")}>
          <MiniBars data={week.map((d) => ({ label: formatDay(d, lang, { weekday: "short" }).slice(0, 2), value: (byDay.get(d) ?? []).reduce((s, e) => s + e.amountMl, 0), highlight: d === day }))} color="#8CCBFF" unit=" ml" />
        </Section>
      </div>
    </div>
  );
}
