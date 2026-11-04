"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { useToday } from "@/lib/client/clock";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { PageHeader, Section } from "@/components/ui/bits";
import { Sheet } from "@/components/ui/Sheet";
import { Burst } from "@/components/effects/Burst";
import { Companion } from "@/components/companion/Companion";
import { formatDay } from "@/components/ui/DayNav";
import { COLLECTIBLE_MAP } from "@/lib/catalog/collectibles";
import { DEFAULT_HEART_CAP, DEFAULT_ROBUX_WEEKLY_CAP } from "@/lib/game/rules";
import { currentSeason, isBirthday } from "@/lib/seasons";
import { dateKey } from "@/lib/time";
import { play } from "@/lib/sound";
import type { Letter } from "@/lib/types";

function ScratchCard() {
  const { t, tl } = useT();
  const daily = useWorld((s) => s.game.daily);
  const gameAction = useWorld((s) => s.gameAction);
  const [cleared, setCleared] = useState<Set<number>>(new Set());
  const [burst, setBurst] = useState(0);
  const sent = useRef(false);
  const compliments = tl("compliments");
  const opened = daily.surpriseOpened;
  const tiles = 12;

  const scratch = (i: number) => {
    if (opened || cleared.has(i)) return;
    const next = new Set(cleared).add(i);
    setCleared(next);
    play("tap");
    if (next.size >= 7 && !sent.current) {
      sent.current = true;
      gameAction({ type: "surprise" }).then(() => {
        setBurst((b) => b + 1);
        play("sparkle");
      });
    }
  };

  return (
    <Section title={`🎟️ ${t("surprises.daily")}`}>
      <div className="relative mx-auto aspect-[2/1] w-full max-w-sm overflow-hidden rounded-2xl bg-surface2" style={{ touchAction: "none" }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <span className="text-3xl" aria-hidden>💌</span>
          <p className="title mt-1">{opened ? compliments[Math.max(0, daily.surpriseIndex) % compliments.length] : "✨"}</p>
          {opened && <p className="mt-1 text-xs font-bold text-muted">{t("surprises.dailyDone")}</p>}
        </div>
        <Burst kind="sparkles" count={16} spread={120} burstKey={burst} />
        {!opened && (
          <div
            className="absolute inset-0 grid grid-cols-4 grid-rows-3"
            onPointerMove={(e) => {
              const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
              const i = el?.dataset.tile;
              if (e.buttons || e.pointerType === "touch") if (i) scratch(Number(i));
            }}
          >
            {Array.from({ length: tiles }).map((_, i) => (
              <button
                key={i}
                data-tile={i}
                onPointerDown={() => scratch(i)}
                aria-label={t("surprises.dailyHint")}
                className={`animate-shimmer transition-opacity duration-300 ${cleared.has(i) ? "pointer-events-none opacity-0" : ""}`}
                style={{ background: i % 2 ? "linear-gradient(135deg,#E8DEFF,#FFD1E2)" : "linear-gradient(135deg,#FFD1E2,#DCEFFF)" }}
              />
            ))}
          </div>
        )}
      </div>
      {!opened && <p className="mt-2 text-center text-sm font-bold text-muted">👆 {t("surprises.dailyHint")}</p>}
    </Section>
  );
}

function Chest() {
  const { t } = useT();
  const opened = useWorld((s) => s.game.daily.chestOpened);
  const gameAction = useWorld((s) => s.gameAction);
  const [burst, setBurst] = useState(0);
  const [lidOpen, setLidOpen] = useState(opened);
  const open = async () => {
    setLidOpen(true);
    play("gift");
    const r = await gameAction({ type: "chest" });
    if (r) setBurst((b) => b + 1);
    else setLidOpen(opened);
  };
  return (
    <Section title={`🎁 ${t("surprises.chest")}`}>
      <div className="relative flex flex-col items-center">
        <Burst kind="confetti" count={24} spread={160} burstKey={burst} />
        <motion.button onClick={open} disabled={opened} aria-label={t("surprises.openChest")} animate={!opened ? { rotate: [0, -4, 4, -4, 0] } : {}} transition={{ repeat: Infinity, duration: 1.4, repeatDelay: 1 }}>
          <svg viewBox="0 0 160 130" className="h-32 w-40" aria-hidden>
            <rect x="16" y="56" width="128" height="66" rx="12" fill="#FFB38A" stroke="#5A2149" strokeWidth={4} />
            <rect x="16" y="78" width="128" height="10" fill="#FFE08A" />
            <motion.g animate={lidOpen ? { rotate: -35, y: -14 } : { rotate: 0 }} style={{ originX: 0.1, originY: 1 }}>
              <path d="M16 60 Q16 22 80 22 Q144 22 144 60Z" fill="#FFC7A8" stroke="#5A2149" strokeWidth={4} />
              <rect x="70" y="44" width="20" height="22" rx="4" fill="#FFE08A" stroke="#5A2149" strokeWidth={3} />
            </motion.g>
            {lidOpen && <circle cx="80" cy="58" r="22" fill="#FFF4C2" opacity={0.8} />}
          </svg>
        </motion.button>
        <p className="title mt-1">{opened ? t("surprises.chestOpened") : t("home.chestReady")}</p>
        {opened ? <p className="text-sm text-muted">{t("home.chestDone")}</p> : <button className="btn btn-primary btn-sm mt-2" onClick={open}>{t("surprises.openChest")}</button>}
      </div>
    </Section>
  );
}

function Bottle({ onLetter }: { onLetter: (l: Letter) => void }) {
  const { t, tl } = useT();
  const daily = useWorld((s) => s.game.daily);
  const bottleLetter = useWorld((s) => s.letters.find((l) => l.kind === "bottle" && !l.openedAt));
  const gameAction = useWorld((s) => s.gameAction);
  const [msg, setMsg] = useState<string | null>(null);
  const available = (daily.bottleAvailable && !daily.bottleOpened) || !!bottleLetter;
  const open = async () => {
    play("water");
    if (daily.bottleAvailable && !daily.bottleOpened) await gameAction({ type: "bottle_open" });
    if (bottleLetter) onLetter(bottleLetter);
    else {
      const pool = [...tl("compliments"), ...tl("hearts.messages")];
      setMsg(pool[Math.floor(Math.random() * pool.length)]);
    }
  };
  return (
    <Section title={`🍾 ${t("surprises.bottle")}`}>
      <div className="relative h-36 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg,#DCEFFF,#A8DAFF)" }}>
        <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="absolute bottom-0 h-16 w-[200%] animate-[wave_6s_linear_infinite]" aria-hidden>
          <path d="M0 20 Q50 5 100 20 T200 20 T300 20 T400 20 L400 40 L0 40Z" fill="#8CCBFF" />
        </svg>
        <div className="absolute bottom-0 h-6 w-full bg-[#FFEBC2]" />
        {available ? (
          <motion.button onClick={open} className="absolute bottom-6 left-1/2 -translate-x-1/2 text-5xl" animate={{ y: [0, -8, 0], rotate: [-10, 10, -10] }} transition={{ repeat: Infinity, duration: 2.4 }} aria-label={t("surprises.openBottle")}>
            🍾
          </motion.button>
        ) : (
          <p className="absolute inset-x-0 top-6 text-center text-sm font-bold text-[#1F3D5C]">{t("surprises.bottleNone")}</p>
        )}
      </div>
      {available && <p className="mt-2 text-center text-sm font-bold">{t("surprises.bottleFound")}</p>}
      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity: 0, y: 10, rotate: -3 }} animate={{ opacity: 1, y: 0, rotate: 0 }} className="mt-3 rounded-2xl bg-[#FFF8E7] p-4 text-center text-[#5A2149]" style={{ fontFamily: "var(--font-patrick), var(--app-font)" }}>
            <p className="text-lg">📜 {msg}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}

export default function SurprisesPage() {
  const { t, td, lang } = useT();
  const letters = useWorld((s) => s.letters);
  const gifts = useWorld((s) => s.gifts);
  const history = useWorld((s) => s.game.history);
  const achievements = useWorld((s) => s.game.achievements);
  const profile = useWorld((s) => s.profile);
  const look = useWorld((s) => s.prefs.companion);
  const tz = useWorld((s) => s.prefs.timezone);
  const mode = useWorld((s) => s.mode);
  const robux = useWorld((s) => s.config?.robuxProgram ?? false);
  const heartCap = useWorld((s) => s.config?.heartCap ?? DEFAULT_HEART_CAP);
  const robuxCap = useWorld((s) => s.config?.robuxWeeklyCap ?? DEFAULT_ROBUX_WEEKLY_CAP);
  const openLetter = useWorld((s) => s.openLetter);
  const setOverlay = useWorld((s) => s.setOverlay);
  const [letter, setLetter] = useState<Letter | null>(null);
  const today = useToday(tz);

  const season = today ? currentSeason(today) : null;
  const birthday = today ? isBirthday(today, profile.birthday) : false;
  const hearts = history.filter((h) => h.kind === "heart").slice(-12).reverse();
  const secretLetters = letters.filter((l) => l.kind === "letter");

  const showLetter = (l: Letter) => {
    setLetter(l);
    openLetter(l.id);
    play("chime");
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t("surprises.title")} subtitle={t("surprises.subtitle")} emoji="🎁" />
      {birthday && (
        <div className="card relative overflow-hidden p-6 text-center">
          <Burst kind="confetti" count={30} spread={220} />
          <div className="relative z-[1]">
            <Companion look={look} anim="celebrate" mood="celebrating" size={120} className="mx-auto" />
            <p className="logo-type text-3xl">🎂 {t("home.birthday", { name: profile.displayName })}</p>
            <p className="mt-1 font-bold">{t("home.birthdaySub")}</p>
          </div>
        </div>
      )}
      {season && (
        <div className="card flex items-center gap-4 p-4" style={{ background: `linear-gradient(120deg, ${season.colors[0]}55, ${season.colors[1]}55), var(--c-surface)` }}>
          <span className="relative z-[1] text-4xl" aria-hidden>{season.emoji}</span>
          <div className="relative z-[1]">
            <p className="text-xs font-bold text-muted">{t("surprises.seasonal")}</p>
            <p className="title text-lg">{td(`seasons.${season.id}`)}</p>
            <p className="text-sm">{td(`seasons.${season.id}Sub`)} {t("seasons.decorFree")} ✨</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <ScratchCard />
        <Chest />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Bottle onLetter={showLetter} />
        <Section title={`💌 ${t("surprises.letters")}`}>
          {secretLetters.length === 0 ? (
            <p className="text-sm text-muted">{t("surprises.noLetters")}</p>
          ) : (
            <ul className="space-y-2">
              {secretLetters.map((l) => (
                <li key={l.id}>
                  <button onClick={() => showLetter(l)} className="card-flat flex w-full items-center gap-3 p-3 text-left">
                    <span className="text-2xl" aria-hidden>{l.openedAt ? "📭" : "💌"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{l.title || t("surprises.readLetter")}</span>
                      <span className="text-xs text-muted capitalize">{formatDay(dateKey(new Date(l.deliverAt), tz), lang, { day: "numeric", month: "long" })}</span>
                    </span>
                    {!l.openedAt && <span className="chip">✨</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title={`🎀 ${t("surprises.gifts")}`}>
        {gifts.length === 0 ? (
          <p className="text-sm text-muted">{t("surprises.noGifts")}</p>
        ) : (
          <ul className="space-y-2">
            {gifts.map((g) => (
              <li key={g.id} className="card-flat flex items-center gap-3 p-3">
                <span className="text-2xl" aria-hidden>{g.status === "sent" ? "🎁" : "💝"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{g.title || t("gift.from")}{g.kind === "demo" ? ` · ${t("common.demo")}` : ""}</span>
                  <span className="text-xs text-muted capitalize">{formatDay(dateKey(new Date(g.sentAt), tz), lang, { day: "numeric", month: "long" })}</span>
                </span>
                <button className="btn btn-primary btn-sm" onClick={() => setOverlay({ gift: g, giftPreview: false })}>{g.status === "sent" ? t("gift.open") : t("common.open")}</button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title={`💗 ${t("surprises.hearts")}`}>
          {hearts.length === 0 ? (
            <p className="text-sm text-muted">{t("surprises.noHearts")}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {hearts.map((h, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span aria-hidden>{h.label.startsWith("golden") ? "💛" : h.label === "rainbow" ? "🌈" : "💗"}</span>
                  <span className="flex-1">{h.item && COLLECTIBLE_MAP[h.item] ? `${COLLECTIBLE_MAP[h.item].emoji} ${COLLECTIBLE_MAP[h.item].name[lang]}` : h.coins ? `+${h.coins} 🪙` : h.xp ? `+${h.xp} XP` : "✨"}</span>
                  <span className="text-xs text-muted">{h.date.slice(5)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title={`🎲 ${t("surprises.odds")}`}>
          <p className="text-sm">{t("surprises.oddsIntro")}</p>
          <ul className="mt-2 space-y-1 text-sm font-bold">
            <li>💛 {t("surprises.oddsGolden")}</li>
            <li>🌈 {t("surprises.oddsRainbow")}</li>
            <li>💗 {t("surprises.oddsNormal")}</li>
            <li>⏱️ {t("surprises.oddsCap", { n: heartCap })}</li>
          </ul>
          <p className="mt-2 text-sm text-muted">
            {mode === "local" ? t("surprises.oddsDemo") : robux ? t("surprises.oddsRobuxOn", { cap: robuxCap }) : t("surprises.oddsRobuxOff")}
          </p>
        </Section>
      </div>

      <Section title={`🏅 ${t("surprises.milestones")}`}>
        {Object.keys(achievements).length === 0 ? <p className="text-sm text-muted">—</p> : (
          <div className="flex flex-wrap gap-2">{Object.keys(achievements).map((id) => <span key={id} className="chip">🏆 {td(`quests.ach.${id}`)}</span>)}</div>
        )}
      </Section>

      <Sheet open={!!letter} onClose={() => setLetter(null)} title={letter?.kind === "bottle" ? `🍾 ${t("surprises.bottle")}` : `💌 ${t("surprises.letters")}`} variant="center">
        {letter && (
          <div className="rounded-2xl bg-[#FFF8E7] p-5 text-[#5A2149]" style={{ fontFamily: "var(--font-patrick), var(--app-font)" }}>
            {letter.title && <p className="mb-2 text-2xl">{letter.title}</p>}
            <p className="text-lg leading-relaxed whitespace-pre-wrap">{letter.body}</p>
            <p className="mt-4 text-right text-lg">— Ewan 💗</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
