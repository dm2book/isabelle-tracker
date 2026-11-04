"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { apiGet, apiPost, ApiError } from "@/lib/client/api";
import { Companion } from "@/components/companion/Companion";
import { Sky } from "@/components/home/Sky";

/** Isabelle chooses a new password from the single-use link Ewan sent her. */
function ResetInner() {
  const { t } = useT();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const look = useWorld((s) => s.prefs.companion);
  const [account, setAccount] = useState<{ email: string } | null>(null);
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    apiGet<{ email: string }>(`/api/auth/recover?token=${encodeURIComponent(token)}`)
      .then((r) => {
        if (!alive) return;
        setAccount(r);
        setState("ready");
      })
      .catch(() => alive && setState("invalid"));
    return () => {
      alive = false;
    };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) return setMsg(t("auth.weak"));
    if (password !== confirm) return setMsg(t("join.mismatch"));
    setBusy(true);
    try {
      await apiPost("/api/auth/recover", { token, password });
      setState("done");
      setTimeout(() => (window.location.href = "/home"), 1400);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "error";
      if (code === "invalid_reset") setState("invalid");
      else setMsg(code === "weak" ? t("auth.weak") : code === "rate_limited" ? t("errors.rateLimited") : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sky period="morning" className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="relative z-[1] w-full max-w-sm">
        <div className="flex justify-center"><Companion look={look} anim={state === "done" ? "celebrate" : "wave"} animKey={state === "done" ? 2 : 1} size={130} /></div>
        <div className="card mt-2 p-6">
          <div className="relative z-[1] space-y-3">
            <h1 className="logo-type text-center text-3xl">{t("reset.title")}</h1>
            {state === "checking" && <p className="text-center text-muted">{t("join.checking")}</p>}
            {state === "invalid" && (
              <div className="space-y-3 text-center">
                <p className="font-bold">{t("reset.invalid")}</p>
                <Link href="/login" className="btn btn-primary w-full">{t("join.goLogin")}</Link>
              </div>
            )}
            {state === "done" && <p className="text-center font-bold" role="status">💗 {t("reset.done")}</p>}
            {state === "ready" && account && (
              <form onSubmit={submit} className="space-y-3">
                <p className="text-center text-muted">{t("reset.subtitle")}</p>
                <p className="chip mx-auto">🔑 {t("reset.forAccount", { email: account.email })}</p>
                <label className="block">
                  <span className="label">{t("auth.newPassword")}</span>
                  <input className="field" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                <label className="block">
                  <span className="label">{t("join.confirm")}</span>
                  <input className="field" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </label>
                {msg && <p className="rounded-xl bg-surface2 p-2 text-center text-sm font-bold" role="alert">{msg}</p>}
                <button className="btn btn-primary w-full" disabled={busy} type="submit">✨ {t("reset.save")}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Sky>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetInner />
    </Suspense>
  );
}
