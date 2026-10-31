"use client";

import { useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { PageHeader, Empty, Section } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/Sheet";
import { formatDay } from "@/components/ui/DayNav";
import { compressImage } from "@/lib/rooms/photo";
import { uuid } from "@/lib/rooms/layout";
import { dateKey } from "@/lib/time";
import { ACHIEVEMENTS } from "@/lib/game/rules";
import type { ScrapEntry, ScrapKind } from "@/lib/types";

const COLORS = ["#FFD1E2", "#E8DEFF", "#DCEFFF", "#FFF4D6", "#D9F5E1", "#FFE3D1"];
const EMOJIS = ["💗", "🌸", "⭐", "🎀", "☕", "🌙", "🍓", "🎉", "🐱", "🌈"];
const FILTERS: ("all" | ScrapKind)[] = ["all", "moment", "memory", "photo", "message", "room"];

function NewMemory({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const saveScrap = useWorld((s) => s.saveScrap);
  const toast = useWorld((s) => s.toast);
  const tz = useWorld((s) => s.prefs.timezone);
  const [kind, setKind] = useState<ScrapKind>("moment");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [emoji, setEmoji] = useState("💗");
  const [color, setColor] = useState(COLORS[0]);
  const [image, setImage] = useState<string | null>(null);

  const reset = () => { setTitle(""); setBody(""); setImage(null); setKind("moment"); };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const data = await compressImage(f);
      if (data.length > 450_000) throw new Error("big");
      setImage(data);
    } catch {
      toast({ text: t("scrapbook.photoTooBig"), tone: "error" });
    }
  };
  const save = async () => {
    if (!title.trim() && !body.trim() && !image) return;
    await saveScrap({
      id: uuid(), kind: image && kind === "moment" ? "photo" : kind, title: title.trim().slice(0, 80), body: body.trim().slice(0, 2000), emoji, color, image, room: null,
      date: dateKey(new Date(), tz), createdAt: new Date().toISOString(),
    });
    toast({ text: t("scrapbook.saved"), emoji: "📖", tone: "success" });
    reset();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("scrapbook.add")} footer={<><button className="btn btn-ghost" onClick={onClose}>{t("common.cancel")}</button><button className="btn btn-primary" onClick={save}>{t("common.save")}</button></>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["moment", "memory"] as ScrapKind[]).map((k) => (
            <button key={k} className={`btn btn-sm ${kind === k ? "btn-primary" : "btn-ghost"}`} onClick={() => setKind(k)}>{t(`scrapbook.kinds.${k}`)}</button>
          ))}
        </div>
        <input className="field" placeholder={t("scrapbook.titleLabel")} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} aria-label={t("scrapbook.titleLabel")} data-autofocus />
        <textarea className="field min-h-28" placeholder={t("scrapbook.body")} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} aria-label={t("scrapbook.body")} />
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => <button key={e} onClick={() => setEmoji(e)} aria-pressed={emoji === e} className={`h-10 w-10 rounded-full text-xl ${emoji === e ? "bg-primary" : "bg-surface2"}`}>{e}</button>)}
        </div>
        <div className="flex gap-2">
          {COLORS.map((c) => <button key={c} onClick={() => setColor(c)} aria-label={c} className={`h-9 w-9 rounded-full border-4 ${color === c ? "border-ink" : "border-surface"}`} style={{ background: c }} />)}
        </div>
        {image ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="max-h-56 rounded-2xl" />
            <button className="btn btn-ghost btn-sm" onClick={() => setImage(null)}>{t("scrapbook.removePhoto")}</button>
          </div>
        ) : (
          <label className="btn btn-soft btn-sm cursor-pointer">
            <ImagePlus size={16} /> {t("scrapbook.photo")}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        )}
      </div>
    </Sheet>
  );
}

function Polaroid({ e, i }: { e: ScrapEntry; i: number }) {
  const { t, lang } = useT();
  const deleteScrap = useWorld((s) => s.deleteScrap);
  const rot = [-2.5, 1.5, -1, 2.2, -1.8, 1][i % 6];
  return (
    <article className="group relative mb-4 break-inside-avoid rounded-2xl p-3 pb-4 shadow-[0_8px_20px_-12px_rgba(90,33,73,0.45)]" style={{ background: e.color, transform: `rotate(${rot}deg)` }}>
      <span className="absolute -top-2 left-1/2 h-5 w-16 -translate-x-1/2 rotate-[-3deg] rounded-sm bg-white/70" aria-hidden />
      {e.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.image} alt={e.title || t("scrapbook.kinds.photo")} className="mb-2 w-full rounded-xl bg-white p-1.5" />
      )}
      <p className="title text-[#5A2149]">{e.emoji} {e.title || t(`scrapbook.kinds.${e.kind}`)}</p>
      {e.body && <p className="mt-1 text-sm whitespace-pre-wrap text-[#5A2149]" style={{ fontFamily: "var(--font-patrick), var(--app-font)" }}>{e.body}</p>}
      <p className="mt-2 text-xs font-bold text-[#87506F] capitalize">{formatDay(e.date, lang, { day: "numeric", month: "long", year: "numeric" })}</p>
      <button className="btn btn-ghost btn-icon btn-sm absolute top-1 right-1 min-h-8 min-w-8 bg-white/70 text-[#5A2149]" onClick={() => confirm(t("common.areYouSure")) && deleteScrap(e.id)} aria-label={t("common.delete")}><Trash2 size={14} /></button>
    </article>
  );
}

export default function ScrapbookPage() {
  const { t, td } = useT();
  const scrapbook = useWorld((s) => s.scrapbook);
  const achievements = useWorld((s) => s.game.achievements);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const list = scrapbook.filter((e) => filter === "all" || e.kind === filter || (filter === "photo" && e.kind === "room"));

  return (
    <div className="space-y-5">
      <PageHeader title={t("scrapbook.title")} subtitle={t("scrapbook.subtitle")} emoji="📖" action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> {t("scrapbook.add")}</button>} />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label={t("scrapbook.filter")}>
        {FILTERS.map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`chip shrink-0 ${filter === f ? "bg-primary text-on-primary" : ""}`}>
            {f === "all" ? t("common.all") : f === "photo" ? `📸 ${t("scrapbook.gallery")}` : t(`scrapbook.kinds.${f}`)}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="card"><Empty emoji="📖" text={t("scrapbook.empty")} action={<button className="btn btn-primary" onClick={() => setOpen(true)}>{t("scrapbook.add")}</button>} /></div>
      ) : (
        <div className="columns-2 gap-4 pt-2 md:columns-3">
          {list.map((e, i) => <Polaroid key={e.id} e={e} i={i} />)}
        </div>
      )}
      <Section title={`🏆 ${t("scrapbook.kinds.achievement")}`}>
        {Object.keys(achievements).length === 0 ? (
          <p className="text-sm text-muted">—</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {ACHIEVEMENTS.filter((a) => achievements[a.id]).map((a) => <span key={a.id} className="chip">{a.emoji} {td(`quests.ach.${a.id}`)}</span>)}
          </div>
        )}
      </Section>
      <NewMemory open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
