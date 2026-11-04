"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePeriod, useToday } from "@/lib/client/clock";
import { motion } from "motion/react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { Sky } from "@/components/home/Sky";
import { LiveCompanion } from "@/components/companion/LiveCompanion";
import { RoomThumb } from "@/components/room/RoomCanvas";
import { ProgressBar } from "@/components/ui/bits";
import { Burst } from "@/components/effects/Burst";
import { hashString, type DayPeriod } from "@/lib/time";
import { activeQuests } from "@/lib/game/rules";
import { questName } from "@/lib/game/notify";
import { currentSeason, isBirthday } from "@/lib/seasons";

export default function HomePage() {
  const { t, tl, td, lang } = useT();
  const profile = useWorld((s) => s.profile);
  const prefs = useWorld((s) => s.prefs);
  const game = useWorld((s) => s.game);
  const water = useWorld((s) => s.water);
  const food = useWorld((s) => s.food);
  const rooms = useWorld((s) => s.rooms);
  const letters = useWorld((s) => s.letters);
  const gifts = useWorld((s) => s.gifts);
  const setOverlay = useWorld((s) => s.setOverlay);
  const period: DayPeriod = usePeriod(prefs.timezone);
  const today = useToday(prefs.timezone);

  const msgs = tl(`greet.${period}Msgs` as never);
  const greetMsg = msgs.length ? msgs[hashString(today) % msgs.length] : "";
  const compliments = tl("compliments");
  const compliment = compliments[(hashString(today) >> 3) % compliments.length];
  const season = today ? currentSeason(today) : null;
  const birthday = today ? isBirthday(today, profile.birthday) : false;
  const quests = today ? activeQuests(today).slice(0, 4) : [];
  const waterToday = water.filter((w) => w.date === today).reduce((s, w) => s + w.amountMl, 0);
  const mealsToday = food.filter((f) => f.date === today).length;
  const newLetters = letters.filter((l) => !l.openedAt).length;
  const unopenedGift = gifts.find((g) => g.status === "sent");
  const visibleRooms = rooms.filter((r) => !r.secret).slice(0, 6);
  const goal = prefs.wellness.waterGoalMl;

  const sparkleKey = useMemo(() => (birthday ? 1 : 0), [birthday]);

  return (
    <div className="space-y-5">
      {/* Hero scene */}
      <section className="card overflow-hidden p-0">
        <Sky period={prefs.ui.effects.timeOfDay ? period : "afternoon"} className="relative min-h-[22rem] px-5 pt-6 pb-0 sm:min-h-[24rem]">
          {birthday && <Burst kind="confetti" count={30} spread={260} burstKey={sparkleKey} />}
          <div className="relative z-[1] pr-20 sm:pr-28">
            <h1 className="logo-type on-sky text-[1.9rem] leading-tight sm:text-4xl">
              {birthday ? t("home.birthday", { name: profile.displayName }) : t(`greet.${period}` as never, { name: profile.displayName })}
            </h1>
            <p className="on-sky-soft mt-1 max-w-md font-semibold">{birthday ? t("home.birthdaySub") : greetMsg}</p>
          </div>
          <div className="relative z-[1] mt-2 flex items-end justify-center">
            <LiveCompanion size={180} />
          </div>
          {/* ground */}
          <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-12 w-full" aria-hidden>
            <path d="M0 22 Q100 0 200 18 T400 14 L400 40 L0 40Z" fill="color-mix(in oklab, var(--c-primary) 30%, #ffffff)" />
          </svg>
        </Sky>
        {(season || unopenedGift) && (
          <div className="relative z-[1] flex flex-wrap items-center gap-2 px-4 py-3">
            {season && (
              <span className="chip" title={td(`seasons.${season.id}Sub`)}>
                {season.emoji} {td(`seasons.${season.id}`)} · {t("seasons.decorFree")}
              </span>
            )}
            {unopenedGift && (
              <button className="btn btn-primary btn-sm ml-auto" onClick={() => setOverlay({ gift: unopenedGift, giftPreview: false })}>
                🎁 {t("home.openGift")}
              </button>
            )}
          </div>
        )}
      </section>

      {/* Today */}
      <section aria-labelledby="today" className="space-y-3">
        <h2 id="today" className="title text-xl">{t("home.todayTitle")}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Link href="/quests" className="card col-span-2 p-4 md:col-span-2 md:row-span-2">
            <div className="relative z-[1]">
              <p className="title mb-2 flex items-center gap-2">⭐ {t("home.quests")}</p>
              <ul className="space-y-2.5">
                {quests.map(({ def, key }) => {
                  const q = game.quests[key];
                  const p = q?.progress ?? 0;
                  return (
                    <li key={key} className="flex items-center gap-2">
                      <span aria-hidden className="text-xl">{def.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-bold ${q?.claimed ? "line-through opacity-60" : ""}`}>{questName(lang, def.id)}</span>
                        <ProgressBar value={p} max={def.target} />
                      </span>
                      {p >= def.target && !q?.claimed && <span className="chip">🎁</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Link>

          {prefs.wellness.waterEnabled && prefs.privacy.wellnessOnHome && (
            <Link href="/water" className="card p-4">
              <div className="relative z-[1]">
                <p className="title text-sm">💧 {t("home.water")}</p>
                <p className="title mt-1 text-2xl">{waterToday}<span className="text-sm"> ml</span></p>
                {goal ? <ProgressBar value={waterToday} max={goal} color="#8CCBFF" /> : null}
              </div>
            </Link>
          )}
          {prefs.wellness.foodEnabled && prefs.privacy.wellnessOnHome && (
            <Link href="/food" className="card p-4">
              <div className="relative z-[1]">
                <p className="title text-sm">🍓 {t("home.meals")}</p>
                <p className="title mt-1 text-2xl">{mealsToday}</p>
              </div>
            </Link>
          )}
          <Link href="/surprises" className="card p-4">
            <div className="relative z-[1]">
              <p className="title text-sm">📮 {t("home.mailbox")}</p>
              <p className="mt-1 text-sm font-bold">{newLetters ? t("home.newLetters", { count: newLetters }) : t("home.noLetters")}</p>
              {game.daily.bottleAvailable && !game.daily.bottleOpened && <p className="mt-1 text-xs font-bold text-muted">🍾 {t("home.bottleSeen")}</p>}
            </div>
          </Link>
          <Link href="/surprises" className="card p-4">
            <div className="relative z-[1]">
              <p className="title text-sm">🎁 {t("home.chest")}</p>
              <motion.p className="mt-1 text-sm font-bold" animate={!game.daily.chestOpened ? { scale: [1, 1.05, 1] } : {}} transition={{ repeat: Infinity, duration: 1.6 }}>
                {game.daily.chestOpened ? t("home.chestDone") : t("home.chestReady")}
              </motion.p>
            </div>
          </Link>
        </div>
      </section>

      {/* Rooms */}
      <section className="space-y-3">
        <div className="flex items-center">
          <h2 className="title flex-1 text-xl">{t("home.rooms")}</h2>
          <Link href="/world" className="btn btn-ghost btn-sm">{t("home.seeAll")}</Link>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {visibleRooms.map((r) => (
            <Link key={r.id} href={`/rooms/${r.id}?view=1`} className="card w-60 shrink-0 snap-start p-2">
              <div className="relative z-[1]">
                <RoomThumb room={r} />
                <p className="title mt-2 truncate px-1">{r.emoji} {r.name}</p>
              </div>
            </Link>
          ))}
          <Link href="/rooms" className="card grid w-40 shrink-0 snap-start place-items-center p-4 text-center">
            <span className="relative z-[1]"><span className="block text-3xl">➕</span><span className="title text-sm">{t("rooms.create")}</span></span>
          </Link>
        </div>
      </section>

      {/* Sweet note */}
      <section className="card flex items-center gap-4 p-5">
        <span className="relative z-[1] text-4xl" aria-hidden>💌</span>
        <div className="relative z-[1]">
          <p className="text-sm font-bold text-muted">{t("home.compliment")}</p>
          <p className="title text-lg">{compliment}</p>
        </div>
      </section>
    </div>
  );
}
