import { mutation, query } from "./_generated/server";

// Resolves the "from" address for a gym: uses its verified email domain if set,
// otherwise falls back to the global AUTH_EMAIL_FROM env var.
function gymFromAddress(gym: {
  name: string;
  emailDomain?: string;
  emailDomainStatus?: string;
}): string | undefined {
  if (gym.emailDomain && gym.emailDomainStatus === "verified") {
    return `${gym.name} <noreply@${gym.emailDomain}>`;
  }
  return undefined;
}
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { requireCoachOrAdmin, requireGymAdmin, requireSuperAdmin } from "./helpers";
import { internal } from "./_generated/api";

const normalizeDomain = (domain: string | undefined) =>
  domain?.trim().toLowerCase() || undefined;

function generateInviteCode(): string {
  // 8-char base32 code from 5 random bytes (~40 bits of CSPRNG entropy).
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit ambiguous I,O,0,1
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] & 0x1f];
    out += alphabet[(bytes[i] >> 5) & 0x07 | ((bytes[(i + 1) % bytes.length] & 0x03) << 3)];
  }
  return out.slice(0, 8);
}

// ── Admin: manage invites ─────────────────────────────────────────────────────

/** Send an invite email to a new gym member. */
export const send = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("athlete"), v.literal("coach"), v.literal("admin")),
  },
  handler: async (ctx, { email, role }) => {
    const { userId, gymId } =
      role === "athlete" ? await requireCoachOrAdmin(ctx) : await requireGymAdmin(ctx);

    const normalizedEmail = email.toLowerCase().trim();

    // Expire any existing pending invite for this email in this gym
    const existing = await ctx.db
      .query("gymInvites")
      .withIndex("by_gym_email", (q) =>
        q.eq("gymId", gymId).eq("email", normalizedEmail)
      )
      .first();

    if (existing?.status === "pending") {
      await ctx.db.patch(existing._id, { status: "expired" });
    }

    const inviteCode = generateInviteCode();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("gymInvites", {
      gymId,
      email: normalizedEmail,
      inviteCode,
      role,
      status: "pending",
      invitedBy: userId,
      expiresAt,
    });

    const gym = await ctx.db.get(gymId);

    await ctx.scheduler.runAfter(0, internal.email.sendInviteEmail, {
      email: normalizedEmail,
      gymName: gym?.name ?? "your gym",
      inviteCode,
      role,
      fromAddress: gym ? gymFromAddress(gym) : undefined,
    });
  },
});

/** List all invites for the caller's gym. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const { gymId } = await requireCoachOrAdmin(ctx);
    const invites = await ctx.db
      .query("gymInvites")
      .withIndex("by_gym", (q) => q.eq("gymId", gymId))
      .order("desc")
      .take(200);

    return await Promise.all(
      invites.map(async (inv) => {
        const invitedBy = await ctx.db.get(inv.invitedBy);
        return { ...inv, invitedByName: invitedBy?.name ?? invitedBy?.email ?? "Unknown" };
      })
    );
  },
});

/** Revoke a pending invite. */
export const revoke = mutation({
  args: { inviteId: v.id("gymInvites") },
  handler: async (ctx, { inviteId }) => {
    const { gymId } = await requireCoachOrAdmin(ctx);
    const invite = await ctx.db.get(inviteId);
    if (!invite || invite.gymId !== gymId) throw new Error("Invite not found");
    await ctx.db.patch(inviteId, { status: "expired" });
  },
});

// ── Athlete: accept invite after OTP login ────────────────────────────────────

/**
 * Called by the mobile app immediately after successful OTP verification.
 * Checks whether the authenticated user's email has a pending invite and
 * accepts it, linking the user to the gym.
 */
export const checkAndAccept = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Already linked to a gym — nothing to do
    if (user.gymId) return { status: "already_member" as const, gymId: user.gymId };

    if (!user.email) return { status: "no_email" as const };

    // Pick the most recently created pending invite. If the same email has
    // pending invites at multiple gyms, the newest one wins.
    const invite = await ctx.db
      .query("gymInvites")
      .withIndex("by_email_status", (q) =>
        q.eq("email", user.email!.toLowerCase()).eq("status", "pending")
      )
      .order("desc")
      .first();

    if (!invite) return { status: "no_invite" as const };

    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(invite._id, { status: "expired" });
      return { status: "expired" as const };
    }

    // Accept: link user to gym and assign role
    await ctx.db.patch(userId, { gymId: invite.gymId, role: invite.role });
    await ctx.db.patch(invite._id, { status: "accepted" });

    const gym = await ctx.db.get(invite.gymId);
    if (user.email) {
      await ctx.scheduler.runAfter(0, internal.email.sendWelcomeEmail, {
        email: user.email,
        name: user.name,
        gymName: gym?.name ?? "your gym",
        fromAddress: gym ? gymFromAddress(gym) : undefined,
      });
    }

    return { status: "accepted" as const, gymId: invite.gymId };
  },
});

// ── Super-admin: create a gym for a client ────────────────────────────────────

/**
 * Creates a gym for a client gym owner and sends them an admin invite email.
 * Does NOT link the gym to the super-admin's own account.
 */
export const superAdminCreateGym = mutation({
  args: {
    gymName: v.string(),
    tagline: v.string(),
    primaryColor: v.string(),
    timezone: v.string(),
    adminEmail: v.string(),
    customDomain: v.optional(v.string()),
    emailDomain: v.optional(v.string()),
  },
  handler: async (ctx, { gymName, tagline, primaryColor, timezone, adminEmail, customDomain, emailDomain }) => {
    const { userId } = await requireSuperAdmin(ctx);

    const normalizedEmail = adminEmail.toLowerCase().trim();
    const normalizedCustomDomain = normalizeDomain(customDomain);
    const normalizedEmailDomain = normalizeDomain(emailDomain);

    if (normalizedCustomDomain) {
      const existingGym = await ctx.db
        .query("gyms")
        .withIndex("by_customDomain", (q) => q.eq("customDomain", normalizedCustomDomain))
        .first();
      if (existingGym) {
        throw new Error("That custom domain is already assigned to another gym");
      }
    }

    const gymId = await ctx.db.insert("gyms", {
      name: gymName,
      tagline,
      primaryColor,
      timezone,
      ...(normalizedCustomDomain ? { customDomain: normalizedCustomDomain } : {}),
      ...(normalizedEmailDomain ? { emailDomain: normalizedEmailDomain, emailDomainStatus: "pending" } : {}),
    });

    if (normalizedEmailDomain) {
      await ctx.scheduler.runAfter(0, internal.gyms.registerResendDomain, {
        gymId,
        emailDomain: normalizedEmailDomain,
      });
    }

    // Expire any existing pending invite for this email
    const existing = await ctx.db
      .query("gymInvites")
      .withIndex("by_email_status", (q) =>
        q.eq("email", normalizedEmail).eq("status", "pending")
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { status: "expired" });
    }

    const inviteCode = generateInviteCode();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("gymInvites", {
      gymId,
      email: normalizedEmail,
      inviteCode,
      role: "admin",
      status: "pending",
      invitedBy: userId,
      expiresAt,
    });

    const portalUrl = customDomain
      ? `https://${customDomain}`
      : undefined;

    await ctx.scheduler.runAfter(0, internal.email.sendAdminPortalInviteEmail, {
      email: normalizedEmail,
      gymName,
      inviteCode,
      ...(portalUrl ? { portalUrl } : {}),
    });

    return gymId;
  },
});

/** Lists all pending admin-role invites across all gyms — for the super-admin panel. */
export const listPendingAdminInvites = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const invites = await ctx.db
      .query("gymInvites")
      .withIndex("by_role_status", (q) =>
        q.eq("role", "admin").eq("status", "pending")
      )
      .order("desc")
      .take(200);

    return await Promise.all(
      invites.map(async (inv) => {
        const gym = await ctx.db.get(inv.gymId);
        return { ...inv, gymName: gym?.name ?? "Unknown gym" };
      })
    );
  },
});

/** Re-sends the admin invite email for an existing gym. Expires the old invite and creates a fresh one. */
export const superAdminResendInvite = mutation({
  args: {
    gymId: v.id("gyms"),
    adminEmail: v.string(),
  },
  handler: async (ctx, { gymId, adminEmail }) => {
    const { userId } = await requireSuperAdmin(ctx);

    const gym = await ctx.db.get(gymId);
    if (!gym) throw new Error("Gym not found");

    const normalizedEmail = adminEmail.toLowerCase().trim();

    // Expire any existing pending invite for this email
    const existing = await ctx.db
      .query("gymInvites")
      .withIndex("by_email_status", (q) =>
        q.eq("email", normalizedEmail).eq("status", "pending")
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { status: "expired" });
    }

    const inviteCode = generateInviteCode();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("gymInvites", {
      gymId,
      email: normalizedEmail,
      inviteCode,
      role: "admin",
      status: "pending",
      invitedBy: userId,
      expiresAt,
    });

    const portalUrl = gym.customDomain ? `https://${gym.customDomain}` : undefined;

    await ctx.scheduler.runAfter(0, internal.email.sendAdminPortalInviteEmail, {
      email: normalizedEmail,
      gymName: gym.name,
      inviteCode,
      fromAddress: gymFromAddress(gym),
      ...(portalUrl ? { portalUrl } : {}),
    });
  },
});

/**
 * Returns the pending web portal invite for the current user, if any.
 * Athlete invites are accepted in the mobile app.
 */
export const getMyAdminInvite = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user?.email || user.gymId) return null;

    const invite = await ctx.db
      .query("gymInvites")
      .withIndex("by_email_status", (q) =>
        q.eq("email", user.email!.toLowerCase()).eq("status", "pending")
      )
      .order("desc")
      .first();
    if (!invite || invite.role === "athlete") return null;

    const gym = await ctx.db.get(invite.gymId);
    return { ...invite, gymName: gym?.name ?? "your gym" };
  },
});

/**
 * Returns the caller's pending invite, if any. Used by the web portal to decide
 * whether a newly created non-admin account should be sent to the mobile app.
 */
export const getMyPendingInvite = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user?.email || user.gymId) return null;

    const invite = await ctx.db
      .query("gymInvites")
      .withIndex("by_email_status", (q) =>
        q.eq("email", user.email!.toLowerCase()).eq("status", "pending")
      )
      .order("desc")
      .first();
    if (!invite) return null;

    const gym = await ctx.db.get(invite.gymId);
    return {
      role: invite.role,
      gymName: gym?.name ?? "your gym",
      expiresAt: invite.expiresAt,
    };
  },
});

/**
 * Accepts a pending web portal invite for the current user, linking them to the gym.
 * Athlete invites are accepted in the mobile app.
 */
export const acceptAdminInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (user.gymId) throw new Error("Already part of a gym");
    if (!user.email) throw new Error("No email on account");

    const invite = await ctx.db
      .query("gymInvites")
      .withIndex("by_email_status", (q) =>
        q.eq("email", user.email!.toLowerCase()).eq("status", "pending")
      )
      .order("desc")
      .first();

    if (!invite) throw new Error("No pending invite found for this email");
    if (invite.role === "athlete") {
      throw new Error("This invite must be accepted in the mobile app");
    }
    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(invite._id, { status: "expired" });
      throw new Error("Invite has expired — ask NorthernGlow to resend it");
    }

    await ctx.db.patch(userId, { gymId: invite.gymId, role: invite.role });
    await ctx.db.patch(invite._id, { status: "accepted" });

    return invite.gymId;
  },
});

// ── Web portal: create first gym and become its admin ────────────────────────

/**
 * Creates a gym and links the authenticated user to it as admin.
 * Used by the NorthernGlow web portal. Restricted to super-admins
 * (NORTHERNGLOW_SUPERADMIN_EMAILS allowlist) to preserve the invite-only model.
 */
export const createGymWithAdmin = mutation({
  args: {
    gymName: v.string(),
    tagline: v.string(),
    primaryColor: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, { gymName, tagline, primaryColor, timezone }) => {
    const { userId, user } = await requireSuperAdmin(ctx);
    if (user.gymId) throw new Error("You are already part of a gym");
    const gymId = await ctx.db.insert("gyms", {
      name: gymName,
      tagline,
      primaryColor,
      timezone,
    });
    await ctx.db.patch(userId, { gymId, role: "admin" });
    return gymId;
  },
});
