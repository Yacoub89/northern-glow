import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const DEFAULT_CONFIG = {
  name: "OCFit",
  tagline: "Powered by OCFit",
  primaryColor: "#1BBFBF",
  timezone: "America/New_York",
};

export const get = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("gymConfig").take(1);
    return config[0] ?? null;
  },
});

export const upsert = mutation({
  args: {
    name: v.string(),
    tagline: v.optional(v.string()),
    primaryColor: v.string(),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const caller = await ctx.db.get(userId);
    if (caller?.role !== "admin")
      throw new Error("Only admins can update gym settings");
    const existing = await ctx.db.query("gymConfig").take(1);
    if (existing[0]) {
      await ctx.db.patch(existing[0]._id, args);
    } else {
      await ctx.db.insert("gymConfig", args);
    }
  },
});
