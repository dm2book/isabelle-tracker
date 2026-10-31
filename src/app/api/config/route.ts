import { cloudEnabled, env, pushConfigured } from "@/lib/server/env";
import { ok } from "@/lib/server/http";
import { DEFAULT_SETTINGS, getAppSettings } from "@/lib/server/settings";
import type { PublicConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const cloud = cloudEnabled();
  let settings = DEFAULT_SETTINGS;
  if (cloud) {
    try {
      settings = await getAppSettings();
    } catch {
      settings = DEFAULT_SETTINGS;
    }
  }
  const config: PublicConfig = {
    mode: cloud ? "cloud" : "local",
    pushConfigured: pushConfigured(),
    vapidPublicKey: pushConfigured() ? env.vapidPublic : null,
    robuxProgram: settings.robuxEnabled,
    heartCap: settings.heartDailyCap,
    robuxWeeklyCap: settings.robuxWeeklyCap,
  };
  return ok(config);
}
