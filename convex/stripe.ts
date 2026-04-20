"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const getStripe = () =>
  new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

// Fall-back global price IDs (used if the gym hasn't configured their own)
const FALLBACK_PRICE_IDS = {
  unlimited: {
    monthly: process.env.STRIPE_PRICE_UNLIMITED_MONTHLY!,
    annual: process.env.STRIPE_PRICE_UNLIMITED_ANNUAL!,
  },
  twice_weekly: {
    monthly: process.env.STRIPE_PRICE_TWICE_WEEKLY_MONTHLY!,
    annual: process.env.STRIPE_PRICE_TWICE_WEEKLY_ANNUAL!,
  },
} as const;

function mapStatus(
  s: string
): "active" | "trialing" | "past_due" | "cancelled" | "incomplete" {
  if (s === "active") return "active";
  if (s === "trialing") return "trialing";
  if (s === "past_due") return "past_due";
  if (s === "canceled" || s === "incomplete_expired") return "cancelled";
  return "incomplete";
}

export const createCheckoutSession = action({
  args: {
    plan: v.union(v.literal("unlimited"), v.literal("twice_weekly")),
    billingPeriod: v.union(v.literal("monthly"), v.literal("annual")),
    returnUrl: v.optional(v.string()),
  },
  handler: async (ctx, { plan, billingPeriod, returnUrl }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const user = await ctx.runQuery(internal.memberships.getUserInfo, { userId });
    if (!user) throw new Error("User not found");

    // Use gym-specific price IDs if configured, otherwise fall back to global
    const gym = await ctx.runQuery(internal.gyms.getGymByUserId, { userId });
    const priceId =
      plan === "unlimited"
        ? billingPeriod === "monthly"
          ? (gym?.stripeUnlimitedMonthlyPriceId ?? FALLBACK_PRICE_IDS.unlimited.monthly)
          : (gym?.stripeUnlimitedAnnualPriceId ?? FALLBACK_PRICE_IDS.unlimited.annual)
        : billingPeriod === "monthly"
          ? (gym?.stripeTwiceWeeklyMonthlyPriceId ?? FALLBACK_PRICE_IDS.twice_weekly.monthly)
          : (gym?.stripeTwiceWeeklyAnnualPriceId ?? FALLBACK_PRICE_IDS.twice_weekly.annual);

    const siteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

    const gymSlug = gym
      ? gym.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      : "ocfit";

    const session = await getStripe().checkout.sessions.create({
      customer_email: user.email ?? undefined,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          convexUserId: userId,
          convexGymId: user.gymId ?? "",
          plan,
          billingPeriod,
        },
      },
      success_url: `${siteUrl}/stripe/checkout-return?status=success&session_id={CHECKOUT_SESSION_ID}&scheme=${gymSlug}${returnUrl ? `&return_url=${encodeURIComponent(returnUrl)}` : ""}`,
      cancel_url: `${siteUrl}/stripe/checkout-return?status=cancelled&scheme=${gymSlug}${returnUrl ? `&return_url=${encodeURIComponent(returnUrl)}` : ""}`,
    });

    return session.url!;
  },
});

export const createPortalSession = action({
  args: { returnUrl: v.optional(v.string()) },
  handler: async (ctx, { returnUrl }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const membership = await ctx.runQuery(internal.memberships.getByUserId, {
      userId,
    });
    if (!membership?.stripeCustomerId) throw new Error("No active subscription found");

    const siteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
    const session = await getStripe().billingPortal.sessions.create({
      customer: membership.stripeCustomerId,
      return_url: `${siteUrl}/stripe/checkout-return?status=portal${returnUrl ? `&return_url=${encodeURIComponent(returnUrl)}` : ""}`,
    });

    return session.url;
  },
});

export const syncFromSession = action({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    let sub = session.subscription as Stripe.Subscription | null;
    if (!sub) return;

    if (sub.status === "incomplete" && session.payment_status === "paid") {
      await new Promise((r) => setTimeout(r, 2000));
      sub = await getStripe().subscriptions.retrieve(sub.id);
    }

    const gymId = sub.metadata.convexGymId
      ? (sub.metadata.convexGymId as Id<"gyms">)
      : undefined;

    await ctx.runMutation(internal.memberships.upsertMembership, {
      userId,
      gymId,
      stripeCustomerId: sub.customer as string,
      stripeSubscriptionId: sub.id,
      stripePriceId: sub.items.data[0].price.id,
      plan: sub.metadata.plan as "unlimited" | "twice_weekly",
      billingPeriod: sub.metadata.billingPeriod as "monthly" | "annual",
      status: mapStatus(sub.status),
      currentPeriodEnd: sub.items.data[0].current_period_end * 1000,
    });
  },
});

export const createEventCheckoutSession = action({
  args: { eventId: v.id("events"), returnUrl: v.optional(v.string()) },
  handler: async (ctx, { eventId, returnUrl }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const { event, user } = await ctx.runQuery(
      internal.events.getEventForCheckout,
      { eventId, userId }
    );
    if (!event) throw new Error("Event not found");
    if (event.priceCents === 0) throw new Error("This event is free — use registerFree instead");
    if (event.status !== "upcoming") throw new Error("Event is not available");
    if (event.capacity !== undefined && event.registeredCount >= event.capacity) {
      throw new Error("Event is full");
    }
    if (!user) throw new Error("User not found");

    // Prevent double-registration: block if a paid registration already exists
    const existingReg = await ctx.runQuery(internal.events.getRegistrationForCancel, {
      eventId,
      userId,
    });
    if (existingReg && existingReg.paymentStatus === "paid") {
      throw new Error("Already registered for this event");
    }

    const siteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
    const gymSlug = event.gymId
      ? (await ctx.runQuery(internal.gyms.getGymByUserId, { userId }))
          ?.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") ?? "ocfit"
      : "ocfit";

    const session = await getStripe().checkout.sessions.create({
      customer_email: user.email ?? undefined,
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: process.env.STRIPE_CURRENCY ?? "cad",
            unit_amount: event.priceCents,
            product_data: {
              name: event.title,
              description: event.description ?? undefined,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          convexUserId: userId,
          convexEventId: eventId,
        },
      },
      metadata: {
        convexUserId: userId,
        convexEventId: eventId,
      },
      success_url: `${siteUrl}/stripe/event-checkout-return?status=success&session_id={CHECKOUT_SESSION_ID}&event_id=${eventId}&scheme=${gymSlug}${returnUrl ? `&return_url=${encodeURIComponent(returnUrl)}` : ""}`,
      cancel_url: `${siteUrl}/stripe/event-checkout-return?status=cancelled&event_id=${eventId}&scheme=${gymSlug}${returnUrl ? `&return_url=${encodeURIComponent(returnUrl)}` : ""}`,
    });

    // Insert a pending registration record so we can confirm it after payment
    await ctx.runMutation(internal.events.insertPendingRegistration, {
      eventId,
      userId,
      gymId: event.gymId,
      stripeSessionId: session.id,
    });

    return session.url!;
  },
});

export const syncEventFromSession = action({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      await ctx.runMutation(internal.events.confirmPaidRegistration, {
        stripeSessionId: sessionId,
      });
    }
  },
});

export const cancelEventRegistration = action({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const reg = await ctx.runQuery(internal.events.getRegistrationForCancel, {
      eventId,
      userId,
    });
    if (!reg) throw new Error("No active registration found");

    if (reg.paymentStatus === "paid" && reg.stripeSessionId) {
      const session = await getStripe().checkout.sessions.retrieve(
        reg.stripeSessionId
      );
      if (session.payment_intent) {
        try {
          await getStripe().refunds.create({
            payment_intent: session.payment_intent as string,
          });
        } catch (e: any) {
          console.error("Refund failed or already refunded:", e.message);
        }
      }
    }

    await ctx.runMutation(internal.events.markRegistrationCancelled, {
      registrationId: reg._id,
      eventId,
    });
  },
});

export const processWebhook = internalAction({
  args: { payload: v.string(), signature: v.string() },
  handler: async (ctx, { payload, signature }) => {
    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch {
      throw new Error("Invalid webhook signature");
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const meta = sub.metadata;
      const userId = meta.convexUserId as Id<"users">;

      // Look up gymId from the user record (more reliable than metadata)
      const gymId = await ctx.runQuery(internal.gyms.getGymIdForUser, { userId });

      await ctx.runMutation(internal.memberships.upsertMembership, {
        userId,
        gymId: gymId ?? undefined,
        stripeCustomerId: sub.customer as string,
        stripeSubscriptionId: sub.id,
        stripePriceId: sub.items.data[0].price.id,
        plan: meta.plan as "unlimited" | "twice_weekly",
        billingPeriod: meta.billingPeriod as "monthly" | "annual",
        status: mapStatus(sub.status),
        currentPeriodEnd: sub.items.data[0].current_period_end * 1000,
      });
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      await ctx.runMutation(internal.memberships.cancelMembership, {
        stripeSubscriptionId: sub.id,
      });
    } else if (event.type === "checkout.session.completed") {
      // Handle one-time event payments
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment" && session.payment_status === "paid") {
        await ctx.runMutation(internal.events.confirmPaidRegistration, {
          stripeSessionId: session.id,
        });
      }
    }
  },
});

/** Issue a full refund for a paid event registration. Scheduled by events.cancel. */
export const refundEventRegistration = internalAction({
  args: { stripeSessionId: v.string() },
  handler: async (_ctx, { stripeSessionId }) => {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
    if (session.payment_intent) {
      try {
        await stripe.refunds.create({
          payment_intent: session.payment_intent as string,
        });
      } catch (e: any) {
        console.error("Refund failed for session", stripeSessionId, ":", e.message);
      }
    }
  },
});
