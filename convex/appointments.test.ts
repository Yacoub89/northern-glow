/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { seedGymAndUser } from "./testHelpers";

const modules = import.meta.glob("./**/*.ts");

// ── appointments.addAvailability ──────────────────────────────────────────────

describe("appointments.addAvailability", () => {
  test("coach can add an availability slot", async () => {
    const t = convexTest(schema, modules);
    const { userId, identity } = await seedGymAndUser(t, { role: "coach" });

    await t.withIdentity(identity).mutation(api.appointments.addAvailability, {
      dayOfWeek: 1, // Monday
      startTime: "09:00",
      durationMinutes: 60,
    });

    const slots = await t.withIdentity(identity).query(api.appointments.getMyAvailability);
    expect(slots).toHaveLength(1);
    expect(slots[0].coachId).toBe(userId);
    expect(slots[0].startTime).toBe("09:00");
  });

  test("adding a duplicate slot throws", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "coach" });

    await t.withIdentity(identity).mutation(api.appointments.addAvailability, {
      dayOfWeek: 2,
      startTime: "10:00",
      durationMinutes: 45,
    });

    await expect(
      t.withIdentity(identity).mutation(api.appointments.addAvailability, {
        dayOfWeek: 2,
        startTime: "10:00",
        durationMinutes: 45,
      })
    ).rejects.toThrow("Slot already exists");
  });

  test("athlete cannot add availability", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "athlete" });

    await expect(
      t.withIdentity(identity).mutation(api.appointments.addAvailability, {
        dayOfWeek: 3,
        startTime: "08:00",
        durationMinutes: 60,
      })
    ).rejects.toThrow("Unauthorized");
  });
});

// ── appointments.removeAvailability ──────────────────────────────────────────

describe("appointments.removeAvailability", () => {
  test("coach can remove their own availability slot", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });

    const slotId = await t.run((ctx) =>
      ctx.db.insert("coachAvailability", {
        gymId,
        coachId: userId,
        dayOfWeek: 1,
        startTime: "07:00",
        durationMinutes: 60,
      })
    );

    await t.withIdentity(identity).mutation(api.appointments.removeAvailability, {
      availabilityId: slotId,
    });

    const slot = await t.run((ctx) => ctx.db.get(slotId));
    expect(slot).toBeNull();
  });

  test("coach cannot remove another coach's slot", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coach1 } = await seedGymAndUser(t, { role: "coach" });
    const { identity: identity2 } = await seedGymAndUser(t, { role: "coach" });

    const slotId = await t.run((ctx) =>
      ctx.db.insert("coachAvailability", {
        gymId,
        coachId: coach1,
        dayOfWeek: 2,
        startTime: "08:00",
        durationMinutes: 60,
      })
    );

    await expect(
      t.withIdentity(identity2).mutation(api.appointments.removeAvailability, {
        availabilityId: slotId,
      })
    ).rejects.toThrow("Unauthorized");
  });
});

// ── appointments.getCoachAvailableSlots ───────────────────────────────────────

describe("appointments.getCoachAvailableSlots", () => {
  test("returns available slots for the coach on that day", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId, identity } = await seedGymAndUser(t, { role: "coach" });

    // 2099-06-02 is a Tuesday (dayOfWeek = 2)
    await t.withIdentity(identity).mutation(api.appointments.addAvailability, {
      dayOfWeek: 2,
      startTime: "09:00",
      durationMinutes: 60,
    });

    // Query as the coach (same gym — requireAuth passes)
    const slots = await t
      .withIdentity(identity)
      .query(api.appointments.getCoachAvailableSlots, { coachId, date: "2099-06-02" });

    expect(slots).toHaveLength(1);
    expect(slots[0].startTime).toBe("09:00");
  });

  test("booked slot is not returned", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId, identity } = await seedGymAndUser(t, { role: "coach" });

    // 2099-06-02 is a Tuesday (dayOfWeek = 2)
    await t.withIdentity(identity).mutation(api.appointments.addAvailability, {
      dayOfWeek: 2,
      startTime: "09:00",
      durationMinutes: 60,
    });

    // Insert a confirmed appointment at 09:00 on 2099-06-02 (Tuesday)
    const { userId: athleteId } = await seedGymAndUser(t, { role: "athlete" });
    await t.run((ctx) => ctx.db.patch(athleteId, { gymId }));
    await t.run((ctx) =>
      ctx.db.insert("appointments", {
        gymId,
        coachId,
        athleteId,
        date: "2099-06-02",
        startTime: "09:00",
        durationMinutes: 60,
        status: "confirmed",
      })
    );

    const slots = await t
      .withIdentity(identity)
      .query(api.appointments.getCoachAvailableSlots, { coachId, date: "2099-06-02" });

    expect(slots).toHaveLength(0);
  });
});

// ── appointments.book ─────────────────────────────────────────────────────────

describe("appointments.book", () => {
  test("athlete can book a 1-on-1 with a coach", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    const { userId: athleteId, identity } = await seedGymAndUser(t, { role: "athlete" });
    await t.run((ctx) => ctx.db.patch(athleteId, { gymId }));

    await t.withIdentity(identity).mutation(api.appointments.book, {
      coachId,
      date: "2099-07-01",
      startTime: "10:00",
      durationMinutes: 60,
    });

    const appt = await t.run((ctx) =>
      ctx.db
        .query("appointments")
        .withIndex("by_coach_date", (q) => q.eq("coachId", coachId).eq("date", "2099-07-01"))
        .first()
    );
    expect(appt?.athleteId).toBe(athleteId);
    expect(appt?.status).toBe("confirmed");
  });

  test("double-booking the same slot throws", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    const { userId: athlete1, identity: i1 } = await seedGymAndUser(t, { role: "athlete" });
    const { userId: athlete2, identity: i2 } = await seedGymAndUser(t, { role: "athlete" });
    await t.run((ctx) => ctx.db.patch(athlete1, { gymId }));
    await t.run((ctx) => ctx.db.patch(athlete2, { gymId }));

    await t.withIdentity(i1).mutation(api.appointments.book, {
      coachId,
      date: "2099-07-02",
      startTime: "11:00",
      durationMinutes: 60,
    });

    await expect(
      t.withIdentity(i2).mutation(api.appointments.book, {
        coachId,
        date: "2099-07-02",
        startTime: "11:00",
        durationMinutes: 60,
      })
    ).rejects.toThrow("This slot has already been booked");
  });

  test("same athlete cannot book coach twice on same day", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    const { userId: athleteId, identity } = await seedGymAndUser(t, { role: "athlete" });
    await t.run((ctx) => ctx.db.patch(athleteId, { gymId }));

    await t.withIdentity(identity).mutation(api.appointments.book, {
      coachId, date: "2099-07-03", startTime: "09:00", durationMinutes: 60,
    });

    await expect(
      t.withIdentity(identity).mutation(api.appointments.book, {
        coachId, date: "2099-07-03", startTime: "10:00", durationMinutes: 60,
      })
    ).rejects.toThrow("You already have an appointment with this coach on this day");
  });
});

// ── appointments.cancel ───────────────────────────────────────────────────────

describe("appointments.cancel", () => {
  test("athlete can cancel their own appointment", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    const { userId: athleteId, identity } = await seedGymAndUser(t, { role: "athlete" });
    await t.run((ctx) => ctx.db.patch(athleteId, { gymId }));

    const apptId = await t.run((ctx) =>
      ctx.db.insert("appointments", {
        gymId,
        coachId,
        athleteId,
        date: "2099-08-01",
        startTime: "09:00",
        durationMinutes: 60,
        status: "confirmed",
      })
    );

    await t.withIdentity(identity).mutation(api.appointments.cancel, { appointmentId: apptId });

    const appt = await t.run((ctx) => ctx.db.get(apptId));
    expect(appt?.status).toBe("cancelled");
  });

  test("coach can cancel any appointment in their gym", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId, identity: coachIdentity } = await seedGymAndUser(t, { role: "coach" });
    const { userId: athleteId } = await seedGymAndUser(t, { role: "athlete" });
    await t.run((ctx) => ctx.db.patch(athleteId, { gymId }));

    const apptId = await t.run((ctx) =>
      ctx.db.insert("appointments", {
        gymId,
        coachId,
        athleteId,
        date: "2099-08-02",
        startTime: "10:00",
        durationMinutes: 60,
        status: "confirmed",
      })
    );

    await t.withIdentity(coachIdentity).mutation(api.appointments.cancel, { appointmentId: apptId });

    const appt = await t.run((ctx) => ctx.db.get(apptId));
    expect(appt?.status).toBe("cancelled");
  });

  test("athlete cannot cancel someone else's appointment", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId: coachId } = await seedGymAndUser(t, { role: "coach" });
    const { userId: athlete1 } = await seedGymAndUser(t, { role: "athlete" });
    const { identity: identity2 } = await seedGymAndUser(t, { role: "athlete" });
    await t.run((ctx) => ctx.db.patch(athlete1, { gymId }));

    const apptId = await t.run((ctx) =>
      ctx.db.insert("appointments", {
        gymId, coachId, athleteId: athlete1,
        date: "2099-08-03", startTime: "09:00", durationMinutes: 60, status: "confirmed",
      })
    );

    await expect(
      t.withIdentity(identity2).mutation(api.appointments.cancel, { appointmentId: apptId })
    ).rejects.toThrow("Unauthorized");
  });

  test("coach cannot cancel an appointment from another gym", async () => {
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

    const apptId = await t.run((ctx) =>
      ctx.db.insert("appointments", {
        gymId: otherGymId,
        coachId: otherCoachId,
        athleteId,
        date: "2099-08-04",
        startTime: "09:00",
        durationMinutes: 60,
        status: "confirmed",
      })
    );

    await expect(
      t.withIdentity(coachIdentity).mutation(api.appointments.cancel, { appointmentId: apptId })
    ).rejects.toThrow("Unauthorized");
  });
});
