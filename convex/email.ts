import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Sends a welcome email after a new user is created.
 * Uses the Resend API directly via fetch (no extra npm package needed).
 *
 * Required env vars:
 *   AUTH_RESEND_KEY  — your Resend API key
 *   AUTH_EMAIL_FROM  — verified sender address
 */
export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (_ctx, { email, name }) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    const from =
      process.env.AUTH_EMAIL_FROM ?? "OCFit <noreply@example.com>";

    if (!apiKey) {
      console.warn("AUTH_RESEND_KEY not set — skipping welcome email");
      return;
    }

    const firstName = name?.split(" ")[0] ?? "";
    const greeting = firstName ? `, ${firstName}` : "";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Welcome to OCFit${greeting}!`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h1 style="color:#111">Welcome${greeting}! 🎉</h1>
            <p>Your OCFit account is ready. Here's what you can do:</p>
            <ul>
              <li>Book classes and join the community</li>
              <li>Track your WOD results and personal records</li>
              <li>View the schedule and manage your bookings</li>
            </ul>
            <p>See you on the floor!</p>
          </div>`,
        text: `Welcome${greeting}! Your OCFit account is ready. Start booking classes and tracking your results.`,
      }),
    });

    if (!res.ok) {
      console.error("Welcome email failed:", await res.text());
    }
  },
});
