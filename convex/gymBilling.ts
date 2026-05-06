import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

const PRICE_FIELDS = [
  "stripeUnlimitedMonthlyPriceId",
  "stripeUnlimitedAnnualPriceId",
  "stripeTwiceWeeklyMonthlyPriceId",
  "stripeTwiceWeeklyAnnualPriceId",
] as const;

/** Gym admin: update per-gym Stripe price IDs. */
export const updatePriceIds = mutation({
  args: {
    stripeUnlimitedMonthlyPriceId: v.optional(v.string()),
    stripeUnlimitedAnnualPriceId: v.optional(v.string()),
    stripeTwiceWeeklyMonthlyPriceId: v.optional(v.string()),
    stripeTwiceWeeklyAnnualPriceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Only admins can update billing settings");
    if (!user.gymId) throw new Error("No gym associated with this account");

    for (const field of PRICE_FIELDS) {
      const val = args[field];
      if (val !== undefined && val !== "" && !val.startsWith("price_")) {
        throw new Error(`${field} must be a Stripe price ID (price_...)`);
      }
    }

    const updates = Object.fromEntries(
      Object.entries(args).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(user.gymId, updates);
  },
});
