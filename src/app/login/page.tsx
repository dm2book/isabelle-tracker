"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { apiPost, ApiError } from "@/lib/client/api";
import { Companion } from "@/components/companion/Companion";
import { Sky } from "@/components/home/Sky";
import { LANGS } from "@/lib/i18n";

function LoginInner() {
  const { t } = useT();
  const params = useSearchParams();
  const mode = useWorld((s) => s.mode);
  const status = useWorld((s) => s.status);
  const look = useWorld((s) => s.prefs.companion);
  const lang = useWorld((s) => s.prefs.lang);
  const updatePrefs = useWorld((s) => s.updatePrefs);
  const [view, setView] = useState<"signin" | "forgot" | "newpass">(params.get("reset") ? "newpass" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "ready" && mode === "cloud" && view !== "newpass") window.location.href = "/home";
  }, [status, mode, view]);

  const errText = (e: unknown) => {
    const code = e instanceof ApiError ? e.code : "error";
    return code === "not_allowed" ? t("auth.notAllowed") : code === "invalid_credentials" ? t("auth.invalid") : code === "weak" ? t("auth.weak") : code === "network" ? t("errors.network") : t("common.error");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      if (view === "signin") {
        await apiPost("/api/auth/signin", { email, password });
        window.location.href = "/";
      } else if (view === "forgot") {
        await apiPost("/api/auth/reset", { email });
        setMsg(t("auth.resetSent"));
      } else {
        if (password.length < 8) throw new ApiError("weak", "weak", 400);
        await apiPost("/api/auth/password", { password });
        setMsg(t("auth.passwordUpdated"));
        setTimeout(() => (window.location.href = "/home"), 900);
      }
    } catch (err) {
      setMsg(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sky period="morning" className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="relative z-[1] w-full max-w-sm">
        <div className="flex justify-center"><Companion look={look} anim="wave" animKey={1} size={130} /></div>
        <div className="card mt-2 p-6">
          <div className="relative z-[1]">
            <h1 className="logo-type text-center text-3xl">{t("auth.title")}</h1>
            <p className="mb-4 text-center text-muted">{t("auth.subtitle")}</p>
            <div className="mb-4 flex justify-center gap-2">
              {LANGS.map((l) => (
                <button key={l.id} className={`btn btn-sm ${lang === l.id ? "btn-primary" : "btn-ghost"}`} onClick={() => updatePrefs((p) => ({ ...p, lang: l.id }))}>{l.flag}</button>
              ))}
            </div>
            {mode === "local" && status === "ready" ? (
              <div className="space-y-3 text-center">
                <p className="text-sm">{t("auth.notConfigured")}</p>
                <Link href="/" className="btn btn-primary w-full">{t("auth.continueLocal")}</Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                {view !== "newpass" && (
                  <label className="block">
                    <span className="label">{t("auth.email")}</span>
                    <input className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </label>
                )}
                {view !== "forgot" && (
                  <label className="block">
                    <span className="label">{view === "newpass" ? t("auth.newPassword") : t("auth.password")}</span>
                    <input className="field" type="password" autoComplete={view === "signin" ? "current-password" : "new-password"} required minLength={view === "signin" ? 1 : 8} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </label>
                )}
                {msg && <p className="rounded-xl bg-surface2 p-2 text-center text-sm font-bold" role="alert">{msg}</p>}
                <button className="btn btn-primary w-full" disabled={busy} type="submit">
                  {view === "signin" ? t("auth.signIn") : view === "forgot" ? t("common.confirm") : t("auth.setPassword")}
                </button>
                <div className="flex flex-col items-center gap-1 pt-1 text-sm font-bold">
                  {view === "signin" && <p className="text-center font-normal text-muted">💌 {t("auth.inviteOnly")}</p>}
                  {view === "signin" && <button type="button" className="text-muted underline" onClick={() => setView("forgot")}>{t("auth.forgot")}</button>}
                  {view === "forgot" && <button type="button" className="text-muted underline" onClick={() => setView("signin")}>{t("common.back")}</button>}
                </div>
              </form>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs"><Link href="/privacy" className="underline">{t("nav.privacy")}</Link></p>
      </div>
    </Sky>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
