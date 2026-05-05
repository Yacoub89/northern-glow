import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireActiveMembershipForAthlete } from "./helpers";
import { MutationCtx } from "./_generated/server";

const EVENT_CANCEL_BATCH_SIZE = 100;
const EVENT_PAYMENT_HOLD_MS = 30 * 60 * 1000;

function isActiveRegistration(reg: {
  paymentStatus: "free" | "paid" | "pending";
  registeredAt: number;
}) {
  return reg.paymentStatus !== "pending" || reg.registeredAt + EVENT_PAYMENT_HOLD_MS > Date.now();
}

async function activeRegistrationCount(
  ctx: MutationCtx,
  eventId: Id<"events">,
) {
  const registrations = await ctx.db
    .query("eventRegistrations")
    .withIndex("by_event_status", (q) =>
      q.eq("eventId", eventId).eq("status", "registered")
    )
    .collect();
  return registrations.filter(isActiveRegistration).length;
}

// ── Public queries ────────────────────────────────────────────────────────────

/** List upcoming events for the authenticated user's gym. */
export const listUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.gymId) return [];

    const today = new Date().toISOString().slice(0, 10);
    return await ctx.db
      .query("events")
      .withIndex("by_gym_status_date", (q) =>
        q.eq("gymId", user.gymId!).eq("status", "upcoming").gte("date", today)
      )
      .order("asc")
      .take(50);
  },
});

/** Get a single event by ID. Scoped to the caller's gym. */
export const get = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user?.gymId) return null;
    const event = await ctx.db.get(eventId);
    if (!event || event.gymId !== user.gymId) return null;
    return event;
  },
});

/** Get the current user's registration for a specific event. */
export const getMyRegistration = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event_user_status", (q) =>
        q.eq("eventId", eventId).eq("userId", userId).eq("status", "registered")
      )
      .first();
  },
});

// ── Public mutations ──────────────────────────────────────────────────────────

/** Register for a free event. Throws if the event is paid. */
export const registerFree = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const user = await ctx.db.get(userId);
    if (!user?.gymId) throw new Error("No gym associated with user");
    if (user.role !== "athlete") {
      throw new Error("Only athletes can register for events");
    }

    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");
    if (event.gymId !== user.gymId) throw new Error("Event not found");
    if (event.priceCents > 0) throw new Error("This event requires payment");
    if (event.status !== "upcoming") throw new Error("Event is not available for registration");

    // Enforce capacity, including fresh pending paid checkouts.
    if (event.capacity !== undefined) {
      const activeCount = await activeRegistrationCount(ctx, eventId);
      if (Math.max(event.registeredCount, activeCount) >= event.capacity) {
        throw new Error("Event is full");
      }
    }

    await requireActiveMembershipForAthlete(ctx, user, "register for events");

    // Check for existing registration
    const existing = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", eventId).eq("userId", userId)
      )
      .first();

    if (existing && existing.status === "registered") {
      throw new Error("Already registered");
    }

    if (existing && existing.status === "cancelled") {
      // Re-register
      await ctx.db.patch(existing._id, {
        status: "registered",
        paymentStatus: "free",
        registeredAt: Date.now(),
      });
    } else {
      await ctx.db.insert("eventRegistrations", {
        eventId,
        userId,
        gymId: event.gymId,
        status: "registered",
        paymentStatus: "free",
        registeredAt: Date.now(),
      });
    }

    await ctx.db.patch(eventId, { registeredCount: event.registeredCount + 1 });
  },
});

// ── Internal cancel helpers (used by stripe.ts) ─────────────────────────

export const getRegistrationForCancel = internalQuery({
  args: { eventId: v.id("events"), userId: v.id("users") },
  handler: async (ctx, { eventId, userId }) => {
    return await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event_user_status", (q) =>
        q.eq("eventId", eventId).eq("userId", userId).eq("status", "registered")
      )
      .first();
  },
});

export const markRegistrationCancelled = internalMutation({
  args: { registrationId: v.id("eventRegistrations"), eventId: v.id("events") },
  handler: async (ctx, { registrationId, eventId }) => {
    await ctx.db.patch(registrationId, { status: "cancelled" });

    const event = await ctx.db.get(eventId);
    if (event && event.registeredCount > 0) {
      await ctx.db.patch(eventId, {
        registeredCount: event.registeredCount - 1,
      });
    }
  },
});

// ── Admin mutations ───────────────────────────────────────────────────────────

/** Admin/coach: create a new event. */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    capacity: v.optional(v.number()),
    priceCents: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const user = await ctx.db.get(userId);
    if (!user?.gymId) throw new Error("No gym associated with user");
    if (user.role !== "admin" && user.role !== "coach") {
      throw new Error("Only admins and coaches can create events");
    }

    return await ctx.db.insert("events", {
      gymId: user.gymId,
      title: args.title,
      description: args.description,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      location: args.location,
      capacity: args.capacity,
      registeredCount: 0,
      priceCents: args.priceCents,
      createdBy: userId,
      status: "upcoming",
    });
  },
});

/** Admin: cancel an event, cancel all active registrations, and refund paid ones. */
export const cancel = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin" && user?.role !== "coach") {
      throw new Error("Not authorized");
    }
    if (!user.gymId) throw new Error("No gym associated with user");

    const event = await ctx.db.get(eventId);
    if (!event || event.gymId !== user.gymId) throw new Error("Event not found");

    // Cancel every active registration; schedule Stripe refunds for paid ones
    const registrations = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", eventId).eq("status", "registered")
      )
      .take(EVENT_CANCEL_BATCH_SIZE);

    for (const reg of registrations) {
      await ctx.db.patch(reg._id, { status: "cancelled" });
      if (reg.paymentStatus === "paid" && reg.stripeSessionId) {
        await ctx.scheduler.runAfter(0, internal.stripe.refundEventRegistration, {
          stripeSessionId: reg.stripeSessionId,
        });
      }
    }

    await ctx.db.patch(eventId, { status: "cancelled", registeredCount: 0 });

    if (registrations.length === EVENT_CANCEL_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.events.cancelEventRegistrationsBatch, {
        eventId,
      });
    }
  },
});

export const cancelEventRegistrationsBatch = internalMutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const registrations = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", eventId).eq("status", "registered")
      )
      .take(EVENT_CANCEL_BATCH_SIZE);

    for (const reg of registrations) {
      await ctx.db.patch(reg._id, { status: "cancelled" });
      if (reg.paymentStatus === "paid" && reg.stripeSessionId) {
        await ctx.scheduler.runAfter(0, internal.stripe.refundEventRegistration, {
          stripeSessionId: reg.stripeSessionId,
        });
      }
    }

    if (registrations.length === EVENT_CANCEL_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.events.cancelEventRegistrationsBatch, {
        eventId,
      });
    }
  },
});

// ── Internal helpers (used by stripe.ts) ─────────────────────────────────────

/** Look up a pending registration by Stripe session ID. */
export const getRegistrationByStripeSession = internalQuery({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, { stripeSessionId }) => {
    return await ctx.db
      .query("eventRegistrations")
      .withIndex("by_stripe_session", (q) =>
        q.eq("stripeSessionId", stripeSessionId)
      )
      .first();
  },
});

/** Insert a pending paid registration (before Stripe payment completes). */
export const insertPendingRegistration = internalMutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
    gymId: v.id("gyms"),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Re-check capacity inside the mutation to close the oversell race.
    // Fresh pending checkouts hold a spot briefly, but abandoned checkouts expire.
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (event.status !== "upcoming") throw new Error("Event is not available");

    if (event.capacity !== undefined) {
      if (event.capacity <= 0) throw new Error("Event is full");
      const activeRegs = await ctx.db
        .query("eventRegistrations")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", args.eventId).eq("status", "registered")
        )
        .collect();
      const heldByOthers = activeRegs.filter(
        (r) => r.userId !== args.userId && isActiveRegistration(r)
      ).length;
      if (Math.max(event.registeredCount, heldByOthers) >= event.capacity) {
        throw new Error("Event is full");
      }
    }

    const existing = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      // Never overwrite a registration that has already been paid
      if (existing.status === "registered" && existing.paymentStatus === "paid") {
        throw new Error("Already registered and paid for this event");
      }
      await ctx.db.patch(existing._id, {
        status: "registered",
        paymentStatus: "pending",
        stripeSessionId: args.stripeSessionId,
        registeredAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("eventRegistrations", {
      eventId: args.eventId,
      userId: args.userId,
      gymId: args.gymId,
      status: "registered",
      paymentStatus: "pending",
      stripeSessionId: args.stripeSessionId,
      registeredAt: Date.now(),
    });
  },
});

/** Mark a pending registration as paid and bump the event's registeredCount. */
export const confirmPaidRegistration = internalMutation({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, { stripeSessionId }) => {
    const registration = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_stripe_session", (q) =>
        q.eq("stripeSessionId", stripeSessionId)
      )
      .first();

    if (!registration) return;
    if (registration.paymentStatus === "paid") return; // idempotent

    await ctx.db.patch(registration._id, { paymentStatus: "paid" });

    const event = await ctx.db.get(registration.eventId);
    if (event) {
      await ctx.db.patch(registration.eventId, {
        registeredCount: event.registeredCount + 1,
      });
    }
  },
});

/** Get event with user info for checkout session creation. */
export const getEventForCheckout = internalQuery({
  args: { eventId: v.id("events"), userId: v.id("users") },
  handler: async (ctx, { eventId, userId }) => {
    const event = await ctx.db.get(eventId);
    const user = await ctx.db.get(userId);
    if (!event || !user?.gymId || event.gymId !== user.gymId) {
      return { event: null, user };
    }
    return { event, user };
  },
});
