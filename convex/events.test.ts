/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, beforeEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Insert a gym and an athlete user, return their IDs.
 * The identity subject is formatted as "{userId}|testSession" so that
 * getAuthUserId (from @convex-dev/auth) correctly extracts the userId.
 */
async function seedGymAndUser(
  t: ReturnType<typeof convexTest>,
  opts: { role?: "athlete" | "coach" | "admin" } = {}
) {
  const { gymId, userId } = await t.run(async (ctx) => {
    const gymId = await ctx.db.insert("gyms", {
      name: "Test Gym",
      tagline: "Push harder",
      primaryColor: "#000000",
      timezone: "America/Toronto",
    });
    const userId = await ctx.db.insert("users", {
      gymId,
      name: "Test User",
      email: "test@example.com",
      role: opts.role ?? "athlete",
    });
    return { gymId, userId };
  });
  return { gymId, userId };
}

/** Create an upcoming free event directly in the DB. */
async function insertEvent(
  t: ReturnType<typeof convexTest>,
  gymId: Id<"gyms">,
  createdBy: Id<"users">,
  overrides: Partial<{
    priceCents: number;
    capacity: number;
    registeredCount: number;
    status: "upcoming" | "cancelled" | "completed";
    date: string;
  }> = {}
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("events", {
      gymId,
      title: "Summer Throwdown",
      date: overrides.date ?? "2099-08-01",
      startTime: "09:00",
      priceCents: overrides.priceCents ?? 0,
      registeredCount: overrides.registeredCount ?? 0,
      capacity: overrides.capacity,
      status: overrides.status ?? "upcoming",
      createdBy,
    });
  });
}

// ── events.create ─────────────────────────────────────────────────────────────

describe("events.create", () => {
  test("admin can create an event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t, { role: "admin" });

    const eventId = await t
      .withIdentity({ subject: `${userId}|session` })
      .mutation(api.events.create, {
        title: "Barbell Battle",
        date: "2099-09-15",
        startTime: "10:00",
        priceCents: 0,
      });

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event).toMatchObject({
      title: "Barbell Battle",
      gymId,
      status: "upcoming",
      registeredCount: 0,
    });
  });

  test("coach can create an event", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedGymAndUser(t, { role: "coach" });

    const eventId = await t
      .withIdentity({ subject: `${userId}|session` })
      .mutation(api.events.create, {
        title: "Coach's Challenge",
        date: "2099-10-01",
        startTime: "08:00",
        priceCents: 500,
      });

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.priceCents).toBe(500);
  });

  test("athlete cannot create an event", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedGymAndUser(t, { role: "athlete" });

    await expect(
      t.withIdentity({ subject: `${userId}|session` }).mutation(api.events.create, {
        title: "Athlete Attempt",
        date: "2099-10-01",
        startTime: "08:00",
        priceCents: 0,
      })
    ).rejects.toThrow("Only admins and coaches can create events");
  });

  test("unauthenticated user cannot create an event", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.events.create, {
        title: "Ghost Event",
        date: "2099-10-01",
        startTime: "08:00",
        priceCents: 0,
      })
    ).rejects.toThrow("Unauthenticated");
  });
});

// ── events.get ────────────────────────────────────────────────────────────────

describe("events.get", () => {
  test("returns event by ID", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t, { role: "admin" });
    const eventId = await insertEvent(t, gymId, userId);

    const event = await t.query(api.events.get, { eventId });
    expect(event?._id).toBe(eventId);
    expect(event?.title).toBe("Summer Throwdown");
  });

  test("returns null for a non-existent event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    // Delete the event then query it
    await t.run((ctx) => ctx.db.delete(eventId));
    const result = await t.query(api.events.get, { eventId });
    expect(result).toBeNull();
  });
});

// ── events.listUpcoming ───────────────────────────────────────────────────────

describe("events.listUpcoming", () => {
  test("returns upcoming events for user's gym", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    await insertEvent(t, gymId, userId, { date: "2099-12-01" });
    await insertEvent(t, gymId, userId, { date: "2099-12-15" });

    const events = await t
      .withIdentity({ subject: `${userId}|session` })
      .query(api.events.listUpcoming);

    expect(events).toHaveLength(2);
  });

  test("excludes cancelled events", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    await insertEvent(t, gymId, userId, { date: "2099-12-01", status: "upcoming" });
    await insertEvent(t, gymId, userId, { date: "2099-12-05", status: "cancelled" });

    const events = await t
      .withIdentity({ subject: `${userId}|session` })
      .query(api.events.listUpcoming);

    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("upcoming");
  });

  test("excludes past events", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    await insertEvent(t, gymId, userId, { date: "2020-01-01" }); // past
    await insertEvent(t, gymId, userId, { date: "2099-12-01" }); // future

    const events = await t
      .withIdentity({ subject: `${userId}|session` })
      .query(api.events.listUpcoming);

    expect(events).toHaveLength(1);
    expect(events[0].date).toBe("2099-12-01");
  });

  test("returns empty array for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const events = await t.query(api.events.listUpcoming);
    expect(events).toEqual([]);
  });

  test("events from a different gym are not returned", async () => {
    const t = convexTest(schema, modules);
    const { gymId: gym1, userId: user1 } = await seedGymAndUser(t);
    const { gymId: gym2, userId: _user2 } = await seedGymAndUser(t);

    await insertEvent(t, gym2, user1, { date: "2099-12-01" });

    const events = await t
      .withIdentity({ subject: `${user1}|session` })
      .query(api.events.listUpcoming);

    expect(events).toHaveLength(0);
  });
});

// ── events.registerFree ───────────────────────────────────────────────────────

describe("events.registerFree", () => {
  test("registers a user for a free event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    await t
      .withIdentity({ subject: `${userId}|session` })
      .mutation(api.events.registerFree, { eventId });

    const reg = await t
      .withIdentity({ subject: `${userId}|session` })
      .query(api.events.getMyRegistration, { eventId });

    expect(reg?.status).toBe("registered");
    expect(reg?.paymentStatus).toBe("free");

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.registeredCount).toBe(1);
  });

  test("throws when registering for a paid event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { priceCents: 2500 });

    await expect(
      t.withIdentity({ subject: `${userId}|session` }).mutation(api.events.registerFree, { eventId })
    ).rejects.toThrow("This event requires payment");
  });

  test("throws when event is not upcoming", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { status: "cancelled" });

    await expect(
      t.withIdentity({ subject: `${userId}|session` }).mutation(api.events.registerFree, { eventId })
    ).rejects.toThrow("Event is not available for registration");
  });

  test("throws when event is full", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { capacity: 1, registeredCount: 1 });

    await expect(
      t.withIdentity({ subject: `${userId}|session` }).mutation(api.events.registerFree, { eventId })
    ).rejects.toThrow("Event is full");
  });

  test("throws if already registered", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    await t.withIdentity({ subject: `${userId}|session` }).mutation(api.events.registerFree, { eventId });

    await expect(
      t.withIdentity({ subject: `${userId}|session` }).mutation(api.events.registerFree, { eventId })
    ).rejects.toThrow("Already registered");
  });

  test("re-registers after cancellation without double-counting", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    // First register
    await t.withIdentity({ subject: `${userId}|session` }).mutation(api.events.registerFree, { eventId });

    // Cancel via internal mutation
    const reg = await t.run((ctx) =>
      ctx.db
        .query("eventRegistrations")
        .withIndex("by_event_user", (q) => q.eq("eventId", eventId).eq("userId", userId))
        .first()
    );
    await t.run((ctx) => ctx.db.patch(reg!._id, { status: "cancelled" }));
    await t.run((ctx) => ctx.db.patch(eventId, { registeredCount: 0 }));

    // Re-register
    await t.withIdentity({ subject: `${userId}|session` }).mutation(api.events.registerFree, { eventId });

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.registeredCount).toBe(1);

    const updatedReg = await t.run((ctx) => ctx.db.get(reg!._id));
    expect(updatedReg?.status).toBe("registered");
  });

  test("unauthenticated user is rejected", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    await expect(
      t.mutation(api.events.registerFree, { eventId })
    ).rejects.toThrow("Unauthenticated");
  });
});

// ── events.cancel (admin) ─────────────────────────────────────────────────────

describe("events.cancel", () => {
  test("admin can cancel an event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t, { role: "admin" });
    const eventId = await insertEvent(t, gymId, userId);

    await t
      .withIdentity({ subject: `${userId}|session` })
      .mutation(api.events.cancel, { eventId });

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.status).toBe("cancelled");
  });

  test("coach can cancel an event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t, { role: "coach" });
    const eventId = await insertEvent(t, gymId, userId);

    await t
      .withIdentity({ subject: `${userId}|session` })
      .mutation(api.events.cancel, { eventId });

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.status).toBe("cancelled");
  });

  test("athlete cannot cancel an event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t, { role: "athlete" });
    const eventId = await insertEvent(t, gymId, userId);

    await expect(
      t.withIdentity({ subject: `${userId}|session` }).mutation(api.events.cancel, { eventId })
    ).rejects.toThrow("Not authorized");
  });
});

// ── internal: confirmPaidRegistration ────────────────────────────────────────

describe("internal.events.confirmPaidRegistration", () => {
  test("marks pending registration as paid and increments count", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { priceCents: 1000 });

    const stripeSessionId = "cs_test_abc123";
    await t.mutation(internal.events.insertPendingRegistration, {
      eventId,
      userId,
      gymId,
      stripeSessionId,
    });

    await t.mutation(internal.events.confirmPaidRegistration, { stripeSessionId });

    const reg = await t.run((ctx) =>
      ctx.db
        .query("eventRegistrations")
        .withIndex("by_stripe_session", (q) => q.eq("stripeSessionId", stripeSessionId))
        .first()
    );
    expect(reg?.paymentStatus).toBe("paid");

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.registeredCount).toBe(1);
  });

  test("is idempotent — calling twice does not double-count", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { priceCents: 1000 });

    const stripeSessionId = "cs_test_idempotent";
    await t.mutation(internal.events.insertPendingRegistration, { eventId, userId, gymId, stripeSessionId });
    await t.mutation(internal.events.confirmPaidRegistration, { stripeSessionId });
    await t.mutation(internal.events.confirmPaidRegistration, { stripeSessionId }); // called again

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.registeredCount).toBe(1);
  });

  test("no-ops for unknown session ID", async () => {
    const t = convexTest(schema, modules);
    // Should not throw
    await t.mutation(internal.events.confirmPaidRegistration, { stripeSessionId: "cs_unknown" });
  });
});

// ── internal: insertPendingRegistration ──────────────────────────────────────

describe("internal.events.insertPendingRegistration", () => {
  test("creates a new pending registration", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { priceCents: 500 });

    const regId = await t.mutation(internal.events.insertPendingRegistration, {
      eventId,
      userId,
      gymId,
      stripeSessionId: "cs_new",
    });

    const reg = await t.run((ctx) => ctx.db.get(regId));
    expect(reg?.status).toBe("registered");
    expect(reg?.paymentStatus).toBe("pending");
    expect(reg?.stripeSessionId).toBe("cs_new");
  });

  test("reuses and updates a cancelled registration", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { priceCents: 500 });

    // Create then cancel a registration
    const firstId = await t.mutation(internal.events.insertPendingRegistration, {
      eventId, userId, gymId, stripeSessionId: "cs_old",
    });
    await t.run((ctx) => ctx.db.patch(firstId, { status: "cancelled" }));

    // Insert new pending — should reuse the existing row
    const secondId = await t.mutation(internal.events.insertPendingRegistration, {
      eventId, userId, gymId, stripeSessionId: "cs_new2",
    });

    expect(secondId).toBe(firstId);
    const reg = await t.run((ctx) => ctx.db.get(firstId));
    expect(reg?.stripeSessionId).toBe("cs_new2");
    expect(reg?.paymentStatus).toBe("pending");
  });
});

// ── internal: markRegistrationCancelled ──────────────────────────────────────

describe("internal.events.markRegistrationCancelled", () => {
  test("cancels registration and decrements registeredCount", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { registeredCount: 1 });

    const regId = await t.run((ctx) =>
      ctx.db.insert("eventRegistrations", {
        eventId,
        userId,
        gymId,
        status: "registered",
        paymentStatus: "free",
        registeredAt: Date.now(),
      })
    );

    await t.mutation(internal.events.markRegistrationCancelled, { registrationId: regId, eventId });

    const reg = await t.run((ctx) => ctx.db.get(regId));
    expect(reg?.status).toBe("cancelled");

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.registeredCount).toBe(0);
  });

  test("does not go below 0 if registeredCount is already 0", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { registeredCount: 0 });

    const regId = await t.run((ctx) =>
      ctx.db.insert("eventRegistrations", {
        eventId,
        userId,
        gymId,
        status: "registered",
        paymentStatus: "free",
        registeredAt: Date.now(),
      })
    );

    await t.mutation(internal.events.markRegistrationCancelled, { registrationId: regId, eventId });

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.registeredCount).toBe(0);
  });
});

// ── internal: getRegistrationForCancel ───────────────────────────────────────

describe("internal.events.getRegistrationForCancel", () => {
  test("returns active registration", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    await t.run((ctx) =>
      ctx.db.insert("eventRegistrations", {
        eventId, userId, gymId,
        status: "registered", paymentStatus: "free", registeredAt: Date.now(),
      })
    );

    const reg = await t.query(internal.events.getRegistrationForCancel, { eventId, userId });
    expect(reg?.status).toBe("registered");
  });

  test("returns null when registration is cancelled", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    await t.run((ctx) =>
      ctx.db.insert("eventRegistrations", {
        eventId, userId, gymId,
        status: "cancelled", paymentStatus: "free", registeredAt: Date.now(),
      })
    );

    const reg = await t.query(internal.events.getRegistrationForCancel, { eventId, userId });
    expect(reg).toBeNull();
  });
});

// ── events.getMyRegistration ──────────────────────────────────────────────────

describe("events.getMyRegistration", () => {
  test("returns null when not registered", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    const reg = await t
      .withIdentity({ subject: `${userId}|session` })
      .query(api.events.getMyRegistration, { eventId });

    expect(reg).toBeNull();
  });

  test("returns null for a cancelled registration", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    await t.run((ctx) =>
      ctx.db.insert("eventRegistrations", {
        eventId, userId, gymId,
        status: "cancelled", paymentStatus: "free", registeredAt: Date.now(),
      })
    );

    const reg = await t
      .withIdentity({ subject: `${userId}|session` })
      .query(api.events.getMyRegistration, { eventId });

    expect(reg).toBeNull();
  });
});
