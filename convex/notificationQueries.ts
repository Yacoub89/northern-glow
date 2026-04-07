import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Convert a "YYYY-MM-DD HH:MM" gym local time (America/New_York) to UTC ms.
// Handles both EST (UTC-5) and EDT (UTC-4) automatically.
function nyLocalToUtcMs(dateStr: string, timeStr: string): number {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, m] = timeStr.split(":").map(Number);
  // Start with EST guess (UTC-5)
  const estMs = Date.UTC(y, mo - 1, d, h + 5, m);
  const dt = new Date(estMs);
  // Ask JS what NY hour this UTC moment actually is
  const nyHour = parseInt(
    dt.toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }),
    10
  );
  // If EDT (UTC-4), nyHour will be h+1 — shift back by 1 hour
  const drift = nyHour - h;
  return estMs - drift * 60 * 60 * 1000;
}

// Convert a UTC ms timestamp to its YYYY-MM-DD date string in New York time
function utcMsToNYDateStr(ts: number): string {
  return new Date(ts).toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  }); // en-CA gives YYYY-MM-DD format
}

export const getClassesInWindow = internalQuery({
  args: { windowStart: v.number(), windowEnd: v.number() },
  handler: async (ctx, { windowStart, windowEnd }) => {
    const startDate = utcMsToNYDateStr(windowStart);
    const endDate = utcMsToNYDateStr(windowEnd);

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_date", (q) => q.eq("date", startDate))
      .collect();

    const nextDayClasses =
      startDate !== endDate
        ? await ctx.db
            .query("classes")
            .withIndex("by_date", (q) => q.eq("date", endDate))
            .collect()
        : [];

    return [...classes, ...nextDayClasses].filter((cls) => {
      const classTs = nyLocalToUtcMs(cls.date, cls.startTime);
      return classTs >= windowStart && classTs <= windowEnd;
    });
  },
});

export const getBookedForClass = internalQuery({
  args: { classId: v.id("classes") },
  handler: async (ctx, { classId }) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_class_status", (q) =>
        q.eq("classId", classId).eq("status", "booked")
      )
      .collect();

    return Promise.all(
      bookings
        .filter((b) => !b.checkedInAt)
        .map(async (b) => {
          const user = await ctx.db.get(b.userId);
          return { ...b, pushToken: user?.pushToken ?? null };
        })
    );
  },
});

export const getExpiringMemberships = internalQuery({
  args: { windowEnd: v.number() },
  handler: async (ctx, { windowEnd }) => {
    const now = Date.now();
    const memberships = await ctx.db
      .query("memberships")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.gt(q.field("currentPeriodEnd"), now),
          q.lt(q.field("currentPeriodEnd"), windowEnd)
        )
      )
      .take(100);

    return Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return { membership: m, pushToken: user?.pushToken ?? null };
      })
    );
  },
});
