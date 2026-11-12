import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";
import nextConfig from "../next.config";

const EXPECTED = "camera=(self), microphone=(self), geolocation=()";

describe("Permissions-Policy header", () => {
  it("applies to every page with camera/microphone for the app itself only and location blocked", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const policies = rules.flatMap((r) => r.headers.filter((h) => h.key.toLowerCase() === "permissions-policy").map((h) => ({ source: r.source, value: h.value })));
    expect(policies).toEqual([{ source: "/:path*", value: EXPECTED }]);
  });

  it("never allows another origin or location", () => {
    expect(EXPECTED).not.toMatch(/\*/); // no wildcard
    expect(EXPECTED).not.toMatch(/https?:/); // no other origin
    expect(EXPECTED).toContain("geolocation=()");
  });
});

describe("code guard: camera, microphone and location only where they are needed", () => {
  const eslint = new ESLint({ cwd: process.cwd() });
  const lint = async (code: string) => {
    const [res] = await eslint.lintText(code, { filePath: "src/components/SomeScreen.tsx" });
    return res.messages.filter((m) => ["no-restricted-properties", "no-restricted-globals", "no-restricted-syntax"].includes(m.ruleId ?? ""));
  };

  it("refuses the camera/microphone API in an ordinary screen", async () => {
    const msgs = await lint("export async function f() { return navigator.mediaDevices.getUserMedia({ video: true }); }\n");
    expect(msgs.map((m) => m.ruleId)).toContain("no-restricted-properties");
  });
  it("refuses screen capture", async () => {
    const msgs = await lint("export async function f() { return navigator.mediaDevices.getDisplayMedia(); }\n");
    expect(msgs.length).toBeGreaterThan(0);
  });
  it("refuses microphone recording", async () => {
    const msgs = await lint("export function f(s: MediaStream) { return new MediaRecorder(s); }\n");
    expect(msgs.map((m) => m.ruleId)).toContain("no-restricted-globals");
  });
  it("refuses opening the camera directly from a file input", async () => {
    const msgs = await lint('export function F() { return <input type="file" accept="image/*" capture="environment" />; }\n');
    expect(msgs.map((m) => m.ruleId)).toContain("no-restricted-syntax");
  });
  it("refuses location", async () => {
    const msgs = await lint("export function f() { navigator.geolocation.getCurrentPosition(() => {}); }\n");
    expect(msgs.map((m) => m.ruleId)).toContain("no-restricted-properties");
  });
  it("leaves normal code (and the photo picker without capture) alone", async () => {
    const msgs = await lint('export function F() { return <input type="file" accept="image/*" />; }\n');
    expect(msgs).toEqual([]);
  });
}, 60_000);
