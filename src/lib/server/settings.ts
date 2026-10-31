import "server-only";
import { serviceClient } from "./supabase";
import { DEFAULT_HEART_CAP, DEFAULT_ROBUX_WEEKLY_CAP } from "../game/rules";

export interface AppSettings {
  robuxEnabled: boolean;
  robuxWeeklyCap: number;
  heartDailyCap: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  robuxEnabled: false,
  robuxWeeklyCap: DEFAULT_ROBUX_WEEKLY_CAP,
  heartDailyCap: DEFAULT_HEART_CAP,
};

export async function getAppSettings(): Promise<AppSettings> {
  const { data } = await serviceClient().from("app_settings").select("value").eq("key", "rewards").maybeSingle();
  return { ...DEFAULT_SETTINGS, ...((data?.value as Partial<AppSettings>) ?? {}) };
}

export async function saveAppSettings(s: AppSettings) {
  const { error } = await serviceClient().from("app_settings").upsert({ key: "rewards", value: s, updated_at: new Date().toISOString() });
  if (error) throw error;
}
