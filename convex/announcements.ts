import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireCoachOrAdmin } from "./helpers";

export const listActive = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const { gymId } = await requireAuth(ctx);
    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_gym_startDate", (q) => q.eq("gymId", gymId).lte("startDate", date))
      .order("desc")
      .take(50);
    return announcements
      .filter((item) => item.startDate <= date && (!item.endDate || item.endDate >= date))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.startDate.localeCompare(a.startDate))
      .slice(0, 5);
  },
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const { gymId } = await requireCoachOrAdmin(ctx);
    return await ctx.db
      .query("announcements")
      .withIndex("by_gym_createdAt", (q) => q.eq("gymId", gymId))
      .order("desc")
      .take(50);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, gymId } = await requireCoachOrAdmin(ctx);
    if (args.endDate && args.endDate < args.startDate) {
      throw new Error("End date must be after the start date");
    }
    return await ctx.db.insert("announcements", {
      gymId,
      title: args.title,
      body: args.body,
      startDate: args.startDate,
      ...(args.endDate ? { endDate: args.endDate } : {}),
      pinned: args.pinned ?? false,
      createdBy: userId,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    const { gymId } = await requireCoachOrAdmin(ctx);
    const announcement = await ctx.db.get(id);
    if (!announcement || announcement.gymId !== gymId) throw new Error("Announcement not found");
    await ctx.db.delete(id);
  },
});
