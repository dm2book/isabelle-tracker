// Shared domain types for Isabelle's world. Used by client, server and the game engine.

export type Lang = "fr" | "en";
export type ColorMode = "light" | "dark" | "auto";
export type AnimLevel = "off" | "gentle" | "normal" | "extra";
export type FontId =
  | "nunito"
  | "quicksand"
  | "baloo"
  | "comfortaa"
  | "atkinson"
  | "patrick"
  | "lexend";
export type ButtonStyle = "pill" | "rounded" | "soft" | "bubbly" | "outline";
export type CardStyle = "soft" | "glass" | "sticker" | "outline" | "cloud";
export type IconStyle = "cute" | "line";
export type BgPattern =
  | "none"
  | "hearts"
  | "stars"
  | "dots"
  | "clouds"
  | "gingham"
  | "sparkles"
  | "strawberries";

export interface ThemeTokens {
  bg: string;
  bg2: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  accent2: string;
  border: string;
}

export interface Theme {
  id: string;
  name: string;
  emoji: string;
  light: ThemeTokens;
  dark: ThemeTokens;
  builtIn?: boolean;
  price?: number; // coins, only for special built-in themes
}

export interface Palette {
  id: string;
  name: string;
  colors: string[];
}

export interface UiPrefs {
  font: FontId;
  buttonStyle: ButtonStyle;
  radius: number; // px, 8..32
  cardStyle: CardStyle;
  iconStyle: IconStyle;
  pattern: BgPattern;
  animations: AnimLevel;
  effects: { hearts: boolean; sparkles: boolean; seasonal: boolean; timeOfDay: boolean };
  sound: { enabled: boolean; volume: number };
}

export type ReminderSlot = "morning" | "afternoon" | "evening";

export interface NotificationPrefs {
  kinds: Record<NotificationKind, boolean>;
  reminders: Record<ReminderSlot, { enabled: boolean; time: string }>;
  breakReminder: boolean;
  quietHours: { enabled: boolean; start: string; end: string };
  push: boolean;
}

export type BowId = "classic" | "big" | "flower" | "heart" | "star" | "crown" | "none";

export interface CompanionLook {
  name: string;
  fur: string;
  bowColor: string;
  bow: BowId;
  outfit: string | null;
  outfitColor: string | null;
  accessory: string | null;
}

export interface PersonalTask {
  id: string;
  title: string;
  emoji: string;
  active: boolean;
}

export interface RoomPreset {
  id: string;
  name: string;
  room: Omit<Room, "id" | "createdAt" | "updatedAt">;
}

export interface Preferences {
  lang: Lang;
  mode: ColorMode;
  themeId: string;
  customThemes: Theme[];
  palettes: Palette[];
  favoritePaletteId: string | null;
  ui: UiPrefs;
  notifications: NotificationPrefs;
  timezone: string;
  companion: CompanionLook;
  wellness: {
    foodEnabled: boolean;
    waterEnabled: boolean;
    showCalories: boolean;
    calorieReference: number | null;
    waterGoalMl: number | null;
    glassSizes: number[];
  };
  privacy: { wellnessOnHome: boolean };
  roomPresets: RoomPreset[];
  favoriteItems: string[];
  tasks: PersonalTask[];
}

export interface Profile {
  displayName: string;
  worldName: string;
  birthday: string | null; // "MM-DD"
  onboarded: boolean;
}

// ---------- Rooms ----------
export type RoomKind =
  | "bedroom"
  | "cafe"
  | "reading"
  | "gaming"
  | "garden"
  | "starry"
  | "living"
  | "island"
  | "custom";
export type RoomSize = "cozy" | "standard" | "grand";

export interface Surface {
  pattern: string;
  c1: string;
  c2: string;
}

export interface RoomObject {
  id: string;
  item: string;
  x: number; // anchor = bottom-center, logical units
  y: number;
  s: number; // scale
  r: number; // degrees
  flip: boolean;
  z: number;
  c1?: string;
  c2?: string;
}

export interface Room {
  id: string;
  name: string;
  kind: RoomKind;
  emoji: string;
  size: RoomSize;
  outdoor: boolean;
  wall: Surface;
  floor: Surface;
  objects: RoomObject[];
  secret?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------- Wellness ----------
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface FoodEntry {
  id: string;
  date: string; // YYYY-MM-DD (local)
  time: string; // HH:mm
  meal: MealType;
  name: string;
  portion: string;
  calories: number | null;
  notes: string;
  source: "manual" | "openfoodfacts";
  createdAt: string;
}

export interface WaterEntry {
  id: string;
  date: string;
  time: string;
  amountMl: number;
  createdAt: string;
}

export type MoodId = "happy" | "calm" | "tired" | "sad" | "excited" | "loved";

export interface DiaryEntry {
  date: string;
  text: string;
  mood: MoodId | null;
  updatedAt: string;
}

export type EventKind = "special" | "birthday" | "milestone" | "appointment" | "note";

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  kind: EventKind;
  emoji: string;
  notes: string;
}

export type ScrapKind = "moment" | "room" | "achievement" | "message" | "photo" | "memory";

export interface ScrapEntry {
  id: string;
  kind: ScrapKind;
  title: string;
  body: string;
  emoji: string;
  color: string;
  image: string | null; // small compressed data URL
  room: Room | null;
  date: string;
  createdAt: string;
}

// ---------- Notifications ----------
export type NotificationKind =
  | "reminder"
  | "message"
  | "gift"
  | "quest"
  | "event"
  | "rare"
  | "birthday";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

// ---------- Messages & gifts from Ewan ----------
export interface Letter {
  id: string;
  kind: "letter" | "bottle";
  title: string;
  body: string;
  deliverAt: string;
  openedAt: string | null;
}

export type GiftAnimation = "hug" | "present" | "hearts" | "confetti" | "rare";
export type GiftKind = "robux" | "demo" | "surprise";
export type GiftStatus = "sent" | "opened" | "revealed";

export interface GiftSummary {
  id: string;
  kind: GiftKind;
  title: string;
  message: string;
  animation: GiftAnimation;
  hasCode: boolean;
  status: GiftStatus;
  sentAt: string;
  openedAt: string | null;
  revealedAt: string | null;
}

// ---------- Game ----------
export type GameEventType =
  | "decorate"
  | "open_diary"
  | "pop_heart"
  | "visit_garden"
  | "write_memory"
  | "personal_task"
  | "customize_companion"
  | "hug"
  | "visit_room"
  | "change_theme"
  | "open_chest"
  | "open_gift"
  | "visit_map"
  | "find_bottle"
  | "daily_visit"
  | "photo_room"
  | "secret_found";

export interface RewardLog {
  at: string;
  date: string;
  kind: "quest" | "chest" | "heart" | "surprise" | "achievement" | "level" | "bottle" | "gift" | "purchase";
  label: string;
  coins?: number;
  xp?: number;
  item?: string;
}

export interface GameState {
  coins: number;
  xp: number;
  level: number;
  owned: string[];
  collectibles: Record<string, number>;
  quests: Record<string, { progress: number; claimed: boolean }>;
  achievements: Record<string, string>;
  stats: Partial<Record<GameEventType, number>> & { goldenHearts?: number };
  daily: {
    date: string;
    chestOpened: boolean;
    surpriseOpened: boolean;
    surpriseIndex: number;
    heartsPopped: number;
    heartsSpawned: number;
    bottleChecked: boolean;
    bottleAvailable: boolean;
    bottleOpened: boolean;
    tasksDone: string[];
    tasksCounted: string[];
    visited: string[];
    eventXp: number;
  };
  streak: { last: string; count: number };
  recentHearts: string[];
  history: RewardLog[];
}

export type HeartVariant = "pink" | "lavender" | "blue" | "rainbow" | "golden";

export interface HeartTicket {
  id: string;
  variant: HeartVariant;
  exp: number;
  sig: string;
}

export type Effect =
  | { type: "coins"; amount: number }
  | { type: "xp"; amount: number }
  | { type: "level"; level: number }
  | { type: "item"; item: string }
  | { type: "collectible"; id: string }
  | { type: "quest_done"; questId: string }
  | { type: "achievement"; id: string }
  | { type: "message"; key: string; params?: Record<string, string | number> }
  | { type: "golden"; robux: "pending" | "disabled" | "capped" | "demo" };

export interface GameResult {
  game: GameState;
  effects: Effect[];
}

// ---------- Whole client snapshot ----------
export interface WorldSnapshot {
  profile: Profile;
  prefs: Preferences;
  rooms: Room[];
  food: FoodEntry[];
  water: WaterEntry[];
  diary: DiaryEntry[];
  events: CalendarEvent[];
  scrapbook: ScrapEntry[];
  game: GameState;
  notifications: AppNotification[];
  letters: Letter[];
  gifts: GiftSummary[];
}

export type AppMode = "local" | "cloud";

export interface PublicConfig {
  mode: AppMode;
  pushConfigured: boolean;
  vapidPublicKey: string | null;
  robuxProgram: boolean;
  heartCap: number;
  robuxWeeklyCap: number;
}
