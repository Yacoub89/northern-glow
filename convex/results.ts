import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const getMyResults = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const results = await ctx.db
      .query("results")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return await Promise.all(
      results.map(async (r) => ({ ...r, wod: await ctx.db.get(r.wodId) }))
    );
  },
});

export const getByWod = query({
  args: { wodId: v.id("wods") },
  handler: async (ctx, { wodId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("results")
      .withIndex("by_user_wod", (q) =>
        q.eq("userId", userId).eq("wodId", wodId)
      )
      .first();
  },
});

export const getWodStats = query({
  args: { wodId: v.id("wods") },
  handler: async (ctx, { wodId }) => {
    const results = await ctx.db
      .query("results")
      .withIndex("by_wod", (q) => q.eq("wodId", wodId))
      .collect();
    return {
      count: results.length,
      scores: results.map((r) => r.score),
    };
  },
});

export const log = mutation({
  args: {
    wodId: v.id("wods"),
    classId: v.optional(v.id("classes")),
    score: v.string(),
    rx: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const existing = await ctx.db
      .query("results")
      .withIndex("by_user_wod", (q) =>
        q.eq("userId", userId).eq("wodId", args.wodId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        score: args.score,
        rx: args.rx,
        notes: args.notes,
        loggedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("results", {
      ...args,
      userId,
      loggedAt: Date.now(),
    });
  },
});
