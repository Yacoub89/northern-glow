import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireSuperAdmin } from "./helpers";

export const submitGymLead = mutation({
  args: {
    type: v.union(v.literal("info"), v.literal("signup")),
    name: v.string(),
    email: v.string(),
    gymName: v.optional(v.string()),
    city: v.optional(v.string()),
    memberCount: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("gymLeads", { ...args, status: "new" });
    await ctx.scheduler.runAfter(0, internal.email.sendLeadNotificationEmail, {
      type: args.type,
      name: args.name,
      email: args.email,
      gymName: args.gymName,
      city: args.city,
      memberCount: args.memberCount,
      message: args.message,
    });
  },
});

export const listLeads = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    return await ctx.db.query("gymLeads").order("desc").take(200);
  },
});

export const updateLeadStatus = mutation({
  args: {
    leadId: v.id("gymLeads"),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("converted"),
      v.literal("dismissed"),
    ),
  },
  handler: async (ctx, { leadId, status }) => {
    await requireSuperAdmin(ctx);
    await ctx.db.patch(leadId, { status });
  },
});
