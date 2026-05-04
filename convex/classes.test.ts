/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { seedGymAndUser, insertClass, insertUser, insertWod } from "./testHelpers";

const modules = import.meta.glob("./**/*.ts");

// ── classes.create ────────────────────────────────────────────────────────────

describe("classes.create", () => {
  test("coach can create a class", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "coach" });

    const classId = await t.withIdentity(identity).mutation(api.classes.create, {
      date: "2099-09-01",
      startTime: "07:00",
      capacity: 15,
    });

    const cls = await t.run((ctx) => ctx.db.get(classId));
    expect(cls).toMatchObject({ gymId, date: "2099-09-01", capacity: 15, bookedCount: 0 });
  });

  test("admin must be coach-enabled to create a class as themselves", async () => {
    const t = convexTest(schema, modules);
    const { userId, identity } = await seedGymAndUser(t, { role: "admin" });

    await expect(
      t.withIdentity(identity).mutation(api.classes.create, {
        date: "2099-09-02",
        startTime: "08:00",
        capacity: 20,
      })
    ).rejects.toThrow("Coach not found");

    await t.run((ctx) => ctx.db.patch(userId, { canCoach: true }));

    const classId = await t.withIdentity(identity).mutation(api.classes.create, {
      date: "2099-09-02",
      startTime: "08:00",
      capacity: 20,
    });

    expect(classId).toBeTruthy();
  });

  test("admin can assign another admin marked as able to coach", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "admin" });
    const coachId = await t.run((ctx) =>
      ctx.db.insert("users", {
        gymId,
        name: "Owner Coach",
        email: "owner-coach@test.com",
        role: "admin",
        canCoach: true,
      })
    );

    const classId = await t.withIdentity(identity).mutation(api.classes.create, {
      date: "2099-09-02",
      startTime: "08:00",
      capacity: 20,
      coachId,
    });

    const cls = await t.run((ctx) => ctx.db.get(classId));
    expect(cls?.coachId).toBe(coachId);
  });

  test("admin can assign an active coach", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "admin" });
    const coachId = await insertUser(t, gymId, { role: "coach", email: "coach@test.com" });

    const classId = await t.withIdentity(identity).mutation(api.classes.create, {
      date: "2099-09-02",
      startTime: "08:00",
      capacity: 20,
      coachId,
    });

    const cls = await t.run((ctx) => ctx.db.get(classId));
    expect(cls?.coachId).toBe(coachId);
  });

  test("admin cannot assign an inactive coach", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "admin" });
    const coachId = await t.run((ctx) =>
      ctx.db.insert("users", {
        gymId,
        name: "Inactive Coach",
        email: "inactive@test.com",
        role: "coach",
        staffStatus: "inactive",
      })
    );

    await expect(
      t.withIdentity(identity).mutation(api.classes.create, {
        date: "2099-09-02",
        startTime: "08:00",
        capacity: 20,
        coachId,
      })
    ).rejects.toThrow("Coach not found");
  });

  test("athlete cannot create a class", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "athlete" });

    await expect(
      t.withIdentity(identity).mutation(api.classes.create, {
        date: "2099-09-03",
        startTime: "09:00",
        capacity: 10,
      })
    ).rejects.toThrow("Unauthorized");
  });

  test("class can be created with a WOD linked", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });
    const wodId = await insertWod(t, gymId, userId, "2099-09-04");

    const classId = await t.withIdentity(identity).mutation(api.classes.create, {
      date: "2099-09-04",
      startTime: "06:00",
      capacity: 12,
      wodId,
    });

    const cls = await t.run((ctx) => ctx.db.get(classId));
    expect(cls?.wodId).toBe(wodId);
  });

  test("class cannot be linked to a WOD from another gym", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "coach" });
    const { gymId: otherGymId, userId: otherUserId } = await seedGymAndUser(t, {
      role: "coach",
      email: "other-coach@test.com",
    });
    const foreignWodId = await insertWod(t, otherGymId, otherUserId, "2099-09-05");

    await expect(
      t.withIdentity(identity).mutation(api.classes.create, {
        date: "2099-09-05",
        startTime: "06:00",
        capacity: 12,
        wodId: foreignWodId,
      })
    ).rejects.toThrow("WOD not found");
  });
});

// ── classes.getByDate ─────────────────────────────────────────────────────────

describe("classes.getByDate", () => {
  test("returns classes for the given date sorted by time", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });

    await t.run((ctx) =>
      ctx.db.insert("classes", { gymId, coachId: userId, date: "2099-10-01", startTime: "09:00", capacity: 10, bookedCount: 0 })
    );
    await t.run((ctx) =>
      ctx.db.insert("classes", { gymId, coachId: userId, date: "2099-10-01", startTime: "06:00", capacity: 8, bookedCount: 0 })
    );

    const classes = await t.withIdentity(identity).query(api.classes.getByDate, { date: "2099-10-01" });
    expect(classes).toHaveLength(2);
    expect(classes[0].startTime).toBe("06:00");
    expect(classes[1].startTime).toBe("09:00");
  });

  test("returns empty array when no classes on that date", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t);

    const classes = await t.withIdentity(identity).query(api.classes.getByDate, { date: "2099-01-01" });
    expect(classes).toEqual([]);
  });

  test("does not return classes from other gyms", async () => {
    const t = convexTest(schema, modules);
    const { identity: identity1 } = await seedGymAndUser(t);
    const { gymId: gym2, userId: coach2 } = await seedGymAndUser(t, { role: "coach" });

    await insertClass(t, gym2, coach2, { date: "2099-10-10" });

    const classes = await t.withIdentity(identity1).query(api.classes.getByDate, { date: "2099-10-10" });
    expect(classes).toHaveLength(0);
  });
});

// ── classes.remove ────────────────────────────────────────────────────────────

describe("classes.remove", () => {
  test("coach can remove a class", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });
    const classId = await insertClass(t, gymId, userId);

    await t.withIdentity(identity).mutation(api.classes.remove, { id: classId });

    const cls = await t.run((ctx) => ctx.db.get(classId));
    expect(cls).toBeNull();
  });

  test("removing a class cancels all its bookings", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });
    const classId = await insertClass(t, gymId, userId);

    // Add two bookings
    const b1 = await t.run((ctx) =>
      ctx.db.insert("bookings", { classId, userId, status: "booked", bookedAt: Date.now() })
    );
    const b2 = await t.run((ctx) =>
      ctx.db.insert("bookings", { classId, userId, status: "waitlist", waitlistPosition: 1, bookedAt: Date.now() })
    );

    await t.withIdentity(identity).mutation(api.classes.remove, { id: classId });

    const booking1 = await t.run((ctx) => ctx.db.get(b1));
    const booking2 = await t.run((ctx) => ctx.db.get(b2));
    expect(booking1?.status).toBe("cancelled");
    expect(booking2?.status).toBe("cancelled");
  });

  test("athlete cannot remove a class", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t, { role: "coach" });
    const { identity: athleteIdentity } = await seedGymAndUser(t, { role: "athlete" });
    const classId = await insertClass(t, gymId, userId);

    await expect(
      t.withIdentity(athleteIdentity).mutation(api.classes.remove, { id: classId })
    ).rejects.toThrow();
  });
});

// ── classes.getUpcoming ───────────────────────────────────────────────────────

describe("classes.getUpcoming", () => {
  test("returns enriched class list with coachName", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });
    await insertClass(t, gymId, userId, { date: "2099-11-01" });

    const upcoming = await t.withIdentity(identity).query(api.classes.getUpcoming, {
      startDate: "2099-11-01",
      days: 1,
    });

    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].coachName).toBe("Test User");
  });
});
