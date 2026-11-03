"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { ProgressBar } from "@/components/ui/bits";
import { downloadBackup, hasMeaningfulWorld, importedAt, isWorld, markImported, readDeviceWorld, runImport, type ImportSummary } from "@/lib/client/importer";
import { play } from "@/lib/sound";

/** Import a device world (or a backup file) into the signed-in account. Never deletes device data. */
export function ImportPanel({ onDone, showFile = true }: { onDone?: () => void; showFile?: boolean }) {
  const { t, lang } = useT();
  const email = useWorld((s) => s.email);
  const boot = useWorld((s) => s.boot);
  const [device, setDevice] = useState<ReturnType<typeof readDeviceWorld>>(null);
  const [doneAt, setDoneAt] = useState<string | null>(null);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const w = readDeviceWorld();
    setDevice(hasMeaningfulWorld(w) ? w : null);
    setDoneAt(importedAt(email));
  }, [email]);

  const start = async (w: NonNullable<typeof device>, source: "device" | "file") => {
    setError(null);
    setSummary(null);
    setProgress([0, 1]);
    try {
      const s = await runImport(w, source, (n, total) => setProgress([n, total]));
      if (source === "device") markImported(email);
      setDoneAt(new Date().toISOString());
      setSummary(s);
      play("sparkle");
      await boot();
      onDone?.();
    } catch {
      setError(t("migrate.failed"));
    } finally {
      setProgress(null);
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const w = JSON.parse(await f.text());
      if (!isWorld(w)) throw new Error("bad");
      await start(w, "file");
    } catch {
      setError(t("migrate.badFile"));
    }
  };

  const entries = (summary?.food ?? 0) + (summary?.water ?? 0) + (summary?.diary ?? 0) + (summary?.events ?? 0);
  return (
    <div className="space-y-3">
      {progress ? (
        <div className="space-y-2" role="status" aria-live="polite">
          <p className="font-bold">⏳ {t("migrate.running")}</p>
          <ProgressBar value={progress[0]} max={progress[1]} />
          <p className="text-xs text-muted">{t("migrate.step", { n: progress[0], t: progress[1] })}</p>
        </div>
      ) : summary ? (
        <div className="space-y-1" role="status">
          <p className="title">{t("migrate.done")}</p>
          <p className="text-sm">{t("migrate.summary", { rooms: summary.rooms ?? 0, entries, memories: summary.scrapbook ?? 0 })}</p>
          {(summary.capped?.length ?? 0) > 0 && <p className="text-xs text-muted">ℹ️ {t("migrate.capped")}</p>}
        </div>
      ) : null}
      {error && <p className="rounded-xl bg-[#FFF1D6] p-2 text-sm font-bold" role="alert">{error}</p>}
      {!progress && (
        <div className="flex flex-wrap gap-2">
          {device && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => start(device, "device")}>💗 {doneAt ? t("migrate.again") : t("migrate.start")}</button>
              <button className="btn btn-soft btn-sm" onClick={() => downloadBackup(device)}><Download size={16} /> {t("migrate.backup")}</button>
            </>
          )}
          {showFile && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><Upload size={16} /> {t("migrate.fromFile")}</button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </>
          )}
        </div>
      )}
      {doneAt && !summary && <p className="text-xs text-muted">✓ {t("migrate.importedOn", { date: new Date(doneAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB") })}</p>}
      {showFile && <p className="text-xs text-muted">{t("migrate.fromFileHint")}</p>}
    </div>
  );
}

/** Shown once after sign-in when this device still holds a world that was never imported. */
export function ImportBanner() {
  const { t } = useT();
  const mode = useWorld((s) => s.mode);
  const email = useWorld((s) => s.email);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (mode !== "cloud" || !email) return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem("ihkw:import-later") === "1";
    } catch {
      /* ignore */
    }
    setVisible(!dismissed && hasMeaningfulWorld(readDeviceWorld()) && !importedAt(email));
  }, [mode, email]);

  if (!visible) return null;
  return (
    <section className="card mb-4 p-4" aria-labelledby="import-title">
      <div className="relative z-[1] space-y-2">
        <h2 id="import-title" className="title text-lg">{t("migrate.title")}</h2>
        <p className="text-sm">{t("migrate.body")}</p>
        <ImportPanel showFile={false} onDone={() => setTimeout(() => setVisible(false), 4000)} />
        <button
          className="text-sm font-bold text-muted underline"
          onClick={() => {
            try {
              sessionStorage.setItem("ihkw:import-later", "1");
            } catch {
              /* ignore */
            }
            setVisible(false);
          }}
        >
          {t("migrate.later")}
        </button>
      </div>
    </section>
  );
}
