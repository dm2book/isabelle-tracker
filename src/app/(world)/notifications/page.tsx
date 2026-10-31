"use client";

import Link from "next/link";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { PageHeader, Empty } from "@/components/ui/bits";
import type { NotificationKind } from "@/lib/types";

const EMOJI: Record<NotificationKind, string> = { reminder: "🔔", message: "💌", gift: "🎁", quest: "⭐", event: "🎉", rare: "💛", birthday: "🎂" };

export default function NotificationsPage() {
  const { t, lang } = useT();
  const notifications = useWorld((s) => s.notifications);
  const kinds = useWorld((s) => s.prefs.notifications.kinds);
  const markRead = useWorld((s) => s.markRead);
  const markAll = useWorld((s) => s.markAllRead);
  const visible = notifications.filter((n) => kinds[n.kind] !== false);
  const fmt = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <PageHeader title={t("notifications.title")} emoji="🔔" action={visible.some((n) => !n.readAt) ? <button className="btn btn-ghost btn-sm" onClick={markAll}>{t("notifications.markAll")}</button> : null} />
      {visible.length === 0 ? (
        <div className="card"><Empty emoji="🔔" text={t("notifications.empty")} /></div>
      ) : (
        <ul className="space-y-2">
          {visible.map((n) => {
            const body = (
              <>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface2 text-2xl" aria-hidden>{EMOJI[n.kind]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{n.title}</span>
                  {n.body && <span className="block text-sm text-muted">{n.body}</span>}
                  <span className="text-xs text-muted">{fmt.format(new Date(n.createdAt))} · {t(`notifications.kinds.${n.kind}`)}</span>
                </span>
                {!n.readAt && <span className="h-3 w-3 shrink-0 rounded-full bg-[#FF5C8A]" aria-label="•" />}
              </>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} onClick={() => markRead(n.id)} className={`card flex items-center gap-3 p-3 ${n.readAt ? "opacity-75" : ""}`}><span className="relative z-[1] flex w-full items-center gap-3">{body}</span></Link>
                ) : (
                  <button onClick={() => markRead(n.id)} className={`card flex w-full items-center gap-3 p-3 text-left ${n.readAt ? "opacity-75" : ""}`}><span className="relative z-[1] flex w-full items-center gap-3">{body}</span></button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-center"><Link href="/settings#notifications" className="btn btn-ghost btn-sm">⚙️ {t("settings.notifications")}</Link></p>
    </div>
  );
}
