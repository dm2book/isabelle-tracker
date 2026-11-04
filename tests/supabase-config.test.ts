import { describe, expect, it } from "vitest";
import { looksSecret, normalizeSupabaseUrl } from "@/lib/supabaseConfig";

const jwt = (payload: object) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`;

describe("Supabase config", () => {
  it("normalizes common ways of pasting the project address", () => {
    expect(normalizeSupabaseUrl("https://abc.supabase.co")).toBe("https://abc.supabase.co");
    expect(normalizeSupabaseUrl(" https://abc.supabase.co/ \n")).toBe("https://abc.supabase.co");
    expect(normalizeSupabaseUrl("https://abc.supabase.co/rest/v1/")).toBe("https://abc.supabase.co");
    expect(normalizeSupabaseUrl("abc.supabase.co")).toBe("https://abc.supabase.co");
    expect(normalizeSupabaseUrl("")).toBe("");
  });
  it("recognizes a secret key pasted as the public key", () => {
    expect(looksSecret("sb_secret_abcdefghijklmnopqrstuvwxyz")).toBe(true);
    expect(looksSecret(jwt({ role: "service_role" }))).toBe(true);
    expect(looksSecret(jwt({ role: "anon" }))).toBe(false);
    expect(looksSecret("sb_publishable_abcdefghijklmnopqrstuvwxyz")).toBe(false);
  });
});
