import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { requireCoachOrAdmin, requireGymAdmin } from "./helpers";
import { internal } from "./_generated/api";
import { generateInviteCode, gymFromAddress } from "./inviteHelpers";

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
