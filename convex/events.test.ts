/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { seedGymAndUser, insertEvent } from "./testHelpers";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

// ── events.create ─────────────────────────────────────────────────────────────

describe("events.create", () => {
  test("admin can create an event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, identity } = await seedGymAndUser(t, { role: "admin" });

    const eventId = await t.withIdentity(identity).mutation(api.events.create, {
      title: "Barbell Battle",
      date: "2099-09-15",
      startTime: "10:00",
      priceCents: 0,
    });

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event).toMatchObject({ title: "Barbell Battle", gymId, status: "upcoming", registeredCount: 0 });
  });

  test("coach can create an event", async () => {
    const t = convexTest(schema, modules);
    const { identity } = await seedGymAndUser(t, { role: "coach" });

    const eventId = await t.withIdentity(identity).mutation(api.events.create, {
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
    const { identity } = await seedGymAndUser(t, { role: "athlete" });

    await expect(
      t.withIdentity(identity).mutation(api.events.create, {
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
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "admin" });
    const eventId = await insertEvent(t, gymId, userId);

    const event = await t.withIdentity(identity).query(api.events.get, { eventId });
    expect(event?._id).toBe(eventId);
    expect(event?.title).toBe("Summer Throwdown");
  });

  test("returns null for a deleted event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);
    await t.run((ctx) => ctx.db.delete(eventId));

    const result = await t.withIdentity(identity).query(api.events.get, { eventId });
    expect(result).toBeNull();
  });

  test("returns null for an event in a different gym", async () => {
    const t = convexTest(schema, modules);
    const { gymId: otherGymId, userId: otherUserId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, otherGymId, otherUserId);

    const { identity } = await seedGymAndUser(t, { email: "outsider@test.com" });
    const result = await t.withIdentity(identity).query(api.events.get, { eventId });
    expect(result).toBeNull();
  });
});

// ── events.listUpcoming ───────────────────────────────────────────────────────

describe("events.listUpcoming", () => {
  test("returns upcoming events for user's gym", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    await insertEvent(t, gymId, userId, { date: "2099-12-01" });
    await insertEvent(t, gymId, userId, { date: "2099-12-15" });

    const events = await t.withIdentity(identity).query(api.events.listUpcoming);
    expect(events).toHaveLength(2);
  });

  test("excludes cancelled events", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    await insertEvent(t, gymId, userId, { date: "2099-12-01", status: "upcoming" });
    await insertEvent(t, gymId, userId, { date: "2099-12-05", status: "cancelled" });

    const events = await t.withIdentity(identity).query(api.events.listUpcoming);
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("upcoming");
  });

  test("excludes past events", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    await insertEvent(t, gymId, userId, { date: "2020-01-01" });
    await insertEvent(t, gymId, userId, { date: "2099-12-01" });

    const events = await t.withIdentity(identity).query(api.events.listUpcoming);
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
    const { identity: identity1 } = await seedGymAndUser(t);
    const { gymId: gym2, userId: user2 } = await seedGymAndUser(t);
    await insertEvent(t, gym2, user2, { date: "2099-12-01" });

    const events = await t.withIdentity(identity1).query(api.events.listUpcoming);
    expect(events).toHaveLength(0);
  });
});

// ── events.registerFree ───────────────────────────────────────────────────────

describe("events.registerFree", () => {
  test("registers a user for a free event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    await t.withIdentity(identity).mutation(api.events.registerFree, { eventId });

    const reg = await t.withIdentity(identity).query(api.events.getMyRegistration, { eventId });
    expect(reg?.status).toBe("registered");
    expect(reg?.paymentStatus).toBe("free");

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.registeredCount).toBe(1);
  });

  test("throws when registering for a paid event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { priceCents: 2500 });

    await expect(
      t.withIdentity(identity).mutation(api.events.registerFree, { eventId })
    ).rejects.toThrow("This event requires payment");
  });

  test("throws when event is not upcoming", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { status: "cancelled" });

    await expect(
      t.withIdentity(identity).mutation(api.events.registerFree, { eventId })
    ).rejects.toThrow("Event is not available for registration");
  });

  test("throws when event is full", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { capacity: 1, registeredCount: 1 });

    await expect(
      t.withIdentity(identity).mutation(api.events.registerFree, { eventId })
    ).rejects.toThrow("Event is full");
  });

  test("throws if already registered", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    await t.withIdentity(identity).mutation(api.events.registerFree, { eventId });
    await expect(
      t.withIdentity(identity).mutation(api.events.registerFree, { eventId })
    ).rejects.toThrow("Already registered");
  });

  test("re-registers after cancellation without double-counting", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    await t.withIdentity(identity).mutation(api.events.registerFree, { eventId });

    const reg = await t.run((ctx) =>
      ctx.db.query("eventRegistrations")
        .withIndex("by_event_user", (q) => q.eq("eventId", eventId).eq("userId", userId))
        .first()
    );
    await t.run((ctx) => ctx.db.patch(reg!._id, { status: "cancelled" }));
    await t.run((ctx) => ctx.db.patch(eventId, { registeredCount: 0 }));

    await t.withIdentity(identity).mutation(api.events.registerFree, { eventId });

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.registeredCount).toBe(1);
    const updatedReg = await t.run((ctx) => ctx.db.get(reg!._id));
    expect(updatedReg?.status).toBe("registered");
  });

  test("unauthenticated user is rejected", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    await expect(t.mutation(api.events.registerFree, { eventId })).rejects.toThrow("Unauthenticated");
  });

  test("user from another gym cannot register", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);
    const { identity: outsider } = await seedGymAndUser(t, { email: "outsider@test.com" });

    await expect(
      t.withIdentity(outsider).mutation(api.events.registerFree, { eventId })
    ).rejects.toThrow("Event not found");
  });
});

// ── events.cancel (admin) ─────────────────────────────────────────────────────

describe("events.cancel", () => {
  test("admin can cancel an event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "admin" });
    const eventId = await insertEvent(t, gymId, userId);

    await t.withIdentity(identity).mutation(api.events.cancel, { eventId });

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.status).toBe("cancelled");
  });

  test("coach can cancel an event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "coach" });
    const eventId = await insertEvent(t, gymId, userId);

    await t.withIdentity(identity).mutation(api.events.cancel, { eventId });

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.status).toBe("cancelled");
  });

  test("athlete cannot cancel an event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t, { role: "athlete" });
    const eventId = await insertEvent(t, gymId, userId);

    await expect(
      t.withIdentity(identity).mutation(api.events.cancel, { eventId })
    ).rejects.toThrow("Not authorized");
  });

  test("coach from another gym cannot cancel an event", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t, { role: "admin" });
    const eventId = await insertEvent(t, gymId, userId);
    const { identity: otherCoach } = await seedGymAndUser(t, {
      role: "coach",
      email: "other-coach@test.com",
    });

    await expect(
      t.withIdentity(otherCoach).mutation(api.events.cancel, { eventId })
    ).rejects.toThrow("Event not found");
  });
});

// ── internal: getEventForCheckout ─────────────────────────────────────────────

describe("internal.events.getEventForCheckout", () => {
  test("does not expose event checkout data across gyms", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { priceCents: 1000 });
    const { userId: outsiderId } = await seedGymAndUser(t, {
      email: "checkout-outsider@test.com",
    });

    const result = await t.query(internal.events.getEventForCheckout, {
      eventId,
      userId: outsiderId,
    });

    expect(result.event).toBeNull();
  });
});

// ── internal: confirmPaidRegistration ────────────────────────────────────────

describe("internal.events.confirmPaidRegistration", () => {
  test("marks pending registration as paid and increments count", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { priceCents: 1000 });

    const stripeSessionId = "cs_test_abc123";
    await t.mutation(internal.events.insertPendingRegistration, { eventId, userId, gymId, stripeSessionId });
    await t.mutation(internal.events.confirmPaidRegistration, { stripeSessionId });

    const reg = await t.run((ctx) =>
      ctx.db.query("eventRegistrations")
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
    await t.mutation(internal.events.confirmPaidRegistration, { stripeSessionId });

    const event = await t.run((ctx) => ctx.db.get(eventId));
    expect(event?.registeredCount).toBe(1);
  });

  test("no-ops for unknown session ID", async () => {
    const t = convexTest(schema, modules);
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
      eventId, userId, gymId, stripeSessionId: "cs_new",
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

    const firstId = await t.mutation(internal.events.insertPendingRegistration, {
      eventId, userId, gymId, stripeSessionId: "cs_old",
    });
    await t.run((ctx) => ctx.db.patch(firstId, { status: "cancelled" }));

    const secondId = await t.mutation(internal.events.insertPendingRegistration, {
      eventId, userId, gymId, stripeSessionId: "cs_new2",
    });

    expect(secondId).toBe(firstId);
    const reg = await t.run((ctx) => ctx.db.get(firstId));
    expect(reg?.stripeSessionId).toBe("cs_new2");
    expect(reg?.paymentStatus).toBe("pending");
  });
});

// ── internal: cancelEventRegistrationsBatch ──────────────────────────────────

describe("internal.events.cancelEventRegistrationsBatch", () => {
  test("cancels the next batch of active registrations", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId, { registeredCount: 2 });
    await t.run(async (ctx) => {
      await ctx.db.insert("eventRegistrations", {
        eventId,
        userId,
        gymId,
        status: "registered",
        paymentStatus: "free",
        registeredAt: Date.now(),
      });
      await ctx.db.insert("eventRegistrations", {
        eventId,
        userId,
        gymId,
        status: "registered",
        paymentStatus: "free",
        registeredAt: Date.now(),
      });
    });

    await t.mutation(internal.events.cancelEventRegistrationsBatch, { eventId });

    const active = await t.run((ctx) =>
      ctx.db
        .query("eventRegistrations")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", eventId).eq("status", "registered")
        )
        .collect()
    );
    expect(active).toHaveLength(0);
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
        eventId, userId, gymId, status: "registered", paymentStatus: "free", registeredAt: Date.now(),
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
        eventId, userId, gymId, status: "registered", paymentStatus: "free", registeredAt: Date.now(),
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
        eventId, userId, gymId, status: "registered", paymentStatus: "free", registeredAt: Date.now(),
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
        eventId, userId, gymId, status: "cancelled", paymentStatus: "free", registeredAt: Date.now(),
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
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    const reg = await t.withIdentity(identity).query(api.events.getMyRegistration, { eventId });
    expect(reg).toBeNull();
  });

  test("returns null for a cancelled registration", async () => {
    const t = convexTest(schema, modules);
    const { gymId, userId, identity } = await seedGymAndUser(t);
    const eventId = await insertEvent(t, gymId, userId);

    await t.run((ctx) =>
      ctx.db.insert("eventRegistrations", {
        eventId, userId, gymId, status: "cancelled", paymentStatus: "free", registeredAt: Date.now(),
      })
    );

    const reg = await t.withIdentity(identity).query(api.events.getMyRegistration, { eventId });
    expect(reg).toBeNull();
  });
});
