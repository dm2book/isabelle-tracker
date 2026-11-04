import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { hasAdminRole, serviceClient } from "./supabase";
import { isAdminEmail } from "./env";
import { HttpError } from "./http";
import { maskEmail } from "./invitations";

/**
 * Password-reset links created by Ewan in Espace Ewan, shared with Isabelle by message. No e-mail is
 * involved (Supabase's built-in mail only reaches the project's team). A link:
 *  - works once, expires after 24 hours, and a newer link cancels older ones;
 *  - is stored only as a SHA-256 hash (prefixed, so it can never be used as an invitation);
 *  - can never reset an admin account (Ewan resets his own password in the Supabase dashboard);
 *  - is only checked on submit (POST), so message apps that preview links cannot use it up.
 * After a reset every other session of that account is signed out.
 */

export const RESET_TTL_HOURS = 24;
const hashToken = (token: string) => createHash("sha256").update(`reset|${token}`).digest("hex");
const TOKEN_RE = /^[A-Za-z0-9_-]{40,60}$/;

async function nonAdminUser(userId: string) {
  const { data, error } = await serviceClient().auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  if (isAdminEmail(data.user.email) || hasAdminRole(data.user)) return null;
  return data.user;
}

export async function createResetLink(userId: string, createdBy: string) {
  const { data, error } = await serviceClient().auth.admin.getUserById(userId);
  if (error || !data.user) throw new HttpError("not_found", 404);
  if (isAdminEmail(data.user.email) || hasAdminRole(data.user)) throw new HttpError("admin_account", 400);
  const db = serviceClient();
  const now = new Date();
  await db.from("password_resets").update({ revoked_at: now.toISOString() }).eq("user_id", userId).is("used_at", null).is("revoked_at", null);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + RESET_TTL_HOURS * 3600_000).toISOString();
  const ins = await db.from("password_resets").insert({ user_id: userId, token_hash: hashToken(token), created_by: createdBy, expires_at: expiresAt }).select("id").single();
  if (ins.error) throw new HttpError("db_error", 500);
  return { id: ins.data.id as string, token, expiresAt };
}

/** A valid (unused, unrevoked, unexpired) link and the account it belongs to, or null. */
export async function findReset(token: string) {
  if (!TOKEN_RE.test(token)) return null;
  const { data } = await serviceClient()
    .from("password_resets")
    .select("id, user_id, expires_at")
    .eq("token_hash", hashToken(token))
    .is("used_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!data) return null;
  const user = await nonAdminUser(data.user_id);
  if (!user?.email) return null;
  return { id: data.id as string, userId: data.user_id as string, email: user.email, expiresAt: data.expires_at as string };
}

/** Set a new password from a valid link. The link is claimed atomically, so it works only once. */
export async function acceptReset(token: string, password: string) {
  const r = await findReset(token);
  if (!r) throw new HttpError("invalid_reset", 404);
  const db = serviceClient();
  const claimed = await db.from("password_resets").update({ used_at: new Date().toISOString() }).eq("id", r.id).is("used_at", null).select("id");
  if (!claimed.data?.length) throw new HttpError("invalid_reset", 404);
  const { error } = await db.auth.admin.updateUserById(r.userId, { password });
  if (error) {
    await db.from("password_resets").update({ used_at: null }).eq("id", r.id);
    const msg = error.message ?? "";
    if (error.code === "weak_password" || /password/i.test(msg)) throw new HttpError("weak", 400, msg.slice(0, 160));
    throw new HttpError("error", 500, `${error.code ?? ""} ${msg}`.trim().slice(0, 160));
  }
  return { userId: r.userId, email: r.email };
}

export async function revokeReset(id: string) {
  await serviceClient().from("password_resets").update({ revoked_at: new Date().toISOString() }).eq("id", id).is("used_at", null);
}

/** Recent links for the admin panel (masked address, status only — never a token). */
export async function listResets(emails: Map<string, string>) {
  const { data } = await serviceClient().from("password_resets").select("id, user_id, expires_at, used_at, revoked_at, created_at").order("created_at", { ascending: false }).limit(20);
  return (data ?? []).map((r) => ({ ...r, email: maskEmail(emails.get(r.user_id) ?? "?@?") }));
}
