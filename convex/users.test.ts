/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { seedGymAndUser, insertUser } from "./testHelpers";

const modules = import.meta.glob("./**/*.ts");

// ── users.getMe ───────────────────────────────────────────────────────────────

describe("users.getMe", () => {
  test("returns the authenticated user", async () => {
    const t = convexTest(schema, modules);
    const { userId, identity } = await seedGymAndUser(t, { role: "athlete" });

    const me = await t.withIdentity(identity).query(api.users.getMe);
    expect(me?._id).toBe(userId);
    expect(me?.role).toBe("athlete");
  });

  test("returns null when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const me = await t.query(api.users.getMe);
    expect(me).toBeNull();
  });
});

// ── users.getMyStats ──────────────────────────────────────────────────────────

describe("users.getMyStats", () => {
  test("returns zeroed stats for new user", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t);

    const stats = await t.withIdentity(identity).query(api.users.getMyStats);
    expect(stats).toMatchObject({ classesAttended: 0, wodsLogged: 0, prsSet: 0 });
  });

  test("counts bookings and results and PRs", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const { userId: coachId } = await seedGymAndUser(t, { role: "coach" });

    // Add a booked class
    const classId = await t.run((ctx) =>
      ctx.db.insert("classes", { gymId, coachId, date: "2099-01-01", startTime: "09:00", capacity: 10, bookedCount: 1 })
    );
    await t.run((ctx) =>
      ctx.db.insert("bookings", { classId, userId, status: "booked", bookedAt: Date.now() })
    );

    // Add a WOD result
    const wodId = await t.run((ctx) =>
      ctx.db.insert("wods", { gymId, date: "2099-01-01", title: "T", description: "D", type: "Other", movements: [], createdBy: userId })
    );
    await t.run((ctx) =>
      ctx.db.insert("results", { wodId, userId, score: "10:00", rx: true, loggedAt: Date.now() })
    );

    // Add a PR
    await t.run((ctx) =>
      ctx.db.insert("personalRecords", { userId, movement: "Snatch", score: "100kg", setAt: Date.now() })
    );

    const stats = await t.withIdentity(identity).query(api.users.getMyStats);
    expect(stats?.classesAttended).toBe(1);
    expect(stats?.wodsLogged).toBe(1);
    expect(stats?.prsSet).toBe(1);
  });
});

// ── users.listMembers ─────────────────────────────────────────────────────────

describe("users.listMembers", () => {
  test("coach can list gym members", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "coach" });
    await insertUser(t, gymId, { role: "athlete", email: "a@test.com" });

    const members = await t.withIdentity(identity).query(api.users.listMembers);
    expect(members.length).toBeGreaterThanOrEqual(2); // coach + athlete
  });

  test("athlete cannot list members", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "athlete" });

    await expect(
      t.withIdentity(identity).query(api.users.listMembers)
    ).rejects.toThrow("Unauthorized");
  });

  test("members from other gyms are not listed", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "coach" });
    // Another gym + member
    const { gymId: gym2 } = await seedGymAndUser(t, { role: "coach" });
    await insertUser(t, gym2, { role: "athlete", email: "other@test.com" });

    const members = await t.withIdentity(identity).query(api.users.listMembers);
    const emails = members.map((m) => m.email);
    expect(emails).not.toContain("other@test.com");
  });
});

// ── users.setRole ─────────────────────────────────────────────────────────────

describe("users.setRole", () => {
  test("admin can change a user's role", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "admin" });
    const targetId = await insertUser(t, gymId, { role: "athlete", email: "athlete@test.com" });

    await t.withIdentity(identity).mutation(api.users.setRole, {
      userId: targetId,
      role: "coach",
    });

    const target = await t.run((ctx) => ctx.db.get(targetId));
    expect(target?.role).toBe("coach");
  });

  test("non-admin cannot change roles", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "coach" });
    const targetId = await insertUser(t, gymId, { role: "athlete" });

    await expect(
      t.withIdentity(identity).mutation(api.users.setRole, { userId: targetId, role: "coach" })
    ).rejects.toThrow("Only admins can change roles");
  });

  test("cannot change role of user in a different gym", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "admin" });
    const { gymId: gym2 } = await seedGymAndUser(t, { role: "coach" });
    const outsiderId = await insertUser(t, gym2, { role: "athlete" });

    await expect(
      t.withIdentity(identity).mutation(api.users.setRole, { userId: outsiderId, role: "coach" })
    ).rejects.toThrow("User not in your gym");
  });
});

// ── users.savePushToken ───────────────────────────────────────────────────────

describe("users.savePushToken", () => {
  test("saves push token for authenticated user", async () => {
    const t = convexTest(schema, modules);
    const { userId, identity } = await seedGymAndUser(t);

    await t.withIdentity(identity).mutation(api.users.savePushToken, {
      token: "ExponentPushToken[abc123]",
    });

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.pushToken).toBe("ExponentPushToken[abc123]");
  });
});

// ── users.promoteToCoach ──────────────────────────────────────────────────────

describe("users.promoteToCoach", () => {
  test("admin can promote athlete to coach", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "admin" });
    const athleteId = await insertUser(t, gymId, { role: "athlete" });

    await t.withIdentity(identity).mutation(api.users.promoteToCoach, { userId: athleteId });

    const user = await t.run((ctx) => ctx.db.get(athleteId));
    expect(user?.role).toBe("coach");
  });

  test("non-admin cannot promote", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "coach" });
    const athleteId = await insertUser(t, gymId, { role: "athlete" });

    await expect(
      t.withIdentity(identity).mutation(api.users.promoteToCoach, { userId: athleteId })
    ).rejects.toThrow("Unauthorized");
  });
});
