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
  },
  handler: async (ctx, { plan, billingPeriod }) => {
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
      success_url: `${siteUrl}/stripe/checkout-return?status=success&session_id={CHECKOUT_SESSION_ID}&scheme=${gymSlug}`,
      cancel_url: `${siteUrl}/stripe/checkout-return?status=cancelled&scheme=${gymSlug}`,
    });

    return session.url!;
  },
});

export const createPortalSession = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const membership = await ctx.runQuery(internal.memberships.getByUserId, {
      userId,
    });
    if (!membership?.stripeCustomerId) throw new Error("No active subscription found");

    const siteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
    const session = await getStripe().billingPortal.sessions.create({
      customer: membership.stripeCustomerId,
      return_url: `${siteUrl}/stripe/checkout-return?status=portal`,
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
    }
  },
});
