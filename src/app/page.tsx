"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { Companion } from "@/components/companion/Companion";
import { Sky } from "@/components/home/Sky";
import { BootScreen } from "@/components/shell/BootScreen";
import { dayPeriod } from "@/lib/time";
import { BUILT_IN_THEMES } from "@/lib/theme/themes";
import { BOW_COLORS } from "@/lib/catalog/wardrobe";
import { LANGS } from "@/lib/i18n";
import { play } from "@/lib/sound";
import { ImportPanel } from "@/components/shell/ImportPanel";
import { hasMeaningfulWorld, readDeviceWorld } from "@/lib/client/importer";

function FloatingDecor() {
  const items = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: (i * 41) % 96, d: (i * 1.7) % 9, s: 14 + ((i * 7) % 18), g: ["💗", "✨", "🎀", "⭐", "💕", "🌸"][i % 6], dur: 9 + (i % 5) * 2 })), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {items.map((p, i) => (
        <span key={i} className="anim-loop absolute bottom-[-10%]" style={{ left: `${p.x}%`, fontSize: p.s, animation: `rise-up ${p.dur}s ease-in ${-p.d}s infinite` }}>{p.g}</span>
      ))}
      <style>{`@keyframes rise-up { 0% { transform: translateY(0) rotate(0); opacity: 0 } 15% { opacity: .9 } 100% { transform: translateY(-115vh) rotate(40deg); opacity: 0 } }`}</style>
    </div>
  );
}

function Onboarding() {
  const { t, tl } = useT();
  const profile = useWorld((s) => s.profile);
  const prefs = useWorld((s) => s.prefs);
  const updateProfile = useWorld((s) => s.updateProfile);
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.displayName);
  const [world, setWorld] = useState(profile.worldName);
  const [cname, setCname] = useState(prefs.companion.name);

  const finish = () => {
    updateProfile({ displayName: name.trim() || "Isabelle", worldName: world.trim() || tl("onboarding.suggestions")[0], onboarded: true });
    play("sparkle");
    router.push("/home");
  };

  const steps = [
    <div key="0" className="space-y-4">
      <div className="flex justify-center gap-2">
        {LANGS.map((l) => (
          <button key={l.id} className={`btn btn-sm ${prefs.lang === l.id ? "btn-primary" : "btn-ghost"}`} onClick={() => updatePrefs((p) => ({ ...p, lang: l.id }))}>
            {l.flag} {l.label}
          </button>
        ))}
      </div>
      <h2 className="title text-2xl">{t("onboarding.step1")}</h2>
      <p className="text-muted">{t("onboarding.step1Hint")}</p>
      <input className="field text-lg" value={name} onChange={(e) => setName(e.target.value)} aria-label={t("onboarding.yourName")} maxLength={40} data-autofocus />
    </div>,
    <div key="1" className="space-y-4">
      <h2 className="title text-2xl">{t("onboarding.step2")}</h2>
      <p className="text-muted">{t("onboarding.step2Hint")}</p>
      <input className="field text-lg" value={world} onChange={(e) => setWorld(e.target.value)} aria-label={t("onboarding.worldName")} maxLength={60} />
      <div className="flex flex-wrap gap-2">
        {tl("onboarding.suggestions").map((s) => (
          <button key={s} className={`chip ${world === s ? "ring-2 ring-primary" : ""}`} onClick={() => setWorld(s)}>{s}</button>
        ))}
      </div>
    </div>,
    <div key="2" className="space-y-4">
      <h2 className="title text-2xl">{t("onboarding.step3")}</h2>
      <p className="text-muted">{t("onboarding.step3Hint")}</p>
      <div className="flex justify-center"><Companion look={{ ...prefs.companion, name: cname }} anim="wave" animKey={step} size={150} /></div>
      <input className="field text-lg" value={cname} onChange={(e) => setCname(e.target.value)} onBlur={() => updatePrefs((p) => ({ ...p, companion: { ...p.companion, name: cname.trim() || "Mimi" } }))} aria-label={t("onboarding.companionName")} maxLength={24} />
      <div>
        <span className="label">{t("onboarding.bowColor")}</span>
        <div className="flex flex-wrap gap-2">
          {BOW_COLORS.map((c) => (
            <button key={c} aria-label={c} onClick={() => updatePrefs((p) => ({ ...p, companion: { ...p.companion, bowColor: c } }))} className={`h-10 w-10 rounded-full border-4 ${prefs.companion.bowColor === c ? "border-ink" : "border-surface"}`} style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>,
    <div key="3" className="space-y-4">
      <h2 className="title text-2xl">{t("onboarding.step4")}</h2>
      <p className="text-muted">{t("onboarding.step4Hint")}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {BUILT_IN_THEMES.filter((th) => !th.price).map((th) => (
          <button key={th.id} onClick={() => updatePrefs((p) => ({ ...p, themeId: th.id }))} className={`rounded-2xl border-4 p-2 text-xs font-bold ${prefs.themeId === th.id ? "border-ink" : "border-transparent"}`} style={{ background: `linear-gradient(135deg, ${th.light.bg}, ${th.light.primary})`, color: th.light.text }}>
            <span className="block text-2xl">{th.emoji}</span>{th.name}
          </button>
        ))}
      </div>
    </div>,
  ];

  return (
    <div className="card w-full max-w-md p-6">
      <div className="relative z-[1]">
        <div className="mb-4 flex gap-1.5" aria-hidden>
          {steps.map((_, i) => <span key={i} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-surface2"}`} />)}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            {steps[step]}
          </motion.div>
        </AnimatePresence>
        <div className="mt-6 flex gap-2">
          {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>{t("common.back")}</button>}
          {step < steps.length - 1 ? (
            <button className="btn btn-primary ml-auto" onClick={() => setStep(step + 1)}>{t("common.next")}</button>
          ) : (
            <button className="btn btn-primary ml-auto" onClick={finish}>{t("onboarding.finish", { world: world || "✨" })}</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Welcome() {
  const status = useWorld((s) => s.status);
  const mode = useWorld((s) => s.mode);
  const profile = useWorld((s) => s.profile);
  const look = useWorld((s) => s.prefs.companion);
  const tz = useWorld((s) => s.prefs.timezone);
  const router = useRouter();
  const { t } = useT();
  const [period, setPeriod] = useState<ReturnType<typeof dayPeriod>>("afternoon");
  const [waveKey, setWaveKey] = useState(0);
  // A new online account on a device that already holds her world: offer the import before onboarding.
  const [deviceWorld, setDeviceWorld] = useState(false);
  const [freshStart, setFreshStart] = useState(false);
  useEffect(() => {
    if (mode === "cloud") setDeviceWorld(hasMeaningfulWorld(readDeviceWorld()));
  }, [mode]);

  useEffect(() => setPeriod(dayPeriod(new Date(), tz)), [tz]);
  useEffect(() => {
    if (status === "auth") router.replace("/login");
  }, [status, router]);

  if (status === "boot" || status === "auth") return <BootScreen />;
  if (status === "error") return <BootScreen error />;
  const offerImport = mode === "cloud" && !profile.onboarded && !freshStart && deviceWorld;

  return (
    <Sky period={period} className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <FloatingDecor />
      {offerImport ? (
        <div className="relative z-[1] flex w-full max-w-md flex-col items-center gap-4">
          <Companion look={look} anim="hug" animKey={1} size={140} />
          <div className="card w-full p-6">
            <div className="relative z-[1] space-y-3">
              <h1 className="title text-2xl">{t("migrate.title")}</h1>
              <p>{t("migrate.body")}</p>
              <ImportPanel showFile={false} onDone={() => router.push("/home")} />
              <button className="text-sm font-bold text-muted underline" onClick={() => setFreshStart(true)}>{t("migrate.later")}</button>
            </div>
          </div>
        </div>
      ) : !profile.onboarded ? (
        <div className="relative z-[1] flex w-full flex-col items-center gap-4">
          <Companion look={look} anim="wave" animKey={1} size={140} />
          <h1 className="logo-type text-center text-3xl">{t("app.name")}</h1>
          <Onboarding />
        </div>
      ) : (
        <div className="relative z-[1] flex flex-col items-center text-center">
          <motion.div initial={{ scale: 0.6, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.2 }} className="relative">
            <svg viewBox="0 0 260 90" className="absolute -bottom-6 left-1/2 w-72 -translate-x-1/2" aria-hidden>
              <path d="M30 80 C0 80 0 46 30 48 C28 18 74 6 88 32 C104 6 156 12 152 44 C176 30 236 34 228 62 C258 62 258 84 226 84 Z" fill="#fff" opacity={0.95} />
            </svg>
            <Companion look={look} anim="wave" animKey={waveKey} size={210} onClick={() => setWaveKey((k) => k + 1)} label={look.name} />
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className={`title mt-10 text-xl ${period === "night" ? "text-white" : ""}`}>
            {t("welcome.hello", { name: profile.displayName })}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 0.8, type: "spring" }}
            className="logo-type mt-2 max-w-xl text-[2.6rem] leading-[1.05] sm:text-6xl"
          >
            {profile.worldName}
          </motion.h1>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.1 }} className="mt-8">
            <Link href="/home" className="btn btn-primary px-10 text-xl" style={{ minHeight: 64 }} onClick={() => play("sparkle")}>
              ✨ {t("welcome.enter")}
            </Link>
          </motion.div>
          {mode === "local" && <p className="chip mt-6">🔒 {t("welcome.demoBadge")}</p>}
        </div>
      )}
    </Sky>
  );
}
