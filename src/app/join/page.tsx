"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { apiGet, apiPost, ApiError } from "@/lib/client/api";
import { Companion } from "@/components/companion/Companion";
import { Sky } from "@/components/home/Sky";

function JoinInner() {
  const { t } = useT();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const look = useWorld((s) => s.prefs.companion);
  const [invite, setInvite] = useState<{ email: string } | null>(null);
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    apiGet<{ email: string }>(`/api/auth/join?token=${encodeURIComponent(token)}`)
      .then((r) => alive && (setInvite(r), setState("ready")))
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
      await apiPost("/api/auth/join", { token, password });
      window.location.href = "/";
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "error";
      setMsg(code === "exists" ? t("join.exists") : code === "invalid_invitation" ? t("join.invalid") : code === "weak" ? t("auth.weak") : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sky period="morning" className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="relative z-[1] w-full max-w-sm">
        <div className="flex justify-center"><Companion look={look} anim="wave" animKey={1} size={130} /></div>
        <div className="card mt-2 p-6">
          <div className="relative z-[1] space-y-3">
            <h1 className="logo-type text-center text-3xl">{t("join.title")}</h1>
            {state === "checking" && <p className="text-center text-muted">{t("join.checking")}</p>}
            {state === "invalid" && (
              <div className="space-y-3 text-center">
                <p className="font-bold">{t("join.invalid")}</p>
                <Link href="/login" className="btn btn-primary w-full">{t("join.goLogin")}</Link>
              </div>
            )}
            {state === "ready" && invite && (
              <form onSubmit={submit} className="space-y-3">
                <p className="text-center text-muted">{t("join.subtitle")}</p>
                <p className="chip mx-auto">💌 {t("join.invitedAs", { email: invite.email })}</p>
                <label className="block">
                  <span className="label">{t("join.password")}</span>
                  <input className="field" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                <label className="block">
                  <span className="label">{t("join.confirm")}</span>
                  <input className="field" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </label>
                {msg && <p className="rounded-xl bg-surface2 p-2 text-center text-sm font-bold" role="alert">{msg}</p>}
                <button className="btn btn-primary w-full" disabled={busy} type="submit">✨ {t("join.create")}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Sky>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinInner />
    </Suspense>
  );
}
