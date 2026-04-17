import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { requireCoachOrAdmin } from "./helpers";
import { internal } from "./_generated/api";

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

// ── Admin: manage invites ─────────────────────────────────────────────────────

/** Send an invite email to a new gym member. */
export const send = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("athlete"), v.literal("coach"), v.literal("admin")),
  },
  handler: async (ctx, { email, role }) => {
    const { userId, gymId } = await requireCoachOrAdmin(ctx);

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

    const invite = await ctx.db
      .query("gymInvites")
      .withIndex("by_email", (q) => q.eq("email", user.email!.toLowerCase()))
      .filter((q) => q.eq(q.field("status"), "pending"))
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
      });
    }

    return { status: "accepted" as const, gymId: invite.gymId };
  },
});

// ── Web portal: create first gym and become its admin ────────────────────────

/**
 * Creates a gym and links the authenticated user to it as admin.
 * Used by the NorthernGlow web portal on first login.
 * Only works if the caller has no gym yet.
 */
export const createGymWithAdmin = mutation({
  args: {
    gymName: v.string(),
    tagline: v.string(),
    primaryColor: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, { gymName, tagline, primaryColor, timezone }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const user = await ctx.db.get(userId);
    if (user?.gymId) throw new Error("You are already part of a gym");
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
