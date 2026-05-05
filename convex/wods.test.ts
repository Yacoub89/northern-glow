/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { seedGymAndUser, insertWod } from "./testHelpers";

const modules = import.meta.glob("./**/*.ts");

// ── wods.create ───────────────────────────────────────────────────────────────

describe("wods.create", () => {
  test("coach can create a WOD", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });

    const wodId = await t.withIdentity(identity).mutation(api.wods.create, {
      date: "2099-07-04",
      title: "Cindy",
      description: "20 min AMRAP: 5 pull-ups, 10 push-ups, 15 squats",
      type: "AMRAP",
      movements: ["Pull-up", "Push-up", "Air Squat"],
    });

    const wod = await t.run((ctx) => ctx.db.get(wodId));
    expect(wod).toMatchObject({ title: "Cindy", gymId, type: "AMRAP" });
  });

  test("admin can create a WOD", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "admin" });

    const wodId = await t.withIdentity(identity).mutation(api.wods.create, {
      date: "2099-07-05",
      title: "Diane",
      description: "21-15-9 DL & HSPU",
      type: "ForTime",
      movements: ["Deadlift", "HSPU"],
    });

    expect(wodId).toBeTruthy();
  });

  test("athlete cannot create a WOD", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "athlete" });

    await expect(
      t.withIdentity(identity).mutation(api.wods.create, {
        date: "2099-07-06",
        title: "Elizabeth",
        description: "21-15-9 Cleans & Ring Dips",
        type: "ForTime",
        movements: ["Clean", "Ring Dip"],
      })
    ).rejects.toThrow("Unauthorized");
  });

  test("creating a duplicate date throws", async () => {
    const t = convexTest(schema, modules);
    const { userId, identity } = await seedGymAndUser(t, { role: "coach" });
    await insertWod(t, (await t.run((ctx) => ctx.db.get(userId)))!.gymId!, userId, "2099-07-10");

    await expect(
      t.withIdentity(identity).mutation(api.wods.create, {
        date: "2099-07-10",
        title: "Duplicate",
        description: "...",
        type: "Other",
        movements: [],
      })
    ).rejects.toThrow("A WOD already exists for this date");
  });

  test("coach can create separate programs on the same date", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });
    await insertWod(t, gymId, userId, "2099-07-11");

    await t.withIdentity(identity).mutation(api.wods.create, {
      date: "2099-07-11",
      program: "OC-Flex",
      title: "Flex Day",
      description: "Bodyweight conditioning",
      type: "AMRAP",
      movements: ["Burpee"],
    });

    const defaultWod = await t.withIdentity(identity).query(api.wods.getByDate, {
      date: "2099-07-11",
      program: "OC-60",
    });
    const flexWod = await t.withIdentity(identity).query(api.wods.getByDate, {
      date: "2099-07-11",
      program: "OC-Flex",
    });

    expect(defaultWod?.title).toBe("Fran");
    expect(flexWod?.title).toBe("Flex Day");
  });
});

// ── wods.getByDate ────────────────────────────────────────────────────────────

describe("wods.getByDate", () => {
  test("returns WOD for that date", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    await insertWod(t, gymId, userId, "2099-08-01");

    const wod = await t.withIdentity(identity).query(api.wods.getByDate, { date: "2099-08-01" });
    expect(wod?.title).toBe("Fran");
  });

  test("returns null when no WOD on that date", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t);

    const wod = await t.withIdentity(identity).query(api.wods.getByDate, { date: "2099-01-01" });
    expect(wod).toBeNull();
  });
});

// ── wods.getById ──────────────────────────────────────────────────────────────

describe("wods.getById", () => {
  test("returns WOD belonging to user's gym", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const wodId = await insertWod(t, gymId, userId);

    const wod = await t.withIdentity(identity).query(api.wods.getById, { id: wodId });
    expect(wod?._id).toBe(wodId);
  });

  test("returns null for WOD in a different gym", async () => {
    const t = convexTest(schema, modules);
    const { identity: identity1 } = await seedGymAndUser(t);
    const { gymId: gym2, userId: user2 } = await seedGymAndUser(t);
    const wodId = await insertWod(t, gym2, user2); // belongs to gym2

    const wod = await t.withIdentity(identity1).query(api.wods.getById, { id: wodId });
    expect(wod).toBeNull();
  });
});

// ── wods.getSchedule ──────────────────────────────────────────────────────────

describe("wods.getSchedule", () => {
  test("returns schedule with nulls for missing days", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    await insertWod(t, gymId, userId, "2099-09-01");

    const schedule = await t
      .withIdentity(identity)
      .query(api.wods.getSchedule, { startDate: "2099-09-01", days: 3 });

    expect(schedule).toHaveLength(3);
    expect(schedule[0].wod?.title).toBe("Fran");
    expect(schedule[1].wod).toBeNull();
    expect(schedule[2].wod).toBeNull();
  });
});

// ── wods.update ───────────────────────────────────────────────────────────────

describe("wods.update", () => {
  test("coach can update a WOD's title", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });
    const wodId = await insertWod(t, gymId, userId);

    await t.withIdentity(identity).mutation(api.wods.update, { id: wodId, title: "Annie" });

    const wod = await t.run((ctx) => ctx.db.get(wodId));
    expect(wod?.title).toBe("Annie");
  });

  test("coach can clear optional WOD metadata", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });
    const wodId = await insertWod(t, gymId, userId);
    await t.run((ctx) =>
      ctx.db.patch(wodId, {
        scalingNotes: "Use ring rows",
        accessLevel: "ADVANCED",
        parts: [
          {
            label: "A",
            name: "METCON",
            type: "AMRAP",
            description: "10 burpees",
          },
        ],
      })
    );

    await t.withIdentity(identity).mutation(api.wods.update, {
      id: wodId,
      scalingNotes: null,
      accessLevel: null,
      parts: null,
    });

    const wod = await t.run((ctx) => ctx.db.get(wodId));
    expect(wod?.scalingNotes).toBeUndefined();
    expect(wod?.accessLevel).toBeUndefined();
    expect(wod?.parts).toBeUndefined();
  });

  test("updating to a date that conflicts throws", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });
    const wod1 = await insertWod(t, gymId, userId, "2099-10-01");
    await insertWod(t, gymId, userId, "2099-10-02");

    await expect(
      t.withIdentity(identity).mutation(api.wods.update, { id: wod1, date: "2099-10-02" })
    ).rejects.toThrow("A WOD already exists for that date");
  });

  test("athlete cannot update a WOD", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t, { role: "coach" });
    const { identity: athleteIdentity } = await seedGymAndUser(t);
    const wodId = await insertWod(t, gymId, userId);

    // Athlete is in a different gym — still tests the Unauthorized path
    await expect(
      t.withIdentity(athleteIdentity).mutation(api.wods.update, { id: wodId, title: "Hack" })
    ).rejects.toThrow("Unauthorized");
  });
});

// ── wods.importMany ───────────────────────────────────────────────────────────

describe("wods.importMany", () => {
  test("coach can import WODs and skips existing dates by default", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });
    await insertWod(t, gymId, userId, "2099-11-01");

    const result = await t.withIdentity(identity).mutation(api.wods.importMany, {
      wods: [
        {
          date: "2099-11-01",
          title: "Imported Duplicate",
          description: "Should skip",
          type: "Other",
          movements: [],
        },
        {
          date: "2099-11-02",
          title: "Imported New",
          description: "10 min AMRAP",
          type: "AMRAP",
          movements: ["Burpee"],
        },
      ],
    });

    expect(result).toEqual({ created: 1, updated: 0, skipped: 1 });

    const newWod = await t.withIdentity(identity).query(api.wods.getByDate, { date: "2099-11-02" });
    expect(newWod?.title).toBe("Imported New");
  });

  test("admin can overwrite existing imported dates", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "admin" });
    await insertWod(t, gymId, userId, "2099-11-03");

    const result = await t.withIdentity(identity).mutation(api.wods.importMany, {
      overwrite: true,
      wods: [
        {
          date: "2099-11-03",
          title: "Replacement",
          description: "For time",
          type: "ForTime",
          movements: ["Run"],
        },
      ],
    });

    expect(result).toEqual({ created: 0, updated: 1, skipped: 0 });

    const wod = await t.withIdentity(identity).query(api.wods.getByDate, { date: "2099-11-03" });
    expect(wod?.title).toBe("Replacement");
  });

  test("athlete cannot import WODs", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "athlete" });

    await expect(
      t.withIdentity(identity).mutation(api.wods.importMany, {
        wods: [
          {
            date: "2099-11-04",
            title: "Nope",
            description: "Nope",
            type: "Other",
            movements: [],
          },
        ],
      })
    ).rejects.toThrow("Unauthorized");
  });
});
