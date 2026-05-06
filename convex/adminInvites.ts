import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireSuperAdmin } from "./helpers";
import { generateInviteCode, gymFromAddress } from "./inviteHelpers";

/** Lists all pending admin-role invites across all gyms for the super-admin panel. */
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
      throw new Error("Invite has expired - ask NorthernGlow to resend it");
    }

    await ctx.db.patch(userId, { gymId: invite.gymId, role: invite.role });
    await ctx.db.patch(invite._id, { status: "accepted" });

    return invite.gymId;
  },
});
