import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireCoachOrAdmin } from "./helpers";

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const { gymId } = await requireAuth(ctx);
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_gym_date", (q) => q.eq("gymId", gymId).eq("date", date))
      .collect();
    return classes.sort((a, b) => a.startTime.localeCompare(b.startTime));
  },
});

export const getUpcoming = query({
  args: { startDate: v.optional(v.string()), days: v.optional(v.number()) },
  handler: async (ctx, { startDate, days = 7 }) => {
    const { gymId } = await requireAuth(ctx);

    const [y, mo, d] = (startDate ?? new Date().toISOString().split("T")[0])
      .split("-")
      .map(Number);
    const perDay = await Promise.all(
      Array.from({ length: days }, (_, i) => {
        const dt = new Date(y, mo - 1, d + i);
        const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        return ctx.db
          .query("classes")
          .withIndex("by_gym_date", (q) => q.eq("gymId", gymId).eq("date", date))
          .collect();
      })
    );
    const flat = perDay.flat().sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      return dc !== 0 ? dc : a.startTime.localeCompare(b.startTime);
    });

    // Enrich with coach name and WOD info
    return Promise.all(
      flat.map(async (cls) => {
        const coach = await ctx.db.get(cls.coachId);
        const wod = cls.wodId ? await ctx.db.get(cls.wodId) : null;
        const visibleWod = wod?.gymId === cls.gymId ? wod : null;
        return {
          ...cls,
          coachName: coach?.name ?? "TBD",
          wodTitle: visibleWod?.title ?? null,
          wodType: visibleWod?.type ?? null,
          wodDescription: visibleWod?.description ?? null,
          wodMovements: visibleWod?.movements ?? null,
          wodScalingNotes: visibleWod?.scalingNotes ?? null,
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    startTime: v.string(),
    capacity: v.number(),
    wodId: v.optional(v.id("wods")),
  },
  handler: async (ctx, args) => {
    const { userId: coachId, gymId } = await requireCoachOrAdmin(ctx);
    if (args.wodId) {
      const wod = await ctx.db.get(args.wodId);
      if (!wod || wod.gymId !== gymId) throw new Error("WOD not found");
    }
    return await ctx.db.insert("classes", {
      ...args,
      gymId,
      coachId,
      bookedCount: 0,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("classes") },
  handler: async (ctx, { id }) => {
    const { gymId } = await requireCoachOrAdmin(ctx);
    const cls = await ctx.db.get(id);
    if (!cls || cls.gymId !== gymId) throw new Error("Class not found");
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_class", (q) => q.eq("classId", id))
      .collect();
    await Promise.all(
      bookings
        .filter((b) => b.status !== "cancelled")
        .map((b) => ctx.db.patch(b._id, { status: "cancelled" }))
    );
    await ctx.db.delete(id);
  },
});
