import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "./env";
import type { HeartTicket, HeartVariant } from "../types";

const AAD = Buffer.from("isabelle-world:reward-code:v1");

function rewardKey(): Buffer {
  if (env.rewardKey.length < 32) throw new Error("REWARD_ENCRYPTION_KEY must be at least 32 characters");
  return createHash("sha256").update(env.rewardKey).digest();
}

/** Encrypt a real reward code (AES-256-GCM, random 96-bit IV, authenticated). */
export function encryptCode(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", rewardKey(), iv);
  cipher.setAAD(AAD);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { ciphertext: ct.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}

export function decryptCode(row: { ciphertext: string; iv: string; tag: string }): string {
  const decipher = createDecipheriv("aes-256-gcm", rewardKey(), Buffer.from(row.iv, "base64"));
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(row.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(row.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

/** Cryptographically secure uniform number in [0, 1). */
export function secureRand(): number {
  return randomInt(0, 2 ** 47) / 2 ** 47;
}

function ticketSig(id: string, variant: HeartVariant, exp: number, userId: string) {
  return createHmac("sha256", env.appSecret).update(`heart|${id}|${variant}|${exp}|${userId}`).digest("base64url");
}

export function signHeart(variant: HeartVariant, exp: number, userId: string): HeartTicket {
  const id = randomUUID();
  return { id, variant, exp, sig: ticketSig(id, variant, exp, userId) };
}

export function verifyHeart(t: HeartTicket, userId: string): boolean {
  const expected = Buffer.from(ticketSig(t.id, t.variant, t.exp, userId));
  const given = Buffer.from(String(t.sig ?? ""));
  return expected.length === given.length && timingSafeEqual(expected, given) && Date.now() <= t.exp;
}
