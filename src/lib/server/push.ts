import "server-only";
import webpush from "web-push";
import { env, pushConfigured } from "./env";
import { serviceClient } from "./supabase";

let configured = false;
function setup() {
  if (configured) return true;
  if (!pushConfigured()) return false;
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublic, env.vapidPrivate);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Send a push to every device of a user. Payloads must never contain personal data or reward codes. */
export async function sendPush(userId: string, payload: PushPayload): Promise<number> {
  if (!setup()) return 0;
  const db = serviceClient();
  const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? "/home", tag: payload.tag }),
        { TTL: 60 * 60 * 12 },
      );
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
    }
  }
  return sent;
}
