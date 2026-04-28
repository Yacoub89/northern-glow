/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { seedGymAndUser, insertWod, insertUser } from "./testHelpers";

const modules = import.meta.glob("./**/*.ts");

// ── results.log ───────────────────────────────────────────────────────────────

describe("results.log", () => {
  test("creates a new result for a WOD", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const wodId = await insertWod(t, gymId, userId);

    const resultId = await t.withIdentity(identity).mutation(api.results.log, {
      wodId,
      score: "12:34",
      rx: true,
    });

    const result = await t.run((ctx) => ctx.db.get(resultId));
    expect(result).toMatchObject({ userId, wodId, score: "12:34", rx: true });
  });

  test("logging a second time updates the existing result", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const wodId = await insertWod(t, gymId, userId);

    const id1 = await t.withIdentity(identity).mutation(api.results.log, { wodId, score: "10:00", rx: false });
    const id2 = await t.withIdentity(identity).mutation(api.results.log, { wodId, score: "09:30", rx: true });

    // Same document, updated score
    expect(id1).toBe(id2);
    const result = await t.run((ctx) => ctx.db.get(id1));
    expect(result?.score).toBe("09:30");
    expect(result?.rx).toBe(true);
  });

  test("different users in the same gym have separate results for the same WOD", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: user1, identity: i1 } = await seedGymAndUser(t);
    const user2 = await insertUser(t, gymId, { email: "u2@test.com" });
    const i2 = { subject: `${user2}|session` };
    const wodId = await insertWod(t, gymId, user1);

    await t.withIdentity(i1).mutation(api.results.log, { wodId, score: "10:00", rx: true });
    await t.withIdentity(i2).mutation(api.results.log, { wodId, score: "11:00", rx: false });

    const stats = await t.withIdentity(i1).query(api.results.getWodStats, { wodId });
    expect(stats.count).toBe(2);
  });

  test("user from another gym cannot log a result against a foreign WOD", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const wodId = await insertWod(t, gymId, userId);

    const { identity: outsider } = await seedGymAndUser(t, { email: "outsider@test.com" });
    await expect(
      t.withIdentity(outsider).mutation(api.results.log, { wodId, score: "10:00", rx: true })
    ).rejects.toThrow("WOD not found");
  });

  test("unauthenticated user is rejected", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const wodId = await insertWod(t, gymId, userId);

    await expect(
      t.mutation(api.results.log, { wodId, score: "10:00", rx: true })
    ).rejects.toThrow("Unauthenticated");
  });
});

// ── results.getByWod ──────────────────────────────────────────────────────────

describe("results.getByWod", () => {
  test("returns the user's result for the WOD", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const wodId = await insertWod(t, gymId, userId);

    await t.withIdentity(identity).mutation(api.results.log, { wodId, score: "8:22", rx: true });

    const result = await t.withIdentity(identity).query(api.results.getByWod, { wodId });
    expect(result?.score).toBe("8:22");
    expect(result?.userId).toBe(userId);
  });

  test("returns null when user has no result for the WOD", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const wodId = await insertWod(t, gymId, userId);

    const result = await t.withIdentity(identity).query(api.results.getByWod, { wodId });
    expect(result).toBeNull();
  });
});

// ── results.getMyResults ──────────────────────────────────────────────────────

describe("results.getMyResults", () => {
  test("returns enriched results with WOD data", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const wodId = await insertWod(t, gymId, userId);

    await t.withIdentity(identity).mutation(api.results.log, { wodId, score: "15:00", rx: false });

    const results = await t.withIdentity(identity).query(api.results.getMyResults);
    expect(results).toHaveLength(1);
    expect(results[0].wod?.title).toBe("Fran");
    expect(results[0].score).toBe("15:00");
  });

  test("returns empty array when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const results = await t.query(api.results.getMyResults);
    expect(results).toEqual([]);
  });

  test("only returns the authenticated user's own results", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: user1, identity: i1 } = await seedGymAndUser(t);
    const { identity: i2 } = await seedGymAndUser(t);
    const wodId = await insertWod(t, gymId, user1);

    await t.withIdentity(i1).mutation(api.results.log, { wodId, score: "10:00", rx: true });

    const results = await t.withIdentity(i2).query(api.results.getMyResults);
    expect(results).toHaveLength(0);
  });
});

// ── results.getWodStats ───────────────────────────────────────────────────────

describe("results.getWodStats", () => {
  test("returns count and all scores for a WOD", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: user1, identity: i1 } = await seedGymAndUser(t);
    const user2 = await insertUser(t, gymId, { email: "u2@test.com" });
    const i2 = { subject: `${user2}|session` };
    const wodId = await insertWod(t, gymId, user1);

    await t.withIdentity(i1).mutation(api.results.log, { wodId, score: "10:00", rx: true });
    await t.withIdentity(i2).mutation(api.results.log, { wodId, score: "11:30", rx: false });

    const stats = await t.withIdentity(i1).query(api.results.getWodStats, { wodId });
    expect(stats.count).toBe(2);
    expect(stats.scores).toContain("10:00");
    expect(stats.scores).toContain("11:30");
  });

  test("returns zero count for WOD with no results", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const wodId = await insertWod(t, gymId, userId);

    const stats = await t.withIdentity(identity).query(api.results.getWodStats, { wodId });
    expect(stats.count).toBe(0);
    expect(stats.scores).toEqual([]);
  });

  test("returns zero stats for a WOD in another gym", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const wodId = await insertWod(t, gymId, userId);
    await t.run((ctx) =>
      ctx.db.insert("results", {
        gymId,
        wodId,
        userId,
        score: "10:00",
        rx: true,
        loggedAt: Date.now(),
      })
    );

    const { identity: outsider } = await seedGymAndUser(t, { email: "outsider@test.com" });
    const stats = await t.withIdentity(outsider).query(api.results.getWodStats, { wodId });
    expect(stats.count).toBe(0);
    expect(stats.scores).toEqual([]);
  });
});
