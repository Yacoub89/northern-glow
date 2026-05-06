import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireSuperAdmin } from "./helpers";
import { generateInviteCode } from "./inviteHelpers";

/**
 * Creates a gym for a client gym owner and sends them an admin invite email.
 * Does not link the gym to the super-admin's own account.
 */
export const superAdminCreateGym = mutation({
  args: {
    gymName: v.string(),
    tagline: v.string(),
    primaryColor: v.string(),
    timezone: v.string(),
    adminEmail: v.string(),
  },
  handler: async (ctx, { gymName, tagline, primaryColor, timezone, adminEmail }) => {
    const { userId } = await requireSuperAdmin(ctx);

    const normalizedEmail = adminEmail.toLowerCase().trim();

    const gymId = await ctx.db.insert("gyms", {
      name: gymName,
      tagline,
      primaryColor,
      timezone,
    });

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

    await ctx.scheduler.runAfter(0, internal.email.sendAdminPortalInviteEmail, {
      email: normalizedEmail,
      gymName,
      inviteCode,
    });

    return gymId;
  },
});
