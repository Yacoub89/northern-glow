import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { requireActiveMembershipForAthlete, requireAuth, requireCoachOrAdmin } from "./helpers";
import { internal } from "./_generated/api";

// ── Queries ──────────────────────────────────────────────────────────────────

export const listCoaches = query({
  args: {},
  handler: async (ctx) => {
    const { gymId } = await requireAuth(ctx);
    const gymMembers = await ctx.db
      .query("users")
      .withIndex("by_gym", (q) => q.eq("gymId", gymId))
      .take(200);
    return gymMembers.filter(
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
    const { gymId } = await requireAuth(ctx);

    // Verify the coach belongs to the same gym
    const coach = await ctx.db.get(coachId);
    if (coach?.gymId !== gymId) return [];

    const [y, mo, d] = date.split("-").map(Number);
    const dayOfWeek = new Date(y, mo - 1, d).getDay();

    const availability = await ctx.db
      .query("coachAvailability")
      .withIndex("by_coach_day", (q) =>
        q.eq("coachId", coachId).eq("dayOfWeek", dayOfWeek)
      )
      .collect();

    if (availability.length === 0) return [];

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

export const getCoachAppointments = query({
  args: { startDate: v.string(), days: v.optional(v.number()) },
  handler: async (ctx, { startDate, days = 7 }) => {
    const { userId: coachId } = await requireCoachOrAdmin(ctx);
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

export const getMyAvailability = query({
  args: {},
  handler: async (ctx) => {
    const { userId: coachId } = await requireCoachOrAdmin(ctx);
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
    const { userId, gymId, user } = await requireAuth(ctx);
    await requireActiveMembershipForAthlete(ctx, user, "book 1-on-1 sessions");

    // Verify coach belongs to the same gym
    const coach = await ctx.db.get(args.coachId);
    if (coach?.gymId !== gymId) throw new Error("Coach not found");

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

    const myExisting = existing.find(
      (a) => a.athleteId === userId && a.status !== "cancelled"
    );
    if (myExisting) throw new Error("You already have an appointment with this coach on this day");

    await ctx.db.insert("appointments", {
      gymId,
      coachId: args.coachId,
      athleteId: userId,
      date: args.date,
      startTime: args.startTime,
      durationMinutes: args.durationMinutes,
      status: "confirmed",
      notes: args.notes,
    });

    const athlete = await ctx.db.get(userId);

    if (athlete?.pushToken) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendPush, {
        tokens: [athlete.pushToken],
        title: "1-on-1 Booked!",
        body: `Your session with ${coach?.name ?? "Coach"} on ${args.date} at ${args.startTime} is confirmed.`,
        data: { type: "appointment_booked" },
      });
    }

    if (coach?.pushToken) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendPush, {
        tokens: [coach.pushToken],
        title: "New 1-on-1 Booking",
        body: `${athlete?.name ?? "An athlete"} booked a session on ${args.date} at ${args.startTime}.`,
        data: { type: "appointment_new" },
      });
    }

    if (athlete?.email || coach?.email) {
      await ctx.scheduler.runAfter(0, internal.email.sendAppointmentEmail, {
        athleteEmail: athlete?.email ?? "",
        athleteName: athlete?.name,
        coachEmail: coach?.email ?? "",
        coachName: coach?.name,
        date: args.date,
        startTime: args.startTime,
        durationMinutes: args.durationMinutes,
        notes: args.notes,
      });
    }
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
    const isSameGymCoach = isCoach && user?.gymId === appointment.gymId;

    if (appointment.athleteId !== userId && !isSameGymCoach) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(appointmentId, { status: "cancelled" });
  },
});

export const addAvailability = mutation({
  args: {
    dayOfWeek: v.number(),
    startTime: v.string(),
    durationMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId: coachId, gymId } = await requireCoachOrAdmin(ctx);

    const existing = await ctx.db
      .query("coachAvailability")
      .withIndex("by_coach_day", (q) =>
        q.eq("coachId", coachId).eq("dayOfWeek", args.dayOfWeek)
      )
      .collect();

    if (existing.some((s) => s.startTime === args.startTime)) {
      throw new Error("Availability slot already exists for this day and time");
    }

    await ctx.db.insert("coachAvailability", { gymId, coachId, ...args });
  },
});

export const removeAvailability = mutation({
  args: { availabilityId: v.id("coachAvailability") },
  handler: async (ctx, { availabilityId }) => {
    const { userId: coachId } = await requireCoachOrAdmin(ctx);
    const slot = await ctx.db.get(availabilityId);
    if (!slot || slot.coachId !== coachId) throw new Error("Unauthorized");
    await ctx.db.delete(availabilityId);
  },
});
