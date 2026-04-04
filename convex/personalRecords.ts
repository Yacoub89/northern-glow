import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const getMyPRs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("personalRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    movement: v.string(),
    score: v.string(),
  },
  handler: async (ctx, { movement, score }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const existing = await ctx.db
      .query("personalRecords")
      .withIndex("by_user_movement", (q) =>
        q.eq("userId", userId).eq("movement", movement)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { score, setAt: Date.now() });
    } else {
      await ctx.db.insert("personalRecords", {
        userId,
        movement,
        score,
        setAt: Date.now(),
      });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("personalRecords") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const pr = await ctx.db.get(id);
    if (pr?.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.delete(id);
  },
});
