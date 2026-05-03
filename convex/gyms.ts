import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireSuperAdmin } from "./helpers";

const gymSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") ||
  "gym";

const androidPackageSegment = (slug: string) => {
  const segment =
    slug.replace(/[^a-z0-9]+/g, "_").replace(/(^_+|_+$)/g, "") || "gym";
  return /^[a-z]/.test(segment) ? segment : `g_${segment}`;
};

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

    const slug = gymSlug(gym.name);
    const androidSegment = androidPackageSegment(slug);

    return {
      name: gym.name,
      tagline: gym.tagline,
      primaryColor: gym.primaryColor,
      timezone: gym.timezone,
      slug,
      bundleId: `com.northernglow.${slug}`,
      androidPackage: `com.northernglow.${androidSegment}`,
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

// ── Email domain (Resend) ─────────────────────────────────────────────────────

/** Persists Resend domain registration result onto the gym record. */
export const storeResendDomainResult = internalMutation({
  args: {
    gymId: v.id("gyms"),
    resendDomainId: v.string(),
    emailDomainStatus: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("failed")
    ),
    emailDomainRecords: v.array(
      v.object({
        record: v.string(),
        name: v.string(),
        type: v.string(),
        ttl: v.string(),
        status: v.string(),
        value: v.string(),
        priority: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { gymId, resendDomainId, emailDomainStatus, emailDomainRecords }) => {
    await ctx.db.patch(gymId, { resendDomainId, emailDomainStatus, emailDomainRecords });
  },
});

/**
 * Calls the Resend API to register the gym's email domain and stores the
 * DNS records that the gym owner must add to their DNS provider.
 */
export const registerResendDomain = internalAction({
  args: { gymId: v.id("gyms"), emailDomain: v.string() },
  handler: async (ctx, { gymId, emailDomain }) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.warn("AUTH_RESEND_KEY not set — skipping Resend domain registration");
      return;
    }

    const res = await fetch("https://api.resend.com/domains", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: emailDomain }),
    });

    if (!res.ok) {
      console.error("Resend domain registration failed:", await res.text());
      await ctx.runMutation(internal.gyms.storeResendDomainResult, {
        gymId,
        resendDomainId: "",
        emailDomainStatus: "failed",
        emailDomainRecords: [],
      });
      return;
    }

    const data = await res.json();
    const records = (data.records ?? []).map((r: Record<string, unknown>) => ({
      record: String(r.record ?? ""),
      name: String(r.name ?? ""),
      type: String(r.type ?? ""),
      ttl: String(r.ttl ?? "Auto"),
      status: String(r.status ?? "not_started"),
      value: String(r.value ?? ""),
      ...(r.priority !== undefined ? { priority: Number(r.priority) } : {}),
    }));

    await ctx.runMutation(internal.gyms.storeResendDomainResult, {
      gymId,
      resendDomainId: String(data.id ?? ""),
      emailDomainStatus: data.status === "verified" ? "verified" : "pending",
      emailDomainRecords: records,
    });
  },
});

/**
 * Calls the Resend verify endpoint and refreshes the DNS record statuses.
 * Super-admin triggers this after the gym owner has added their DNS records.
 */
export const superAdminVerifyEmailDomain = mutation({
  args: { gymId: v.id("gyms") },
  handler: async (ctx, { gymId }) => {
    await requireSuperAdmin(ctx);
    const gym = await ctx.db.get(gymId);
    if (!gym?.resendDomainId) throw new Error("No Resend domain registered for this gym");
    await ctx.scheduler.runAfter(0, internal.gyms.checkResendDomainStatus, { gymId });
  },
});

/** Fetches current domain status from Resend and updates the gym record. */
export const checkResendDomainStatus = internalAction({
  args: { gymId: v.id("gyms") },
  handler: async (ctx, { gymId }) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) return;

    const gym = await ctx.runQuery(internal.gyms.getGymForDomainCheck, { gymId });
    if (!gym?.resendDomainId) return;

    const res = await fetch(`https://api.resend.com/domains/${gym.resendDomainId}/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      console.error("Resend domain verify failed:", await res.text());
      return;
    }

    // Re-fetch the domain to get updated record statuses
    const domainRes = await fetch(
      `https://api.resend.com/domains/${gym.resendDomainId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!domainRes.ok) return;

    const data = await domainRes.json();
    const records = (data.records ?? []).map((r: Record<string, unknown>) => ({
      record: String(r.record ?? ""),
      name: String(r.name ?? ""),
      type: String(r.type ?? ""),
      ttl: String(r.ttl ?? "Auto"),
      status: String(r.status ?? "not_started"),
      value: String(r.value ?? ""),
      ...(r.priority !== undefined ? { priority: Number(r.priority) } : {}),
    }));

    await ctx.runMutation(internal.gyms.storeResendDomainResult, {
      gymId,
      resendDomainId: gym.resendDomainId,
      emailDomainStatus: data.status === "verified" ? "verified" : "pending",
      emailDomainRecords: records,
    });
  },
});

/** Minimal gym projection for domain actions that can't use ctx.db directly. */
export const getGymForDomainCheck = internalQuery({
  args: { gymId: v.id("gyms") },
  handler: async (ctx, { gymId }) => {
    const gym = await ctx.db.get(gymId);
    if (!gym) return null;
    return { resendDomainId: gym.resendDomainId };
  },
});

/**
 * Super-admin: set or update the custom domain and/or email domain for a gym.
 * Triggers Resend registration when a new email domain is provided.
 */
export const superAdminUpdateGymDomains = mutation({
  args: {
    gymId: v.id("gyms"),
    customDomain: v.optional(v.string()),
    emailDomain: v.optional(v.string()),
  },
  handler: async (ctx, { gymId, customDomain, emailDomain }) => {
    await requireSuperAdmin(ctx);
    const gym = await ctx.db.get(gymId);
    if (!gym) throw new Error("Gym not found");

    const updates: Record<string, unknown> = {};
    if (customDomain !== undefined) updates.customDomain = customDomain || undefined;

    const isNewDomain = emailDomain && emailDomain !== gym.emailDomain;
    if (emailDomain !== undefined) {
      updates.emailDomain = emailDomain || undefined;
      if (isNewDomain) {
        updates.emailDomainStatus = "pending";
        updates.resendDomainId = undefined;
        updates.emailDomainRecords = undefined;
      }
    }

    await ctx.db.patch(gymId, updates);

    if (isNewDomain && emailDomain) {
      await ctx.scheduler.runAfter(0, internal.gyms.registerResendDomain, {
        gymId,
        emailDomain,
      });
    }
  },
});
