import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for classes starting ~1 hour from now — runs every 10 minutes
crons.interval(
  "class reminders",
  { minutes: 10 },
  internal.notifications.sendClassReminders,
  {}
);

// Check for memberships expiring within 3 days — runs once daily at 9am EST (14:00 UTC)
crons.cron(
  "membership expiry reminders",
  "0 14 * * *",
  internal.notifications.sendMembershipReminders,
  {}
);

export default crons;
