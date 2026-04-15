import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // ── Gyms ─────────────────────────────────────────────────────────────────────

  gyms: defineTable({
    name: v.string(),
    tagline: v.string(),
    primaryColor: v.string(),
    timezone: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
    // Per-gym Stripe price IDs (falls back to env vars if not set)
    stripeUnlimitedMonthlyPriceId: v.optional(v.string()),
    stripeUnlimitedAnnualPriceId: v.optional(v.string()),
    stripeTwiceWeeklyMonthlyPriceId: v.optional(v.string()),
    stripeTwiceWeeklyAnnualPriceId: v.optional(v.string()),
  }),

  gymInvites: defineTable({
    gymId: v.id("gyms"),
    email: v.string(),
    inviteCode: v.string(),
    role: v.union(v.literal("athlete"), v.literal("coach"), v.literal("admin")),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
    ),
    invitedBy: v.id("users"),
    expiresAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_gym", ["gymId"])
    .index("by_code", ["inviteCode"])
    .index("by_gym_email", ["gymId", "email"]),

  // ── Users (extends auth) ──────────────────────────────────────────────────────

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("athlete"), v.literal("coach"), v.literal("admin")),
    ),
    pushToken: v.optional(v.string()),
    // Optional until the user accepts their gym invite
    gymId: v.optional(v.id("gyms")),
  })
    .index("email", ["email"])
    .index("by_gym", ["gymId"]),

  // ── Workouts ─────────────────────────────────────────────────────────────────

  wods: defineTable({
    gymId: v.id("gyms"),
    date: v.string(), // YYYY-MM-DD
    title: v.string(),
    description: v.string(),
    type: v.union(
      v.literal("AMRAP"),
      v.literal("ForTime"),
      v.literal("EMOM"),
      v.literal("Strength"),
      v.literal("Other"),
    ),
    movements: v.array(v.string()),
    scalingNotes: v.optional(v.string()),
    createdBy: v.id("users"),
    accessLevel: v.optional(v.union(
      v.literal("PUBLIC_CLASS"),
      v.literal("MEMBERS_ONLY"),
      v.literal("ADVANCED"),
    )),
    parts: v.optional(v.array(v.object({
      label: v.string(),
      name: v.string(),
      type: v.optional(v.union(
        v.literal("AMRAP"),
        v.literal("ForTime"),
        v.literal("EMOM"),
        v.literal("Strength"),
        v.literal("Other"),
      )),
      movement: v.optional(v.string()),
      sets: v.optional(v.string()),
      reps: v.optional(v.string()),
      percentMax: v.optional(v.string()),
      coachNotes: v.optional(v.string()),
      timeCap: v.optional(v.string()),
      description: v.optional(v.string()),
    }))),
  })
    .index("by_date", ["date"])
    .index("by_gym_date", ["gymId", "date"]),

  classes: defineTable({
    gymId: v.id("gyms"),
    date: v.string(), // YYYY-MM-DD
    startTime: v.string(), // HH:MM (24h)
    capacity: v.number(),
    bookedCount: v.number(),
    coachId: v.id("users"),
    wodId: v.optional(v.id("wods")),
  })
    .index("by_date", ["date"])
    .index("by_date_time", ["date", "startTime"])
    .index("by_gym_date", ["gymId", "date"]),

  bookings: defineTable({
    classId: v.id("classes"),
    userId: v.id("users"),
    status: v.union(
      v.literal("booked"),
      v.literal("waitlist"),
      v.literal("cancelled"),
    ),
    waitlistPosition: v.optional(v.number()),
    bookedAt: v.number(),
    checkedInAt: v.optional(v.number()),
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

  documents: defineTable({
    gymId: v.id("gyms"),
    title: v.string(),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
    fileStorageId: v.optional(v.id("_storage")),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_gym_createdAt", ["gymId", "createdAt"]),

  documentSignatures: defineTable({
    documentId: v.id("documents"),
    userId: v.id("users"),
    signatureName: v.string(),
    signatureData: v.optional(v.string()),
    signedAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_user", ["userId"])
    .index("by_document_user", ["documentId", "userId"]),

  coachAvailability: defineTable({
    gymId: v.id("gyms"),
    coachId: v.id("users"),
    dayOfWeek: v.number(), // 0=Sun, 1=Mon, ..., 6=Sat
    startTime: v.string(), // HH:MM (24h)
    durationMinutes: v.number(),
  })
    .index("by_coach", ["coachId"])
    .index("by_coach_day", ["coachId", "dayOfWeek"]),

  appointments: defineTable({
    gymId: v.id("gyms"), // required after backfill migration
    coachId: v.id("users"),
    athleteId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    startTime: v.string(), // HH:MM (24h)
    durationMinutes: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled"),
    ),
    notes: v.optional(v.string()),
  })
    .index("by_coach", ["coachId"])
    .index("by_athlete", ["athleteId"])
    .index("by_coach_date", ["coachId", "date"])
    .index("by_athlete_status", ["athleteId", "status"]),

  memberships: defineTable({
    gymId: v.optional(v.id("gyms")),
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
      v.literal("incomplete"),
    ),
    currentPeriodEnd: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"]),
});
