import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Extends the auth users table with gym-specific fields
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("athlete"), v.literal("coach"), v.literal("admin"))
    ),
  }).index("email", ["email"]),

  wods: defineTable({
    date: v.string(), // YYYY-MM-DD
    title: v.string(),
    description: v.string(),
    type: v.union(
      v.literal("AMRAP"),
      v.literal("ForTime"),
      v.literal("EMOM"),
      v.literal("Strength"),
      v.literal("Other")
    ),
    movements: v.array(v.string()),
    scalingNotes: v.optional(v.string()),
    createdBy: v.id("users"),
  }).index("by_date", ["date"]),

  classes: defineTable({
    date: v.string(), // YYYY-MM-DD
    startTime: v.string(), // HH:MM (24h)
    capacity: v.number(),
    bookedCount: v.number(),
    coachId: v.id("users"),
    wodId: v.optional(v.id("wods")),
  })
    .index("by_date", ["date"])
    .index("by_date_time", ["date", "startTime"]),

  bookings: defineTable({
    classId: v.id("classes"),
    userId: v.id("users"),
    status: v.union(
      v.literal("booked"),
      v.literal("waitlist"),
      v.literal("cancelled")
    ),
    waitlistPosition: v.optional(v.number()),
    bookedAt: v.number(),
  })
    .index("by_class", ["classId"])
    .index("by_user", ["userId"])
    .index("by_class_user", ["classId", "userId"])
    .index("by_class_status", ["classId", "status"]),

  personalRecords: defineTable({
    userId: v.id("users"),
    movement: v.string(),
    score: v.string(),
    setAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_movement", ["userId", "movement"]),

  results: defineTable({
    wodId: v.id("wods"),
    userId: v.id("users"),
    classId: v.optional(v.id("classes")),
    score: v.string(), // flexible: "15:32", "185 lbs", "234 reps"
    rx: v.boolean(),
    notes: v.optional(v.string()),
    loggedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_wod", ["wodId"])
    .index("by_user_wod", ["userId", "wodId"]),

  memberships: defineTable({
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    plan: v.union(v.literal("unlimited"), v.literal("twice_weekly")),
    billingPeriod: v.union(v.literal("monthly"), v.literal("annual")),
    status: v.union(
      v.literal("active"),
      v.literal("trialing"),
      v.literal("past_due"),
      v.literal("cancelled"),
      v.literal("incomplete")
    ),
    currentPeriodEnd: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"]),
});
