import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireGymAdmin } from "./helpers";

const staffRole = v.union(v.literal("coach"), v.literal("admin"));
const staffStatus = v.union(v.literal("active"), v.literal("inactive"));

function cleanOptional(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { gymId } = await requireGymAdmin(ctx);
    const members = await ctx.db
      .query("users")
      .withIndex("by_gym", (q) => q.eq("gymId", gymId))
      .take(500);

    return members
      .filter((member) => member.role === "coach" || member.role === "admin")
      .map((member) => ({
        ...member,
        staffStatus: member.staffStatus ?? "active",
      }))
      .sort((a, b) => {
        const roleOrder = a.role === b.role ? 0 : a.role === "admin" ? -1 : 1;
        if (roleOrder !== 0) return roleOrder;
        return (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? "");
      });
  },
});

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    role: staffRole,
    staffStatus,
    staffTitle: v.optional(v.string()),
    staffPhone: v.optional(v.string()),
    staffNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: callerId, gymId } = await requireGymAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target || target.gymId !== gymId) throw new Error("Staff member not found");
    if (target.role !== "coach" && target.role !== "admin") {
      throw new Error("Only staff members can be edited here");
    }
    if (callerId === args.userId && args.role !== "admin") {
      throw new Error("Cannot remove your own admin access");
    }
    if (callerId === args.userId && args.staffStatus !== "active") {
      throw new Error("Cannot deactivate yourself");
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      staffStatus: args.staffStatus,
      staffTitle: cleanOptional(args.staffTitle),
      staffPhone: cleanOptional(args.staffPhone),
      staffNotes: cleanOptional(args.staffNotes),
    });
  },
});

export const deactivate = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const { userId: callerId, gymId } = await requireGymAdmin(ctx);
    if (callerId === userId) throw new Error("Cannot deactivate yourself");
    const target = await ctx.db.get(userId as Id<"users">);
    if (!target || target.gymId !== gymId) throw new Error("Staff member not found");
    if (target.role !== "coach" && target.role !== "admin") {
      throw new Error("Only staff members can be deactivated");
    }
    await ctx.db.patch(userId, { staffStatus: "inactive" });
  },
});
