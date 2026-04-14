import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Backfills gymId on appointments that were created before gymId was added.
 * Resolves gymId from the coach's user record.
 * Run once after deploying the widened schema, then re-deploy with gymId required.
 */
export const backfillAppointmentGymId = internalMutation({
  args: {},
  handler: async (ctx) => {
    const appointments = await ctx.db
      .query("appointments")
      .filter((q) => q.eq(q.field("gymId"), undefined))
      .take(500);

    let patched = 0;
    for (const appointment of appointments) {
      const coach = await ctx.db.get(appointment.coachId);
      if (coach?.gymId) {
        await ctx.db.patch(appointment._id, { gymId: coach.gymId });
        patched++;
      }
    }

    return { patched };
  },
});
