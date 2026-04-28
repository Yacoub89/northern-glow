import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { requireAuth, requireCoachOrAdmin } from "./helpers";

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const getMyStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const [bookings, results, prs] = await Promise.all([
      ctx.db
        .query("bookings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("results")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("personalRecords")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    ]);

    return {
      classesAttended: bookings.filter((b) => b.status === "booked").length,
      wodsLogged: results.length,
      prsSet: prs.length,
    };
  },
});

export const listMembers = query({
  args: {},
  handler: async (ctx) => {
    const { gymId } = await requireCoachOrAdmin(ctx);
    return await ctx.db
      .query("users")
      .withIndex("by_gym", (q) => q.eq("gymId", gymId))
      .take(200);
  },
});

export const savePushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    await ctx.db.patch(userId, { pushToken: token });
  },
});

export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("athlete"), v.literal("coach"), v.literal("admin")),
  },
  handler: async (ctx, { userId, role }) => {
    const { userId: callerId, gymId, user: caller } = await requireAuth(ctx);
    if (caller.role !== "admin") throw new Error("Only admins can change roles");
    const target = await ctx.db.get(userId);
    if (target?.gymId !== gymId) throw new Error("User not in your gym");
    if (callerId === userId && role !== "admin") {
      throw new Error("Cannot demote yourself — ask another admin to do it");
    }
    await ctx.db.patch(userId, { role });
  },
});

export const promoteToCoach = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const { userId: callerId, gymId, user: caller } = await requireAuth(ctx);
    if (caller.role !== "admin") throw new Error("Unauthorized");
    const target = await ctx.db.get(userId);
    if (target?.gymId !== gymId) throw new Error("User not in your gym");
    if (callerId === userId) {
      throw new Error("Cannot change your own role — ask another admin to do it");
    }
    await ctx.db.patch(userId, { role: "coach" });
  },
});
