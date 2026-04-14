import { internalMutation, internalQuery, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const getMyMembership = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const getUserInfo = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return { email: user.email ?? null, name: user.name ?? null, gymId: user.gymId ?? null };
  },
});

export const getByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const upsertMembership = internalMutation({
  args: {
    userId: v.id("users"),
    gymId: v.optional(v.id("gyms")),
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        gymId: args.gymId,
        stripeCustomerId: args.stripeCustomerId,
        stripePriceId: args.stripePriceId,
        plan: args.plan,
        billingPeriod: args.billingPeriod,
        status: args.status,
        currentPeriodEnd: args.currentPeriodEnd,
      });
    } else {
      await ctx.db.insert("memberships", args);
    }
  },
});

export const cancelMembership = internalMutation({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, { stripeSubscriptionId }) => {
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { status: "cancelled" });
    }
  },
});
