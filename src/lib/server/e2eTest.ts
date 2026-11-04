import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { env } from "./env";
import { hasAdminRole, serviceClient, type Session } from "./supabase";
import { HttpError } from "./http";
import { acceptInvitation, createInvitation, findInvitation, SELFTEST_DOMAIN } from "./invitations";
import { importBatch, importBegin, importFinish } from "./importer";
import { deliverGift, revealGiftFor } from "./gifts";
import { acceptReset, createResetLink, findReset, revokeReset } from "./passwordResets";
import { roomToRow } from "./mappers";
import { buildRoom } from "../rooms/templates";
import { COINS_PER_DAY, START_COINS, daysSinceLaunch } from "../game/importCaps";
import { dateKey } from "../time";
import { emptySnapshot } from "../defaults";

export type StepResult = { id: string; ok: boolean; detail?: string };

/**
 * Full end-to-end test against the real Supabase project, run on the server by an admin.
 * It creates two temporary accounts on a reserved test domain (`@selftest.invalid`, which can never
 * receive mail), exercises invitations, sign-in, admin rights, password-reset links, Row Level Security,
 * the import and a gift with a fake code, then deletes everything it created — also when a step fails.
 * Results are pass/fail only: no key, password or code is ever returned.
 */
export async function runEndToEnd(admin: Session): Promise<StepResult[]> {
  const out: StepResult[] = [];
  const svc = serviceClient();
  const tag = randomBytes(4).toString("hex");
  const email1 = `t1-${tag}${SELFTEST_DOMAIN}`;
  const email2 = `t2-${tag}${SELFTEST_DOMAIN}`;
  // Long random passwords that also satisfy the strictest Supabase password rules (upper, lower, digit, symbol).
  let pw1 = `${randomBytes(18).toString("base64url")}Aa1!`;
  const pw2 = `${randomBytes(18).toString("base64url")}Aa1!`;
  const created: string[] = [];
  const codeIds: string[] = [];
  let t1: { user: User; db: SupabaseClient } | null = null;
  let t2: { user: User; db: SupabaseClient } | null = null;

  const step = async (id: string, fn: () => Promise<string | void>, needs: unknown[] = []) => {
    if (needs.some((n) => !n)) return out.push({ id, ok: false, detail: "skipped (an earlier step failed)" });
    try {
      const detail = await fn();
      out.push({ id, ok: true, ...(detail ? { detail } : {}) });
    } catch (e) {
      const msg = e instanceof HttpError ? `${e.code}${e.detail ? `: ${e.detail}` : ""}` : e instanceof Error ? e.message : "failed";
      out.push({ id, ok: false, detail: msg.slice(0, 200) });
    }
  };
  const expectCode = async (fn: () => Promise<unknown>, code: string) => {
    try {
      await fn();
    } catch (e) {
      if (e instanceof HttpError && e.code === code) return;
      throw new Error(`expected ${code}, got ${e instanceof HttpError ? e.code : "error"}`);
    }
    throw new Error(`expected ${code}, but it succeeded`);
  };
  const signIn = async (email: string, password: string) => {
    const db = createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new Error(`sign-in failed (${error?.code ?? error?.message ?? "no user"})`);
    return { user: data.user, db };
  };

  try {
    // --- Invitations -----------------------------------------------------------------------------
    await step("e2e_inviteAdminBlocked", async () => {
      const adminEmail = env.adminEmails[0];
      if (!adminEmail) throw new Error("ADMIN_EMAILS is empty");
      await expectCode(() => createInvitation(adminEmail, admin.user.id), "admin_email");
    });
    await step("e2e_inviteStrangerBlocked", () => expectCode(() => createInvitation(`stranger-${tag}@example.com`, admin.user.id), "not_allowed"));
    let token = "";
    await step("e2e_inviteCreated", async () => {
      token = (await createInvitation(email1, admin.user.id, { selfTest: true })).token;
    });
    await step("e2e_invitePublicBlocked", async () => {
      if (await findInvitation(token)) throw new Error("a test invitation worked through the public join page");
    }, [token]);
    await step("e2e_inviteAccepted", async () => {
      const r = await acceptInvitation(token, pw1, { selfTest: true });
      created.push(r.userId);
    }, [token]);
    await step("e2e_inviteSingleUse", () => expectCode(() => acceptInvitation(token, pw2, { selfTest: true }), "invalid_invitation"), [created[0]]);

    // --- Sign-in and admin rights ----------------------------------------------------------------
    await step("e2e_signIn", async () => {
      t1 = await signIn(email1, pw1);
    }, [created[0]]);
    await step("e2e_notAdmin", async () => {
      if (hasAdminRole(t1!.user)) throw new Error("new account has admin rights");
      // Trying to grant herself admin only changes user_metadata, never the server-only app_metadata.
      await t1!.db.auth.updateUser({ data: { role: "admin" } });
      const { data } = await t1!.db.auth.getUser();
      if (data.user && hasAdminRole(data.user)) throw new Error("a user could grant herself admin");
    }, [t1]);

    // --- Password-reset links (Espace Ewan) ------------------------------------------------------
    await step("e2e_resetAdminBlocked", () => expectCode(() => createResetLink(admin.user.id, admin.user.id), "admin_account"));
    let resetToken = "";
    await step("e2e_resetCreated", async () => {
      resetToken = (await createResetLink(t1!.user.id, admin.user.id)).token;
      const r = await findReset(resetToken);
      if (r?.email !== email1) throw new Error("the link does not point to her account");
    }, [t1]);
    await step("e2e_resetUsed", async () => {
      const newPw = `${randomBytes(18).toString("base64url")}Bb2!`;
      await acceptReset(resetToken, newPw);
      const old = createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error } = await old.auth.signInWithPassword({ email: email1, password: pw1 });
      if (!error) throw new Error("the old password still works");
      pw1 = newPw;
      t1 = await signIn(email1, pw1);
    }, [resetToken]);
    await step("e2e_resetSingleUse", () => expectCode(() => acceptReset(resetToken, `${randomBytes(18).toString("base64url")}Cc3!`), "invalid_reset"), [resetToken]);
    await step("e2e_resetExpiredRevoked", async () => {
      const expired = await createResetLink(t1!.user.id, admin.user.id);
      await svc.from("password_resets").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", expired.id);
      if (await findReset(expired.token)) throw new Error("an expired link still works");
      const revoked = await createResetLink(t1!.user.id, admin.user.id);
      await revokeReset(revoked.id);
      if (await findReset(revoked.token)) throw new Error("a cancelled link still works");
      const older = await createResetLink(t1!.user.id, admin.user.id);
      const newer = await createResetLink(t1!.user.id, admin.user.id);
      if (await findReset(older.token)) throw new Error("a newer link did not cancel the older one");
      if (!(await findReset(newer.token))) throw new Error("the newest link does not work");
      await revokeReset(newer.id);
    }, [t1]);

    // --- Row Level Security ----------------------------------------------------------------------
    const ownFood = randomUUID();
    await step("e2e_ownData", async () => {
      const today = dateKey(new Date());
      const ins = await t1!.db.from("food_entries").insert({ id: ownFood, user_id: t1!.user.id, entry_date: today, meal: "lunch", name: "Test" });
      if (ins.error) throw new Error(ins.error.message);
      const { data } = await t1!.db.from("food_entries").select("id").eq("id", ownFood);
      if (data?.length !== 1) throw new Error("cannot read her own entry");
    }, [t1]);
    await step("e2e_secondAccount", async () => {
      const { data, error } = await svc.auth.admin.createUser({ email: email2, password: pw2, email_confirm: true });
      if (error || !data.user) throw new Error(`could not create the second test account (${error?.code ?? ""} ${error?.message ?? ""})`.trim());
      created.push(data.user.id);
      t2 = await signIn(email2, pw2);
    }, [t1]);
    await step("e2e_isolation", async () => {
      const read = await t2!.db.from("food_entries").select("id").eq("id", ownFood);
      if (read.data?.length) throw new Error("another account can read her food diary");
      const spoof = await t2!.db.from("food_entries").insert({ id: randomUUID(), user_id: t1!.user.id, entry_date: dateKey(new Date()), meal: "lunch", name: "Spoof" });
      if (!spoof.error) throw new Error("another account could write into her diary");
      const del = await t2!.db.from("food_entries").delete().eq("id", ownFood).select("id");
      if (del.data?.length) throw new Error("another account could delete her data");
    }, [t1, t2]);
    // --- Import ----------------------------------------------------------------------------------
    const world = emptySnapshot("fr");
    const now = new Date().toISOString();
    const today = dateKey(new Date());
    const rooms = [buildRoom("bedroom", "standard", "fr", false, "Chambre test"), buildRoom("garden", "cozy", "fr", false, "Jardin test")];
    const food = [1, 2, 3].map((i) => ({ id: randomUUID(), date: today, time: "12:00", meal: "lunch" as const, name: `Plat ${i}`, portion: "", calories: 100 * i, notes: "", source: "manual" as const, createdAt: now }));
    const water = [1, 2].map(() => ({ id: randomUUID(), date: today, time: "10:00", amountMl: 250, createdAt: now }));
    const scrap = [{ id: randomUUID(), kind: "moment" as const, title: "Souvenir test", body: "", emoji: "💗", color: "#FFD1E2", image: null, room: null, date: today, createdAt: now }];
    const game = { ...world.game, coins: 999_999, xp: 999_999, owned: ["item:bed_cloud", "item:hacked"], collectibles: { macaron: 2, golden_heart: 40 }, achievements: { first_room: now }, stats: { decorate: 5 } };
    const payload = { source: "file", profile: { ...world.profile, worldName: "Monde test", onboarded: true }, prefs: world.prefs, rooms };
    const cap = START_COINS + COINS_PER_DAY * daysSinceLaunch(today);
    const s1 = () => ({ user: t1!.user, db: t1!.db });

    const runImport = async () => {
      const begin = await importBegin(s1(), payload);
      await importBatch(s1(), { importId: begin.importId, kind: "food", items: food });
      await importBatch(s1(), { importId: begin.importId, kind: "water", items: water });
      await importBatch(s1(), { importId: begin.importId, kind: "scrapbook", items: scrap });
      return importFinish(s1(), { importId: begin.importId, game });
    };
    let firstCoins = -1;
    await step("e2e_import", async () => {
      // An untouched starter room, as created at first sign-in, must be replaced by her own rooms.
      const starter = buildRoom("cafe", "cozy", "fr");
      await t1!.db.from("rooms").insert(roomToRow({ ...starter, starter: true } as typeof starter, t1!.user.id));
      const r = await runImport();
      const { data: roomRows } = await t1!.db.from("rooms").select("id");
      if (roomRows?.length !== 2) throw new Error(`expected 2 rooms, found ${roomRows?.length}`);
      const { data: foodRows } = await t1!.db.from("food_entries").select("id").in("id", food.map((f) => f.id));
      if (foodRows?.length !== 3) throw new Error("food diary not fully imported");
      const { data: waterRows } = await t1!.db.from("water_entries").select("id").in("id", water.map((w) => w.id));
      if (waterRows?.length !== 2) throw new Error("water history not fully imported");
      const { data: scrapRows } = await t1!.db.from("scrapbook_entries").select("id").in("id", scrap.map((x) => x.id));
      if (scrapRows?.length !== 1) throw new Error("scrapbook not imported");
      const { data: prof } = await t1!.db.from("profiles").select("world_name").eq("id", t1!.user.id).single();
      if (prof?.world_name !== "Monde test") throw new Error("world name not imported");
      if (r.game.coins > cap || r.game.coins <= 0) throw new Error(`coins not capped (${r.game.coins})`);
      if (r.game.owned.includes("item:hacked")) throw new Error("an invalid item was imported");
      if ((r.game.collectibles.golden_heart ?? 0) >= 40) throw new Error("ultra-rare items not capped");
      firstCoins = r.game.coins;
      return `coins ${game.coins} → ${r.game.coins}`;
    }, [t1]);
    await step("e2e_importTwice", async () => {
      const r = await runImport();
      const { data: roomRows } = await t1!.db.from("rooms").select("id");
      const { data: foodRows } = await t1!.db.from("food_entries").select("id").in("id", food.map((f) => f.id));
      if (roomRows?.length !== 2 || foodRows?.length !== 3) throw new Error("importing twice created duplicates");
      if (r.game.coins !== firstCoins) throw new Error("importing twice changed the coins");
    }, [firstCoins >= 0 || null]);

    await step("e2e_economyLocked", async () => {
      // Her progress row now exists: she must not be able to change coins or XP herself.
      const up = await t1!.db.from("game_states").update({ state: { coins: 999999 } }).eq("user_id", t1!.user.id).select("user_id");
      if (!up.error && up.data?.length) throw new Error("a user could change her own coins");
      const { data } = await svc.from("game_states").select("state").eq("user_id", t1!.user.id).single();
      if ((data?.state as { coins?: number })?.coins === 999999) throw new Error("coins were changed");
    }, [t1]);

    // --- Gift with a fake code -------------------------------------------------------------------
    const fakeCode = `TEST-${tag.toUpperCase()}`;
    let giftId = "";
    await step("e2e_giftEncrypted", async () => {
      const g = await deliverGift(admin.user.id, { recipientId: t1!.user.id, kind: "robux", code: fakeCode, title: "Test", message: "Test", animation: "present", idempotencyKey: `selftest-${tag}` }, { notify: false });
      giftId = g.id;
      if (g.codeId) codeIds.push(g.codeId);
      const { data } = await svc.from("reward_codes").select("ciphertext").eq("id", g.codeId!).single();
      if (!data || data.ciphertext.includes(fakeCode)) throw new Error("the code is not encrypted");
      const asUser = await t1!.db.from("reward_codes").select("id").eq("id", g.codeId!);
      if (!asUser.error && asUser.data?.length) throw new Error("reward codes are readable by a user");
    }, [t1]);
    await step("e2e_giftDuplicate", () => expectCode(() => deliverGift(admin.user.id, { recipientId: t1!.user.id, kind: "surprise", title: "", message: "", animation: "present", idempotencyKey: `selftest-${tag}` }, { notify: false }), "duplicate"), [giftId]);
    await step("e2e_giftRecipientOnly", async () => {
      await expectCode(() => revealGiftFor(t2!.user.id, giftId), "not_found");
      const seen = await t2!.db.from("gift_deliveries").select("id").eq("id", giftId);
      if (seen.data?.length) throw new Error("another account can see her gift");
    }, [giftId, t2]);
    await step("e2e_giftReveal", async () => {
      const r = await revealGiftFor(t1!.user.id, giftId);
      if (r.code !== fakeCode) throw new Error("revealed code does not match");
      const { data } = await svc.from("gift_deliveries").select("status, revealed_at").eq("id", giftId).single();
      if (data?.status !== "revealed" || !data.revealed_at) throw new Error("status not recorded");
    }, [giftId]);
  } finally {
    // --- Clean-up: everything created above is removed ---------------------------------------------
    await step("e2e_cleanup", async () => {
      for (const id of codeIds) await svc.from("reward_codes").delete().eq("id", id);
      await svc.from("invitations").delete().like("email", `%-${tag}${SELFTEST_DOMAIN}`);
      for (const id of created) await svc.auth.admin.deleteUser(id); // cascades to all of their rows
      const { data } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
      if ((data?.users ?? []).some((u) => u.email?.endsWith(`-${tag}${SELFTEST_DOMAIN}`))) throw new Error("test accounts were not removed");
    });
  }
  return out;
}
