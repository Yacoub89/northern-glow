import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

/** Asserts the caller is authenticated and has a coach or admin role.
 *  Returns the caller's userId on success. */
export async function requireCoachOrAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthenticated");
  const user = await ctx.db.get(userId);
  if (user?.role !== "coach" && user?.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return userId;
}
