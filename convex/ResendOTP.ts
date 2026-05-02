import type { EmailConfig } from "@convex-dev/auth/server";

function buildResendErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { statusCode?: number; message?: string };
    if (
      parsed.statusCode === 403 &&
      parsed.message?.includes("You can only send testing emails")
    ) {
      return [
        "Resend is still in testing mode for this sender.",
        "Verify a sending domain in Resend and set AUTH_EMAIL_FROM to an address on that domain,",
        "or use the Resend account owner's email while testing.",
      ].join(" ");
    }
    return parsed.message ?? body;
  } catch {
    return body;
  }
}

/**
 * OTP email provider using the Resend API.
 * Sends a 6-digit numeric code to the user's email address.
 *
 * Required env vars:
 *   AUTH_RESEND_KEY  — your Resend API key
 *   AUTH_EMAIL_FROM  — verified sender address, e.g. "NorthernGlow <noreply@yourdomain.com>"
 *   AUTH_APP_NAME    — app/brand name shown in the email (defaults to "NorthernGlow")
 */
export const ResendOTP: EmailConfig = {
  id: "resend-otp",
  type: "email",
  name: "ResendOTP",
  from: "noreply@example.com", // overridden at send time via process.env
  maxAge: 60 * 60, // code valid for 1 hour
  async generateVerificationToken() {
    return String(Math.floor(100000 + Math.random() * 900000));
  },
  async sendVerificationRequest({ identifier: email, token }) {
    const apiKey = process.env.AUTH_RESEND_KEY;
    const from = process.env.AUTH_EMAIL_FROM ?? "NorthernGlow <noreply@example.com>";
    const appName = process.env.AUTH_APP_NAME ?? "NorthernGlow";

    if (!apiKey) throw new Error("AUTH_RESEND_KEY env var is not set");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `otp-${email}-${token}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Your ${appName} verification code`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#111">Verify your email</h2>
            <p>Enter this code in the app to sign in:</p>
            <p style="font-size:36px;font-weight:700;letter-spacing:10px;color:#111;margin:24px 0">
              ${token}
            </p>
            <p style="color:#666;font-size:14px">
              This code expires in 1 hour. If you didn't request this, you can ignore this email.
            </p>
          </div>`,
        text: `Your ${appName} verification code is: ${token}\n\nThis code expires in 1 hour.`,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to send verification email: ${buildResendErrorMessage(body)}`);
    }
  },
  options: {},
};
