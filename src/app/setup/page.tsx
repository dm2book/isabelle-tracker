"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { apiGet, apiPost } from "@/lib/client/api";
import { PageHeader, Section } from "@/components/ui/bits";
import { BootScreen } from "@/components/shell/BootScreen";

type Check = { id: string; ok: boolean; detail?: string };
interface Status {
  mode: "local" | "cloud";
  env: Check[];
  database: Check[];
  accounts: Check[] | null;
  adminSql: string | null;
  viewer: "anonymous" | "admin" | "admin_candidate" | "user";
}

function Row({ c, label }: { c: Check; label: string }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="text-lg leading-none" aria-hidden>{c.ok ? "✅" : "⬜️"}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm [overflow-wrap:anywhere] ${c.ok ? "" : "font-bold"}`}>{label}</span>
        {c.detail && <span className="block text-xs break-words text-muted">{c.detail}</span>}
      </span>
      <span className="sr-only">{c.ok ? "OK" : "—"}</span>
    </li>
  );
}

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Random secrets and a VAPID key pair, generated in the browser with Web Crypto. Never leaves the page. */
async function makeSecrets() {
  const rand = (n: number) => b64url(crypto.getRandomValues(new Uint8Array(n)));
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return [
    ["APP_SECRET", rand(48)],
    ["REWARD_ENCRYPTION_KEY", rand(48)],
    ["CRON_SECRET", rand(32)],
    ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", b64url(pub)],
    ["VAPID_PRIVATE_KEY", jwk.d ?? ""],
  ] as [string, string][];
}

function SecretGenerator() {
  const { t } = useT();
  const toast = useWorld((s) => s.toast);
  const [secrets, setSecrets] = useState<[string, string][] | null>(null);
  return (
    <Section title={`🔐 ${t("setup.generator.title")}`} action={<button className="btn btn-soft btn-sm" onClick={async () => setSecrets(await makeSecrets())}>{t("setup.generator.generate")}</button>}>
      <p className="text-sm text-muted">{t("setup.generator.hint")}</p>
      {secrets && (
        <ul className="mt-3 space-y-2">
          {secrets.map(([name, value]) => (
            <li key={name} className="card-flat flex items-center gap-2 p-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-xs font-bold">{name}</span>
              <button
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(value).catch(() => {});
                  toast({ text: t("setup.generator.copied"), emoji: "📋", tone: "success" });
                }}
              >
                {t("setup.generator.copy")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/** Ewan's setup checklist: what is configured, what is missing, and live self-tests. */
export default function SetupPage() {
  const { t, td } = useT();
  const status = useWorld((s) => s.status);
  const toast = useWorld((s) => s.toast);
  const [data, setData] = useState<Status | null>(null);
  const [tests, setTests] = useState<Check[] | null>(null);
  const [full, setFull] = useState<Check[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await apiGet<Status>("/api/setup/status"));
    } catch {
      setData(null);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const runTests = async (mode: "quick" | "full" = "quick") => {
    setBusy(true);
    try {
      const r = await apiPost<{ results: Check[] }>("/api/setup/selftest", { mode });
      (mode === "full" ? setFull : setTests)(r.results);
    } catch {
      toast({ text: "common.error", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (status === "boot") return <BootScreen />;
  const all = data ? [...data.env.filter((c) => c.id !== "vapid"), ...data.database, ...(data.accounts ?? [])] : [];
  const allOk = data && data.mode === "cloud" && all.length > 0 && all.every((c) => c.ok);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-16">
      <div className="mb-2 flex gap-2">
        <Link href="/admin" className="btn btn-ghost btn-sm">← {t("nav.admin")}</Link>
        <button className="btn btn-ghost btn-icon btn-sm ml-auto" onClick={load} aria-label="Refresh"><RefreshCw size={18} /></button>
      </div>
      <PageHeader title={t("setup.title")} subtitle={t("setup.subtitle")} emoji="🧰" />
      {!data ? (
        <div className="skeleton h-40" />
      ) : (
        <div className="space-y-4">
          <div className="card p-4">
            <p className="relative z-[1] text-sm font-bold text-muted">{t("setup.mode")}</p>
            <p className="title relative z-[1] text-lg">{data.mode === "cloud" ? `☁️ ${t("setup.modeCloud")}` : `📱 ${t("setup.modeLocal")}`}</p>
            <p className="relative z-[1] mt-1 text-sm font-bold">{allOk ? t("setup.allGood") : t("setup.someMissing")}</p>
          </div>

          {data.mode === "local" && <SecretGenerator />}

          <Section title={`🔑 ${t("setup.env")}`}>
            <ul className="divide-y-2 divide-dashed divide-line">{data.env.map((c) => <Row key={c.id} c={c} label={td(`setup.items.${c.id}`)} />)}</ul>
          </Section>

          {data.database.length > 0 && (
            <Section title={`🗄️ ${t("setup.database")}`}>
              <ul className="divide-y-2 divide-dashed divide-line">{data.database.map((c) => <Row key={c.id} c={c} label={td(`setup.items.${c.id}`)} />)}</ul>
            </Section>
          )}

          {data.mode === "cloud" && (
            <Section title={`👤 ${t("setup.accounts")}`}>
              {data.accounts ? (
                <ul className="divide-y-2 divide-dashed divide-line">{data.accounts.map((c) => <Row key={c.id} c={c} label={td(`setup.items.${c.id}`)} />)}</ul>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm">{t("setup.signInNeeded")}</p>
                  <Link href="/login" className="btn btn-primary btn-sm">{t("setup.signIn")}</Link>
                </div>
              )}
              {data.adminSql && (
                <div className="mt-3 space-y-2 rounded-2xl bg-[#FFF1D6] p-3">
                  <p className="text-sm font-bold text-[#4A2E12]">{t("setup.adminRoleMissing")}</p>
                  <pre className="overflow-x-auto rounded-xl bg-surface p-2 text-xs whitespace-pre-wrap break-all">{data.adminSql}</pre>
                  <button className="btn btn-soft btn-sm" onClick={async () => { await navigator.clipboard.writeText(data.adminSql!).catch(() => {}); toast({ text: t("common.copied"), tone: "success" }); }}>
                    📋 {t("setup.copySql")}
                  </button>
                </div>
              )}
            </Section>
          )}

          {data.viewer === "admin" && (
            <Section title={`🧪 ${t("setup.tests")}`} action={<button className="btn btn-primary btn-sm" disabled={busy} onClick={() => runTests("quick")}>{t("setup.runTests")}</button>}>
              {tests ? <ul className="divide-y-2 divide-dashed divide-line">{tests.map((c) => <Row key={c.id} c={c} label={td(`setup.checks.${c.id}`)} />)}</ul> : <p className="text-sm text-muted">—</p>}
              <div className="mt-4 space-y-2 rounded-2xl bg-surface2 p-3">
                <p className="text-sm font-bold">{t("setup.fullTitle")}</p>
                <p className="text-sm">{t("setup.fullIntro")}</p>
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => runTests("full")}>{busy ? t("setup.fullRunning") : t("setup.runFull")}</button>
                {full && (
                  <>
                    <p className="text-sm font-bold">{full.every((c) => c.ok) ? `✅ ${t("setup.fullPassed")}` : `⚠️ ${t("setup.fullFailed")}`}</p>
                    <ul className="divide-y-2 divide-dashed divide-line">{full.map((c) => <Row key={c.id} c={c} label={td(`setup.checks.${c.id}`)} />)}</ul>
                  </>
                )}
              </div>
              <div className="mt-3"><Link href="/admin" className="btn btn-soft btn-sm">🛡️ {t("setup.openAdmin")}</Link></div>
            </Section>
          )}
        </div>
      )}
    </main>
  );
}
