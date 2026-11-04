import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { foodSchema, profileSchema, roomSchema, scrapSchema, waterSchema } from "@/lib/server/schemas";
import { buildRoom } from "@/lib/rooms/templates";
import { emptySnapshot } from "@/lib/defaults";
import { dateKey } from "@/lib/time";

// The server-side end-to-end test sends synthetic data through the real import. Make sure that data is
// valid, so a failure on Preview always means a real problem and never a bad test fixture.
describe("e2e test fixtures", () => {
  const now = new Date().toISOString();
  const today = dateKey(new Date());
  it("rooms built from templates pass the import schema", () => {
    for (const r of [buildRoom("bedroom", "standard", "fr", false, "Chambre test"), buildRoom("garden", "cozy", "fr", false, "Jardin test"), buildRoom("cafe", "cozy", "fr")]) {
      expect(roomSchema.safeParse(r).success).toBe(true);
    }
  });
  it("food, water, scrapbook and profile fixtures are valid", () => {
    expect(foodSchema.safeParse({ id: randomUUID(), date: today, time: "12:00", meal: "lunch", name: "Plat 1", portion: "", calories: 100, notes: "", source: "manual", createdAt: now }).success).toBe(true);
    expect(waterSchema.safeParse({ id: randomUUID(), date: today, time: "10:00", amountMl: 250, createdAt: now }).success).toBe(true);
    expect(scrapSchema.safeParse({ id: randomUUID(), kind: "moment", title: "Souvenir test", body: "", emoji: "💗", color: "#FFD1E2", image: null, room: null, date: today, createdAt: now }).success).toBe(true);
    expect(profileSchema.safeParse({ ...emptySnapshot("fr").profile, worldName: "Monde test", onboarded: true }).success).toBe(true);
  });
});
