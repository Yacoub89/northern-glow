import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

type AuthResult = {
  userId: Id<"users">;
  gymId: Id<"gyms">;
  user: Doc<"users">;
};

/**
 * Asserts the caller is authenticated and has accepted a gym invite.
 * Returns userId, gymId, and the full user document.
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<AuthResult> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthenticated");
  const user = await ctx.db.get(userId);
  if (!user?.gymId) {
    throw new Error("No gym membership — accept your invite first");
  }
  return { userId, gymId: user.gymId, user };
}

/**
 * Asserts the caller is authenticated, has a gym, and has a coach or admin role.
 * Returns userId and gymId.
 */
export async function requireCoachOrAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<{ userId: Id<"users">; gymId: Id<"gyms"> }> {
  const { userId, gymId, user } = await requireAuth(ctx);
  if (user.role !== "coach" && user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { userId, gymId };
}

/**
 * Asserts the caller is authenticated, has a gym, and has an admin role.
 */
export async function requireGymAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<{ userId: Id<"users">; gymId: Id<"gyms">; user: Doc<"users"> }> {
  const { userId, gymId, user } = await requireAuth(ctx);
  if (user.role !== "admin") {
    throw new Error("Only admins can manage staff");
  }
  return { userId, gymId, user };
}

export async function requireActiveMembershipForAthlete(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
  feature: string
) {
  if (user.role === "coach" || user.role === "admin") return null;

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();

  if (!membership || (membership.status !== "active" && membership.status !== "trialing")) {
    throw new Error(`An active membership is required to ${feature}`);
  }

  return membership;
}

/**
 * Asserts the caller is a NorthernGlow super-admin. The allowlist is configured
 * via the NORTHERNGLOW_SUPERADMIN_EMAILS env var (comma-separated).
 */
export async function requireSuperAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthenticated");
  const user = await ctx.db.get(userId);
  if (!user?.email) throw new Error("Unauthorized");
  const allowlist = (process.env.NORTHERNGLOW_SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!allowlist.includes(user.email.toLowerCase())) {
    throw new Error("Unauthorized");
  }
  return { userId, user };
}
