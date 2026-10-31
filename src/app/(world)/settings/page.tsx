"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Download, LogOut, Trash2 } from "lucide-react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { PageHeader, Section, Seg, Toggle } from "@/components/ui/bits";
import { LANGS } from "@/lib/i18n";
import { apiGet, apiPost, rpc } from "@/lib/client/api";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/client/push";
import { THEME_CACHE_KEY } from "@/lib/theme/apply";
import type { ColorMode, NotificationKind, ReminderSlot } from "@/lib/types";

const TIMEZONES = ["Europe/Paris", "Europe/London", "Europe/Brussels", "Europe/Zurich", "America/Montreal", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "Australia/Sydney", "Indian/Reunion", "Pacific/Tahiti", "America/Martinique"];
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

function PushSettings() {
  const { t } = useT();
  const mode = useWorld((s) => s.mode);
  const config = useWorld((s) => s.config);
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const toast = useWorld((s) => s.toast);
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pushState({ mode, configured: !!config?.pushConfigured }).then(setState);
  }, [mode, config?.pushConfigured]);

  const msg: Partial<Record<PushState, string>> = {
    unsupported: t("settings.pushUnsupported"),
    "ios-install": t("settings.pushIos"),
    "not-configured": t("settings.pushNotConfigured"),
    local: t("settings.pushLocal"),
    denied: t("settings.pushDenied"),
    on: t("settings.pushEnabled"),
  };

  const enable = async () => {
    if (!config?.vapidPublicKey) return;
    setBusy(true);
    try {
      const s = await enablePush(config.vapidPublicKey);
      setState(s);
      if (s === "on") updatePrefs((p) => ({ ...p, notifications: { ...p.notifications, push: true } }));
    } catch {
      toast({ text: "common.error", tone: "error" });
    } finally {
      setBusy(false);
    }
  };
  const disable = async () => {
    setBusy(true);
    setState(await disablePush());
    updatePrefs((p) => ({ ...p, notifications: { ...p.notifications, push: false } }));
    setBusy(false);
  };
  const test = async () => {
    try {
      await rpc("push.test", {});
      toast({ text: t("settings.pushTestSent"), emoji: "🔔", tone: "success" });
    } catch {
      toast({ text: "common.error", tone: "error" });
    }
  };

  return (
    <div className="card-flat space-y-2 p-3">
      <p className="font-bold">📲 {t("settings.push")}</p>
      {state && msg[state] && <p className="text-sm text-muted">{msg[state]}</p>}
      <div className="flex flex-wrap gap-2">
        {state === "off" && <button className="btn btn-primary btn-sm" disabled={busy} onClick={enable}>{t("settings.pushEnable")}</button>}
        {state === "on" && (
          <>
            <button className="btn btn-soft btn-sm" onClick={test}>{t("settings.pushTest")}</button>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={disable}>{t("settings.pushDisable")}</button>
          </>
        )}
      </div>
      <p className="text-xs text-muted">🔒 {t("settings.pushPrivacy")}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useT();
  const router = useRouter();
  const prefs = useWorld((s) => s.prefs);
  const profile = useWorld((s) => s.profile);
  const mode = useWorld((s) => s.mode);
  const email = useWorld((s) => s.email);
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const updateProfile = useWorld((s) => s.updateProfile);
  const resetLocal = useWorld((s) => s.resetLocal);
  const toast = useWorld((s) => s.toast);
  const [confirmText, setConfirmText] = useState("");
  const n = prefs.notifications;
  const [bm, bd] = (profile.birthday ?? "-").split("-");

  const setN = (patch: Partial<typeof n>) => updatePrefs((p) => ({ ...p, notifications: { ...p.notifications, ...patch } }));
  const setW = (patch: Partial<typeof prefs.wellness>) => updatePrefs((p) => ({ ...p, wellness: { ...p.wellness, ...patch } }));

  const exportData = async () => {
    let data: unknown;
    if (mode === "local") {
      const s = useWorld.getState();
      data = { exportedAt: new Date().toISOString(), profile: s.profile, prefs: s.prefs, rooms: s.rooms, food: s.food, water: s.water, diary: s.diary, events: s.events, scrapbook: s.scrapbook, game: s.game, notifications: s.notifications, letters: s.letters };
    } else {
      data = await apiGet("/api/account/export");
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `monde-isabelle-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const deleteAll = async () => {
    if (confirmText.trim().toUpperCase() !== t("settings.deleteWord")) return;
    if (mode === "local") {
      resetLocal();
      localStorage.removeItem(THEME_CACHE_KEY);
      toast({ text: t("settings.deleted"), tone: "success" });
      router.replace("/");
    } else {
      await rpc("account.delete", { confirm: true });
      localStorage.removeItem(THEME_CACHE_KEY);
      window.location.href = "/login";
    }
  };

  const signOut = async () => {
    await apiPost("/api/auth/signout", {}).catch(() => {});
    window.location.href = "/login";
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} emoji="⚙️" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={`🌍 ${t("settings.language")}`}>
          <Seg value={prefs.lang} onChange={(lang) => updatePrefs((p) => ({ ...p, lang }))} options={LANGS.map((l) => ({ id: l.id, label: `${l.flag} ${l.label}` }))} />
        </Section>
        <Section title={`🎨 ${t("settings.appearance")}`}>
          <Seg<ColorMode> value={prefs.mode} onChange={(m) => updatePrefs((p) => ({ ...p, mode: m }))} options={(["light", "dark", "auto"] as ColorMode[]).map((m) => ({ id: m, label: t(`studio.modes.${m}`) }))} />
          <div className="mt-3"><Link href="/studio" className="btn btn-soft btn-sm">🎨 {t("settings.openStudio")}</Link></div>
        </Section>
      </div>

      <Section title={`🏡 ${t("settings.world")}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="label">{t("settings.displayName")}</span><input className="field" value={profile.displayName} maxLength={40} onChange={(e) => updateProfile({ displayName: e.target.value })} /></label>
          <label className="block"><span className="label">{t("settings.worldName")}</span><input className="field" value={profile.worldName} maxLength={60} onChange={(e) => updateProfile({ worldName: e.target.value })} /></label>
          <div>
            <span className="label">{t("settings.birthday")}</span>
            <div className="flex gap-2">
              <select className="field" value={bd || ""} onChange={(e) => updateProfile({ birthday: e.target.value && bm ? `${bm}-${e.target.value}` : e.target.value ? `01-${e.target.value}` : null })} aria-label="Jour">
                <option value="">—</option>{DAYS.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select className="field" value={bm || ""} onChange={(e) => updateProfile({ birthday: e.target.value ? `${e.target.value}-${bd || "01"}` : null })} aria-label="Mois">
                <option value="">—</option>{MONTHS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <p className="mt-1 text-xs text-muted">{t("settings.birthdayHint")}</p>
          </div>
          <label className="block">
            <span className="label">{t("settings.timezone")}</span>
            <select className="field" value={prefs.timezone} onChange={(e) => updatePrefs((p) => ({ ...p, timezone: e.target.value }))}>
              {Array.from(new Set([prefs.timezone, ...TIMEZONES])).map((z) => <option key={z}>{z}</option>)}
            </select>
          </label>
        </div>
      </Section>

      <Section title={`💗 ${t("settings.wellness")}`}>
        <div className="divide-y-2 divide-dashed divide-line">
          <Toggle label={t("settings.foodEnabled")} checked={prefs.wellness.foodEnabled} onChange={(v) => setW({ foodEnabled: v })} />
          <Toggle label={t("settings.waterEnabled")} checked={prefs.wellness.waterEnabled} onChange={(v) => setW({ waterEnabled: v })} />
          <Toggle label={t("settings.showCalories")} checked={prefs.wellness.showCalories} onChange={(v) => setW({ showCalories: v })} />
          <Toggle label={t("settings.wellnessOnHome")} checked={prefs.privacy.wellnessOnHome} onChange={(v) => updatePrefs((p) => ({ ...p, privacy: { ...p.privacy, wellnessOnHome: v } }))} />
        </div>
      </Section>

      <section id="notifications" className="scroll-mt-24">
        <Section title={`🔔 ${t("settings.notifications")}`}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="title mb-1 text-sm">{t("settings.inApp")}</p>
              <div className="divide-y-2 divide-dashed divide-line">
                {(Object.keys(n.kinds) as NotificationKind[]).map((k) => (
                  <Toggle key={k} label={t(`notifications.kinds.${k}`)} checked={n.kinds[k]} onChange={(v) => setN({ kinds: { ...n.kinds, [k]: v } })} />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="title text-sm">{t("settings.reminders")}</p>
              {(["morning", "afternoon", "evening"] as ReminderSlot[]).map((slot) => (
                <div key={slot} className="flex items-center gap-2">
                  <div className="flex-1"><Toggle label={t(`settings.${slot}`)} checked={n.reminders[slot].enabled} onChange={(v) => setN({ reminders: { ...n.reminders, [slot]: { ...n.reminders[slot], enabled: v } } })} /></div>
                  <input type="time" className="field w-32" value={n.reminders[slot].time} onChange={(e) => setN({ reminders: { ...n.reminders, [slot]: { ...n.reminders[slot], time: e.target.value } } })} aria-label={`${t(`settings.${slot}`)} — ${t("common.time")}`} />
                </div>
              ))}
              <Toggle label={t("settings.breakReminder")} checked={n.breakReminder} onChange={(v) => setN({ breakReminder: v })} />
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1"><Toggle label={t("settings.quietHours")} checked={n.quietHours.enabled} onChange={(v) => setN({ quietHours: { ...n.quietHours, enabled: v } })} /></div>
                <span className="text-sm">{t("settings.quietFrom")}</span>
                <input type="time" className="field w-28" value={n.quietHours.start} onChange={(e) => setN({ quietHours: { ...n.quietHours, start: e.target.value } })} aria-label={t("settings.quietFrom")} />
                <span className="text-sm">{t("settings.quietTo")}</span>
                <input type="time" className="field w-28" value={n.quietHours.end} onChange={(e) => setN({ quietHours: { ...n.quietHours, end: e.target.value } })} aria-label={t("settings.quietTo")} />
              </div>
              <PushSettings />
            </div>
          </div>
        </Section>
      </section>

      <Section title={`🔒 ${t("settings.privacy")}`}>
        <p className="mb-3 text-sm text-muted">{mode === "local" ? t("settings.localMode") : t("settings.cloudMode")}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/privacy" className="btn btn-ghost btn-sm">📄 {t("settings.privacyPage")}</Link>
          <button className="btn btn-soft btn-sm" onClick={exportData}><Download size={16} /> {t("settings.export")}</button>
        </div>
        <p className="mt-1 text-xs text-muted">{t("settings.exportHint")}</p>
        <div className="mt-4 rounded-2xl border-2 border-dashed border-[#F2A7B5] p-3">
          <p className="font-bold">{t("settings.delete")}</p>
          <p className="text-sm text-muted">{t("settings.deleteHint")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input className="field max-w-56" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={t("settings.deleteConfirm")} aria-label={t("settings.deleteConfirm")} />
            <button className="btn btn-danger btn-sm" disabled={confirmText.trim().toUpperCase() !== t("settings.deleteWord")} onClick={deleteAll}><Trash2 size={16} /> {t("common.delete")}</button>
          </div>
        </div>
      </Section>

      <Section title={`👤 ${t("settings.account")}`}>
        {mode === "cloud" ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold">{t("settings.signedInAs", { email: email ?? "" })}</p>
            <button className="btn btn-ghost btn-sm" onClick={signOut}><LogOut size={16} /> {t("settings.signOut")}</button>
          </div>
        ) : (
          <p className="text-sm text-muted">{t("settings.localMode")}</p>
        )}
      </Section>

      <Section title={`✨ ${t("settings.about")}`}>
        <p className="text-sm">{t("app.name")} · {t("settings.version")} 1.0.0</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/" className="btn btn-ghost btn-sm">{t("settings.replayWelcome")}</Link>
        </div>
      </Section>
    </div>
  );
}
