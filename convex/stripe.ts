"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const getStripe = () =>
  new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

const PRICE_IDS = {
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

    const priceId = PRICE_IDS[plan][billingPeriod];
    const siteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

    const session = await getStripe().checkout.sessions.create({
      customer_email: user.email ?? undefined,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { convexUserId: userId, plan, billingPeriod },
      },
      success_url: `${siteUrl}/stripe/checkout-return?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/stripe/checkout-return?status=cancelled`,
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

    // Stripe can redirect before the subscription transitions incomplete → active.
    // If payment is confirmed but subscription is still incomplete, poll briefly.
    if (sub.status === "incomplete" && session.payment_status === "paid") {
      await new Promise((r) => setTimeout(r, 2000));
      sub = await getStripe().subscriptions.retrieve(sub.id);
    }

    await ctx.runMutation(internal.memberships.upsertMembership, {
      userId,
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
      await ctx.runMutation(internal.memberships.upsertMembership, {
        userId: meta.convexUserId as Id<"users">,
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
