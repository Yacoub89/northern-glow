import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { WOD_TYPES } from "../constants/wod";
import { requireCoachOrAdmin } from "./helpers";

const WodType = v.union(
  v.literal("AMRAP"),
  v.literal("ForTime"),
  v.literal("EMOM"),
  v.literal("Strength"),
  v.literal("Other")
);

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    return await ctx.db
      .query("wods")
      .withIndex("by_date", (q) => q.eq("date", date))
      .first();
  },
});

export const getById = query({
  args: { id: v.id("wods") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getSchedule = query({
  args: { startDate: v.string(), days: v.optional(v.number()) },
  handler: async (ctx, { startDate, days = 7 }) => {
    const [y, mo, d] = startDate.split("-").map(Number);
    return await Promise.all(
      Array.from({ length: days }, async (_, i) => {
        const dt = new Date(y, mo - 1, d + i);
        const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        const wod = await ctx.db
          .query("wods")
          .withIndex("by_date", (q) => q.eq("date", date))
          .first();
        return { date, wod: wod ?? null };
      })
    );
  },
});

export const getUpcoming = query({
  args: { startDate: v.string(), days: v.optional(v.number()) },
  handler: async (ctx, { startDate, days = 7 }) => {
    const [y, mo, d] = startDate.split("-").map(Number);
    const wods = await Promise.all(
      Array.from({ length: days }, (_, i) => {
        const dt = new Date(y, mo - 1, d + i);
        const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        return ctx.db
          .query("wods")
          .withIndex("by_date", (q) => q.eq("date", date))
          .first();
      })
    );
    return wods.filter(Boolean);
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    title: v.string(),
    description: v.string(),
    type: WodType,
    movements: v.array(v.string()),
    scalingNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireCoachOrAdmin(ctx);
    const existing = await ctx.db
      .query("wods")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
    if (existing) throw new Error("A WOD already exists for this date");
    return await ctx.db.insert("wods", { ...args, createdBy: userId });
  },
});

export const update = mutation({
  args: {
    id: v.id("wods"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(WodType),
    movements: v.optional(v.array(v.string())),
    scalingNotes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requireCoachOrAdmin(ctx);
    await ctx.db.patch(id, updates);
  },
});
