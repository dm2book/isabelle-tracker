"use client";

// Tiny synthesized sounds (no audio files needed). Respect Isabelle's sound settings.
let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.5;

export function configureSound(on: boolean, vol: number) {
  enabled = on;
  volume = Math.max(0, Math.min(1, vol));
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.18) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(gain * volume, a.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
}

export type SoundName = "pop" | "chime" | "coin" | "sparkle" | "levelup" | "tap" | "hug" | "gift" | "water";

export function play(name: SoundName) {
  if (!enabled || volume <= 0) return;
  switch (name) {
    case "tap":
      tone(880, 0, 0.08, "triangle", 0.08);
      break;
    case "pop":
      tone(660, 0, 0.1, "triangle");
      tone(990, 0.05, 0.15, "sine", 0.12);
      break;
    case "coin":
      tone(988, 0, 0.09, "square", 0.06);
      tone(1319, 0.08, 0.2, "square", 0.06);
      break;
    case "chime":
      [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.4));
      break;
    case "sparkle":
      [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.06, 0.25, "sine", 0.08));
      break;
    case "levelup":
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.1, 0.45, "triangle", 0.12));
      break;
    case "hug":
      [392, 494, 587].forEach((f, i) => tone(f, i * 0.18, 0.8, "sine", 0.1));
      break;
    case "gift":
      [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, i * 0.08, 0.5, "sine", 0.1));
      break;
    case "water":
      tone(420, 0, 0.12, "sine", 0.14);
      tone(620, 0.08, 0.14, "sine", 0.1);
      tone(860, 0.16, 0.16, "sine", 0.08);
      break;
  }
}
