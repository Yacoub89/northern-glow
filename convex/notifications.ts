"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Send push notifications via Expo Push API
export const sendPush = internalAction({
  args: {
    tokens: v.array(v.string()),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (_ctx, { tokens, title, body, data }) => {
    if (tokens.length === 0) return;

    const messages = tokens.map((to) => ({
      to,
      sound: "default" as const,
      title,
      body,
      data: data ?? {},
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
  },
});

// Class reminders — runs every 10 min via cron
export const sendClassReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;
    const windowStart = now + oneHourMs - 5 * 60 * 1000;
    const windowEnd = now + oneHourMs + 5 * 60 * 1000;

    const classes = await ctx.runQuery(internal.notificationQueries.getClassesInWindow, {
      windowStart,
      windowEnd,
    });

    for (const cls of classes) {
      const bookings = await ctx.runQuery(internal.notificationQueries.getBookedForClass, {
        classId: cls._id,
      });

      const tokens = bookings
        .map((b: any) => b.pushToken)
        .filter((t: any): t is string => !!t);

      if (tokens.length === 0) continue;

      const timeStr = cls.startTime.replace(
        /^(\d{2}):(\d{2})$/,
        (_: string, h: string, m: string) => {
          const hour = parseInt(h);
          const ampm = hour >= 12 ? "PM" : "AM";
          const h12 = hour % 12 || 12;
          return `${h12}:${m} ${ampm}`;
        }
      );

      await ctx.runAction(internal.notifications.sendPush, {
        tokens,
        title: "Class Starting Soon",
        body: `Your ${timeStr} class starts in 1 hour. See you there!`,
        data: { type: "class_reminder", classId: cls._id },
      });
    }
  },
});

// Membership expiry reminders — runs daily via cron
export const sendMembershipReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const windowEnd = now + 3 * 24 * 60 * 60 * 1000;

    const expiring = await ctx.runQuery(internal.notificationQueries.getExpiringMemberships, {
      windowEnd,
    });

    for (const { membership, pushToken } of expiring) {
      if (!pushToken) continue;
      const daysLeft = Math.ceil((membership.currentPeriodEnd - now) / (24 * 60 * 60 * 1000));
      await ctx.runAction(internal.notifications.sendPush, {
        tokens: [pushToken],
        title: "Membership Expiring Soon",
        body: `Your membership expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Renew to keep booking classes.`,
        data: { type: "membership_expiry" },
      });
    }
  },
});
