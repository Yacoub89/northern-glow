import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

auth.addHttpRoutes(http);

// Stripe webhook — receives subscription lifecycle events
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    const payload = await req.text();

    try {
      await ctx.runAction(internal.stripe.processWebhook, { payload, signature });
    } catch (err) {
      console.error("Webhook error:", err);
      return new Response("Webhook processing failed", { status: 400 });
    }

    return new Response("OK", { status: 200 });
  }),
});

// After Stripe Checkout — redirects the browser back into the app via deep link
http.route({
  path: "/stripe/checkout-return",
  method: "GET",
  handler: httpAction(async (_ctx, req) => {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "cancelled";
    const sessionId = url.searchParams.get("session_id") ?? "";
    const deepLink = `northernglow://membership?status=${status}${sessionId ? `&session_id=${encodeURIComponent(sessionId)}` : ""}`;

    const html = `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /><title>Redirecting…</title></head>
  <body>
    <script>window.location.replace("${deepLink}");</script>
    <p>Redirecting back to the app…
      <a href="${deepLink}">Tap here if nothing happens.</a>
    </p>
  </body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }),
});

// Gym build config — returns branding data + resolved asset URLs for the white-label build script.
// Secured with the NORTHERNGLOW_BUILD_SECRET environment variable.
http.route({
  path: "/gym-build-config",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const buildSecret = process.env.NORTHERNGLOW_BUILD_SECRET;

    if (!buildSecret || secret !== buildSecret) {
      return new Response("Unauthorized", { status: 401 });
    }

    const gymId = url.searchParams.get("gymId");
    if (!gymId) {
      return new Response("Missing gymId", { status: 400 });
    }

    const gym = await ctx.runQuery(internal.gyms.getGymForBuild, {
      gymId: gymId as Id<"gyms">,
    });

    if (!gym) {
      return new Response("Gym not found", { status: 404 });
    }

    return new Response(JSON.stringify(gym), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
