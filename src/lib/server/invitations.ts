import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { serviceClient } from "./supabase";
import { env, isAdminEmail } from "./env";
import { HttpError } from "./http";

const DAY = 86_400_000;
export const INVITE_TTL_DAYS = 7;

const hashToken = (token: string) => createHash("sha256").update(`invite|${token}`).digest("hex");

/** Mask an address for display to whoever holds the link: "isabelle@gmail.com" → "is•••••@gmail.com". */
export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}${"•".repeat(Math.max(3, user.length - 2))}@${domain}`;
}

/** Reserved domain for the automatic end-to-end test (RFC 2606: `.invalid` can never receive mail). */
export const SELFTEST_DOMAIN = "@selftest.invalid";
const isSelfTestEmail = (e: string) => e.endsWith(SELFTEST_DOMAIN);

/**
 * Create a single-use invitation for an address listed in ALLOWED_EMAILS. Admin addresses can never
 * be invited (admins are created in the Supabase dashboard). Earlier unused links for the same
 * address are revoked, so only the newest link works.
 */
export async function createInvitation(email: string, createdBy: string, opts: { selfTest?: boolean } = {}) {
  const e = email.trim().toLowerCase();
  if (isAdminEmail(e)) throw new HttpError("admin_email", 400);
  // Server-side test invitations may use the reserved test domain; nothing else bypasses the allowlist.
  const allowed = opts.selfTest ? isSelfTestEmail(e) : env.allowedEmails.includes(e);
  if (!allowed) throw new HttpError("not_allowed", 400);
  const db = serviceClient();
  const now = new Date();
  await db.from("invitations").update({ revoked_at: now.toISOString() }).eq("email", e).is("used_at", null).is("revoked_at", null);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * DAY).toISOString();
  const { error } = await db.from("invitations").insert({ email: e, token_hash: hashToken(token), created_by: createdBy, expires_at: expiresAt });
  if (error) throw new HttpError("db_error", 500);
  return { token, expiresAt };
}

export async function findInvitation(token: string, opts: { selfTest?: boolean } = {}) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const { data } = await serviceClient()
    .from("invitations")
    .select("id, email, expires_at")
    .eq("token_hash", hashToken(token))
    .is("used_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!data) return null;
  // Re-check the allowlist at use time: removing an address from ALLOWED_EMAILS cancels its invitations.
  // Test-domain invitations only work for the server-side test, never through the public join page.
  const allowed = opts.selfTest ? isSelfTestEmail(data.email) : env.allowedEmails.includes(data.email);
  if (!allowed || isAdminEmail(data.email)) return null;
  return data as { id: string; email: string; expires_at: string };
}

/** Atomically mark an invitation as used. Returns false if someone else used it first. */
export async function claimInvitation(id: string) {
  const { data } = await serviceClient().from("invitations").update({ used_at: new Date().toISOString() }).eq("id", id).is("used_at", null).select("id");
  return !!data?.length;
}

export async function releaseInvitation(id: string) {
  await serviceClient().from("invitations").update({ used_at: null }).eq("id", id);
}

export async function markInvitationUser(id: string, userId: string) {
  await serviceClient().from("invitations").update({ used_by: userId }).eq("id", id);
}

export async function listInvitations() {
  const { data } = await serviceClient()
    .from("invitations")
    .select("id, email, expires_at, used_at, revoked_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function revokeInvitation(id: string) {
  await serviceClient().from("invitations").update({ revoked_at: new Date().toISOString() }).eq("id", id).is("used_at", null);
}

/** Create the account for a valid, unused invitation (single use). */
export async function acceptInvitation(token: string, password: string, opts: { selfTest?: boolean } = {}) {
  const inv = await findInvitation(token, opts);
  if (!inv) throw new HttpError("invalid_invitation", 404);
  if (!(await claimInvitation(inv.id))) throw new HttpError("invalid_invitation", 404);
  const { data, error } = await serviceClient().auth.admin.createUser({ email: inv.email, password, email_confirm: true });
  if (error || !data.user) {
    await releaseInvitation(inv.id);
    const msg = error?.message ?? "";
    if (error?.code === "weak_password" || /password/i.test(msg)) throw new HttpError("weak", 400, msg.slice(0, 160));
    throw new HttpError(/already/i.test(msg) ? "exists" : "error", 409, `${error?.code ?? ""} ${msg}`.trim().slice(0, 160));
  }
  await markInvitationUser(inv.id, data.user.id);
  return { userId: data.user.id, email: inv.email };
}
