"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Lock, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useWorld } from "@/store/world";
import { useUi } from "@/store/ui";
import { useT } from "@/lib/i18n/use";
import { PageHeader, Section, Seg, Toggle, ColorField } from "@/components/ui/bits";
import { BUILT_IN_THEMES, fixContrast, themeFromColors } from "@/lib/theme/themes";
import { contrast } from "@/lib/theme/color";
import { FONT_VARS } from "@/lib/theme/apply";
import { isUnlocked, uid } from "@/lib/catalog";
import { uuid } from "@/lib/rooms/layout";
import type { AnimLevel, BgPattern, ButtonStyle, CardStyle, ColorMode, FontId, IconStyle, Palette, Theme, ThemeTokens } from "@/lib/types";

type Tab = "themes" | "create" | "palettes" | "style" | "effects";

function ThemeSwatch({ tk }: { tk: ThemeTokens }) {
  return (
    <div className="relative h-20 w-full overflow-hidden rounded-xl" style={{ background: `linear-gradient(160deg, ${tk.bg}, ${tk.bg2})` }} aria-hidden>
      <div className="absolute top-2 left-2 h-9 w-16 rounded-lg" style={{ background: tk.surface, border: `2px solid ${tk.border}` }}>
        <div className="m-1.5 h-1.5 w-8 rounded-full" style={{ background: tk.text }} />
        <div className="mx-1.5 h-1.5 w-5 rounded-full" style={{ background: tk.muted }} />
      </div>
      <div className="absolute right-2 bottom-2 h-6 w-12 rounded-full" style={{ background: tk.primary }} />
      <div className="absolute bottom-2 left-2 flex gap-1">
        <span className="h-4 w-4 rounded-full" style={{ background: tk.accent }} />
        <span className="h-4 w-4 rounded-full" style={{ background: tk.accent2 }} />
      </div>
    </div>
  );
}

function PreviewSample() {
  const { t } = useT();
  return (
    <div className="card-flat space-y-3 p-4">
      <p className="text-sm font-bold text-muted">{t("studio.sample")}</p>
      <div className="card p-4">
        <p className="title relative z-[1]">{t("studio.sampleCard")} 🎀</p>
        <p className="relative z-[1] text-sm text-muted">{t("app.tagline")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary btn-sm">{t("studio.sampleButton")}</button>
        <button className="btn btn-soft btn-sm">{t("studio.sampleButton")}</button>
        <span className="chip">🪙 120</span>
      </div>
    </div>
  );
}

function ThemesTab() {
  const { t } = useT();
  const prefs = useWorld((s) => s.prefs);
  const owned = useWorld((s) => s.game.owned);
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const gameAction = useWorld((s) => s.gameAction);
  const systemDark = useUi((s) => s.systemDark);
  const setPreview = useUi((s) => s.setPreview);
  const [previewing, setPreviewing] = useState<Theme | null>(null);
  const dark = prefs.mode === "dark" || (prefs.mode === "auto" && systemDark);

  useEffect(() => () => setPreview(null), [setPreview]);

  const preview = (th: Theme) => {
    setPreviewing(th);
    setPreview(dark ? th.dark : th.light);
  };
  const apply = async (th: Theme) => {
    if (th.price && !isUnlocked(uid("theme", th.id), owned)) {
      const r = await gameAction({ type: "buy", uid: uid("theme", th.id) });
      if (!r) return;
    }
    updatePrefs((p) => ({ ...p, themeId: th.id }));
    setPreviewing(null);
    setPreview(null);
  };
  const cancel = () => {
    setPreviewing(null);
    setPreview(null);
  };

  const card = (th: Theme, custom = false) => {
    const locked = !!th.price && !isUnlocked(uid("theme", th.id), owned);
    const active = prefs.themeId === th.id;
    return (
      <div key={th.id} className={`card-flat relative p-2 ${active ? "ring-[3px] ring-primary" : ""}`}>
        <button className="w-full text-left" onClick={() => preview(th)} aria-label={`${t("common.preview")} ${th.name}`}>
          <ThemeSwatch tk={dark ? th.dark : th.light} />
          <p className="mt-1.5 truncate text-sm font-bold">{th.emoji} {th.name}</p>
        </button>
        <div className="mt-1 flex items-center gap-1">
          {active ? (
            <span className="chip text-xs"><Check size={12} /> {t("studio.using")}</span>
          ) : (
            <button className="btn btn-soft btn-sm min-h-9 px-3 text-xs" onClick={() => apply(th)}>
              {locked ? <><Lock size={12} /> {th.price}</> : t("studio.applyTheme")}
            </button>
          )}
          {custom && (
            <button
              className="btn btn-ghost btn-icon btn-sm ml-auto min-h-8 min-w-8"
              aria-label={t("common.delete")}
              onClick={() => updatePrefs((p) => ({ ...p, customThemes: p.customThemes.filter((x) => x.id !== th.id), themeId: p.themeId === th.id ? "rose" : p.themeId }))}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Section title={t("studio.mode")}>
        <Seg<ColorMode>
          value={prefs.mode}
          onChange={(mode) => updatePrefs((p) => ({ ...p, mode }))}
          options={(["light", "dark", "auto"] as ColorMode[]).map((m) => ({ id: m, label: `${m === "light" ? "☀️" : m === "dark" ? "🌙" : "✨"} ${t(`studio.modes.${m}`)}` }))}
        />
      </Section>
      {previewing && (
        <div className="card sticky top-24 z-10 flex flex-wrap items-center gap-2 p-3">
          <p className="title relative z-[1] mr-auto">👀 {t("studio.previewing")} : {previewing.emoji} {previewing.name}</p>
          <button className="btn btn-ghost btn-sm relative z-[1]" onClick={cancel}>{t("common.cancel")}</button>
          <button className="btn btn-primary btn-sm relative z-[1]" onClick={() => apply(previewing)}>{t("studio.applyTheme")}</button>
        </div>
      )}
      <Section title={t("studio.mine")}>
        {prefs.customThemes.length === 0 ? <p className="text-sm text-muted">{t("studio.noCustom")}</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{prefs.customThemes.map((th) => card(th, true))}</div>}
      </Section>
      <Section title={t("studio.builtIn")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{BUILT_IN_THEMES.map((th) => card(th))}</div>
      </Section>
    </div>
  );
}

function CreateTab({ editing, onDone }: { editing: Theme | null; onDone: () => void }) {
  const { t } = useT();
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const palettes = useWorld((s) => s.prefs.palettes);
  const toast = useWorld((s) => s.toast);
  const setPreview = useUi((s) => s.setPreview);
  const base = editing?.light ?? BUILT_IN_THEMES[0].light;
  const [name, setName] = useState(editing?.name ?? "");
  const [emoji, setEmoji] = useState(editing?.emoji ?? "💖");
  const [c, setC] = useState({ bg: base.bg, surface: base.surface, primary: base.primary, accent: base.accent, accent2: base.accent2, text: base.text });
  const swatches = useMemo(() => Array.from(new Set(palettes.flatMap((p) => p.colors))).slice(0, 12), [palettes]);

  const built = useMemo(() => {
    const th = themeFromColors(editing?.id ?? `custom-${uuid().slice(0, 8)}`, name || t("studio.newTheme"), emoji, c);
    return th;
  }, [c, name, emoji, editing?.id, t]);

  useEffect(() => {
    setPreview(built.light);
  }, [built, setPreview]);
  useEffect(() => () => setPreview(null), [setPreview]);

  const textOk = contrast(built.light.text, built.light.surface) >= 4.5 && contrast(built.light.text, built.light.bg) >= 4.5;
  const btnOk = contrast(built.light.onPrimary, built.light.primary) >= 4.5;

  const fix = () => {
    const f = fixContrast(built.light);
    setC((x) => ({ ...x, text: f.text }));
  };

  const save = () => {
    const th: Theme = { ...built, light: fixContrast(built.light), dark: fixContrast(built.dark) };
    updatePrefs((p) => ({
      ...p,
      customThemes: p.customThemes.some((x) => x.id === th.id) ? p.customThemes.map((x) => (x.id === th.id ? th : x)) : [...p.customThemes, th],
      themeId: th.id,
    }));
    setPreview(null);
    toast({ text: t("studio.themeSaved"), emoji: "🎨", tone: "success" });
    onDone();
  };

  const field = (k: keyof typeof c, label: string) => <ColorField label={label} value={c[k]} onChange={(v) => setC((x) => ({ ...x, [k]: v }))} swatches={swatches} />;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Section title={editing ? t("studio.editTheme") : t("studio.newTheme")}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input className="field w-16 text-center text-xl" value={emoji} onChange={(e) => setEmoji([...e.target.value].slice(-1).join("") || "💖")} aria-label="Emoji" />
            <input className="field" placeholder={t("studio.themeName")} value={name} onChange={(e) => setName(e.target.value)} maxLength={30} aria-label={t("studio.themeName")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("bg", t("studio.background"))}
            {field("surface", `${t("studio.cards")} / ${t("studio.menus")}`)}
            {field("primary", `${t("studio.buttons")} / ${t("studio.icons")}`)}
            {field("accent", t("studio.accent"))}
            {field("accent2", t("studio.accent2"))}
            {field("text", t("studio.text"))}
          </div>
        </div>
      </Section>
      <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
        <PreviewSample />
        <div className={`card-flat p-3 text-sm font-bold ${textOk && btnOk ? "" : "bg-[#FFF1D6] text-[#4A2E12]"}`}>
          {textOk && btnOk ? (
            <p>✅ {t("studio.contrastOk")}</p>
          ) : (
            <div className="space-y-2">
              <p>⚠️ {t("studio.contrastLow")}</p>
              <button className="btn btn-soft btn-sm" onClick={fix}>{t("studio.fixContrast")}</button>
            </div>
          )}
        </div>
        <button className="btn btn-primary w-full" onClick={save}>💾 {t("studio.saveTheme")}</button>
      </div>
    </div>
  );
}

function PalettesTab() {
  const { t } = useT();
  const palettes = useWorld((s) => s.prefs.palettes);
  const fav = useWorld((s) => s.prefs.favoritePaletteId);
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const [editing, setEditing] = useState<string | null>(null);
  const set = (fn: (p: Palette[]) => Palette[]) => updatePrefs((p) => ({ ...p, palettes: fn(p.palettes) }));
  const add = () => {
    const id = uuid();
    set((ps) => [...ps, { id, name: t("studio.newPalette"), colors: ["#FF8DC0", "#C9B6FF", "#A8DAFF", "#FFF4D6", "#8FE0BC"] }]);
    setEditing(id);
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t("studio.paletteHint")}</p>
      {palettes.map((p) => (
        <Section
          key={p.id}
          title={
            editing === p.id ? (
              <input className="field" value={p.name} maxLength={30} onChange={(e) => set((ps) => ps.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))} aria-label={t("studio.paletteName")} />
            ) : (
              p.name
            )
          }
          action={
            <div className="flex gap-1">
              <button className="btn btn-ghost btn-icon btn-sm" aria-pressed={fav === p.id} aria-label={t("studio.favoritePalette")} onClick={() => updatePrefs((pr) => ({ ...pr, favoritePaletteId: p.id }))}>
                <Star size={16} className={fav === p.id ? "fill-[#FFD45E] text-[#E0A800]" : ""} />
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" aria-label={t("common.edit")} onClick={() => setEditing(editing === p.id ? null : p.id)}><Pencil size={16} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" aria-label={t("common.delete")} disabled={palettes.length <= 1} onClick={() => set((ps) => ps.filter((x) => x.id !== p.id))}><Trash2 size={16} /></button>
            </div>
          }
        >
          {editing === p.id ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {p.colors.map((col, i) => (
                <ColorField key={i} label={`${i + 1}`} value={col} onChange={(v) => set((ps) => ps.map((x) => (x.id === p.id ? { ...x, colors: x.colors.map((cc, j) => (j === i ? v : cc)) } : x)))} />
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              {p.colors.map((col, i) => <span key={i} className="h-12 flex-1 rounded-xl border-2 border-line" style={{ background: col }} title={col} />)}
            </div>
          )}
        </Section>
      ))}
      <button className="btn btn-primary" onClick={add}><Plus size={18} /> {t("studio.newPalette")}</button>
    </div>
  );
}

function StyleTab() {
  const { t } = useT();
  const ui = useWorld((s) => s.prefs.ui);
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const setUi = (patch: Partial<typeof ui>) => updatePrefs((p) => ({ ...p, ui: { ...p.ui, ...patch } }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title={t("studio.font")}>
        <div className="grid gap-2">
          {(Object.keys(FONT_VARS) as FontId[]).map((f) => (
            <button key={f} onClick={() => setUi({ font: f })} aria-pressed={ui.font === f} className={`card-flat flex items-center justify-between border-[3px] px-4 py-3 text-left ${ui.font === f ? "border-primary" : "border-transparent"}`} style={{ fontFamily: `var(${FONT_VARS[f].cssVar})` }}>
              <span className="text-lg">{FONT_VARS[f].label}</span>
              <span className="text-sm text-muted">Bonjour Isabelle ✨</span>
            </button>
          ))}
        </div>
      </Section>
      <div className="space-y-4">
        <Section title={t("studio.buttonStyle")}>
          <Seg<ButtonStyle> value={ui.buttonStyle} onChange={(buttonStyle) => setUi({ buttonStyle })} options={(["pill", "rounded", "soft", "bubbly", "outline"] as ButtonStyle[]).map((b) => ({ id: b, label: t(`studio.buttonStyles.${b}`) }))} />
          <div className="mt-3 flex gap-2"><button className="btn btn-primary btn-sm">{t("studio.sampleButton")}</button><button className="btn btn-soft btn-sm">{t("studio.sampleButton")}</button></div>
        </Section>
        <Section title={t("studio.radius")}>
          <input type="range" className="range" min={8} max={32} value={ui.radius} onChange={(e) => setUi({ radius: Number(e.target.value) })} aria-label={t("studio.radius")} />
        </Section>
        <Section title={t("studio.cardStyle")}>
          <Seg<CardStyle> value={ui.cardStyle} onChange={(cardStyle) => setUi({ cardStyle })} options={(["soft", "glass", "sticker", "outline", "cloud"] as CardStyle[]).map((c) => ({ id: c, label: t(`studio.cardStyles.${c}`) }))} />
        </Section>
        <Section title={t("studio.iconStyle")}>
          <Seg<IconStyle> value={ui.iconStyle} onChange={(iconStyle) => setUi({ iconStyle })} options={(["cute", "line"] as IconStyle[]).map((c) => ({ id: c, label: t(`studio.iconStyles.${c}`) }))} />
        </Section>
        <Section title={t("studio.pattern")}>
          <div className="grid grid-cols-4 gap-2">
            {(["none", "hearts", "stars", "dots", "clouds", "gingham", "sparkles", "strawberries"] as BgPattern[]).map((p) => (
              <button key={p} onClick={() => setUi({ pattern: p })} aria-pressed={ui.pattern === p} className={`card-flat border-[3px] px-1 py-2 text-xs font-bold ${ui.pattern === p ? "border-primary" : "border-transparent"}`}>
                <span className="block text-xl" aria-hidden>{{ none: "⬜", hearts: "💗", stars: "⭐", dots: "⚪", clouds: "☁️", gingham: "🧺", sparkles: "✨", strawberries: "🍓" }[p]}</span>
                {t(`studio.patterns.${p}`)}
              </button>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function EffectsTab() {
  const { t } = useT();
  const ui = useWorld((s) => s.prefs.ui);
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const reduced = useUi((s) => s.reducedMotion);
  const setUi = (patch: Partial<typeof ui>) => updatePrefs((p) => ({ ...p, ui: { ...p.ui, ...patch } }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title={t("studio.animations")}>
        <Seg<AnimLevel> value={ui.animations} onChange={(animations) => setUi({ animations })} options={(["off", "gentle", "normal", "extra"] as AnimLevel[]).map((a) => ({ id: a, label: t(`studio.animLevels.${a}`) }))} />
        {reduced && <p className="mt-2 text-sm text-muted">🌙 {t("studio.reducedMotion")}</p>}
        <div className="mt-3 divide-y-2 divide-dashed divide-line">
          <Toggle label={t("studio.effectsHearts")} checked={ui.effects.hearts} onChange={(v) => setUi({ effects: { ...ui.effects, hearts: v } })} />
          <Toggle label={t("studio.effectsSparkles")} checked={ui.effects.sparkles} onChange={(v) => setUi({ effects: { ...ui.effects, sparkles: v } })} />
          <Toggle label={t("studio.effectsSeasonal")} checked={ui.effects.seasonal} onChange={(v) => setUi({ effects: { ...ui.effects, seasonal: v } })} />
          <Toggle label={t("studio.effectsTime")} checked={ui.effects.timeOfDay} onChange={(v) => setUi({ effects: { ...ui.effects, timeOfDay: v } })} />
        </div>
      </Section>
      <Section title={t("studio.sound")}>
        <Toggle label={t("studio.sound")} checked={ui.sound.enabled} onChange={(v) => setUi({ sound: { ...ui.sound, enabled: v } })} />
        <label className="mt-2 flex items-center gap-3">
          <span className="text-sm font-bold">{t("studio.volume")}</span>
          <input type="range" className="range" min={0} max={1} step={0.05} value={ui.sound.volume} disabled={!ui.sound.enabled} onChange={(e) => setUi({ sound: { ...ui.sound, volume: Number(e.target.value) } })} aria-label={t("studio.volume")} />
        </label>
      </Section>
    </div>
  );
}

export default function StudioPage() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("themes");
  const [editing, setEditing] = useState<Theme | null>(null);
  const customThemes = useWorld((s) => s.prefs.customThemes);
  const tabs: Tab[] = ["themes", "create", "palettes", "style", "effects"];
  return (
    <div>
      <PageHeader title={t("studio.title")} subtitle={t("studio.subtitle")} emoji="🎨" />
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist">
        {tabs.map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} onClick={() => { setTab(x); if (x !== "create") setEditing(null); }} className={`btn btn-sm shrink-0 ${tab === x ? "btn-primary" : "btn-ghost"}`}>
            {t(`studio.tabs.${x}`)}
          </button>
        ))}
      </div>
      {tab === "themes" && (
        <>
          <ThemesTab />
          {customThemes.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {customThemes.map((th) => (
                <button key={th.id} className="btn btn-ghost btn-sm" onClick={() => { setEditing(th); setTab("create"); }}><Pencil size={14} /> {th.emoji} {th.name}</button>
              ))}
            </div>
          )}
        </>
      )}
      {tab === "create" && <CreateTab key={editing?.id ?? "new"} editing={editing} onDone={() => { setEditing(null); setTab("themes"); }} />}
      {tab === "palettes" && <PalettesTab />}
      {tab === "style" && <StyleTab />}
      {tab === "effects" && <EffectsTab />}
    </div>
  );
}
