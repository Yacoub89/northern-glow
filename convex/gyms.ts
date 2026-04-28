import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireSuperAdmin } from "./helpers";

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

/** Returns a gym by its id. Caller must be a member of the gym, or a super-admin. */
export const get = query({
  args: { gymId: v.id("gyms") },
  handler: async (ctx, { gymId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const isMember = user.gymId === gymId;
    const allowlist = (process.env.NORTHERNGLOW_SUPERADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isSuperAdmin =
      !!user.email && allowlist.includes(user.email.toLowerCase());

    if (!isMember && !isSuperAdmin) throw new Error("Unauthorized");
    return await ctx.db.get(gymId);
  },
});

/** Lists all gyms — for the NorthernGlow super-admin portal. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
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
    appIconStorageId: v.optional(v.id("_storage")),
    splashStorageId: v.optional(v.id("_storage")),
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

    const priceFields = [
      "stripeUnlimitedMonthlyPriceId",
      "stripeUnlimitedAnnualPriceId",
      "stripeTwiceWeeklyMonthlyPriceId",
      "stripeTwiceWeeklyAnnualPriceId",
    ] as const;
    for (const field of priceFields) {
      const val = args[field];
      if (val !== undefined && val !== "" && !val.startsWith("price_")) {
        throw new Error(`${field} must be a Stripe price ID (price_…)`);
      }
    }

    const updates = Object.fromEntries(
      Object.entries(args).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(user.gymId, updates);
  },
});

/** Returns the gym config with resolved storage URLs for logo, app icon, and splash. */
export const getMyGymFull = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user?.gymId) return null;
    const gym = await ctx.db.get(user.gymId);
    if (!gym) return null;

    const [logoUrl, appIconUrl, splashUrl] = await Promise.all([
      gym.logoStorageId ? ctx.storage.getUrl(gym.logoStorageId) : null,
      gym.appIconStorageId ? ctx.storage.getUrl(gym.appIconStorageId) : null,
      gym.splashStorageId ? ctx.storage.getUrl(gym.splashStorageId) : null,
    ]);

    return { ...gym, logoUrl, appIconUrl, splashUrl };
  },
});

/** Returns the public URL for the caller's gym's stored logo. */
export const getLogoUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user?.gymId) return null;
    const gym = await ctx.db.get(user.gymId);
    if (!gym) return null;
    // Only resolve URLs for storage IDs that belong to this gym's branding.
    const allowed = [gym.logoStorageId, gym.appIconStorageId, gym.splashStorageId];
    if (!allowed.includes(storageId)) return null;
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

/** Returns gym data with resolved asset URLs — used by the /gym-build-config HTTP endpoint. */
export const getGymForBuild = internalQuery({
  args: { gymId: v.id("gyms") },
  handler: async (ctx, { gymId }) => {
    const gym = await ctx.db.get(gymId);
    if (!gym) return null;

    const [logoUrl, appIconUrl, splashUrl] = await Promise.all([
      gym.logoStorageId ? ctx.storage.getUrl(gym.logoStorageId) : null,
      gym.appIconStorageId ? ctx.storage.getUrl(gym.appIconStorageId) : null,
      gym.splashStorageId ? ctx.storage.getUrl(gym.splashStorageId) : null,
    ]);

    const slug = gym.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    return {
      name: gym.name,
      tagline: gym.tagline,
      primaryColor: gym.primaryColor,
      timezone: gym.timezone,
      slug,
      bundleId: `com.northernglow.${slug}`,
      logoUrl,
      appIconUrl,
      splashUrl,
    };
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
