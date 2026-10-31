import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.REWARD_ENCRYPTION_KEY = "test-key-test-key-test-key-test-key-123";
  process.env.APP_SECRET = "app-secret-for-tests-only-0123456789";
});

describe("reward code encryption", async () => {
  it("round-trips and never stores plain text", async () => {
    const { encryptCode, decryptCode } = await import("@/lib/server/crypto");
    const enc = encryptCode("ROBUX-1234-ABCD");
    expect(JSON.stringify(enc)).not.toContain("ROBUX");
    expect(decryptCode(enc)).toBe("ROBUX-1234-ABCD");
    const enc2 = encryptCode("ROBUX-1234-ABCD");
    expect(enc2.iv).not.toBe(enc.iv);
  });
  it("detects tampering", async () => {
    const { encryptCode, decryptCode } = await import("@/lib/server/crypto");
    const enc = encryptCode("SECRET");
    const bad = { ...enc, ciphertext: Buffer.from("xxxxxx").toString("base64") };
    expect(() => decryptCode(bad)).toThrow();
  });
});

describe("heart tickets", () => {
  it("are bound to the user, the variant and the expiry", async () => {
    const { signHeart, verifyHeart } = await import("@/lib/server/crypto");
    const t = signHeart("pink", Date.now() + 60_000, "user-a");
    expect(verifyHeart(t, "user-a")).toBe(true);
    expect(verifyHeart(t, "user-b")).toBe(false);
    expect(verifyHeart({ ...t, variant: "golden" }, "user-a")).toBe(false);
    expect(verifyHeart({ ...t, exp: t.exp + 1 }, "user-a")).toBe(false);
    const old = signHeart("pink", Date.now() - 1, "user-a");
    expect(verifyHeart(old, "user-a")).toBe(false);
  });
});
