import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { DatabaseReader } from "./_generated/server";
import { requireCoachOrAdmin } from "./helpers";
import { internal } from "./_generated/api";

async function getWaitlisted(db: DatabaseReader, classId: Id<"classes">) {
  const waitlisted = await db
    .query("bookings")
    .withIndex("by_class_status", (q) =>
      q.eq("classId", classId).eq("status", "waitlist")
    )
    .collect();
  return waitlisted.sort(
    (a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0)
  );
}

export const getMyUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const today = new Date().toISOString().split("T")[0];

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const active = bookings.filter(
      (b) => b.status === "booked" || b.status === "waitlist"
    );

    const enriched = await Promise.all(
      active.map(async (b) => {
        const cls = await ctx.db.get(b.classId);
        if (!cls || cls.date < today) return null;
        const coach = cls.coachId ? await ctx.db.get(cls.coachId) : null;
        return { booking: b, cls, coachName: coach?.name ?? "Coach" };
      })
    );

    return enriched
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => {
        if (a.cls.date !== b.cls.date)
          return a.cls.date < b.cls.date ? -1 : 1;
        return a.cls.startTime < b.cls.startTime ? -1 : 1;
      });
  },
});

export const getMyBookings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getMyUpcomingBooking = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const myBookings = await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const active = myBookings.filter((b) => b.status !== "cancelled");
    const slots = await Promise.all(active.map((b) => ctx.db.get(b.classId)));

    for (let i = 0; i < active.length; i++) {
      if (slots[i]?.date === date) return { booking: active[i], slot: slots[i]! };
    }
    return null;
  },
});

export const getUserBookingForClass = query({
  args: { classId: v.id("classes") },
  handler: async (ctx, { classId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("bookings")
      .withIndex("by_class_user", (q) =>
        q.eq("classId", classId).eq("userId", userId)
      )
      .first();
  },
});

export const getClassRoster = query({
  args: { classId: v.id("classes") },
  handler: async (ctx, { classId }) => {
    await requireCoachOrAdmin(ctx);
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_class", (q) => q.eq("classId", classId))
      .collect();
    return await Promise.all(
      bookings.map(async (b) => ({ ...b, user: await ctx.db.get(b.userId) }))
    );
  },
});

export const checkIn = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    await requireCoachOrAdmin(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "booked") throw new Error("Athlete is not booked");
    await ctx.db.patch(bookingId, { checkedInAt: Date.now() });
  },
});

export const uncheckIn = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    await requireCoachOrAdmin(ctx);
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found");
    await ctx.db.patch(bookingId, { checkedInAt: undefined });
  },
});

export const book = mutation({
  args: { classId: v.id("classes") },
  handler: async (ctx, { classId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const cls = await ctx.db.get(classId);
    if (!cls) throw new Error("Class not found");

    // Membership gate — coaches and admins always bypass
    const user = await ctx.db.get(userId);
    if (user?.role !== "coach" && user?.role !== "admin") {
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      if (!membership || (membership.status !== "active" && membership.status !== "trialing")) {
        throw new Error("An active membership is required to book classes");
      }

      // 2x/week cap: count booked classes in the same calendar week as the target class
      if (membership.plan === "twice_weekly") {
        const classDate = new Date(cls.date + "T00:00:00Z");
        const dow = classDate.getUTCDay(); // 0=Sun
        const daysToMon = dow === 0 ? 6 : dow - 1;
        const mon = new Date(classDate);
        mon.setUTCDate(classDate.getUTCDate() - daysToMon);
        const sun = new Date(mon);
        sun.setUTCDate(mon.getUTCDate() + 7);
        const weekStart = mon.toISOString().split("T")[0];
        const weekEnd = sun.toISOString().split("T")[0]; // exclusive

        const userBookings = await ctx.db
          .query("bookings")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(100);

        const bookedClasses = await Promise.all(
          userBookings
            .filter((b) => b.status === "booked" && b.classId !== classId)
            .map((b) => ctx.db.get(b.classId))
        );

        const weekCount = bookedClasses.filter(
          (c) => c && c.date >= weekStart && c.date < weekEnd
        ).length;

        if (weekCount >= 2) {
          throw new Error(
            "You've reached your 2 classes/week limit for this week"
          );
        }
      }
    }

    const existing = await ctx.db
      .query("bookings")
      .withIndex("by_class_user", (q) =>
        q.eq("classId", classId).eq("userId", userId)
      )
      .first();

    if (existing?.status === "booked" || existing?.status === "waitlist") {
      throw new Error("Already booked for this class");
    }

    const isFull = cls.bookedCount >= cls.capacity;

    if (!isFull) {
      if (existing) {
        await ctx.db.patch(existing._id, {
          status: "booked",
          waitlistPosition: undefined,
          bookedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("bookings", {
          classId,
          userId,
          status: "booked",
          bookedAt: Date.now(),
        });
      }
      await ctx.db.patch(classId, { bookedCount: cls.bookedCount + 1 });
      return { status: "booked" as const };
    } else {
      const waitlisted = await getWaitlisted(ctx.db, classId);
      const position = waitlisted.length + 1;
      if (existing) {
        await ctx.db.patch(existing._id, {
          status: "waitlist",
          waitlistPosition: position,
          bookedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("bookings", {
          classId,
          userId,
          status: "waitlist",
          waitlistPosition: position,
          bookedAt: Date.now(),
        });
      }
      return { status: "waitlist" as const, position };
    }
  },
});

export const cancel = mutation({
  args: { classId: v.id("classes") },
  handler: async (ctx, { classId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_class_user", (q) =>
        q.eq("classId", classId).eq("userId", userId)
      )
      .first();

    if (!booking) throw new Error("No booking found");
    if (booking.status === "cancelled") throw new Error("Already cancelled");

    const prevStatus = booking.status;
    const prevPosition = booking.waitlistPosition;
    await ctx.db.patch(booking._id, { status: "cancelled" });

    if (prevStatus === "booked") {
      const cls = await ctx.db.get(classId);
      if (!cls) return;

      const newCount = Math.max(0, cls.bookedCount - 1);
      await ctx.db.patch(classId, { bookedCount: newCount });

      const waitlisted = await getWaitlisted(ctx.db, classId);
      if (waitlisted.length > 0) {
        const [first, ...rest] = waitlisted;
        await Promise.all([
          ctx.db.patch(first._id, { status: "booked", waitlistPosition: undefined }),
          ctx.db.patch(classId, { bookedCount: newCount + 1 }),
          ...rest.map((b, i) => ctx.db.patch(b._id, { waitlistPosition: i + 1 })),
        ]);
        // Notify promoted athlete
        const promotedUser = await ctx.db.get(first.userId);
        if (promotedUser?.pushToken) {
          const cls = await ctx.db.get(classId);
          await ctx.scheduler.runAfter(0, internal.notifications.sendPush, {
            tokens: [promotedUser.pushToken],
            title: "You're off the waitlist!",
            body: cls
              ? `A spot opened up for the ${cls.startTime} class on ${cls.date}. You're booked!`
              : "A spot opened up — you're now booked!",
            data: { type: "waitlist_promoted", classId },
          });
        }
      }
    } else if (prevStatus === "waitlist" && prevPosition !== undefined) {
      const waitlisted = await getWaitlisted(ctx.db, classId);
      await Promise.all(
        waitlisted
          .filter((b) => (b.waitlistPosition ?? 0) > prevPosition)
          .map((b) =>
            ctx.db.patch(b._id, {
              waitlistPosition: (b.waitlistPosition ?? 0) - 1,
            })
          )
      );
    }
  },
});
