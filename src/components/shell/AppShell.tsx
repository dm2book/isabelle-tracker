"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { motion } from "motion/react";
import { Bell, Heart, Menu } from "lucide-react";
import { useWorld } from "@/store/world";
import { useUi } from "@/store/ui";
import { useT } from "@/lib/i18n/use";
import { NAV, BOTTOM, GROUPS, ADMIN_ITEM, type NavItem } from "./nav";
import { Sheet } from "@/components/ui/Sheet";
import { FloatingHearts } from "@/components/effects/FloatingHearts";
import { SeasonalEffects } from "@/components/effects/SeasonalEffects";
import { GiftWatcher } from "./GiftWatcher";
import { Reminders } from "./Reminders";
import { BootScreen } from "./BootScreen";
import { ImportBanner } from "./ImportPanel";
import { levelProgress } from "@/lib/game/rules";

function NavIcon({ item, active, size = 22 }: { item: NavItem; active?: boolean; size?: number }) {
  const style = useWorld((s) => s.prefs.ui.iconStyle);
  if (style === "cute") return <span aria-hidden className={`leading-none ${active ? "scale-110" : ""} transition-transform`} style={{ fontSize: size }}>{item.emoji}</span>;
  const I = item.icon;
  return <I size={size} strokeWidth={active ? 2.6 : 2} aria-hidden />;
}

function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

function Wallet() {
  const coins = useWorld((s) => s.game.coins);
  const xp = useWorld((s) => s.game.xp);
  const { t } = useT();
  const lp = levelProgress(xp);
  return (
    <Link href="/quests" className="flex min-h-10 items-center gap-1.5" aria-label={`${coins} ${t("common.coins")}, ${t("common.level")} ${lp.level}`}>
      <span className="chip"><span aria-hidden>🪙</span>{coins}</span>
      <span className="chip relative overflow-hidden">
        <span aria-hidden>⭐</span>{lp.level}
        <span className="absolute bottom-0 left-0 h-1 bg-primary" style={{ width: `${(lp.into / lp.span) * 100}%` }} />
      </span>
    </Link>
  );
}

function TopBar() {
  const { t } = useT();
  const worldName = useWorld((s) => s.profile.worldName);
  const unread = useWorld((s) => s.notifications.filter((n) => !n.readAt).length);
  const setOverlay = useWorld((s) => s.setOverlay);
  const setMore = useUi((s) => s.setMoreOpen);
  return (
    <div className="sticky top-0 z-40 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 lg:px-8">
      <div className="card flex items-center gap-2 px-3 py-2 lg:px-4">
        <button className="btn btn-ghost btn-icon btn-sm relative z-[1] lg:hidden" onClick={() => setMore(true)} aria-label={t("nav.more")}>
          <Menu size={20} />
        </button>
        <Link href="/home" className="logo-type relative z-[1] min-w-0 flex-1 truncate py-2 text-lg lg:text-xl">{worldName}</Link>
        <div className="relative z-[1] hidden sm:block"><Wallet /></div>
        <Link href="/notifications" className="btn btn-ghost btn-icon btn-sm relative z-[1]" aria-label={`${t("nav.notifications")}${unread ? ` (${unread})` : ""}`}>
          <Bell size={20} />
          {unread > 0 && <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#FF5C8A] px-1 text-xs font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
        </Link>
        <button className="btn btn-primary btn-sm relative z-[1]" onClick={() => setOverlay({ hug: true })} aria-label={t("hug.button")}>
          <Heart size={18} fill="currentColor" /> <span className="hidden sm:inline">{t("hug.short")}</span>
        </button>
      </div>
      <div className="mt-2 flex justify-end sm:hidden"><Wallet /></div>
    </div>
  );
}

function Sidebar() {
  const { t } = useT();
  const path = usePathname();
  const isAdmin = useWorld((s) => s.isAdmin);
  const look = useWorld((s) => s.profile.displayName);
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-1 overflow-y-auto px-4 py-6 lg:flex">
      <div className="card mb-3 px-4 py-3">
        <p className="relative z-[1] text-sm font-bold text-muted">🎀 {t("app.short")}</p>
        <p className="title relative z-[1] text-lg">{look}</p>
      </div>
      {GROUPS.map((g) => (
        <div key={g.id} className="mb-2">
          <p className="px-3 pt-2 pb-1 text-xs font-bold text-muted">{t(g.label)}</p>
          {[...NAV.filter((n) => n.group === g.id), ...(g.id === "system" && isAdmin ? [ADMIN_ITEM] : [])].map((item) => {
            const active = isActive(path, item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-full px-3 py-2 font-bold transition-colors ${active ? "bg-primary text-on-primary" : "hover:bg-surface/70"}`}
              >
                <NavIcon item={item} active={active} size={20} />
                {t(item.label)}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

function BottomNav() {
  const { t } = useT();
  const path = usePathname();
  const setMore = useUi((s) => s.setMoreOpen);
  const giftWaiting = useWorld((s) => s.gifts.some((g) => g.status === "sent"));
  const items = BOTTOM.map((id) => NAV.find((n) => n.id === id)!);
  return (
    <nav aria-label={t("nav.sections")} className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="card mx-auto flex max-w-lg items-stretch justify-between px-2 py-1.5" style={{ minHeight: "var(--nav-h)" }}>
        {items.map((item) => {
          const active = isActive(path, item.href);
          const center = item.id === "surprises";
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative z-[1] flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.72rem] font-bold ${active ? "text-ink" : "text-muted"}`}
            >
              {center ? (
                <span className={`-mt-7 grid h-14 w-14 place-items-center rounded-full bg-primary text-on-primary shadow-[0_4px_0_var(--primary-deep)] ${giftWaiting ? "animate-bob anim-loop" : ""}`}>
                  <NavIcon item={item} active size={26} />
                </span>
              ) : (
                <span className={`grid h-9 w-12 place-items-center rounded-full ${active ? "bg-primary/25" : ""}`}>
                  <NavIcon item={item} active={active} />
                </span>
              )}
              <span className="max-w-full truncate">{t(item.label)}</span>
              {active && <motion.span layoutId="nav-dot" className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-primary" />}
            </Link>
          );
        })}
        <button onClick={() => setMore(true)} className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-0.5 text-[0.72rem] font-bold text-muted">
          <span className="grid h-9 w-12 place-items-center rounded-full"><Menu size={22} /></span>
          {t("nav.more")}
        </button>
      </div>
    </nav>
  );
}

function MoreSheet() {
  const { t } = useT();
  const open = useUi((s) => s.moreOpen);
  const setOpen = useUi((s) => s.setMoreOpen);
  const isAdmin = useWorld((s) => s.isAdmin);
  const path = usePathname();
  useEffect(() => setOpen(false), [path, setOpen]);
  return (
    <Sheet open={open} onClose={() => setOpen(false)} title={t("nav.sections")}>
      {GROUPS.map((g) => (
        <div key={g.id} className="mb-4">
          <p className="mb-2 text-sm font-bold text-muted">{t(g.label)}</p>
          <div className="grid grid-cols-3 gap-2">
            {[...NAV.filter((n) => n.group === g.id), ...(g.id === "system" && isAdmin ? [ADMIN_ITEM] : [])].map((item) => (
              <Link key={item.id} href={item.href} className="card-flat flex flex-col items-center gap-1 p-3 text-center text-sm font-bold">
                <span className="text-3xl" aria-hidden>{item.emoji}</span>
                {t(item.label)}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </Sheet>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const status = useWorld((s) => s.status);
  const onboarded = useWorld((s) => s.profile.onboarded);
  const router = useRouter();
  const path = usePathname();
  const editing = /^\/rooms\/[^/]+$/.test(path);

  useEffect(() => {
    if (status === "auth") router.replace("/login");
    else if (status === "ready" && !onboarded) router.replace("/");
  }, [status, onboarded, router]);

  if (status !== "ready" || !onboarded) return <BootScreen error={status === "error"} />;

  return (
    <div className="relative min-h-dvh">
      <SeasonalEffects />
      <Sidebar />
      <div className="relative z-[1] lg:pl-64">
        <TopBar />
        <main id="main" className="pb-nav mx-auto w-full max-w-5xl px-4 pt-2 lg:px-8"><ImportBanner />{children}</main>
      </div>
      <BottomNav />
      <MoreSheet />
      {!editing && <FloatingHearts />}
      <GiftWatcher />
      <Reminders />
    </div>
  );
}
