import type { Lang, Preferences, Profile, WorldSnapshot } from "./types";
import { DEFAULT_PALETTES, DEFAULT_THEME_ID } from "./theme/themes";
import { DEFAULT_TZ, dateKey } from "./time";
import { initialGame } from "./game/engine";
import { starterRooms } from "./rooms/templates";

export function defaultPrefs(lang: Lang = "fr"): Preferences {
  return {
    lang,
    mode: "auto",
    themeId: DEFAULT_THEME_ID,
    customThemes: [],
    palettes: DEFAULT_PALETTES.map((p) => ({ ...p, colors: [...p.colors] })),
    favoritePaletteId: DEFAULT_PALETTES[0].id,
    ui: {
      font: "nunito",
      buttonStyle: "bubbly",
      radius: 22,
      cardStyle: "sticker",
      iconStyle: "cute",
      pattern: "hearts",
      animations: "normal",
      effects: { hearts: true, sparkles: true, seasonal: true, timeOfDay: true },
      sound: { enabled: true, volume: 0.5 },
    },
    notifications: {
      kinds: { reminder: true, message: true, gift: true, quest: true, event: true, rare: true, birthday: true },
      reminders: {
        morning: { enabled: false, time: "09:00" },
        afternoon: { enabled: false, time: "15:30" },
        evening: { enabled: false, time: "20:30" },
      },
      breakReminder: false,
      quietHours: { enabled: true, start: "22:30", end: "08:00" },
      push: false,
    },
    timezone: DEFAULT_TZ,
    companion: {
      name: "Mimi",
      fur: "#FFFFFF",
      bowColor: "#FF5C8A",
      bow: "classic",
      outfit: null,
      outfitColor: null,
      accessory: null,
    },
    wellness: {
      foodEnabled: true,
      waterEnabled: true,
      showCalories: true,
      calorieReference: null,
      waterGoalMl: 1500,
      glassSizes: [150, 250, 330, 500],
    },
    privacy: { wellnessOnHome: true },
    roomPresets: [],
    favoriteItems: [],
    tasks: [],
  };
}

export function defaultProfile(): Profile {
  return { displayName: "Isabelle", worldName: "Le Petit Monde d’Isabelle", birthday: null, onboarded: false };
}

export function emptySnapshot(lang: Lang = "fr"): WorldSnapshot {
  const today = dateKey(new Date(), DEFAULT_TZ);
  return {
    profile: defaultProfile(),
    prefs: defaultPrefs(lang),
    rooms: starterRooms(lang),
    food: [],
    water: [],
    diary: [],
    events: [],
    scrapbook: [],
    game: initialGame(today),
    notifications: [],
    letters: [],
    gifts: [],
  };
}

/** Merge a possibly-partial preferences object over defaults (for forward compatibility). */
export function mergePrefs(p: Partial<Preferences> | null | undefined): Preferences {
  const d = defaultPrefs(p?.lang ?? "fr");
  if (!p) return d;
  return {
    ...d,
    ...p,
    ui: { ...d.ui, ...(p.ui ?? {}), effects: { ...d.ui.effects, ...(p.ui?.effects ?? {}) }, sound: { ...d.ui.sound, ...(p.ui?.sound ?? {}) } },
    notifications: {
      ...d.notifications,
      ...(p.notifications ?? {}),
      kinds: { ...d.notifications.kinds, ...(p.notifications?.kinds ?? {}) },
      reminders: { ...d.notifications.reminders, ...(p.notifications?.reminders ?? {}) },
      quietHours: { ...d.notifications.quietHours, ...(p.notifications?.quietHours ?? {}) },
    },
    companion: { ...d.companion, ...(p.companion ?? {}) },
    wellness: { ...d.wellness, ...(p.wellness ?? {}) },
    privacy: { ...d.privacy, ...(p.privacy ?? {}) },
    customThemes: p.customThemes ?? [],
    palettes: p.palettes ?? d.palettes,
    roomPresets: p.roomPresets ?? [],
    favoriteItems: p.favoriteItems ?? [],
    tasks: p.tasks ?? [],
  };
}
