"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, RefreshCw, Send, Trash2 } from "lucide-react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { apiPost, ApiError } from "@/lib/client/api";
import { PageHeader, Section, Toggle } from "@/components/ui/bits";
import { BootScreen } from "@/components/shell/BootScreen";
import { uuid } from "@/lib/rooms/layout";
import { zonedToUtc } from "@/lib/time";
import type { GiftAnimation, GiftKind, GiftSummary } from "@/lib/types";

type Tab = "overview" | "rewards" | "gift" | "gifts" | "messages" | "invites" | "resets" | "settings" | "audit";

interface Overview {
  recipients: { id: string; email: string; displayName: string }[];
  rewardEvents: { id: string; user_id: string; tier: string; status: string; created_at: string }[];
  gifts: { id: string; recipient_id: string; kind: GiftKind; title: string; animation: GiftAnimation; status: string; sent_at: string; opened_at: string | null; revealed_at: string | null }[];
  messages: { id: string; recipient_id: string; kind: "letter" | "bottle"; title: string; body: string; deliver_at: string; opened_at: string | null }[];
  settings: { robuxEnabled: boolean; robuxWeeklyCap: number; heartDailyCap: number };
  audit: { admin_email: string; action: string; target: string | null; created_at: string }[];
  stats: { heartsThisWeek: number };
  encryptionReady: boolean;
  invitations: { id: string; email: string; expires_at: string; used_at: string | null; revoked_at: string | null; created_at: string }[];
  invitableEmails: string[];
  resets: { id: string; user_id: string; email: string; expires_at: string; used_at: string | null; revoked_at: string | null; created_at: string }[];
}

function InvitesPanel({ data, onChange }: { data: Overview; onChange: () => void }) {
  const { t } = useT();
  const toast = useWorld((s) => s.toast);
  const [email, setEmail] = useState(data.invitableEmails[0] ?? "");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try {
      const r = await apiPost<{ link: string }>("/api/admin", { op: "invite.create", payload: { email } });
      setLink(r.link);
      onChange();
    } catch {
      toast({ text: "common.error", tone: "error" });
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    if (!link) return;
    if (navigator.share) await navigator.share({ title: t("app.short"), text: "💌", url: link }).catch(() => {});
    else {
      await navigator.clipboard.writeText(link).catch(() => {});
      toast({ text: t("invites.copied"), tone: "success" });
    }
  };
  const status = (i: Overview["invitations"][number]) =>
    i.used_at ? t("invites.used") : i.revoked_at ? t("invites.revoked") : new Date(i.expires_at) < new Date() ? t("invites.expired") : t("invites.active");
  if (!data.invitableEmails.length) return <p className="text-sm text-muted">{t("invites.none")}</p>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t("invites.hint")}</p>
      <div className="flex flex-wrap gap-2">
        <select className="field max-w-xs" value={email} onChange={(e) => setEmail(e.target.value)} aria-label={t("invites.email")}>
          {data.invitableEmails.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <button className="btn btn-primary" disabled={busy || !email} onClick={create}>💌 {t("invites.create")}</button>
      </div>
      {link && (
        <div className="card-flat space-y-2 p-3">
          <p className="text-sm font-bold">{t("invites.link")}</p>
          <p className="font-mono text-xs break-all select-all">{link}</p>
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={share}>📤 {t("invites.share")}</button>
            <button className="btn btn-ghost btn-sm" onClick={async () => { await navigator.clipboard.writeText(link).catch(() => {}); toast({ text: t("invites.copied"), tone: "success" }); }}>{t("invites.copy")}</button>
          </div>
        </div>
      )}
      <div>
        <p className="title mb-2 text-sm">{t("invites.list")}</p>
        <ul className="space-y-2">
          {data.invitations.map((i) => (
            <li key={i.id} className="card-flat flex flex-wrap items-center gap-2 p-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate font-bold">{i.email}</span>
              <span className="text-xs text-muted">{fmt(i.created_at)}</span>
              <span className="chip">{status(i)}</span>
              {!i.used_at && !i.revoked_at && new Date(i.expires_at) > new Date() && (
                <button className="btn btn-ghost btn-sm" onClick={async () => { await apiPost("/api/admin", { op: "invite.revoke", payload: { id: i.id } }); onChange(); }}>{t("invites.revoke")}</button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Single-use password-reset links for Isabelle (no e-mail needed). The link is shown once. */
function ResetsPanel({ data, onChange }: { data: Overview; onChange: () => void }) {
  const { t } = useT();
  const toast = useWorld((s) => s.toast);
  const [userId, setUserId] = useState(data.recipients[0]?.id ?? "");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try {
      const r = await apiPost<{ link: string }>("/api/admin", { op: "reset.create", payload: { userId } });
      setLink(r.link);
      onChange();
    } catch {
      toast({ text: "common.error", tone: "error" });
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link).catch(() => {});
    toast({ text: t("invites.copied"), tone: "success" });
  };
  const share = async () => {
    if (!link) return;
    if (navigator.share) await navigator.share({ title: t("app.short"), text: "🔑", url: link }).catch(() => {});
    else await copy();
  };
  const status = (r: Overview["resets"][number]) =>
    r.used_at ? t("invites.used") : r.revoked_at ? t("invites.revoked") : new Date(r.expires_at) < new Date() ? t("invites.expired") : t("invites.active");
  if (!data.recipients.length) return <p className="text-sm text-muted">{t("resets.none")}</p>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t("resets.hint")}</p>
      <div className="flex flex-wrap gap-2">
        <select className="field max-w-xs" value={userId} onChange={(e) => { setUserId(e.target.value); setLink(null); }} aria-label={t("admin.recipient")}>
          {data.recipients.map((r) => <option key={r.id} value={r.id}>{r.displayName || r.email}</option>)}
        </select>
        <button className="btn btn-primary" disabled={busy || !userId} onClick={create}>🔑 {t("resets.create")}</button>
      </div>
      {link && (
        <div className="card-flat space-y-2 p-3">
          <p className="text-sm font-bold">{t("resets.link")}</p>
          <p className="font-mono text-xs break-all select-all">{link}</p>
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={share}>📤 {t("invites.share")}</button>
            <button className="btn btn-ghost btn-sm" onClick={copy}>{t("invites.copy")}</button>
          </div>
        </div>
      )}
      {data.resets.length > 0 && (
        <div>
          <p className="title mb-2 text-sm">{t("resets.list")}</p>
          <ul className="space-y-2">
            {data.resets.map((r) => (
              <li key={r.id} className="card-flat flex flex-wrap items-center gap-2 p-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-bold">{r.email}</span>
                <span className="text-xs text-muted">{fmt(r.created_at)}</span>
                <span className="chip">{status(r)}</span>
                {!r.used_at && !r.revoked_at && new Date(r.expires_at) > new Date() && (
                  <button className="btn btn-ghost btn-sm" onClick={async () => { await apiPost("/api/admin", { op: "reset.revoke", payload: { id: r.id } }); onChange(); }}>{t("invites.revoke")}</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const ANIMS: GiftAnimation[] = ["present", "hug", "hearts", "confetti", "rare"];
const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(iso)) : "—");

function GiftForm({ data, preset, onSent }: { data: Overview; preset: { rewardEventId?: string; recipientId?: string } | null; onSent: () => void }) {
  const { t } = useT();
  const setOverlay = useWorld((s) => s.setOverlay);
  const toast = useWorld((s) => s.toast);
  const [recipientId, setRecipientId] = useState(preset?.recipientId ?? data.recipients[0]?.id ?? "");
  const [kind, setKind] = useState<GiftKind>(preset?.rewardEventId ? "robux" : "surprise");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [animation, setAnimation] = useState<GiftAnimation>(preset?.rewardEventId ? "rare" : "present");
  const [key, setKey] = useState(() => uuid());
  const [busy, setBusy] = useState(false);
  const name = data.recipients.find((r) => r.id === recipientId)?.displayName ?? "Isabelle";

  const preview = () => {
    const g: GiftSummary = { id: "preview", kind: kind === "robux" ? "robux" : kind, title, message, animation, hasCode: kind === "robux", status: "sent", sentAt: new Date().toISOString(), openedAt: null, revealedAt: null };
    setOverlay({ gift: g, giftPreview: true });
  };
  const send = async () => {
    if (!recipientId) return;
    if (kind === "robux" && code.trim().length < 4) return toast({ text: t("admin.codeHint"), tone: "error" });
    if (!confirm(t("admin.sendConfirm"))) return;
    setBusy(true);
    try {
      await apiPost("/api/admin", { op: "gift.send", payload: { recipientId, kind, code: kind === "robux" ? code.trim() : undefined, title, message, animation, rewardEventId: preset?.rewardEventId ?? null, idempotencyKey: key } });
      setCode("");
      setTitle("");
      setMessage("");
      setKey(uuid());
      toast({ text: t("admin.sentOk"), emoji: "🎁", tone: "success" });
      onSent();
    } catch (e) {
      toast({ text: e instanceof ApiError && e.code === "duplicate" ? t("admin.duplicate") : "common.error", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (!data.recipients.length) return <p className="text-sm text-muted">{t("admin.noRecipients")}</p>;
  return (
    <div className="space-y-4">
      {preset?.rewardEventId && <p className="chip">💛 {t("admin.linkReward")} · {preset.rewardEventId.slice(0, 8)}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">{t("admin.recipient")}</span>
          <select className="field" value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>{data.recipients.map((r) => <option key={r.id} value={r.id}>{r.displayName} ({r.email})</option>)}</select>
        </label>
        <label className="block"><span className="label">{t("admin.type")}</span>
          <select className="field" value={kind} onChange={(e) => setKind(e.target.value as GiftKind)}>{(["robux", "demo", "surprise"] as GiftKind[]).map((k) => <option key={k} value={k}>{t(`admin.types.${k}`)}</option>)}</select>
        </label>
      </div>
      {kind === "robux" && (
        <label className="block">
          <span className="label">{t("admin.code")}</span>
          <div className="flex gap-2">
            <input className="field font-mono" type={showCode ? "text" : "password"} autoComplete="off" spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} maxLength={100} />
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowCode((v) => !v)} aria-label={showCode ? "Hide" : "Show"}>{showCode ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          <span className="mt-1 block text-xs text-muted">🔒 {t("admin.codeHint")}</span>
          {!data.encryptionReady && <span className="mt-1 block text-xs font-bold text-[#a3123c]">REWARD_ENCRYPTION_KEY missing on the server.</span>}
        </label>
      )}
      <label className="block"><span className="label">{t("admin.titleField")}</span><input className="field" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="block"><span className="label">{t("admin.message")}</span><textarea className="field min-h-28" value={message} maxLength={2000} onChange={(e) => setMessage(e.target.value)} /></label>
      <div>
        <span className="label">{t("admin.animation")}</span>
        <div className="flex flex-wrap gap-2">{ANIMS.map((a) => <button key={a} type="button" onClick={() => setAnimation(a)} className={`btn btn-sm ${animation === a ? "btn-primary" : "btn-ghost"}`}>{t(`admin.animations.${a}`)}</button>)}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-soft" onClick={preview}><Eye size={18} /> {t("admin.previewGift")}</button>
        <button className="btn btn-primary" disabled={busy} onClick={send}><Send size={18} /> {t("admin.send", { name })}</button>
      </div>
    </div>
  );
}

function MessageForm({ data, onDone }: { data: Overview; onDone: () => void }) {
  const { t } = useT();
  const toast = useWorld((s) => s.toast);
  const [recipientId, setRecipientId] = useState(data.recipients[0]?.id ?? "");
  const [kind, setKind] = useState<"letter" | "bottle">("letter");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState(() => new Date(Date.now() + 3600_000).toISOString().slice(0, 16));
  const submit = async () => {
    if (!body.trim() || !recipientId) return;
    try {
      await apiPost("/api/admin", { op: "message.schedule", payload: { recipientId, kind, title, body, deliverAt: zonedToUtc(when, "Europe/Paris") } });
      setTitle("");
      setBody("");
      toast({ text: t("common.saved"), emoji: "💌", tone: "success" });
      onDone();
    } catch {
      toast({ text: "common.error", tone: "error" });
    }
  };
  if (!data.recipients.length) return <p className="text-sm text-muted">{t("admin.noRecipients")}</p>;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <select className="field" value={recipientId} onChange={(e) => setRecipientId(e.target.value)} aria-label={t("admin.recipient")}>{data.recipients.map((r) => <option key={r.id} value={r.id}>{r.displayName}</option>)}</select>
        <select className="field" value={kind} onChange={(e) => setKind(e.target.value as "letter" | "bottle")} aria-label={t("admin.kind")}>{(["letter", "bottle"] as const).map((k) => <option key={k} value={k}>{t(`admin.kinds.${k}`)}</option>)}</select>
        <input className="field" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label={t("admin.deliverAt")} />
      </div>
      <input className="field" placeholder={t("admin.titleField")} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="field min-h-28" placeholder={t("admin.message")} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} />
      <p className="text-xs text-muted">{t("admin.deliverAt")}</p>
      <button className="btn btn-primary" onClick={submit} disabled={!body.trim()}>💌 {t("admin.schedule")}</button>
    </div>
  );
}

function LocalAdmin() {
  const { t } = useT();
  const addLocalDemoGift = useWorld((s) => s.addLocalDemoGift);
  const setOverlay = useWorld((s) => s.setOverlay);
  const [message, setMessage] = useState("Coucou Isabelle ! Voici un petit cadeau de démonstration 💗");
  const [animation, setAnimation] = useState<GiftAnimation>("present");
  return (
    <div className="space-y-4">
      <div className="card p-4"><p className="relative z-[1] text-sm font-bold">⚙️ {t("admin.needsCloud")}</p></div>
      <Section title={`🎁 ${t("admin.sendDemoLocal")}`}>
        <p className="mb-3 text-sm text-muted">{t("admin.demoLocal")}</p>
        <textarea className="field min-h-24" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} aria-label={t("admin.message")} />
        <div className="mt-3 flex flex-wrap gap-2">{ANIMS.map((a) => <button key={a} onClick={() => setAnimation(a)} className={`btn btn-sm ${animation === a ? "btn-primary" : "btn-ghost"}`}>{t(`admin.animations.${a}`)}</button>)}</div>
        <div className="mt-3 flex gap-2">
          <button className="btn btn-soft" onClick={() => setOverlay({ gift: { id: "preview", kind: "demo", title: "🎁", message, animation, hasCode: false, status: "sent", sentAt: new Date().toISOString(), openedAt: null, revealedAt: null }, giftPreview: true })}>{t("admin.previewGift")}</button>
          <button className="btn btn-primary" onClick={() => addLocalDemoGift({ kind: "demo", title: "Cadeau démo", message, animation, hasCode: false })}>{t("admin.sendDemoLocal")}</button>
        </div>
      </Section>
    </div>
  );
}

export default function AdminPage() {
  const { t } = useT();
  const status = useWorld((s) => s.status);
  const mode = useWorld((s) => s.mode);
  const isAdmin = useWorld((s) => s.isAdmin);
  const toast = useWorld((s) => s.toast);
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<Overview | null>(null);
  const [preset, setPreset] = useState<{ rewardEventId?: string; recipientId?: string } | null>(null);
  const [settings, setSettings] = useState<Overview["settings"] | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await apiPost<Overview>("/api/admin", { op: "overview" });
      setData(d);
      setSettings(d.settings);
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    if (status === "auth") window.location.href = "/login";
    if (!(status === "ready" && mode === "cloud" && isAdmin)) return;
    let alive = true;
    apiPost<Overview>("/api/admin", { op: "overview" })
      .then((d) => {
        if (!alive) return;
        setData(d);
        setSettings(d.settings);
      })
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [status, mode, isAdmin]);

  const nameOf = useMemo(() => (id: string) => data?.recipients.find((r) => r.id === id)?.displayName ?? id.slice(0, 6), [data]);

  if (status === "boot") return <BootScreen />;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-16">
      <div className="mb-2"><Link href="/home" className="btn btn-ghost btn-sm">← {t("nav.home")}</Link></div>
      <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} emoji="🛡️" action={
          <div className="flex gap-1">
            <Link href="/setup" className="btn btn-ghost btn-sm">🧰 {t("admin.tabs.setup")}</Link>
            {mode === "cloud" && isAdmin ? <button className="btn btn-ghost btn-icon" onClick={load} aria-label="Refresh"><RefreshCw size={18} /></button> : null}
          </div>
        } />
      {mode === "local" ? (
        <LocalAdmin />
      ) : !isAdmin ? (
        <div className="card p-6">
          <p className="relative z-[1] font-bold">{t("admin.forbidden")}</p>
          <Link href="/setup" className="btn btn-soft btn-sm relative z-[1] mt-3">🧰 {t("admin.tabs.setup")}</Link>
        </div>
      ) : !data ? (
        <div className="skeleton h-40" />
      ) : (
        <>
          <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4" role="tablist">
            {(["overview", "invites", "resets", "rewards", "gift", "gifts", "messages", "settings", "audit"] as Tab[]).map((x) => (
              <button key={x} role="tab" aria-selected={tab === x} className={`btn btn-sm shrink-0 ${tab === x ? "btn-primary" : "btn-ghost"}`} onClick={() => { setTab(x); if (x !== "gift") setPreset(null); }}>{t(`admin.tabs.${x}`)}</button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ["💛", t("admin.pending"), data.rewardEvents.filter((r) => r.status === "pending").length],
                ["🎁", t("admin.sent"), data.gifts.length],
                ["🔓", t("admin.revealed"), data.gifts.filter((g) => g.status === "revealed").length],
                ["💗", "Hearts / 7 j", data.stats.heartsThisWeek],
              ].map(([e, l, v]) => (
                <div key={String(l)} className="card p-4"><p className="relative z-[1] text-sm font-bold text-muted">{e} {l}</p><p className="title relative z-[1] text-3xl">{v}</p></div>
              ))}
              <div className="card p-4 sm:col-span-4"><p className="relative z-[1] text-sm">🔒 {t("admin.neverStored")} · {t("admin.robuxProgram")} : <b>{data.settings.robuxEnabled ? t("common.on") : t("common.off")}</b></p></div>
            </div>
          )}

          {tab === "invites" && <Section title={t("invites.title")}><InvitesPanel data={data} onChange={load} /></Section>}
          {tab === "resets" && <Section title={t("resets.title")}><ResetsPanel data={data} onChange={load} /></Section>}

          {tab === "rewards" && (
            <Section title={t("admin.events")}>
              {data.rewardEvents.length === 0 ? <p className="text-sm text-muted">{t("admin.noPending")}</p> : (
                <ul className="space-y-2">
                  {data.rewardEvents.map((r) => (
                    <li key={r.id} className="card-flat flex flex-wrap items-center gap-2 p-3">
                      <span>💛</span><span className="font-bold">{nameOf(r.user_id)}</span>
                      <span className="text-xs text-muted">{fmt(r.created_at)}</span>
                      <span className="chip ml-auto">{r.status}</span>
                      {r.status === "pending" && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => { setPreset({ rewardEventId: r.id, recipientId: r.user_id }); setTab("gift"); }}>{t("admin.fulfill")}</button>
                          <button className="btn btn-ghost btn-sm" onClick={async () => { await apiPost("/api/admin", { op: "reward.dismiss", payload: { id: r.id } }); load(); }}>✕</button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {tab === "gift" && <Section title={t("admin.tabs.gift")}><GiftForm key={preset?.rewardEventId ?? "free"} data={data} preset={preset} onSent={() => { setPreset(null); load(); setTab("gifts"); }} /></Section>}

          {tab === "gifts" && (
            <Section title={t("admin.tabs.gifts")}>
              <ul className="space-y-2">
                {data.gifts.map((g) => (
                  <li key={g.id} className="card-flat grid gap-1 p-3 text-sm sm:grid-cols-[1fr_auto]">
                    <span className="font-bold">{g.kind === "robux" ? "💎" : g.kind === "demo" ? "🧪" : "💌"} {g.title || "—"} → {nameOf(g.recipient_id)}</span>
                    <span className="chip">{g.status === "revealed" ? t("admin.revealed") : g.status === "opened" ? t("admin.opened") : t("admin.sent")}</span>
                    <span className="text-xs text-muted sm:col-span-2">{t("admin.sent")}: {fmt(g.sent_at)} · {t("admin.opened")}: {fmt(g.opened_at)} · {t("admin.revealed")}: {fmt(g.revealed_at)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {tab === "messages" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Section title={t("admin.schedule")}><MessageForm data={data} onDone={load} /></Section>
              <Section title={t("admin.scheduled")}>
                <ul className="space-y-2">
                  {data.messages.map((m) => (
                    <li key={m.id} className="card-flat flex items-start gap-2 p-3 text-sm">
                      <span>{m.kind === "bottle" ? "🍾" : "💌"}</span>
                      <span className="min-w-0 flex-1"><span className="block font-bold">{m.title || m.body.slice(0, 40)}</span><span className="text-xs text-muted">{fmt(m.deliver_at)} · {new Date(m.deliver_at) > new Date() ? t("admin.upcoming") : m.opened_at ? t("admin.opened") : t("admin.delivered")}</span></span>
                      <button className="btn btn-ghost btn-icon btn-sm" aria-label={t("common.delete")} onClick={async () => { await apiPost("/api/admin", { op: "message.delete", payload: { id: m.id } }); load(); }}><Trash2 size={14} /></button>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          )}

          {tab === "settings" && settings && (
            <Section title={t("admin.tabs.settings")}>
              <Toggle label={t("admin.robuxProgram")} hint={t("admin.robuxProgramHint")} checked={settings.robuxEnabled} onChange={(v) => setSettings({ ...settings, robuxEnabled: v })} />
              <label className="mt-3 flex items-center gap-3"><span className="flex-1 text-sm font-bold">{t("admin.weeklyCap")}</span><input className="field w-24" type="number" min={0} max={7} value={settings.robuxWeeklyCap} onChange={(e) => setSettings({ ...settings, robuxWeeklyCap: Number(e.target.value) })} /></label>
              <label className="mt-3 flex items-center gap-3"><span className="flex-1 text-sm font-bold">{t("admin.dailyHeartCap")}</span><input className="field w-24" type="number" min={1} max={60} value={settings.heartDailyCap} onChange={(e) => setSettings({ ...settings, heartDailyCap: Number(e.target.value) })} /></label>
              <button className="btn btn-primary mt-4" onClick={async () => { try { await apiPost("/api/admin", { op: "settings.save", payload: settings }); toast({ text: t("admin.settingsSaved"), tone: "success" }); load(); } catch { toast({ text: "common.error", tone: "error" }); } }}>{t("common.save")}</button>
            </Section>
          )}

          {tab === "audit" && (
            <Section title={t("admin.audit")}>
              <ul className="space-y-1 text-sm">{data.audit.map((a, i) => <li key={i} className="flex gap-2"><span className="text-xs text-muted">{fmt(a.created_at)}</span><span className="font-bold">{a.action}</span><span className="truncate text-muted">{a.target?.slice(0, 8)}</span></li>)}</ul>
            </Section>
          )}
        </>
      )}
    </main>
  );
}
