/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { insertUser, seedGymAndUser } from "./testHelpers";

const modules = import.meta.glob("./**/*.ts");

describe("staff.list", () => {
  test("lists only admins and coaches for the caller's gym", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "admin" });
    await insertUser(t, gymId, { role: "coach", email: "coach@test.com", name: "Coach" });
    await insertUser(t, gymId, { role: "athlete", email: "athlete@test.com", name: "Athlete" });

    const staff = await t.withIdentity(identity).query(api.staff.list);

    expect(staff.map((member) => member.email)).toContain("coach@test.com");
    expect(staff.map((member) => member.email)).not.toContain("athlete@test.com");
    expect(staff.every((member) => member.staffStatus === "active")).toBe(true);
    expect(staff.find((member) => member.email === "coach@test.com")?.canCoach).toBe(true);
  });

  test("rejects coaches", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "coach" });

    await expect(t.withIdentity(identity).query(api.staff.list)).rejects.toThrow(
      "Only admins can manage staff"
    );
  });
});

describe("staff.updateProfile", () => {
  test("updates staff profile fields", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "admin" });
    const coachId = await insertUser(t, gymId, { role: "coach", email: "coach@test.com" });

    await t.withIdentity(identity).mutation(api.staff.updateProfile, {
      userId: coachId,
      role: "admin",
      staffStatus: "inactive",
      canCoach: true,
      staffTitle: "Head Coach",
      staffPhone: "555-123-4567",
      staffNotes: "CF-L2",
    });

    const coach = await t.run((ctx) => ctx.db.get(coachId));
    expect(coach?.role).toBe("admin");
    expect(coach?.staffStatus).toBe("inactive");
    expect(coach?.canCoach).toBe(true);
    expect(coach?.staffTitle).toBe("Head Coach");
  });

  test("prevents admins from deactivating themselves", async () => {
    const t = convexTest(schema, modules);
    const { userId, identity } = await seedGymAndUser(t, { role: "admin" });

    await expect(
      t.withIdentity(identity).mutation(api.staff.updateProfile, {
        userId,
        role: "admin",
        staffStatus: "inactive",
        canCoach: false,
      })
    ).rejects.toThrow("Cannot deactivate yourself");
  });
});
