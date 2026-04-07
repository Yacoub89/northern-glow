import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { requireCoachOrAdmin } from "./helpers";

// ── Queries ──────────────────────────────────────────────────────────────────

export const listCoaches = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const users = await ctx.db.query("users").take(200);
    return users.filter(
      (u) => u.role === "coach" || u.role === "admin"
    );
  },
});

export const getCoachAvailableSlots = query({
  args: {
    coachId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, { coachId, date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const [y, mo, d] = date.split("-").map(Number);
    const dayOfWeek = new Date(y, mo - 1, d).getDay(); // 0=Sun

    // Get recurring availability for this day of week
    const availability = await ctx.db
      .query("coachAvailability")
      .withIndex("by_coach_day", (q) =>
        q.eq("coachId", coachId).eq("dayOfWeek", dayOfWeek)
      )
      .collect();

    if (availability.length === 0) return [];

    // Get already-booked slots for this coach on this date
    const booked = await ctx.db
      .query("appointments")
      .withIndex("by_coach_date", (q) =>
        q.eq("coachId", coachId).eq("date", date)
      )
      .collect();

    const bookedTimes = new Set(
      booked
        .filter((a) => a.status !== "cancelled")
        .map((a) => a.startTime)
    );

    // Return available (not yet booked) slots
    return availability
      .filter((slot) => !bookedTimes.has(slot.startTime))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((slot) => ({
        availabilityId: slot._id,
        startTime: slot.startTime,
        durationMinutes: slot.durationMinutes,
      }));
  },
});

export const getMyAppointments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const today = new Date().toISOString().split("T")[0];

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_athlete_status", (q) =>
        q.eq("athleteId", userId).eq("status", "confirmed")
      )
      .collect();

    const upcoming = appointments.filter((a) => a.date >= today);

    return Promise.all(
      upcoming.map(async (a) => {
        const coach = await ctx.db.get(a.coachId);
        return { ...a, coachName: coach?.name ?? "Coach" };
      })
    ).then((list) =>
      list.sort((a, b) =>
        a.date !== b.date
          ? a.date.localeCompare(b.date)
          : a.startTime.localeCompare(b.startTime)
      )
    );
  },
});

export const getMyAppointmentForDate = query({
  args: { date: v.string(), coachId: v.id("users") },
  handler: async (ctx, { date, coachId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_coach_date", (q) =>
        q.eq("coachId", coachId).eq("date", date)
      )
      .collect();

    return (
      appointments.find(
        (a) => a.athleteId === userId && a.status !== "cancelled"
      ) ?? null
    );
  },
});

// Coach: view their schedule for a date range
export const getCoachAppointments = query({
  args: { startDate: v.string(), days: v.optional(v.number()) },
  handler: async (ctx, { startDate, days = 7 }) => {
    const coachId = await requireCoachOrAdmin(ctx);
    const [y, mo, d] = startDate.split("-").map(Number);

    const perDay = await Promise.all(
      Array.from({ length: days }, (_, i) => {
        const dt = new Date(y, mo - 1, d + i);
        const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        return ctx.db
          .query("appointments")
          .withIndex("by_coach_date", (q) =>
            q.eq("coachId", coachId).eq("date", date)
          )
          .collect();
      })
    );

    const flat = perDay.flat().filter((a) => a.status !== "cancelled");
    return Promise.all(
      flat.map(async (a) => {
        const athlete = await ctx.db.get(a.athleteId);
        return { ...a, athleteName: athlete?.name ?? "Athlete" };
      })
    );
  },
});

// Coach: view their availability settings
export const getMyAvailability = query({
  args: {},
  handler: async (ctx) => {
    const coachId = await requireCoachOrAdmin(ctx);
    return await ctx.db
      .query("coachAvailability")
      .withIndex("by_coach", (q) => q.eq("coachId", coachId))
      .collect();
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const book = mutation({
  args: {
    coachId: v.id("users"),
    date: v.string(),
    startTime: v.string(),
    durationMinutes: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    // Check slot not already taken
    const existing = await ctx.db
      .query("appointments")
      .withIndex("by_coach_date", (q) =>
        q.eq("coachId", args.coachId).eq("date", args.date)
      )
      .collect();

    const conflict = existing.find(
      (a) => a.startTime === args.startTime && a.status !== "cancelled"
    );
    if (conflict) throw new Error("This slot has already been booked");

    // Check athlete doesn't already have an appointment with this coach that day
    const myExisting = existing.find(
      (a) => a.athleteId === userId && a.status !== "cancelled"
    );
    if (myExisting) throw new Error("You already have an appointment with this coach on this day");

    await ctx.db.insert("appointments", {
      coachId: args.coachId,
      athleteId: userId,
      date: args.date,
      startTime: args.startTime,
      durationMinutes: args.durationMinutes,
      status: "confirmed",
      notes: args.notes,
    });
  },
});

export const cancel = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const appointment = await ctx.db.get(appointmentId);
    if (!appointment) throw new Error("Appointment not found");

    const user = await ctx.db.get(userId);
    const isCoach = user?.role === "coach" || user?.role === "admin";

    if (appointment.athleteId !== userId && !isCoach) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(appointmentId, { status: "cancelled" });
  },
});

// Coach: add a recurring availability slot
export const addAvailability = mutation({
  args: {
    dayOfWeek: v.number(),
    startTime: v.string(),
    durationMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const coachId = await requireCoachOrAdmin(ctx);

    // Prevent duplicate slots
    const existing = await ctx.db
      .query("coachAvailability")
      .withIndex("by_coach_day", (q) =>
        q.eq("coachId", coachId).eq("dayOfWeek", args.dayOfWeek)
      )
      .collect();

    if (existing.some((s) => s.startTime === args.startTime)) {
      throw new Error("Slot already exists");
    }

    await ctx.db.insert("coachAvailability", { coachId, ...args });
  },
});

// Coach: remove a recurring availability slot
export const removeAvailability = mutation({
  args: { availabilityId: v.id("coachAvailability") },
  handler: async (ctx, { availabilityId }) => {
    const coachId = await requireCoachOrAdmin(ctx);
    const slot = await ctx.db.get(availabilityId);
    if (!slot || slot.coachId !== coachId) throw new Error("Unauthorized");
    await ctx.db.delete(availabilityId);
  },
});
