"use client";

import { useEffect, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { PageHeader, Section, ProgressBar } from "@/components/ui/bits";
import { ACHIEVEMENTS, activeQuests, levelProgress, type QuestDef } from "@/lib/game/rules";
import { questName } from "@/lib/game/notify";
import { dateKey } from "@/lib/time";
import { uuid } from "@/lib/rooms/layout";
import { play } from "@/lib/sound";

function QuestRow({ def, qkey }: { def: QuestDef; qkey: string }) {
  const { t, lang } = useT();
  const q = useWorld((s) => s.game.quests[qkey]);
  const gameAction = useWorld((s) => s.gameAction);
  const p = q?.progress ?? 0;
  const done = p >= def.target;
  return (
    <li className={`card-flat flex items-center gap-3 p-3 ${q?.claimed ? "opacity-60" : ""}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-2xl" aria-hidden>{def.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{questName(lang, def.id)}</p>
        <div className="mt-1 flex items-center gap-2">
          <ProgressBar value={p} max={def.target} />
          <span className="shrink-0 text-xs font-bold text-muted">{t("quests.progress", { p, t: def.target })}</span>
        </div>
        <p className="mt-1 text-xs font-bold text-muted">🪙 {def.coins} · ✨ {def.xp} XP</p>
      </div>
      {q?.claimed ? (
        <span className="chip"><Check size={14} /> {t("quests.claimed")}</span>
      ) : done ? (
        <motion.button animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} className="btn btn-primary btn-sm" onClick={async () => { const r = await gameAction({ type: "claim", questKey: qkey }); if (r) play("coin"); }}>
          🎁 {t("quests.claim")}
        </motion.button>
      ) : null}
    </li>
  );
}

export default function QuestsPage() {
  const { t, td } = useT();
  const game = useWorld((s) => s.game);
  const tasks = useWorld((s) => s.prefs.tasks);
  const tz = useWorld((s) => s.prefs.timezone);
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const gameAction = useWorld((s) => s.gameAction);
  const [today, setToday] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskEmoji, setTaskEmoji] = useState("🌟");

  useEffect(() => setToday(dateKey(new Date(), tz)), [tz]);
  if (!today) return null;

  const lp = levelProgress(game.xp);
  const quests = activeQuests(today);
  const daily = quests.filter((q) => q.def.period === "daily");
  const weekly = quests.filter((q) => q.def.period === "weekly");
  const activeTasks = tasks.filter((x) => x.active);

  const addTask = () => {
    if (!taskTitle.trim()) return;
    updatePrefs((p) => ({ ...p, tasks: [...p.tasks, { id: uuid(), title: taskTitle.trim().slice(0, 60), emoji: taskEmoji, active: true }] }));
    setTaskTitle("");
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t("quests.title")} subtitle={t("quests.subtitle")} emoji="⭐" />
      <div className="card p-5">
        <div className="relative z-[1] flex items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-primary text-on-primary shadow-[0_5px_0_var(--primary-deep)]">
            <span className="text-center leading-none"><span className="block text-xs font-bold">{t("common.level")}</span><span className="title text-3xl">{lp.level}</span></span>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <ProgressBar value={lp.into} max={lp.span} />
            <p className="text-sm font-bold text-muted">{t("quests.levelProgress", { xp: lp.toNext, level: lp.level + 1 })}</p>
            <div className="flex flex-wrap gap-2">
              <span className="chip">🪙 {game.coins}</span>
              <span className="chip">✨ {game.xp} XP</span>
              {game.streak.count > 0 && <span className="chip">🔥 {t("quests.streak", { days: game.streak.count })}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={`☀️ ${t("quests.daily")}`} action={<span className="text-xs font-bold text-muted">{t("quests.resetsDaily")}</span>}>
          <ul className="space-y-2">{daily.map(({ def, key }) => <QuestRow key={key} def={def} qkey={key} />)}</ul>
        </Section>
        <Section title={`🗓️ ${t("quests.weekly")}`} action={<span className="text-xs font-bold text-muted">{t("quests.resetsWeekly")}</span>}>
          <ul className="space-y-2">{weekly.map(({ def, key }) => <QuestRow key={key} def={def} qkey={key} />)}</ul>
        </Section>
      </div>

      <Section title={`✅ ${t("quests.personal")}`}>
        <p className="mb-3 text-sm text-muted">{t("quests.personalHint")}</p>
        <ul className="mb-3 space-y-2">
          {activeTasks.map((task) => {
            const done = game.daily.tasksDone.includes(task.id);
            return (
              <li key={task.id} className="card-flat flex items-center gap-3 p-2.5">
                <button
                  role="checkbox"
                  aria-checked={done}
                  onClick={async () => { await gameAction({ type: "task", taskId: task.id, done: !done }); if (!done) play("chime"); }}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-[3px] ${done ? "border-primary bg-primary text-on-primary" : "border-line bg-surface"}`}
                  aria-label={task.title}
                >
                  {done && <Check size={18} />}
                </button>
                <span className={`min-w-0 flex-1 font-bold ${done ? "line-through opacity-60" : ""}`}>{task.emoji} {task.title}</span>
                <button className="btn btn-ghost btn-icon btn-sm" aria-label={t("common.delete")} onClick={() => updatePrefs((p) => ({ ...p, tasks: p.tasks.filter((x) => x.id !== task.id) }))}><Trash2 size={14} /></button>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2">
          <select className="field w-16 px-2 text-center text-lg" value={taskEmoji} onChange={(e) => setTaskEmoji(e.target.value)} aria-label="Emoji">
            {["🌟", "📚", "🧘", "📞", "🎨", "🎵", "🌿", "🧸", "✍️", "🛁"].map((e) => <option key={e}>{e}</option>)}
          </select>
          <input className="field" value={taskTitle} maxLength={60} placeholder={t("quests.taskPlaceholder")} onChange={(e) => setTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} aria-label={t("quests.addTask")} />
          <button className="btn btn-primary shrink-0" onClick={addTask} disabled={!taskTitle.trim()} aria-label={t("quests.addTask")}><Plus size={18} /></button>
        </div>
      </Section>

      <Section title={`🏆 ${t("quests.achievements")}`}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const got = !!game.achievements[a.id];
            return (
              <div key={a.id} className={`card-flat p-3 text-center ${got ? "" : "opacity-55 grayscale"}`}>
                <span className="text-3xl" aria-hidden>{got ? a.emoji : "🔒"}</span>
                <p className="title text-sm">{td(`quests.ach.${a.id}`)}</p>
                <p className="text-xs text-muted">{td(`quests.achDesc.${a.id}`)}</p>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
