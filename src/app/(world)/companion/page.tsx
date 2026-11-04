"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { useWorld, type CompanionAnim } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { PageHeader, Section, ColorField } from "@/components/ui/bits";
import { Companion, type Mood } from "@/components/companion/Companion";
import { WEARABLES, FUR_COLORS, BOW_COLORS, type WearableDef } from "@/lib/catalog/wardrobe";
import { isUnlocked, uid } from "@/lib/catalog";
import { currentSeason } from "@/lib/seasons";
import { dateKey } from "@/lib/time";
import type { BowId, CompanionLook } from "@/lib/types";

const ANIMS: CompanionAnim[] = ["wave", "dance", "kiss", "hug", "celebrate", "sleep", "eat", "drink", "present", "play"];
const MOODS: Mood[] = ["happy", "excited", "sleepy", "relaxed", "hungry", "celebrating", "loving"];
const BOWS: BowId[] = ["classic", "big", "flower", "heart", "star", "crown", "none"];

export default function CompanionPage() {
  const { t, td, lang } = useT();
  const look = useWorld((s) => s.prefs.companion);
  const owned = useWorld((s) => s.game.owned);
  const tz = useWorld((s) => s.prefs.timezone);
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const gameAction = useWorld((s) => s.gameAction);
  const [anim, setAnim] = useState<CompanionAnim | null>("wave");
  const [mood, setMood] = useState<Mood>("happy");
  const [key, setKey] = useState(0);
  const [name, setName] = useState(look.name);
  const season = currentSeason(dateKey(new Date(), tz));

  const set = (patch: Partial<CompanionLook>) => updatePrefs((p) => ({ ...p, companion: { ...p.companion, ...patch } }));
  const play = (a: CompanionAnim) => {
    setAnim(a);
    setKey((k) => k + 1);
  };

  const wear = async (w: WearableDef) => {
    const id = uid("wear", w.id);
    if (!isUnlocked(id, owned)) {
      const r = await gameAction({ type: "buy", uid: id });
      if (!r) return;
    }
    if (w.kind === "outfit") set({ outfit: look.outfit === w.id ? null : w.id, outfitColor: w.colorable ? w.color : null });
    else set({ accessory: look.accessory === w.id ? null : w.id });
    play("celebrate");
  };

  const grid = (kind: WearableDef["kind"]) => (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {WEARABLES.filter((w) => w.kind === kind)
        .sort((a, b) => Number(!!b.season && b.season === season?.id) - Number(!!a.season && a.season === season?.id))
        .map((w) => {
          const unlocked = isUnlocked(uid("wear", w.id), owned);
          const active = kind === "outfit" ? look.outfit === w.id : look.accessory === w.id;
          return (
            <button
              key={w.id}
              onClick={() => wear(w)}
              aria-pressed={active}
              className={`card-flat relative flex flex-col items-center gap-1 border-[3px] p-2 text-center text-[0.72rem] font-bold ${active ? "border-primary" : "border-transparent"}`}
            >
              {/* Locked items stay readable (name and price); only the preview is dimmed. Tapping one
                  without enough coins explains it instead of doing nothing. */}
              <span className={!unlocked ? "opacity-70" : ""}>
                <Companion look={{ ...look, outfit: kind === "outfit" ? w.id : look.outfit, accessory: kind === "accessory" ? w.id : look.accessory, outfitColor: kind === "outfit" ? w.color : look.outfitColor }} size={64} still />
              </span>
              <span className="line-clamp-2">{w.name[lang]}</span>
              {!unlocked && <span className="absolute top-1 left-1 flex items-center gap-0.5 rounded-full bg-surface px-1.5 text-[0.62rem]"><Lock size={9} /> {w.price}</span>}
              {w.season && <span className="absolute top-1 right-1 text-xs" aria-hidden>{w.season === season?.id ? "✨" : ""}</span>}
            </button>
          );
        })}
    </div>
  );

  return (
    <div>
      <PageHeader title={t("companion.title")} subtitle={t("companion.subtitle", { name: look.name })} emoji="🐱" />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card flex flex-col items-center p-5">
            <div className="relative z-[1]">
              <Companion look={look} mood={mood} anim={anim} animKey={key} size={220} onClick={() => play("poke")} />
            </div>
            <input className="field relative z-[1] mt-3 text-center text-lg font-bold" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} onBlur={() => set({ name: name.trim() || "Mimi" })} aria-label={t("onboarding.companionName")} />
          </div>
          <Section title={t("companion.animations")}>
            <div className="flex flex-wrap gap-1.5">
              {ANIMS.map((a) => <button key={a} className="btn btn-soft btn-sm" onClick={() => play(a)}>{td(`companion.anim.${a}`)}</button>)}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {MOODS.map((m) => (
                <button key={m} aria-pressed={mood === m} className={`chip ${mood === m ? "bg-primary text-on-primary" : ""}`} onClick={() => setMood(m)}>{td(`companion.moods.${m}`)}</button>
              ))}
            </div>
          </Section>
        </div>
        <div className="space-y-4">
          <Section title={t("companion.fur")}>
            <div className="flex flex-wrap gap-2">
              {FUR_COLORS.map((c) => <button key={c} aria-label={c} onClick={() => set({ fur: c })} className={`h-10 w-10 rounded-full border-4 ${look.fur === c ? "border-ink" : "border-line"}`} style={{ background: c }} />)}
            </div>
          </Section>
          <Section title={t("companion.bow")}>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {BOWS.map((b) => (
                <button key={b} onClick={() => set({ bow: b })} aria-pressed={look.bow === b} className={`card-flat flex flex-col items-center border-[3px] p-1 text-[0.7rem] font-bold ${look.bow === b ? "border-primary" : "border-transparent"}`}>
                  <Companion look={{ ...look, bow: b, accessory: null }} size={52} still />
                  {td(`companion.bows.${b}`)}
                </button>
              ))}
            </div>
            <div className="mt-3"><ColorField label={t("onboarding.bowColor")} value={look.bowColor} onChange={(c) => set({ bowColor: c })} swatches={BOW_COLORS} /></div>
          </Section>
          <Section title={t("companion.outfit")} action={look.outfit ? <button className="btn btn-ghost btn-sm" onClick={() => set({ outfit: null })}>{t("companion.noOutfit")}</button> : null}>
            {grid("outfit")}
            {look.outfit && WEARABLES.find((w) => w.id === look.outfit)?.colorable && (
              <div className="mt-3"><ColorField label={t("companion.colors")} value={look.outfitColor ?? "#FF8DC0"} onChange={(c) => set({ outfitColor: c })} swatches={BOW_COLORS} /></div>
            )}
          </Section>
          <Section title={t("companion.accessory")} action={look.accessory ? <button className="btn btn-ghost btn-sm" onClick={() => set({ accessory: null })}>{t("companion.noAccessory")}</button> : null}>
            {grid("accessory")}
          </Section>
        </div>
      </div>
    </div>
  );
}
