import { cloudEnabled } from "@/lib/server/env";
import { getSession, serviceClient, type Session } from "@/lib/server/supabase";
import { fail, ok } from "@/lib/server/http";
import { loadGame } from "@/lib/server/game";
import {
  diaryFromRow, eventFromRow, foodFromRow, GIFT_COLUMNS, giftFromRow, letterFromRow, notifFromRow, roomFromRow, roomToRow, scrapFromRow, waterFromRow,
} from "@/lib/server/mappers";
import { defaultPrefs, defaultProfile, mergePrefs } from "@/lib/defaults";
import { starterRooms } from "@/lib/rooms/templates";
import { addDays, dateKey } from "@/lib/time";
import { translate } from "@/lib/i18n";
import type { Preferences, Profile, WorldSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Letters whose delivery time has passed get an in-app notification (once). */
async function deliverDueLetters(s: Session, lang: "fr" | "en") {
  const db = serviceClient();
  const { data } = await db
    .from("scheduled_messages")
    .select("id, kind")
    .eq("recipient_id", s.user.id)
    .lte("deliver_at", new Date().toISOString())
    .is("notified_at", null);
  if (!data?.length) return;
  await db.from("scheduled_messages").update({ notified_at: new Date().toISOString() }).in("id", data.map((m) => m.id));
  await db.from("notifications").insert(
    data.map((m) => ({
      user_id: s.user.id,
      kind: "message",
      title: translate(lang, m.kind === "bottle" ? "surprises.bottleFound" : "notifications.letterTitle"),
      body: translate(lang, "notifications.letterBody"),
      link: "/surprises",
    })),
  );
}

async function inbox(s: Session) {
  const [notifications, letters, gifts] = await Promise.all([
    s.db.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
    s.db.from("scheduled_messages").select("id, kind, title, body, deliver_at, opened_at").order("deliver_at", { ascending: false }).limit(100),
    s.db.from("gift_deliveries").select(GIFT_COLUMNS).order("sent_at", { ascending: false }).limit(50),
  ]);
  return {
    notifications: (notifications.data ?? []).map(notifFromRow),
    letters: (letters.data ?? []).map(letterFromRow),
    gifts: (gifts.data ?? []).map(giftFromRow),
  };
}

export async function GET(req: Request) {
  if (!cloudEnabled()) return fail("local_mode", 400);
  const s = await getSession();
  if (!s) return fail("unauthorized", 401);
  const part = new URL(req.url).searchParams.get("part");

  // Ensure her base rows exist (first sign-in)
  let { data: profileRow } = await s.db.from("profiles").select("*").eq("id", s.user.id).maybeSingle();
  const firstVisit = !profileRow;
  if (!profileRow) {
    const d = defaultProfile();
    await s.db.from("profiles").upsert({ id: s.user.id, display_name: d.displayName, world_name: d.worldName }, { onConflict: "id", ignoreDuplicates: true });
    profileRow = (await s.db.from("profiles").select("*").eq("id", s.user.id).single()).data;
  }
  let { data: prefsRow } = await s.db.from("preferences").select("data").eq("user_id", s.user.id).maybeSingle();
  if (!prefsRow) {
    await s.db.from("preferences").upsert({ user_id: s.user.id, data: defaultPrefs("fr") }, { onConflict: "user_id", ignoreDuplicates: true });
    prefsRow = { data: defaultPrefs("fr") };
  }
  const prefs: Preferences = mergePrefs(prefsRow.data as Partial<Preferences>);
  await deliverDueLetters(s, prefs.lang);

  if (part === "inbox") return ok(await inbox(s));

  if (firstVisit) {
    const { count } = await s.db.from("rooms").select("id", { count: "exact", head: true });
    // `starter: true` marks untouched template rooms; editing a room drops it (schemas strip unknown keys),
    // so an import can safely replace rooms she never touched.
    if (!count) await s.db.from("rooms").insert(starterRooms(prefs.lang).map((r) => roomToRow({ ...r, starter: true } as typeof r, s.user.id)));
  }

  const since = addDays(dateKey(new Date(), prefs.timezone), -400);
  const [rooms, food, water, diary, events, scrap, game, box] = await Promise.all([
    s.db.from("rooms").select("*").order("created_at"),
    s.db.from("food_entries").select("*").gte("entry_date", since),
    s.db.from("water_entries").select("*").gte("entry_date", since),
    s.db.from("diary_entries").select("*").gte("entry_date", since),
    s.db.from("calendar_events").select("*"),
    s.db.from("scrapbook_entries").select("*").order("created_at", { ascending: false }).limit(300),
    loadGame(s.user.id, prefs.timezone),
    inbox(s),
  ]);

  const profile: Profile = {
    displayName: profileRow?.display_name ?? "Isabelle",
    worldName: profileRow?.world_name ?? "",
    birthday: profileRow?.birthday ?? null,
    onboarded: !!profileRow?.onboarded,
  };

  const snapshot: WorldSnapshot & { email: string; isAdmin: boolean } = {
    profile,
    prefs,
    rooms: (rooms.data ?? []).map(roomFromRow),
    food: (food.data ?? []).map(foodFromRow),
    water: (water.data ?? []).map(waterFromRow),
    diary: (diary.data ?? []).map(diaryFromRow),
    events: (events.data ?? []).map(eventFromRow),
    scrapbook: (scrap.data ?? []).map(scrapFromRow),
    game: game.state,
    ...box,
    email: s.user.email ?? "",
    isAdmin: s.isAdmin,
  };
  return ok(snapshot);
}
