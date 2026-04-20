/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { seedGymAndUser } from "./testHelpers";

const modules = import.meta.glob("./**/*.ts");

// ── personalRecords.upsert ────────────────────────────────────────────────────

describe("personalRecords.upsert", () => {
  test("creates a new PR for a movement", async () => {
    const t = convexTest(schema, modules);
    const { userId, identity } = await seedGymAndUser(t);

    await t.withIdentity(identity).mutation(api.personalRecords.upsert, {
      movement: "Back Squat",
      score: "140kg",
    });

    const prs = await t.withIdentity(identity).query(api.personalRecords.getMyPRs);
    expect(prs).toHaveLength(1);
    expect(prs[0]).toMatchObject({ userId, movement: "Back Squat", score: "140kg" });
  });

  test("updates score when PR for movement already exists", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t);

    await t.withIdentity(identity).mutation(api.personalRecords.upsert, { movement: "Clean", score: "80kg" });
    await t.withIdentity(identity).mutation(api.personalRecords.upsert, { movement: "Clean", score: "90kg" });

    const prs = await t.withIdentity(identity).query(api.personalRecords.getMyPRs);
    expect(prs).toHaveLength(1);
    expect(prs[0].score).toBe("90kg");
  });

  test("different movements are stored as separate PRs", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t);

    await t.withIdentity(identity).mutation(api.personalRecords.upsert, { movement: "Snatch", score: "70kg" });
    await t.withIdentity(identity).mutation(api.personalRecords.upsert, { movement: "Clean & Jerk", score: "90kg" });

    const prs = await t.withIdentity(identity).query(api.personalRecords.getMyPRs);
    expect(prs).toHaveLength(2);
  });

  test("unauthenticated user is rejected", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.personalRecords.upsert, { movement: "Deadlift", score: "200kg" })
    ).rejects.toThrow("Unauthenticated");
  });
});

// ── personalRecords.getMyPRs ──────────────────────────────────────────────────

describe("personalRecords.getMyPRs", () => {
  test("returns only the authenticated user's PRs", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: user1 } = await seedGymAndUser(t);
    const { identity: identity2 } = await seedGymAndUser(t);

    // Insert a PR directly for user1
    await t.run((ctx) =>
      ctx.db.insert("personalRecords", { userId: user1, movement: "Press", score: "60kg", setAt: Date.now() })
    );

    // Query as user2 — should not see user1's PRs
    const prs = await t.withIdentity(identity2).query(api.personalRecords.getMyPRs);
    expect(prs).toHaveLength(0);
  });

  test("returns empty array for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const prs = await t.query(api.personalRecords.getMyPRs);
    expect(prs).toEqual([]);
  });
});

// ── personalRecords.remove ────────────────────────────────────────────────────

describe("personalRecords.remove", () => {
  test("user can delete their own PR", async () => {
    const t = convexTest(schema, modules);
    const { userId, identity } = await seedGymAndUser(t);

    const prId = await t.run((ctx) =>
      ctx.db.insert("personalRecords", { userId, movement: "Thruster", score: "50kg", setAt: Date.now() })
    );

    await t.withIdentity(identity).mutation(api.personalRecords.remove, { id: prId });

    const pr = await t.run((ctx) => ctx.db.get(prId));
    expect(pr).toBeNull();
  });

  test("user cannot delete another user's PR", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: user1 } = await seedGymAndUser(t);
    const { identity: identity2 } = await seedGymAndUser(t);

    const prId = await t.run((ctx) =>
      ctx.db.insert("personalRecords", { userId: user1, movement: "Row", score: "1:30/500m", setAt: Date.now() })
    );

    await expect(
      t.withIdentity(identity2).mutation(api.personalRecords.remove, { id: prId })
    ).rejects.toThrow("Unauthorized");
  });
});
