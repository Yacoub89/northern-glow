import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

/** Returns the caller's gym config with resolved storage URLs for brand assets. */
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

/** Returns a public URL for one of the caller's gym brand assets. */
export const getAssetUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user?.gymId) return null;
    const gym = await ctx.db.get(user.gymId);
    if (!gym) return null;

    const allowed = [gym.logoStorageId, gym.appIconStorageId, gym.splashStorageId];
    if (!allowed.includes(storageId)) return null;
    return await ctx.storage.getUrl(storageId);
  },
});

/** Generates a signed upload URL for gym brand assets. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Only admins can upload brand assets");
    return await ctx.storage.generateUploadUrl();
  },
});

/** Gym admin: update brand asset storage IDs. */
export const updateAssets = mutation({
  args: {
    logoStorageId: v.optional(v.id("_storage")),
    appIconStorageId: v.optional(v.id("_storage")),
    splashStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Only admins can update brand assets");
    if (!user.gymId) throw new Error("No gym associated with this account");

    const updates = Object.fromEntries(
      Object.entries(args).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(user.gymId, updates);
  },
});
