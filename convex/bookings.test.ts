/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import {
  seedGymAndUser,
  insertClass,
  insertMembership,
  insertUser,
} from "./testHelpers";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

// ── bookings.book ─────────────────────────────────────────────────────────────

describe("bookings.book", () => {
  test("athlete with active membership can book a class", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "athlete" });
    await insertMembership(t, userId, gymId);
    const { userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    const classId = await insertClass(t, gymId, coachId);

    const result = await t.withIdentity(identity).mutation(api.bookings.book, { classId });
    expect(result.status).toBe("booked");

    const cls = await t.run((ctx) => ctx.db.get(classId));
    expect(cls?.bookedCount).toBe(1);
  });

  test("coach can book without a membership", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });
    const classId = await insertClass(t, gymId, userId);

    const result = await t.withIdentity(identity).mutation(api.bookings.book, { classId });
    expect(result.status).toBe("booked");
  });

  test("athlete without membership cannot book", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    const { userId: athleteId, identity } = await seedGymAndUser(t, { role: "athlete" });
    // Move athlete into the same gym so the class is reachable
    await t.run((ctx) => ctx.db.patch(athleteId, { gymId }));
    const classId = await insertClass(t, gymId, coachId);

    await expect(
      t.withIdentity(identity).mutation(api.bookings.book, { classId })
    ).rejects.toThrow("An active membership is required to book classes");
  });

  test("booking a full class puts user on waitlist", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    // Class is already full (capacity 1, bookedCount 1)
    const classId = await insertClass(t, gymId, coachId, { capacity: 1, bookedCount: 1 });

    const { userId: athleteId, identity } = await seedGymAndUser(t, { role: "athlete" });
    // Move athlete into the same gym
    await t.run((ctx) => ctx.db.patch(athleteId, { gymId }));
    await insertMembership(t, athleteId, gymId);

    const result = await t.withIdentity(identity).mutation(api.bookings.book, { classId });
    expect(result.status).toBe("waitlist");
  });

  test("already-booked user cannot double-book", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "athlete" });
    await insertMembership(t, userId, gymId);
    const { userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    const classId = await insertClass(t, gymId, coachId);

    await t.withIdentity(identity).mutation(api.bookings.book, { classId });

    await expect(
      t.withIdentity(identity).mutation(api.bookings.book, { classId })
    ).rejects.toThrow("Already booked for this class");
  });

  test("twice_weekly plan enforces 2 classes/week limit", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "athlete" });
    await insertMembership(t, userId, gymId, { plan: "twice_weekly" });
    const { userId: coachId } = await seedGymAndUser(t, { role: "coach" });

    // Book 2 classes in the same week
    const class1 = await insertClass(t, gymId, coachId, { date: "2099-06-02" }); // Monday
    const class2 = await insertClass(t, gymId, coachId, { date: "2099-06-03" }); // Tuesday
    const class3 = await insertClass(t, gymId, coachId, { date: "2099-06-04" }); // Wednesday

    await t.withIdentity(identity).mutation(api.bookings.book, { classId: class1 });
    await t.withIdentity(identity).mutation(api.bookings.book, { classId: class2 });

    await expect(
      t.withIdentity(identity).mutation(api.bookings.book, { classId: class3 })
    ).rejects.toThrow("You've reached your 2 classes/week limit for this week");
  });

  test("class from a different gym cannot be booked", async () => {
    const t = convexTest(schema, modules);
    const { gymId: gym1, userId, identity } = await seedGymAndUser(t, { role: "athlete" });
    await insertMembership(t, userId, gym1);
    const { gymId: gym2, userId: coach2 } = await seedGymAndUser(t, { role: "coach" });
    const classId = await insertClass(t, gym2, coach2);

    await expect(
      t.withIdentity(identity).mutation(api.bookings.book, { classId })
    ).rejects.toThrow("Class not found");
  });
});

// ── bookings.cancel ───────────────────────────────────────────────────────────

describe("bookings.cancel", () => {
  test("cancelling a booked class decrements bookedCount", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "athlete" });
    await insertMembership(t, userId, gymId);
    const { userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    const classId = await insertClass(t, gymId, coachId);

    await t.withIdentity(identity).mutation(api.bookings.book, { classId });
    await t.withIdentity(identity).mutation(api.bookings.cancel, { classId });

    const cls = await t.run((ctx) => ctx.db.get(classId));
    expect(cls?.bookedCount).toBe(0);

    const booking = await t.run((ctx) =>
      ctx.db
        .query("bookings")
        .withIndex("by_class_user", (q) => q.eq("classId", classId).eq("userId", userId))
        .first()
    );
    expect(booking?.status).toBe("cancelled");
  });

  test("cancelling promotes first waitlisted user", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    // Class with capacity 1, already 1 booked
    const classId = await insertClass(t, gymId, coachId, { capacity: 1 });

    // User A books the class (takes the spot)
    const { userId: userA, identity: identityA } = await seedGymAndUser(t, { role: "athlete" });
    await t.run((ctx) => ctx.db.patch(userA, { gymId }));
    await insertMembership(t, userA, gymId);
    await t.withIdentity(identityA).mutation(api.bookings.book, { classId });

    // User B goes to waitlist
    const { userId: userB, identity: identityB } = await seedGymAndUser(t, { role: "athlete" });
    await t.run((ctx) => ctx.db.patch(userB, { gymId }));
    await insertMembership(t, userB, gymId);
    await t.withIdentity(identityB).mutation(api.bookings.book, { classId });

    // Verify waitlist
    const waitlistBefore = await t.run((ctx) =>
      ctx.db.query("bookings").withIndex("by_class_user", (q) => q.eq("classId", classId).eq("userId", userB)).first()
    );
    expect(waitlistBefore?.status).toBe("waitlist");

    // User A cancels → User B promoted
    await t.withIdentity(identityA).mutation(api.bookings.cancel, { classId });

    const waitlistAfter = await t.run((ctx) =>
      ctx.db.query("bookings").withIndex("by_class_user", (q) => q.eq("classId", classId).eq("userId", userB)).first()
    );
    expect(waitlistAfter?.status).toBe("booked");
  });

  test("no booking found throws", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    const { identity } = await seedGymAndUser(t, { role: "athlete" });
    const classId = await insertClass(t, gymId, coachId);

    await expect(
      t.withIdentity(identity).mutation(api.bookings.cancel, { classId })
    ).rejects.toThrow("No booking found");
  });
});

// ── bookings.getUserBookingForClass ───────────────────────────────────────────

describe("bookings.getUserBookingForClass", () => {
  test("returns booking for authenticated user", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "athlete" });
    await insertMembership(t, userId, gymId);
    const { userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    const classId = await insertClass(t, gymId, coachId);
    await t.withIdentity(identity).mutation(api.bookings.book, { classId });

    const booking = await t
      .withIdentity(identity)
      .query(api.bookings.getUserBookingForClass, { classId });

    expect(booking?.userId).toBe(userId);
    expect(booking?.status).toBe("booked");
  });

  test("returns null when not booked", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId, identity } = await seedGymAndUser(t, { role: "coach" });
    const classId = await insertClass(t, gymId, coachId);

    const booking = await t
      .withIdentity(identity)
      .query(api.bookings.getUserBookingForClass, { classId });

    expect(booking).toBeNull();
  });
});

// ── bookings.checkIn ──────────────────────────────────────────────────────────

describe("bookings.checkIn", () => {
  test("coach can check in an athlete", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId, identity: coachIdentity } = await seedGymAndUser(t, { role: "coach" });
    const { userId: athleteId } = await seedGymAndUser(t, { role: "athlete" });
    await t.run((ctx) => ctx.db.patch(athleteId, { gymId }));
    await insertMembership(t, athleteId, gymId);
    const classId = await insertClass(t, gymId, coachId);

    const bookingId = await t.run((ctx) =>
      ctx.db.insert("bookings", {
        classId,
        userId: athleteId,
        status: "booked",
        bookedAt: Date.now(),
      })
    );

    await t.withIdentity(coachIdentity).mutation(api.bookings.checkIn, { bookingId });

    const booking = await t.run((ctx) => ctx.db.get(bookingId));
    expect(booking?.checkedInAt).toBeTruthy();
  });

  test("athlete cannot check in", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "athlete" });
    await insertMembership(t, userId, gymId);
    const { userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    const classId = await insertClass(t, gymId, coachId);

    const bookingId = await t.run((ctx) =>
      ctx.db.insert("bookings", {
        classId,
        userId,
        status: "booked",
        bookedAt: Date.now(),
      })
    );

    await expect(
      t.withIdentity(identity).mutation(api.bookings.checkIn, { bookingId })
    ).rejects.toThrow("Unauthorized");
  });

  test("coach cannot check in a booking from another gym", async () => {
    const t = convexTest(schema, modules);
    const { identity: coachIdentity } = await seedGymAndUser(t, {
      role: "coach",
      email: "coach-a@test.com",
    });
    const { gymId: otherGymId, userId: otherCoachId } = await seedGymAndUser(t, {
      role: "coach",
      email: "coach-b@test.com",
    });
    const { userId: athleteId } = await seedGymAndUser(t, {
      role: "athlete",
      email: "athlete-b@test.com",
    });
    await t.run((ctx) => ctx.db.patch(athleteId, { gymId: otherGymId }));
    const classId = await insertClass(t, otherGymId, otherCoachId);

    const bookingId = await t.run((ctx) =>
      ctx.db.insert("bookings", {
        classId,
        userId: athleteId,
        status: "booked",
        bookedAt: Date.now(),
      })
    );

    await expect(
      t.withIdentity(coachIdentity).mutation(api.bookings.checkIn, { bookingId })
    ).rejects.toThrow("Booking not found");
  });
});

// ── bookings.uncheckIn ───────────────────────────────────────────────────────

describe("bookings.uncheckIn", () => {
  test("coach cannot uncheck a booking from another gym", async () => {
    const t = convexTest(schema, modules);
    const { identity: coachIdentity } = await seedGymAndUser(t, {
      role: "coach",
      email: "coach-a@test.com",
    });
    const { gymId: otherGymId, userId: otherCoachId } = await seedGymAndUser(t, {
      role: "coach",
      email: "coach-b@test.com",
    });
    const { userId: athleteId } = await seedGymAndUser(t, {
      role: "athlete",
      email: "athlete-b@test.com",
    });
    await t.run((ctx) => ctx.db.patch(athleteId, { gymId: otherGymId }));
    const classId = await insertClass(t, otherGymId, otherCoachId);

    const bookingId = await t.run((ctx) =>
      ctx.db.insert("bookings", {
        classId,
        userId: athleteId,
        status: "booked",
        bookedAt: Date.now(),
        checkedInAt: Date.now(),
      })
    );

    await expect(
      t.withIdentity(coachIdentity).mutation(api.bookings.uncheckIn, { bookingId })
    ).rejects.toThrow("Booking not found");
  });
});

// ── bookings.getClassRoster ───────────────────────────────────────────────────

describe("bookings.getClassRoster", () => {
  test("coach can view class roster", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId, identity } = await seedGymAndUser(t, { role: "coach" });
    const classId = await insertClass(t, gymId, coachId);

    await t.run((ctx) =>
      ctx.db.insert("bookings", { classId, userId: coachId, status: "booked", bookedAt: Date.now() })
    );

    const roster = await t
      .withIdentity(identity)
      .query(api.bookings.getClassRoster, { classId });

    expect(roster).toHaveLength(1);
    expect(roster[0].userId).toBe(coachId);
  });

  test("athlete cannot view the roster", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    const { identity } = await seedGymAndUser(t, { role: "athlete" });
    const classId = await insertClass(t, gymId, coachId);

    await expect(
      t.withIdentity(identity).query(api.bookings.getClassRoster, { classId })
    ).rejects.toThrow("Unauthorized");
  });
});
