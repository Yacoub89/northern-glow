/// <reference types="vite/client" />
/**
 * Shared test seed helpers for convex-test suites.
 * Not a Convex module — no function exports consumed by the Convex runtime.
 */
import { convexTest } from "convex-test";
import { Id } from "./_generated/dataModel";
import schema from "./schema";

export type T = ReturnType<typeof convexTest>;

// ── Core seed helpers ─────────────────────────────────────────────────────────

/** Insert a gym and return its ID. */
export async function insertGym(t: T, overrides: Partial<{ name: string }> = {}) {
  return t.run((ctx) =>
    ctx.db.insert("gyms", {
      name: overrides.name ?? "Test Gym",
      tagline: "Push harder",
      primaryColor: "#000000",
      timezone: "America/Toronto",
    })
  );
}

/** Insert a user linked to a gym with the given role. */
export async function insertUser(
  t: T,
  gymId: Id<"gyms">,
  opts: {
    role?: "athlete" | "coach" | "admin";
    email?: string;
    name?: string;
  } = {}
) {
  return t.run((ctx) =>
    ctx.db.insert("users", {
      gymId,
      name: opts.name ?? "Test User",
      email: opts.email ?? "test@example.com",
      role: opts.role ?? "athlete",
    })
  );
}

/**
 * Create a gym + user in one call.
 * The identity subject `${userId}|session` is the format expected by
 * getAuthUserId from @convex-dev/auth — it splits on "|" and takes the first
 * segment as the userId.
 */
export async function seedGymAndUser(
  t: T,
  opts: { role?: "athlete" | "coach" | "admin"; email?: string } = {}
) {
  const gymId = await insertGym(t);
  const userId = await insertUser(t, gymId, opts);
  const identity = { subject: `${userId}|session` };
  return { gymId, userId, identity };
}

/** Insert an active unlimited membership for a user. */
export async function insertMembership(
  t: T,
  userId: Id<"users">,
  gymId: Id<"gyms">,
  opts: { plan?: "unlimited" | "twice_weekly"; status?: "active" | "cancelled" | "trialing" } = {}
) {
  return t.run((ctx) =>
    ctx.db.insert("memberships", {
      userId,
      gymId,
      stripeCustomerId: "cus_test",
      stripeSubscriptionId: "sub_test",
      stripePriceId: "price_test",
      plan: opts.plan ?? "unlimited",
      billingPeriod: "monthly",
      status: opts.status ?? "active",
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
    })
  );
}

/** Insert a WOD. */
export async function insertWod(
  t: T,
  gymId: Id<"gyms">,
  createdBy: Id<"users">,
  date = "2099-06-01"
) {
  return t.run((ctx) =>
    ctx.db.insert("wods", {
      gymId,
      date,
      title: "Fran",
      description: "21-15-9 Thrusters & Pull-ups",
      type: "ForTime",
      movements: ["Thruster", "Pull-up"],
      createdBy,
    })
  );
}

/** Insert a class. */
export async function insertClass(
  t: T,
  gymId: Id<"gyms">,
  coachId: Id<"users">,
  opts: { capacity?: number; date?: string; bookedCount?: number } = {}
) {
  return t.run((ctx) =>
    ctx.db.insert("classes", {
      gymId,
      coachId,
      date: opts.date ?? "2099-06-01",
      startTime: "09:00",
      capacity: opts.capacity ?? 10,
      bookedCount: opts.bookedCount ?? 0,
    })
  );
}

/** Insert an upcoming free event. */
export async function insertEvent(
  t: T,
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
  return t.run((ctx) =>
    ctx.db.insert("events", {
      gymId,
      title: "Summer Throwdown",
      date: overrides.date ?? "2099-08-01",
      startTime: "09:00",
      priceCents: overrides.priceCents ?? 0,
      registeredCount: overrides.registeredCount ?? 0,
      capacity: overrides.capacity,
      status: overrides.status ?? "upcoming",
      createdBy,
    })
  );
}
