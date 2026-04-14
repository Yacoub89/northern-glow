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
