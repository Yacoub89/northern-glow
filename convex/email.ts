import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_WEB_URL = "https://www.northernglow.fit";

function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDate(date: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function buildGoogleCalendarUrl(params: {
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  description?: string;
}): string {
  const dateStr = params.date.replace(/-/g, "");
  const [sh, sm] = params.startTime.split(":").map(Number);
  const startStr = `${String(sh).padStart(2, "0")}${String(sm).padStart(2, "0")}00`;
  const totalEnd = sh * 60 + sm + params.durationMinutes;
  const endH = Math.floor(totalEnd / 60) % 24;
  const endM = totalEnd % 60;
  const endStr = `${String(endH).padStart(2, "0")}${String(endM).padStart(2, "0")}00`;
  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${dateStr}T${startStr}/${dateStr}T${endStr}`,
    details: params.description ?? "",
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

function generateICS(params: {
  date: string;
  startTime: string;
  durationMinutes: number;
  athleteName: string;
  coachName: string;
  athleteEmail: string;
  coachEmail: string;
  gymName: string;
  notes?: string;
}): string {
  const dateStr = params.date.replace(/-/g, "");
  const [sh, sm] = params.startTime.split(":").map(Number);
  const startStr = `${String(sh).padStart(2, "0")}${String(sm).padStart(2, "0")}00`;
  const totalEnd = sh * 60 + sm + params.durationMinutes;
  const endH = Math.floor(totalEnd / 60) % 24;
  const endM = totalEnd % 60;
  const endStr = `${String(endH).padStart(2, "0")}${String(endM).padStart(2, "0")}00`;
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@northernglow.app`;
  const prodId = params.gymName.replace(/\s+/g, "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${prodId}//${prodId}//EN`,
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${dateStr}T${startStr}`,
    `DTEND:${dateStr}T${endStr}`,
    `SUMMARY:1-on-1 Session: ${params.athleteName} & ${params.coachName}`,
    `DESCRIPTION:${params.notes ?? "Personal training session"}`,
    "STATUS:CONFIRMED",
    `ORGANIZER:mailto:${params.coachEmail}`,
    `ATTENDEE;RSVP=TRUE:mailto:${params.athleteEmail}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// ── Welcome email ─────────────────────────────────────────────────────────────

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    gymName: v.string(),
    fromAddress: v.optional(v.string()),
  },
  handler: async (_ctx, { email, name, gymName, fromAddress }) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    const from =
      fromAddress ?? process.env.AUTH_EMAIL_FROM ?? `${gymName} <noreply@example.com>`;
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
        "Idempotency-Key": `welcome-${email}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Welcome to ${gymName}${greeting}!`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h1 style="color:#111">Welcome to ${gymName}${greeting}!</h1>
            <p>Your account is ready. Here's what you can do:</p>
            <ul>
              <li>Book classes and join the community</li>
              <li>Track your WOD results and personal records</li>
              <li>View the schedule and manage your bookings</li>
            </ul>
            <p>See you on the floor!</p>
          </div>`,
        text: `Welcome to ${gymName}${greeting}! Your account is ready. Start booking classes and tracking your results.`,
      }),
    });

    if (!res.ok) {
      console.error("Welcome email failed:", await res.text());
    }
  },
});

// ── Invite email ──────────────────────────────────────────────────────────────

export const sendInviteEmail = internalAction({
  args: {
    email: v.string(),
    gymName: v.string(),
    inviteCode: v.string(),
    role: v.union(v.literal("athlete"), v.literal("coach"), v.literal("admin")),
    fromAddress: v.optional(v.string()),
  },
  handler: async (_ctx, { email, gymName, inviteCode, role, fromAddress }) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    const from =
      fromAddress ?? process.env.AUTH_EMAIL_FROM ?? `${gymName} <noreply@example.com>`;
    if (!apiKey) {
      console.warn("AUTH_RESEND_KEY not set — skipping invite email");
      return;
    }

    const roleLabel =
      role === "admin" ? "Admin" : role === "coach" ? "Coach" : "Athlete";
    const webUrl = process.env.NORTHERNGLOW_WEB_URL ?? DEFAULT_WEB_URL;
    const createAccountUrl = `${webUrl.replace(/\/$/, "")}/createaccount?invite=${encodeURIComponent(inviteCode)}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `invite-${inviteCode}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `You've been invited to join ${gymName}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#111">You're invited to ${gymName}!</h2>
            <p>You've been invited as a <strong>${roleLabel}</strong>.</p>
            <p>Create an account using <strong>this email address</strong>. Athlete accounts use the NorthernGlow mobile app after signup.</p>
            <a href="${createAccountUrl}" style="display:inline-block;background:#1BBFBF;color:#000;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;margin:16px 0">Create account</a>
            <p style="color:#555;font-size:13px">
              This invite expires in 7 days.
            </p>
          </div>`,
        text: `You've been invited to join ${gymName} as a ${roleLabel}. Create your account using this email address: ${createAccountUrl}. Athlete accounts use the NorthernGlow mobile app after signup.`,
      }),
    });

    if (!res.ok) {
      console.error("Invite email failed:", await res.text());
    }
  },
});

// ── Class booking confirmation ────────────────────────────────────────────────

export const sendClassBookingEmail = internalAction({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    coachName: v.string(),
    status: v.union(v.literal("booked"), v.literal("waitlist")),
    waitlistPosition: v.optional(v.number()),
    fromAddress: v.optional(v.string()),
  },
  handler: async (
    _ctx,
    { email, name, date, startTime, coachName, status, waitlistPosition, fromAddress }
  ) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    const from =
      fromAddress ?? process.env.AUTH_EMAIL_FROM ?? "noreply@example.com";
    if (!apiKey) {
      console.warn("AUTH_RESEND_KEY not set — skipping class booking email");
      return;
    }

    const firstName = name?.split(" ")[0] ?? "there";
    const dateLabel = formatDate(date);
    const timeLabel = formatTime12h(startTime);

    const isWaitlist = status === "waitlist";
    const subject = isWaitlist
      ? `Waitlist #${waitlistPosition}: ${timeLabel} on ${dateLabel}`
      : `Booking confirmed: ${timeLabel} on ${dateLabel}`;

    const headline = isWaitlist
      ? `You're on the waitlist (#${waitlistPosition})`
      : "You're booked!";
    const detail = isWaitlist
      ? `You're currently <strong>#${waitlistPosition}</strong> on the waitlist for the <strong>${timeLabel}</strong> class on <strong>${dateLabel}</strong>. We'll notify you if a spot opens up.`
      : `Your spot in the <strong>${timeLabel}</strong> class on <strong>${dateLabel}</strong> with coach <strong>${coachName}</strong> is confirmed.`;
    const textDetail = isWaitlist
      ? `You're #${waitlistPosition} on the waitlist for the ${timeLabel} class on ${dateLabel}. We'll notify you if a spot opens up.`
      : `Your spot in the ${timeLabel} class on ${dateLabel} with coach ${coachName} is confirmed.`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `booking-${email}-${date}-${startTime}-${status}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#111">Hey ${firstName}, ${headline}</h2>
            <p>${detail}</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:6px 0;color:#555">Date</td><td style="padding:6px 0;font-weight:600">${dateLabel}</td></tr>
              <tr><td style="padding:6px 0;color:#555">Time</td><td style="padding:6px 0;font-weight:600">${timeLabel}</td></tr>
              <tr><td style="padding:6px 0;color:#555">Coach</td><td style="padding:6px 0;font-weight:600">${coachName}</td></tr>
            </table>
            <p style="color:#555;font-size:13px">See you on the floor!</p>
          </div>`,
        text: `Hey ${firstName}, ${textDetail} Coach: ${coachName}.`,
      }),
    });

    if (!res.ok) {
      console.error("Class booking email failed:", await res.text());
    }
  },
});

// ── 1-on-1 appointment confirmation (+ .ics calendar invite) ─────────────────

export const sendAppointmentEmail = internalAction({
  args: {
    athleteEmail: v.string(),
    athleteName: v.optional(v.string()),
    coachEmail: v.string(),
    coachName: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    durationMinutes: v.number(),
    notes: v.optional(v.string()),
    gymName: v.optional(v.string()),
    fromAddress: v.optional(v.string()),
  },
  handler: async (
    _ctx,
    {
      athleteEmail,
      athleteName,
      coachEmail,
      coachName,
      date,
      startTime,
      durationMinutes,
      notes,
      gymName = "your gym",
      fromAddress,
    }
  ) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    const from =
      fromAddress ?? process.env.AUTH_EMAIL_FROM ?? "noreply@example.com";
    if (!apiKey) {
      console.warn("AUTH_RESEND_KEY not set — skipping appointment email");
      return;
    }

    const athleteFirst = athleteName?.split(" ")[0] ?? "there";
    const dateLabel = formatDate(date);
    const timeLabel = formatTime12h(startTime);
    const subject = `1-on-1 confirmed: ${timeLabel} on ${dateLabel}`;

    const icsContent = generateICS({
      date,
      startTime,
      durationMinutes,
      athleteName: athleteName ?? "Athlete",
      coachName: coachName ?? "Coach",
      athleteEmail,
      coachEmail,
      gymName,
      notes,
    });
    const icsBase64 = btoa(icsContent);

    const googleCalUrl = buildGoogleCalendarUrl({
      title: `1-on-1 Session: ${athleteName ?? "Athlete"} & ${coachName ?? "Coach"}`,
      date,
      startTime,
      durationMinutes,
      description: notes ?? "Personal training session",
    });

    const calendarButtons = `
      <div style="margin:20px 0">
        <a href="${googleCalUrl}"
           style="display:inline-block;background:#4285F4;color:#fff;font-weight:600;padding:11px 22px;border-radius:6px;text-decoration:none;font-size:14px;margin-right:8px">
          Add to Google Calendar
        </a>
        <p style="color:#777;font-size:12px;margin:10px 0 0">
          On iOS or using Outlook? Tap the <strong>invite.ics</strong> attachment below to add directly to your calendar.
        </p>
      </div>`;

    const athleteHtml = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#111">Hey ${athleteFirst}, your 1-on-1 is confirmed!</h2>
        <p>Your session with <strong>${coachName ?? "your coach"}</strong> is booked.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 0;color:#555">Date</td><td style="padding:6px 0;font-weight:600">${dateLabel}</td></tr>
          <tr><td style="padding:6px 0;color:#555">Time</td><td style="padding:6px 0;font-weight:600">${timeLabel}</td></tr>
          <tr><td style="padding:6px 0;color:#555">Duration</td><td style="padding:6px 0;font-weight:600">${durationMinutes} min</td></tr>
          <tr><td style="padding:6px 0;color:#555">Coach</td><td style="padding:6px 0;font-weight:600">${coachName ?? "TBD"}</td></tr>
          ${notes ? `<tr><td style="padding:6px 0;color:#555">Notes</td><td style="padding:6px 0">${notes}</td></tr>` : ""}
        </table>
        ${calendarButtons}
        <p style="color:#555;font-size:13px">See you there!</p>
      </div>`;

    const coachHtml = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#111">New 1-on-1 booking from ${athleteName ?? "an athlete"}</h2>
        <p>A session has been booked with you.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 0;color:#555">Athlete</td><td style="padding:6px 0;font-weight:600">${athleteName ?? "Unknown"}</td></tr>
          <tr><td style="padding:6px 0;color:#555">Date</td><td style="padding:6px 0;font-weight:600">${dateLabel}</td></tr>
          <tr><td style="padding:6px 0;color:#555">Time</td><td style="padding:6px 0;font-weight:600">${timeLabel}</td></tr>
          <tr><td style="padding:6px 0;color:#555">Duration</td><td style="padding:6px 0;font-weight:600">${durationMinutes} min</td></tr>
          ${notes ? `<tr><td style="padding:6px 0;color:#555">Notes</td><td style="padding:6px 0">${notes}</td></tr>` : ""}
        </table>
        ${calendarButtons}
      </div>`;

    const attachment = { filename: "invite.ics", content: icsBase64 };
    const sends = [];

    if (athleteEmail) {
      sends.push(
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `appt-athlete-${athleteEmail}-${date}-${startTime}`,
          },
          body: JSON.stringify({
            from,
            to: [athleteEmail],
            subject,
            html: athleteHtml,
            text: `Hey ${athleteFirst}, your 1-on-1 with ${coachName ?? "your coach"} on ${dateLabel} at ${timeLabel} (${durationMinutes} min) is confirmed.`,
            attachments: [attachment],
          }),
        })
      );
    }

    if (coachEmail) {
      sends.push(
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `appt-coach-${coachEmail}-${athleteEmail}-${date}-${startTime}`,
          },
          body: JSON.stringify({
            from,
            to: [coachEmail],
            subject: `New booking: ${athleteName ?? "Athlete"} — ${timeLabel} on ${dateLabel}`,
            html: coachHtml,
            text: `${athleteName ?? "An athlete"} booked a 1-on-1 with you on ${dateLabel} at ${timeLabel} (${durationMinutes} min).`,
            attachments: [attachment],
          }),
        })
      );
    }

    const results = await Promise.all(sends);
    for (const res of results) {
      if (!res.ok) {
        console.error("Appointment email failed:", await res.text());
      }
    }
  },
});

// ── Lead notification email (notifies NorthernGlow team) ─────────────────────

export const sendLeadNotificationEmail = internalAction({
  args: {
    type: v.union(v.literal("info"), v.literal("signup")),
    name: v.string(),
    email: v.string(),
    gymName: v.optional(v.string()),
    city: v.optional(v.string()),
    memberCount: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    const notifyEmail =
      process.env.NORTHERNGLOW_NOTIFY_EMAIL ?? "yacoub.abdulla89@gmail.com";
    const from =
      process.env.AUTH_EMAIL_FROM ?? "NorthernGlow <noreply@example.com>";
    if (!apiKey) {
      console.warn("AUTH_RESEND_KEY not set — skipping lead notification email");
      return;
    }

    const subject =
      args.type === "signup"
        ? `New signup request: ${args.gymName ?? args.name}`
        : `New info request from ${args.name}`;

    const rows = [
      ["Type", args.type === "signup" ? "Signup request" : "Info request"],
      ["Name", args.name],
      ["Email", args.email],
      ...(args.gymName ? [["Gym", args.gymName]] : []),
      ...(args.city ? [["City", args.city]] : []),
      ...(args.memberCount ? [["Members", args.memberCount]] : []),
      ...(args.message ? [["Message", args.message]] : []),
    ]
      .map(
        ([label, val]) =>
          `<tr><td style="padding:6px 0;color:#555;width:100px;vertical-align:top">${label}</td><td style="padding:6px 0;font-weight:600">${val}</td></tr>`
      )
      .join("");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [notifyEmail],
        subject,
        html: `<div style="font-family:sans-serif;max-width:480px"><h2 style="color:#111">${subject}</h2><table style="width:100%;border-collapse:collapse">${rows}</table></div>`,
        text: [
          subject,
          "",
          `Type: ${args.type}`,
          `Name: ${args.name}`,
          `Email: ${args.email}`,
          args.gymName ? `Gym: ${args.gymName}` : "",
          args.city ? `City: ${args.city}` : "",
          args.memberCount ? `Members: ${args.memberCount}` : "",
          args.message ? `Message: ${args.message}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    });

    if (!res.ok) {
      console.error("Lead notification email failed:", await res.text());
    }
  },
});

// ── Admin portal invite email ─────────────────────────────────────────────────

export const sendAdminPortalInviteEmail = internalAction({
  args: {
    email: v.string(),
    gymName: v.string(),
    inviteCode: v.string(),
    fromAddress: v.optional(v.string()),
    portalUrl: v.optional(v.string()),
  },
  handler: async (
    _ctx,
    { email, gymName, inviteCode, fromAddress, portalUrl: portalUrlArg }
  ) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    const from =
      fromAddress ?? process.env.AUTH_EMAIL_FROM ?? `NorthernGlow <noreply@example.com>`;
    const portalUrl =
      portalUrlArg ?? process.env.ADMIN_PORTAL_URL ?? DEFAULT_WEB_URL;
    if (!apiKey) {
      console.warn("AUTH_RESEND_KEY not set — skipping admin portal invite email");
      return;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `admin-invite-${inviteCode}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `You've been invited to manage ${gymName} on NorthernGlow`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#111">You're set up as the admin for ${gymName}</h2>
            <p>NorthernGlow has set up a gym account for <strong>${gymName}</strong> and made you its admin.</p>
            <p>To get started, visit the admin portal and create an account using <strong>this email address</strong>. Your gym will be linked automatically.</p>
            <a href="${portalUrl}" style="display:inline-block;background:#1BBFBF;color:#000;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;margin:16px 0">${portalUrl}</a>
            <p style="color:#555;font-size:13px">This invite expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
          </div>`,
        text: `You're set up as the admin for ${gymName} on NorthernGlow. Go to ${portalUrl} and create an account using this email address. Your gym will be linked automatically.`,
      }),
    });

    if (!res.ok) {
      console.error("Admin portal invite email failed:", await res.text());
    }
  },
});
