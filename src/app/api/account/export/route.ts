import { cloudEnabled } from "@/lib/server/env";
import { getSession } from "@/lib/server/supabase";
import { fail, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** GDPR data export: everything stored about the signed-in user (reward codes excluded — they are revealed in-app). */
export async function GET() {
  if (!cloudEnabled()) return fail("local_mode", 400);
  const s = await getSession();
  if (!s) return fail("unauthorized", 401);
  const tables = ["profiles", "preferences", "rooms", "food_entries", "water_entries", "diary_entries", "calendar_events", "scrapbook_entries", "game_states", "reward_events", "notifications", "scheduled_messages", "push_subscriptions"] as const;
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), email: s.user.email };
  for (const t of tables) {
    const { data } = await s.db.from(t).select("*");
    out[t] = data ?? [];
  }
  const { data: gifts } = await s.db.from("gift_deliveries").select("id, kind, title, message, animation, status, sent_at, opened_at, revealed_at");
  out.gift_deliveries = gifts ?? [];
  return ok(out);
}
