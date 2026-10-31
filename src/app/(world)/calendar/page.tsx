"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { PageHeader, Section } from "@/components/ui/bits";
import { formatDay } from "@/components/ui/DayNav";
import { dateKey, monthGrid } from "@/lib/time";
import { uuid } from "@/lib/rooms/layout";
import { QUEST_MAP } from "@/lib/game/rules";
import { questName } from "@/lib/game/notify";
import { isBirthday, activeSeasons } from "@/lib/seasons";
import { COLLECTIBLE_MAP } from "@/lib/catalog/collectibles";
import type { CalendarEvent, EventKind, MoodId } from "@/lib/types";

const MOODS: { id: MoodId; emoji: string }[] = [
  { id: "happy", emoji: "😊" }, { id: "calm", emoji: "😌" }, { id: "excited", emoji: "🤩" },
  { id: "loved", emoji: "🥰" }, { id: "tired", emoji: "😴" }, { id: "sad", emoji: "🥺" },
];
const KIND_EMOJI: Record<EventKind, string> = { special: "✨", birthday: "🎂", milestone: "🏆", appointment: "📌", note: "📝" };

function DayPanel({ day }: { day: string }) {
  const { t, td, lang } = useT();
  const diary = useWorld((s) => s.diary.find((d) => d.date === day));
  const allEvents = useWorld((s) => s.events);
  const allFood = useWorld((s) => s.food);
  const allWater = useWorld((s) => s.water);
  const allHistory = useWorld((s) => s.game.history);
  const events = useMemo(() => allEvents.filter((e) => e.date === day), [allEvents, day]);
  const food = useMemo(() => allFood.filter((f) => f.date === day), [allFood, day]);
  const water = useMemo(() => allWater.filter((w) => w.date === day), [allWater, day]);
  const history = useMemo(() => allHistory.filter((h) => h.date === day), [allHistory, day]);
  const achievements = useWorld((s) => s.game.achievements);
  const birthday = useWorld((s) => s.profile.birthday);
  const showCal = useWorld((s) => s.prefs.wellness.showCalories);
  const saveDiary = useWorld((s) => s.saveDiary);
  const saveEvent = useWorld((s) => s.saveEvent);
  const deleteEvent = useWorld((s) => s.deleteEvent);
  const toast = useWorld((s) => s.toast);
  const [text, setText] = useState(diary?.text ?? "");
  const [mood, setMood] = useState<MoodId | null>(diary?.mood ?? null);
  const [evTitle, setEvTitle] = useState("");
  const [evKind, setEvKind] = useState<EventKind>("special");

  useEffect(() => {
    setText(diary?.text ?? "");
    setMood(diary?.mood ?? null);
  }, [day, diary?.text, diary?.mood]);

  const persist = async (nextText = text, nextMood = mood) => {
    if ((diary?.text ?? "") === nextText && (diary?.mood ?? null) === nextMood) return;
    await saveDiary({ date: day, text: nextText.slice(0, 4000), mood: nextMood, updatedAt: new Date().toISOString() });
    toast({ text: t("calendar.noteSaved"), emoji: "📝", tone: "success" });
  };

  const addEvent = async () => {
    if (!evTitle.trim()) return;
    const ev: CalendarEvent = { id: uuid(), date: day, title: evTitle.trim().slice(0, 80), kind: evKind, emoji: KIND_EMOJI[evKind], notes: "" };
    await saveEvent(ev);
    setEvTitle("");
  };

  const quests = history.filter((h) => h.kind === "quest");
  const rewards = history.filter((h) => h.kind !== "quest" && h.kind !== "purchase" && h.kind !== "achievement");
  const milestones = Object.entries(achievements).filter(([, at]) => dateKey(new Date(at)) === day);
  const waterTotal = water.reduce((s, w) => s + w.amountMl, 0);
  const kcal = food.reduce((s, f) => s + (f.calories ?? 0), 0);
  const seasons = activeSeasons(day);

  return (
    <div className="space-y-4">
      <h2 className="logo-type text-2xl capitalize">{formatDay(day, lang)}</h2>
      {(isBirthday(day, birthday) || seasons.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {isBirthday(day, birthday) && <span className="chip">🎂 {t("surprises.birthday")}</span>}
          {seasons.slice(0, 1).map((s) => <span key={s.id} className="chip">{s.emoji} {td(`seasons.${s.id}`)}</span>)}
        </div>
      )}
      <Section title={`📝 ${t("calendar.dayNote")}`}>
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={t("calendar.mood")}>
          {MOODS.map((m) => (
            <button key={m.id} aria-pressed={mood === m.id} onClick={() => { const v = mood === m.id ? null : m.id; setMood(v); persist(text, v); }} className={`chip ${mood === m.id ? "bg-primary text-on-primary" : ""}`}>
              {m.emoji} {t(`calendar.moods.${m.id}`)}
            </button>
          ))}
        </div>
        <textarea className="field min-h-28" value={text} onChange={(e) => setText(e.target.value)} onBlur={() => persist()} placeholder={t("calendar.notePlaceholder")} aria-label={t("calendar.dayNote")} />
        <div className="mt-2 flex justify-end"><button className="btn btn-soft btn-sm" onClick={() => persist()}>{t("common.save")}</button></div>
      </Section>
      <Section title={`📌 ${t("calendar.events")}`}>
        {events.length > 0 && (
          <ul className="mb-3 space-y-2">
            {events.map((e) => (
              <li key={e.id} className="card-flat flex items-center gap-2 p-2.5">
                <span aria-hidden>{e.emoji}</span>
                <span className="min-w-0 flex-1 font-bold">{e.title}</span>
                <span className="text-xs text-muted">{t(`calendar.kinds.${e.kind}`)}</span>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteEvent(e.id)} aria-label={t("common.delete")}><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <input className="field min-w-0 flex-1" value={evTitle} maxLength={80} placeholder={t("calendar.eventTitle")} onChange={(e) => setEvTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addEvent()} aria-label={t("calendar.eventTitle")} />
          <select className="field w-auto" value={evKind} onChange={(e) => setEvKind(e.target.value as EventKind)} aria-label={t("calendar.eventKind")}>
            {(Object.keys(KIND_EMOJI) as EventKind[]).map((k) => <option key={k} value={k}>{KIND_EMOJI[k]} {t(`calendar.kinds.${k}`)}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={addEvent} disabled={!evTitle.trim()}><Plus size={16} /> {t("common.add")}</button>
        </div>
      </Section>
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3"><p className="relative z-[1] text-sm font-bold text-muted">🍓 {t("calendar.food")}</p><p className="title relative z-[1] text-xl">{food.length}{showCal && kcal ? <span className="text-sm text-muted"> · {kcal} kcal</span> : null}</p></div>
        <div className="card p-3"><p className="relative z-[1] text-sm font-bold text-muted">💧 {t("calendar.water")}</p><p className="title relative z-[1] text-xl">{waterTotal} ml</p></div>
      </div>
      {(quests.length > 0 || rewards.length > 0 || milestones.length > 0) ? (
        <Section title={`⭐ ${t("calendar.quests")} & ${t("calendar.rewards")}`}>
          <ul className="space-y-1.5 text-sm">
            {quests.map((h, i) => <li key={`q${i}`}>✅ {QUEST_MAP[h.label] ? questName(lang, h.label) : h.label} {h.coins ? `· +${h.coins} 🪙` : ""}</li>)}
            {rewards.map((h, i) => (
              <li key={`r${i}`}>🎁 {h.item && COLLECTIBLE_MAP[h.item] ? `${COLLECTIBLE_MAP[h.item].emoji} ${COLLECTIBLE_MAP[h.item].name[lang]}` : h.kind} {h.coins ? `· +${h.coins} 🪙` : ""}</li>
            ))}
            {milestones.map(([id]) => <li key={id}>🏆 {td(`quests.ach.${id}`)}</li>)}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

export default function CalendarPage() {
  const { t, tl, lang } = useT();
  const tz = useWorld((s) => s.prefs.timezone);
  const track = useWorld((s) => s.track);
  const food = useWorld((s) => s.food);
  const water = useWorld((s) => s.water);
  const diary = useWorld((s) => s.diary);
  const events = useWorld((s) => s.events);
  const history = useWorld((s) => s.game.history);
  const [today, setToday] = useState("");
  const [day, setDay] = useState("");
  const [ym, setYm] = useState<[number, number]>([2026, 1]);

  useEffect(() => {
    const k = dateKey(new Date(), tz);
    setToday(k);
    setDay(k);
    setYm([Number(k.slice(0, 4)), Number(k.slice(5, 7))]);
    track("open_diary");
  }, [tz, track]);

  const marks = useMemo(() => {
    const m = new Map<string, Set<string>>();
    const add = (d: string, k: string) => m.set(d, (m.get(d) ?? new Set()).add(k));
    food.forEach((f) => add(f.date, "food"));
    water.forEach((w) => add(w.date, "water"));
    diary.forEach((d) => d.text.trim() && add(d.date, "note"));
    events.forEach((e) => add(e.date, "event"));
    history.forEach((h) => add(h.date, h.kind === "quest" ? "quest" : "reward"));
    return m;
  }, [food, water, diary, events, history]);
  const moodOf = useMemo(() => new Map(diary.filter((d) => d.mood).map((d) => [d.date, MOODS.find((m) => m.id === d.mood)?.emoji])), [diary]);

  if (!day) return null;
  const [y, mo] = ym;
  const grid = monthGrid(y, mo);
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, mo - 1 + n, 1));
    setYm([d.getUTCFullYear(), d.getUTCMonth() + 1]);
  };
  const DOT: Record<string, string> = { food: "#FF8FB5", water: "#8CCBFF", note: "#C9B6FF", event: "#FFD45E", quest: "#8FE0BC", reward: "#FFB38A" };

  return (
    <div>
      <PageHeader title={t("calendar.title")} subtitle={t("calendar.subtitle")} emoji="📅" />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <div className="card p-4">
            <div className="relative z-[1] mb-3 flex items-center gap-2">
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => shift(-1)} aria-label="−1"><ChevronLeft size={18} /></button>
              <p className="title flex-1 text-center text-lg">{tl("calendar.months")[mo - 1]} {y}</p>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => shift(1)} aria-label="+1"><ChevronRight size={18} /></button>
            </div>
            <div className="relative z-[1] grid grid-cols-7 gap-1 text-center">
              {tl("calendar.weekdays").map((w, i) => <span key={i} className="pb-1 text-xs font-bold text-muted">{w}</span>)}
              {grid.map((d, i) =>
                d ? (
                  <button
                    key={d}
                    onClick={() => setDay(d)}
                    aria-pressed={d === day}
                    aria-label={formatDay(d, lang)}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-bold transition-colors ${d === day ? "bg-primary text-on-primary" : d === today ? "bg-surface2 ring-2 ring-primary" : "hover:bg-surface2"}`}
                  >
                    {moodOf.get(d) ? <span className="text-base leading-none">{moodOf.get(d)}</span> : <span>{Number(d.slice(8))}</span>}
                    <span className="mt-0.5 flex gap-0.5">
                      {[...(marks.get(d) ?? [])].slice(0, 4).map((k) => <span key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: DOT[k] }} />)}
                    </span>
                  </button>
                ) : (
                  <span key={`e${i}`} />
                ),
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 px-1 text-xs font-bold text-muted">
            {Object.entries(DOT).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{k === "food" ? t("calendar.food") : k === "water" ? t("calendar.water") : k === "note" ? t("calendar.dayNote") : k === "event" ? t("calendar.events") : k === "quest" ? t("calendar.quests") : t("calendar.rewards")}</span>
            ))}
          </div>
        </div>
        <DayPanel key={day} day={day} />
      </div>
    </div>
  );
}
