import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ── Public queries ────────────────────────────────────────────────────────────

/** Returns the gym config for the currently authenticated user. */
export const getMyGym = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user?.gymId) return null;
    return await ctx.db.get(user.gymId);
  },
});

/** Returns a gym by its id (used by the web admin portal). */
export const get = query({
  args: { gymId: v.id("gyms") },
  handler: async (ctx, { gymId }) => {
    return await ctx.db.get(gymId);
  },
});

/** Lists all gyms — for the NorthernGlow super-admin portal. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("gyms").take(200);
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Gym admin: update their gym's branding and Stripe settings. */
export const updateSettings = mutation({
  args: {
    name: v.optional(v.string()),
    tagline: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    timezone: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    stripeUnlimitedMonthlyPriceId: v.optional(v.string()),
    stripeUnlimitedAnnualPriceId: v.optional(v.string()),
    stripeTwiceWeeklyMonthlyPriceId: v.optional(v.string()),
    stripeTwiceWeeklyAnnualPriceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Only admins can update gym settings");
    if (!user.gymId) throw new Error("No gym associated with this account");
    const updates = Object.fromEntries(
      Object.entries(args).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(user.gymId, updates);
  },
});

/** Returns the public URL for the gym's stored logo. */
export const getLogoUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

/** Generate a signed upload URL for the gym logo. */
export const generateLogoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Only admins can upload logos");
    return await ctx.storage.generateUploadUrl();
  },
});

// ── Internal functions (used by the web admin portal HTTP action) ─────────────

/** Creates a new gym. Called from the super-admin web portal. */
export const createGym = internalMutation({
  args: {
    name: v.string(),
    tagline: v.string(),
    primaryColor: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("gyms", args);
  },
});

/** Returns a user's gymId — used from actions that can't access ctx.db. */
export const getGymIdForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<Id<"gyms"> | null> => {
    const user = await ctx.db.get(userId);
    return user?.gymId ?? null;
  },
});

/** Returns a gym record by userId — used from Stripe actions for price IDs. */
export const getGymByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user?.gymId) return null;
    return await ctx.db.get(user.gymId);
  },
});
