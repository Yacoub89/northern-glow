import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireCoachOrAdmin } from "./helpers";
import { DEFAULT_WOD_PROGRAM, MAX_SCHEDULE_DAYS, WodPart, WodType } from "./wodTypes";

function boundedScheduleDays(days: number) {
  if (!Number.isFinite(days) || days < 1) {
    throw new Error("days must be at least 1");
  }
  return Math.min(Math.floor(days), MAX_SCHEDULE_DAYS);
}

export const getByDate = query({
  args: { date: v.string(), program: v.optional(v.string()) },
  handler: async (ctx, { date, program = DEFAULT_WOD_PROGRAM }) => {
    const { gymId } = await requireAuth(ctx);
    const wod = await ctx.db
      .query("wods")
      .withIndex("by_gym_date_program", (q) =>
        q.eq("gymId", gymId).eq("date", date).eq("program", program)
      )
      .first();
    if (wod || program !== DEFAULT_WOD_PROGRAM) return wod;
    const legacyWods = await ctx.db
      .query("wods")
      .withIndex("by_gym_date", (q) => q.eq("gymId", gymId).eq("date", date))
      .collect();
    return legacyWods.find((item) => item.program === undefined) ?? null;
  },
});

export const getById = query({
  args: { id: v.id("wods") },
  handler: async (ctx, { id }) => {
    const { gymId } = await requireAuth(ctx);
    const wod = await ctx.db.get(id);
    if (wod?.gymId !== gymId) return null;
    return wod;
  },
});

export const getSchedule = query({
  args: { startDate: v.string(), days: v.optional(v.number()), program: v.optional(v.string()) },
  handler: async (ctx, { startDate, days = 7, program = DEFAULT_WOD_PROGRAM }) => {
    const { gymId } = await requireAuth(ctx);
    const scheduleDays = boundedScheduleDays(days);
    const [y, mo, d] = startDate.split("-").map(Number);
    return await Promise.all(
      Array.from({ length: scheduleDays }, async (_, i) => {
        const dt = new Date(y, mo - 1, d + i);
        const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        const wod = await ctx.db
          .query("wods")
          .withIndex("by_gym_date_program", (q) =>
            q.eq("gymId", gymId).eq("date", date).eq("program", program)
          )
          .first();
        if (wod || program !== DEFAULT_WOD_PROGRAM) return { date, wod: wod ?? null };
        const legacyWods = await ctx.db
          .query("wods")
          .withIndex("by_gym_date", (q) => q.eq("gymId", gymId).eq("date", date))
          .collect();
        const fallbackWod = legacyWods.find((item) => item.program === undefined);
        return { date, wod: fallbackWod ?? null };
      })
    );
  },
});

export const getUpcoming = query({
  args: { startDate: v.string(), days: v.optional(v.number()), program: v.optional(v.string()) },
  handler: async (ctx, { startDate, days = 7, program = DEFAULT_WOD_PROGRAM }) => {
    const { gymId } = await requireAuth(ctx);
    const scheduleDays = boundedScheduleDays(days);
    const [y, mo, d] = startDate.split("-").map(Number);
    const wods = await Promise.all(
      Array.from({ length: scheduleDays }, async (_, i) => {
        const dt = new Date(y, mo - 1, d + i);
        const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        const wod = await ctx.db
          .query("wods")
          .withIndex("by_gym_date_program", (q) =>
            q.eq("gymId", gymId).eq("date", date).eq("program", program)
          )
          .first();
        if (wod || program !== DEFAULT_WOD_PROGRAM) return wod;
        const legacyWods = await ctx.db
          .query("wods")
          .withIndex("by_gym_date", (q) => q.eq("gymId", gymId).eq("date", date))
          .collect();
        return legacyWods.find((item) => item.program === undefined) ?? null;
      })
    );
    return wods.filter(Boolean);
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    program: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    type: WodType,
    movements: v.array(v.string()),
    scalingNotes: v.optional(v.string()),
    accessLevel: v.optional(v.union(
      v.literal("PUBLIC_CLASS"),
      v.literal("MEMBERS_ONLY"),
      v.literal("ADVANCED"),
    )),
    parts: v.optional(v.array(WodPart)),
  },
  handler: async (ctx, args) => {
    const { userId, gymId } = await requireCoachOrAdmin(ctx);
    const program = args.program ?? DEFAULT_WOD_PROGRAM;
    const existing = await ctx.db
      .query("wods")
      .withIndex("by_gym_date_program", (q) =>
        q.eq("gymId", gymId).eq("date", args.date).eq("program", program)
      )
      .first();
    if (existing) throw new Error("A WOD already exists for this date");
    if (program === DEFAULT_WOD_PROGRAM) {
      const legacyWods = await ctx.db
        .query("wods")
        .withIndex("by_gym_date", (q) => q.eq("gymId", gymId).eq("date", args.date))
        .collect();
      if (legacyWods.some((item) => item.program === undefined)) {
        throw new Error("A WOD already exists for this date");
      }
    }
    return await ctx.db.insert("wods", { ...args, program, gymId, createdBy: userId });
  },
});

export const update = mutation({
  args: {
    id: v.id("wods"),
    date: v.optional(v.string()),
    program: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(WodType),
    movements: v.optional(v.array(v.string())),
    scalingNotes: v.optional(v.union(v.string(), v.null())),
    accessLevel: v.optional(v.union(
      v.literal("PUBLIC_CLASS"),
      v.literal("MEMBERS_ONLY"),
      v.literal("ADVANCED"),
      v.null(),
    )),
    parts: v.optional(v.union(v.array(WodPart), v.null())),
  },
  handler: async (ctx, { id, ...updates }) => {
    const { gymId } = await requireCoachOrAdmin(ctx);
    const wod = await ctx.db.get(id);
    if (wod?.gymId !== gymId) throw new Error("WOD not found");
    const nextDate = updates.date ?? wod.date;
    const nextProgram = updates.program ?? wod.program ?? DEFAULT_WOD_PROGRAM;
    if (nextDate !== wod.date || nextProgram !== (wod.program ?? DEFAULT_WOD_PROGRAM)) {
      const conflict = await ctx.db
        .query("wods")
        .withIndex("by_gym_date_program", (q) =>
          q.eq("gymId", gymId).eq("date", nextDate).eq("program", nextProgram)
        )
        .first();
      if (conflict) throw new Error("A WOD already exists for that date");
      if (nextProgram === DEFAULT_WOD_PROGRAM) {
        const legacyWods = await ctx.db
          .query("wods")
          .withIndex("by_gym_date", (q) => q.eq("gymId", gymId).eq("date", nextDate))
          .collect();
        const legacyConflict = legacyWods.find((item) => item._id !== id && item.program === undefined);
        if (legacyConflict) throw new Error("A WOD already exists for that date");
      }
    }
    const patch = {
      ...updates,
      scalingNotes: updates.scalingNotes === null ? undefined : updates.scalingNotes,
      accessLevel: updates.accessLevel === null ? undefined : updates.accessLevel,
      parts: updates.parts === null ? undefined : updates.parts,
    };
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("wods") },
  handler: async (ctx, { id }) => {
    const { gymId } = await requireCoachOrAdmin(ctx);
    const wod = await ctx.db.get(id);
    if (wod?.gymId !== gymId) throw new Error("WOD not found");

    const results = await ctx.db
      .query("results")
      .withIndex("by_wod", (q) => q.eq("wodId", id))
      .take(200);
    if (results.length >= 200) {
      throw new Error("This WOD has too many results to delete at once");
    }
    for (const result of results) {
      await ctx.db.delete(result._id);
    }
    await ctx.db.delete(id);
  },
});
