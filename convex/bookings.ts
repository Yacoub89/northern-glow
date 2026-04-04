import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { DatabaseReader } from "./_generated/server";
import { requireCoachOrAdmin } from "./helpers";

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

export const book = mutation({
  args: { classId: v.id("classes") },
  handler: async (ctx, { classId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const cls = await ctx.db.get(classId);
    if (!cls) throw new Error("Class not found");

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
