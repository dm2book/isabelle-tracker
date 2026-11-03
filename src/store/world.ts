"use client";

import { create } from "zustand";
import type {
  AppMode, AppNotification, CalendarEvent, DiaryEntry, Effect, FoodEntry, GameEventType, GameResult, GameState,
  GiftSummary, HeartTicket, Preferences, Profile, PublicConfig, Room, ScrapEntry, WaterEntry, WorldSnapshot,
} from "@/lib/types";
import { emptySnapshot, mergePrefs } from "@/lib/defaults";
import { applyGameAction, GameError, normalizeGame, rollHeartVariant, type GameAction } from "@/lib/game/engine";
import { DEFAULT_HEART_CAP, HEART_TICKET_TTL_MS } from "@/lib/game/rules";
import { diaryEvents, prefsEvents, roomEvents, scrapEvents, type DerivedEvent } from "@/lib/game/derive";
import { notificationsFromEffects } from "@/lib/game/notify";
import { ApiError, apiGet, apiPost, rpc } from "@/lib/client/api";
import { dateKey } from "@/lib/time";
import { uuid } from "@/lib/rooms/layout";
import { secretRoom } from "@/lib/rooms/templates";

const LOCAL_KEY = "ihkw:world:v1";

export type CompanionAnim =
  | "wave" | "dance" | "kiss" | "hug" | "celebrate" | "sleep" | "eat" | "drink" | "present" | "play" | "poke";

export interface Toast {
  id: string;
  text: string;
  emoji?: string;
  tone?: "info" | "success" | "reward" | "error";
}

interface OpResult {
  game?: GameState;
  effects?: Effect[];
  notifications?: AppNotification[];
}

export interface WorldState extends WorldSnapshot {
  mode: AppMode;
  status: "boot" | "ready" | "auth" | "error";
  config: PublicConfig | null;
  email: string | null;
  isAdmin: boolean;
  toasts: Toast[];
  companionCue: { anim: CompanionAnim | null; say: string | null; key: number };
  overlay: { hug: boolean; levelUp: number | null; golden: Effect | null; gift: GiftSummary | null; giftPreview: boolean };
  pendingEffects: Effect[];

  boot: () => Promise<void>;
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  cue: (anim: CompanionAnim | null, say?: string | null) => void;
  setOverlay: (patch: Partial<WorldState["overlay"]>) => void;
  consumeEffects: () => Effect[];

  updateProfile: (patch: Partial<Profile>) => void;
  updatePrefs: (fn: (p: Preferences) => Preferences) => void;
  saveRoom: (room: Room, opts?: { immediate?: boolean }) => void;
  deleteRoom: (id: string) => Promise<void>;
  saveFood: (e: FoodEntry) => Promise<void>;
  deleteFood: (id: string) => Promise<void>;
  saveWater: (e: WaterEntry) => Promise<void>;
  deleteWater: (id: string) => Promise<void>;
  saveDiary: (e: DiaryEntry) => Promise<void>;
  saveEvent: (e: CalendarEvent) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  saveScrap: (e: ScrapEntry) => Promise<void>;
  deleteScrap: (id: string) => Promise<void>;

  game: GameState;
  gameAction: (action: GameAction) => Promise<GameResult | null>;
  track: (event: GameEventType, meta?: string) => void;
  spawnHeart: () => Promise<HeartTicket | null>;
  popHeart: (t: HeartTicket) => Promise<GameResult | null>;

  markRead: (id: string) => void;
  markAllRead: () => void;
  openLetter: (id: string) => void;
  openGift: (id: string) => void;
  revealGift: (id: string) => Promise<{ code: string; demo: boolean; already: boolean }>;
  addLocalDemoGift: (g: Omit<GiftSummary, "id" | "status" | "sentAt" | "openedAt" | "revealedAt">) => void;
  unlockSecretRoom: () => void;
  refresh: () => Promise<void>;
  resetLocal: () => void;
}

function cryptoRand(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 4294967296;
}

function loadLocal(): WorldSnapshot | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as WorldSnapshot;
    return s;
  } catch {
    return null;
  }
}

const SNAPSHOT_KEYS: (keyof WorldSnapshot)[] = [
  "profile", "prefs", "rooms", "food", "water", "diary", "events", "scrapbook", "game", "notifications", "letters", "gifts",
];

function snapshotOf(s: WorldState): WorldSnapshot {
  const out = {} as Record<string, unknown>;
  for (const k of SNAPSHOT_KEYS) out[k] = s[k];
  return out as unknown as WorldSnapshot;
}

function normalizeSnapshot(s: WorldSnapshot): WorldSnapshot {
  const prefs = mergePrefs(s.prefs);
  const today = dateKey(new Date(), prefs.timezone);
  const base = emptySnapshot(prefs.lang);
  return {
    ...base,
    ...s,
    profile: { ...base.profile, ...(s.profile ?? {}) },
    prefs,
    rooms: s.rooms ?? base.rooms,
    game: normalizeGame(s.game, today),
    food: s.food ?? [],
    water: s.water ?? [],
    diary: s.diary ?? [],
    events: s.events ?? [],
    scrapbook: s.scrapbook ?? [],
    notifications: s.notifications ?? [],
    letters: s.letters ?? [],
    gifts: s.gifts ?? [],
  };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const cloudTimers = new Map<string, ReturnType<typeof setTimeout>>();

function debounceCloud(key: string, fn: () => void, ms = 900) {
  const t = cloudTimers.get(key);
  if (t) clearTimeout(t);
  cloudTimers.set(key, setTimeout(() => { cloudTimers.delete(key); fn(); }, ms));
}

export const useWorld = create<WorldState>()((set, get) => {
  const writeLocal = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(snapshotOf(get())));
    } catch {
      /* storage full or unavailable */
    }
  };

  const persistLocal = () => {
    if (get().mode !== "local") return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(writeLocal, 300);
  };

  // Never lose the last change: write any pending save at once when the page is hidden or closed
  // (switching apps, locking the phone, reloading, closing the tab).
  if (typeof window !== "undefined") {
    const flush = () => {
      if (saveTimer && get().mode === "local") writeLocal();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }

  const fail = (err: unknown) => {
    const code = err instanceof ApiError ? err.code : err instanceof GameError ? err.code : "error";
    if (code === "unauthorized") set({ status: "auth" });
    get().toast({ text: code, tone: "error" });
  };

  const applyOp = (r: OpResult | null | undefined) => {
    if (!r) return;
    if (r.game) set({ game: r.game });
    if (r.notifications?.length) set((s) => ({ notifications: [...r.notifications!, ...s.notifications].slice(0, 200) }));
    if (r.effects?.length) set((s) => ({ pendingEffects: [...s.pendingEffects, ...r.effects!] }));
  };

  const localGame = (action: GameAction): GameResult => {
    const s = get();
    const res = applyGameAction(s.game, action, {
      now: new Date(), tz: s.prefs.timezone, rand: cryptoRand, robux: "demo", heartCap: DEFAULT_HEART_CAP,
    });
    const notes = notificationsFromEffects(res.effects, s.prefs.lang).map<AppNotification>((n) => ({
      ...n, id: uuid(), readAt: null, createdAt: new Date().toISOString(),
    }));
    applyOp({ game: res.game, effects: res.effects, notifications: notes });
    persistLocal();
    return res;
  };

  const localEvents = (events: DerivedEvent[]) => {
    for (const e of events) localGame({ type: "track", event: e.event, amount: e.amount, meta: e.meta });
  };

  const cloudCall = async (op: string, payload: unknown) => {
    try {
      const r = await rpc<OpResult>(op, payload);
      applyOp(r);
      return r;
    } catch (e) {
      fail(e);
      throw e;
    }
  };

  return {
    ...emptySnapshot("fr"),
    mode: "local",
    status: "boot",
    config: null,
    email: null,
    isAdmin: false,
    toasts: [],
    companionCue: { anim: null, say: null, key: 0 },
    overlay: { hug: false, levelUp: null, golden: null, gift: null, giftPreview: false },
    pendingEffects: [],

    async boot() {
      let config: PublicConfig;
      try {
        config = await apiGet<PublicConfig>("/api/config");
      } catch {
        config = { mode: "local", pushConfigured: false, vapidPublicKey: null, robuxProgram: false, heartCap: DEFAULT_HEART_CAP, robuxWeeklyCap: 1 };
      }
      set({ config, mode: config.mode });
      if (config.mode === "local") {
        const saved = loadLocal();
        const snap = normalizeSnapshot(saved ?? emptySnapshot("fr"));
        set({ ...snap, status: "ready" });
        localGame({ type: "visit" });
        localGame({ type: "bottle_check" });
        return;
      }
      try {
        const data = await apiGet<WorldSnapshot & { email: string; isAdmin: boolean }>("/api/state");
        const snap = normalizeSnapshot(data);
        set({ ...snap, email: data.email, isAdmin: data.isAdmin, status: "ready" });
        cloudCall("game.action", { action: { type: "visit" } }).catch(() => {});
        cloudCall("game.action", { action: { type: "bottle_check" } }).catch(() => {});
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.code === "unauthorized")) set({ status: "auth" });
        else set({ status: "error" });
      }
    },

    async refresh() {
      if (get().mode !== "cloud" || get().status !== "ready") return;
      try {
        const data = await apiGet<Pick<WorldSnapshot, "notifications" | "letters" | "gifts">>("/api/state?part=inbox");
        set({ notifications: data.notifications, letters: data.letters, gifts: data.gifts });
      } catch {
        /* ignore background refresh errors */
      }
    },

    toast(t) {
      const id = uuid();
      set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
      setTimeout(() => get().dismissToast(id), t.tone === "error" ? 5000 : 3600);
    },
    dismissToast(id) {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    },
    cue(anim, say = null) {
      set((s) => ({ companionCue: { anim, say, key: s.companionCue.key + 1 } }));
    },
    setOverlay(patch) {
      set((s) => ({ overlay: { ...s.overlay, ...patch } }));
    },
    consumeEffects() {
      const e = get().pendingEffects;
      if (e.length) set({ pendingEffects: [] });
      return e;
    },

    updateProfile(patch) {
      set((s) => ({ profile: { ...s.profile, ...patch } }));
      persistLocal();
      if (get().mode === "cloud") debounceCloud("profile", () => cloudCall("profile.update", { profile: get().profile }).catch(() => {}));
    },

    updatePrefs(fn) {
      const prev = get().prefs;
      const next = fn(structuredClone(prev));
      set({ prefs: next });
      persistLocal();
      if (get().mode === "local") localEvents(prefsEvents(prev, next));
      else if (get().status === "ready")
        debounceCloud("prefs", () => {
          const cur = get().prefs;
          cloudCall("prefs.save", { prefs: cur }).catch(() => {});
        });
    },

    saveRoom(room, opts) {
      const prevRoom = get().rooms.find((r) => r.id === room.id);
      const next = { ...room, updatedAt: new Date().toISOString() };
      set((s) => ({ rooms: prevRoom ? s.rooms.map((r) => (r.id === room.id ? next : r)) : [...s.rooms, next] }));
      persistLocal();
      if (get().mode === "local") {
        localEvents(roomEvents(prevRoom, next));
      } else {
        const send = () => {
          const cur = get().rooms.find((r) => r.id === room.id);
          if (!cur) return;
          cloudCall("room.save", { room: cur }).catch(() => {});
        };
        if (opts?.immediate) send();
        else debounceCloud(`room:${room.id}`, send, 1000);
      }
    },

    async deleteRoom(id) {
      set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id) }));
      persistLocal();
      if (get().mode === "cloud") await cloudCall("room.delete", { id });
    },

    async saveFood(e) {
      set((s) => ({ food: s.food.some((f) => f.id === e.id) ? s.food.map((f) => (f.id === e.id ? e : f)) : [...s.food, e] }));
      persistLocal();
      if (get().mode === "cloud") await cloudCall("food.save", { entry: e });
    },
    async deleteFood(id) {
      set((s) => ({ food: s.food.filter((f) => f.id !== id) }));
      persistLocal();
      if (get().mode === "cloud") await cloudCall("food.delete", { id });
    },
    async saveWater(e) {
      set((s) => ({ water: s.water.some((f) => f.id === e.id) ? s.water.map((f) => (f.id === e.id ? e : f)) : [...s.water, e] }));
      persistLocal();
      if (get().mode === "cloud") await cloudCall("water.save", { entry: e });
    },
    async deleteWater(id) {
      set((s) => ({ water: s.water.filter((f) => f.id !== id) }));
      persistLocal();
      if (get().mode === "cloud") await cloudCall("water.delete", { id });
    },
    async saveDiary(e) {
      const prev = get().diary.find((d) => d.date === e.date);
      set((s) => ({ diary: prev ? s.diary.map((d) => (d.date === e.date ? e : d)) : [...s.diary, e] }));
      persistLocal();
      if (get().mode === "local") localEvents(diaryEvents(prev, e));
      else await cloudCall("diary.save", { entry: e });
    },
    async saveEvent(e) {
      set((s) => ({ events: s.events.some((x) => x.id === e.id) ? s.events.map((x) => (x.id === e.id ? e : x)) : [...s.events, e] }));
      persistLocal();
      if (get().mode === "cloud") await cloudCall("event.save", { event: e });
    },
    async deleteEvent(id) {
      set((s) => ({ events: s.events.filter((x) => x.id !== id) }));
      persistLocal();
      if (get().mode === "cloud") await cloudCall("event.delete", { id });
    },
    async saveScrap(e) {
      const isNew = !get().scrapbook.some((x) => x.id === e.id);
      set((s) => ({ scrapbook: isNew ? [e, ...s.scrapbook] : s.scrapbook.map((x) => (x.id === e.id ? e : x)) }));
      persistLocal();
      if (get().mode === "local") localEvents(scrapEvents(isNew, e.kind));
      else await cloudCall("scrap.save", { entry: e });
    },
    async deleteScrap(id) {
      set((s) => ({ scrapbook: s.scrapbook.filter((x) => x.id !== id) }));
      persistLocal();
      if (get().mode === "cloud") await cloudCall("scrap.delete", { id });
    },

    async gameAction(action) {
      if (get().mode === "local") {
        try {
          return localGame(action);
        } catch (e) {
          if (e instanceof GameError) {
            get().toast({ text: e.code, tone: "error" });
            return null;
          }
          throw e;
        }
      }
      try {
        const r = await cloudCall("game.action", { action });
        return r?.game ? { game: r.game, effects: r.effects ?? [] } : null;
      } catch {
        return null;
      }
    },

    track(event, meta) {
      get().gameAction({ type: "track", event, meta }).catch(() => {});
    },

    async spawnHeart() {
      if (get().mode === "local") {
        try {
          localGame({ type: "heart_spawn" });
        } catch {
          return null;
        }
        return { id: uuid(), variant: rollHeartVariant(cryptoRand), exp: Date.now() + HEART_TICKET_TTL_MS, sig: "local" };
      }
      try {
        return await rpc<HeartTicket>("heart.spawn", {});
      } catch {
        return null;
      }
    },

    async popHeart(t) {
      if (get().mode === "local") {
        if (Date.now() > t.exp) return null;
        try {
          return localGame({ type: "heart_pop", heartId: t.id, variant: t.variant });
        } catch (e) {
          if (e instanceof GameError && e.code === "limit") get().toast({ text: "hearts.limit", tone: "info" });
          return null;
        }
      }
      try {
        const r = await rpc<OpResult>("heart.pop", { ticket: t });
        applyOp(r);
        return r.game ? { game: r.game, effects: r.effects ?? [] } : null;
      } catch (e) {
        if (e instanceof ApiError && e.code === "limit") get().toast({ text: "hearts.limit", tone: "info" });
        return null;
      }
    },

    markRead(id) {
      const now = new Date().toISOString();
      set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? now } : n)) }));
      persistLocal();
      if (get().mode === "cloud") rpc("notif.read", { id }).catch(() => {});
    },
    markAllRead() {
      const now = new Date().toISOString();
      set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, readAt: n.readAt ?? now })) }));
      persistLocal();
      if (get().mode === "cloud") rpc("notif.readAll", {}).catch(() => {});
    },
    openLetter(id) {
      const now = new Date().toISOString();
      set((s) => ({ letters: s.letters.map((l) => (l.id === id ? { ...l, openedAt: l.openedAt ?? now } : l)) }));
      persistLocal();
      if (get().mode === "cloud") rpc("letter.open", { id }).catch(() => {});
    },
    openGift(id) {
      const now = new Date().toISOString();
      const g = get().gifts.find((x) => x.id === id);
      if (!g) return;
      if (g.status === "sent") {
        set((s) => ({ gifts: s.gifts.map((x) => (x.id === id ? { ...x, status: "opened", openedAt: now } : x)) }));
        persistLocal();
        if (get().mode === "cloud") cloudCall("gift.open", { id }).catch(() => {});
        else localGame({ type: "track", event: "open_gift" });
      }
    },
    async revealGift(id) {
      const g = get().gifts.find((x) => x.id === id);
      if (get().mode === "local" || g?.kind === "demo") {
        const now = new Date().toISOString();
        set((s) => ({ gifts: s.gifts.map((x) => (x.id === id ? { ...x, status: "revealed", revealedAt: x.revealedAt ?? now } : x)) }));
        persistLocal();
        return { code: "DEMO-KITTY-2026", demo: true, already: !!g?.revealedAt };
      }
      // The real code only ever lives in component memory — never in this store or in storage.
      const r = await apiPost<{ code: string; already: boolean }>("/api/gifts/reveal", { id });
      const now = new Date().toISOString();
      set((s) => ({ gifts: s.gifts.map((x) => (x.id === id ? { ...x, status: "revealed", revealedAt: x.revealedAt ?? now } : x)) }));
      return { code: r.code, demo: false, already: r.already };
    },
    addLocalDemoGift(gift) {
      const g: GiftSummary = { ...gift, id: uuid(), status: "sent", sentAt: new Date().toISOString(), openedAt: null, revealedAt: null };
      set((s) => ({ gifts: [g, ...s.gifts] }));
      persistLocal();
    },
    unlockSecretRoom() {
      if (get().rooms.some((r) => r.secret)) return;
      const room = secretRoom(get().prefs.lang);
      get().saveRoom(room, { immediate: true });
      get().track("secret_found", "secret_room");
    },
    resetLocal() {
      localStorage.removeItem(LOCAL_KEY);
      set({ ...emptySnapshot(get().prefs.lang), status: "ready" });
    },
  };
});
