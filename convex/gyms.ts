import { internalQuery, mutation, query } from "./_generated/server";
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

/** Returns public gym branding by id, with full config for members and super-admins. */
export const get = query({
  args: { gymId: v.id("gyms") },
  handler: async (ctx, { gymId }) => {
    const gym = await ctx.db.get(gymId);
    if (!gym) return null;

    const publicGymConfig = {
      _id: gym._id,
      _creationTime: gym._creationTime,
      name: gym.name,
      tagline: gym.tagline,
      primaryColor: gym.primaryColor,
      timezone: gym.timezone,
    };

    const userId = await getAuthUserId(ctx);
    if (!userId) return publicGymConfig;
    const user = await ctx.db.get(userId);
    if (!user) return publicGymConfig;

    const isMember = user.gymId === gymId;
    const allowlist = (process.env.NORTHERNGLOW_SUPERADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isSuperAdmin =
      !!user.email && allowlist.includes(user.email.toLowerCase());

    if (!isMember && !isSuperAdmin) return publicGymConfig;
    return gym;
  },
});

/** Returns public gym branding for the current admin portal host. */
export const getByCustomDomain = query({
  args: { customDomain: v.string() },
  handler: async (ctx, { customDomain }) => {
    const normalizedDomain = customDomain.trim().toLowerCase();
    if (!normalizedDomain) return null;

    let gym = await ctx.db
      .query("gyms")
      .withIndex("by_customDomain", (q) => q.eq("customDomain", normalizedDomain))
      .first();
    if (!gym) {
      const gyms = await ctx.db.query("gyms").take(200);
      gym =
        gyms.find((g) => g.customDomain?.trim().toLowerCase() === normalizedDomain) ??
        null;
    }

    if (!gym) return null;
    return {
      _id: gym._id,
      _creationTime: gym._creationTime,
      name: gym.name,
      tagline: gym.tagline,
      primaryColor: gym.primaryColor,
      timezone: gym.timezone,
    };
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

/** Gym admin: update their gym profile. */
export const updateProfile = mutation({
  args: {
    name: v.string(),
    tagline: v.string(),
    primaryColor: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Only admins can update gym profile");
    if (!user.gymId) throw new Error("No gym associated with this account");

    await ctx.db.patch(user.gymId, args);
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
