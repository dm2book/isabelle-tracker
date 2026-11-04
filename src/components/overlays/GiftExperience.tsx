"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Copy, Check, Lock } from "lucide-react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { Companion } from "@/components/companion/Companion";
import { Burst, type BurstKind } from "@/components/effects/Burst";
import { play } from "@/lib/sound";
import { uuid } from "@/lib/rooms/layout";
import { dateKey } from "@/lib/time";

type Step = "arrive" | "walk" | "present" | "open" | "hug" | "message";

function Present({ opened, onOpen, label }: { opened: boolean; onOpen: () => void; label: string }) {
  return (
    <button onClick={onOpen} disabled={opened} aria-label={label} className="relative mx-auto block h-44 w-44 focus-visible:outline-offset-8">
      <motion.svg viewBox="0 0 160 160" className="h-full w-full overflow-visible" animate={opened ? {} : { rotate: [0, -4, 4, -4, 0], y: [0, -4, 0] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.6 }}>
        <rect x="22" y="70" width="116" height="80" rx="12" fill="#C9B6FF" stroke="#5A2149" strokeWidth={4} />
        <rect x="70" y="70" width="20" height="80" fill="#FF8DC0" stroke="#5A2149" strokeWidth={4} />
        <motion.g animate={opened ? { y: -110, rotate: -25, opacity: 0 } : { y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} style={{ originX: 0.5, originY: 1 }}>
          <rect x="14" y="50" width="132" height="26" rx="8" fill="#DCCEFF" stroke="#5A2149" strokeWidth={4} />
          <rect x="70" y="50" width="20" height="26" fill="#FF8DC0" stroke="#5A2149" strokeWidth={4} />
          <path d="M80 50 C58 18 34 30 54 50Z M80 50 C102 18 126 30 106 50Z" fill="#FF8DC0" stroke="#5A2149" strokeWidth={4} strokeLinejoin="round" />
        </motion.g>
        {opened && (
          <motion.g initial={{ scale: 0, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 160, damping: 10, delay: 0.3 }}>
            <path transform="translate(80 40) scale(2.4)" d="M0 6 C-6 -2 -16 2 -12 10 C-9 15 0 19 0 22 C0 19 9 15 12 10 C16 2 6 -2 0 6Z" fill="#FF5C8A" stroke="#5A2149" strokeWidth={1.4} />
          </motion.g>
        )}
      </motion.svg>
    </button>
  );
}

export function GiftExperience() {
  const gift = useWorld((s) => s.overlay.gift);
  const preview = useWorld((s) => s.overlay.giftPreview);
  const setOverlay = useWorld((s) => s.setOverlay);
  const openGift = useWorld((s) => s.openGift);
  const revealGift = useWorld((s) => s.revealGift);
  const saveScrap = useWorld((s) => s.saveScrap);
  const look = useWorld((s) => s.prefs.companion);
  const tz = useWorld((s) => s.prefs.timezone);
  const { t } = useT();
  const [step, setStep] = useState<Step>("arrive");
  const [code, setCode] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [kept, setKept] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  // Each new gift starts the experience from the beginning.
  const [shownGift, setShownGift] = useState<typeof gift>(null);
  if (gift && gift !== shownGift) {
    setShownGift(gift);
    setStep("arrive");
    setCode(null);
    setErr(null);
    setCopied(false);
    setKept(false);
  }

  useEffect(() => {
    if (!gift) return;
    play("chime");
    if (!preview) openGift(gift.id);
    const a = setTimeout(() => setStep("walk"), 1600);
    const b = setTimeout(() => setStep("present"), 3600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [gift, preview, openGift]);

  // Forget the code as soon as the experience closes.
  const close = () => {
    setCode(null);
    setOverlay({ gift: null, giftPreview: false });
  };

  if (!gift) return null;

  const burst: BurstKind = gift.animation === "confetti" ? "confetti" : gift.animation === "rare" ? "golden" : gift.animation === "hearts" ? "hearts" : "sparkles";

  const onOpenPresent = () => {
    setStep("open");
    setBurstKey((k) => k + 1);
    play("gift");
    setTimeout(() => {
      setStep("hug");
      play("hug");
    }, 1800);
    setTimeout(() => setStep("message"), 4400);
  };

  const onReveal = async () => {
    setErr(null);
    if (preview) {
      setCode("PREVIEW-XXXX-XXXX");
      setDemo(true);
      return;
    }
    setBusy(true);
    try {
      const r = await revealGift(gift.id);
      setCode(r.code);
      setDemo(r.demo);
      setBurstKey((k) => k + 1);
      play("sparkle");
    } catch {
      setErr(t("gift.revealError"));
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard unavailable: the code stays visible and selectable */
    }
  };

  const onKeep = async () => {
    if (preview) return;
    await saveScrap({
      id: uuid(), kind: "message", title: gift.title || t("gift.from"), body: gift.message, emoji: "💌", color: "#FFD1E2",
      image: null, room: null, date: dateKey(new Date(), tz), createdAt: new Date().toISOString(),
    });
    setKept(true);
  };

  const canReveal = gift.kind === "robux" || gift.kind === "demo";

  return (
    <AnimatePresence>
      <motion.div
        key="gift"
        role="dialog"
        aria-modal="true"
        aria-label={t("gift.arrived")}
        className="fixed inset-0 z-[92] flex flex-col items-center justify-center overflow-y-auto px-5 py-10 text-center"
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
        animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
        exit={{ opacity: 0 }}
        style={{ background: gift.animation === "rare" ? "radial-gradient(circle at 50% 40%, #FFF3C4ee, #2a1530dd 75%)" : "radial-gradient(circle at 50% 40%, color-mix(in oklab, var(--c-primary) 30%, #fff0) , #2a1530cc 75%)" }}
      >
        {preview && <span className="chip absolute top-[max(1rem,env(safe-area-inset-top))] left-4">{t("gift.preview")}</span>}
        <div className="relative w-full max-w-md">
          <Burst kind={burst} count={gift.animation === "rare" ? 40 : 26} spread={220} burstKey={burstKey} />

          <AnimatePresence mode="wait">
            {step === "arrive" && (
              <motion.div key="arrive" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-white">
                <p className="text-5xl" aria-hidden>💌</p>
                <p className="logo-type mt-3 text-3xl">{t("gift.arrived")}</p>
              </motion.div>
            )}

            {(step === "walk" || step === "present" || step === "open" || step === "hug") && (
              <motion.div key="scene" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                <motion.div
                  initial={{ x: "-120vw" }}
                  animate={{ x: 0 }}
                  transition={{ duration: 1.8, ease: [0.3, 0.9, 0.4, 1] }}
                >
                  <motion.div animate={step === "walk" ? { y: [0, -10, 0, -10, 0], rotate: [-4, 4, -4, 4, 0] } : {}} transition={{ duration: 1.8 }}>
                    <Companion look={look} mood={step === "hug" ? "loving" : "excited"} anim={step === "hug" ? "hug" : step === "walk" ? "present" : "present"} animKey={step === "hug" ? 2 : 1} size={200} still={step === "open"} />
                  </motion.div>
                </motion.div>
                {step === "present" && <p className="mt-2 font-bold text-white">{t("gift.tapPresent")} 👇</p>}
                {(step === "present" || step === "open") && <Present opened={step === "open"} onOpen={onOpenPresent} label={t("gift.open")} />}
                {step === "hug" && <p className="logo-type mt-4 text-3xl">{t("gift.hugText")} 💗</p>}
              </motion.div>
            )}

            {step === "message" && (
              <motion.div key="msg" initial={{ opacity: 0, y: 40, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} className="card p-6 text-left">
                <div className="relative z-[1]">
                  <div className="flex items-center gap-3">
                    <Companion look={look} mood="loving" size={70} still />
                    <div>
                      <p className="text-sm font-bold text-muted">{t("gift.from")}</p>
                      <h2 className="title text-2xl">{gift.title || "🎁"}</h2>
                    </div>
                  </div>
                  {gift.message && <p className="mt-4 text-lg leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "var(--font-patrick), var(--app-font)" }}>{gift.message}</p>}

                  {canReveal && (
                    <div className="mt-5 rounded-[calc(var(--r)*0.7)] border-2 border-dashed border-line bg-surface2 p-4 text-center">
                      {gift.kind === "demo" && <p className="mb-2 text-sm font-bold text-muted">{t("gift.demo")}</p>}
                      {!code ? (
                        <button className="btn btn-primary w-full" onClick={onReveal} disabled={busy}>
                          <Lock size={18} /> {busy ? t("gift.revealing") : t("gift.reveal")}
                        </button>
                      ) : (
                        <div>
                          <p className="text-sm font-bold text-muted">{t("gift.yourCode")}</p>
                          <p className="my-2 select-all font-mono text-2xl font-bold tracking-widest break-all">{code}</p>
                          <button className="btn btn-soft" onClick={onCopy}>
                            {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? t("gift.copied") : t("gift.copy")}
                          </button>
                          {!demo && <p className="mt-2 text-sm text-muted">{t("gift.redeemHint")}</p>}
                          {demo && <p className="mt-2 text-sm text-muted">{t("gift.demo")}</p>}
                        </div>
                      )}
                      {err && <p className="mt-2 text-sm font-bold text-[#a3123c]">{err}</p>}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {gift.message && !preview && (
                      <button className="btn btn-ghost btn-sm" onClick={onKeep} disabled={kept}>
                        📖 {kept ? t("gift.kept") : t("gift.keep")}
                      </button>
                    )}
                    <button className="btn btn-primary ml-auto" onClick={close} data-autofocus>
                      {t("gift.close")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
