import { internalMutation } from "./_generated/server";

// ── Mock coaches ─────────────────────────────────────────────────────────────
const COACHES = [
  { name: "Coach Marcus", email: "marcus@ocfit.com" },
  { name: "Coach Jess", email: "jess@ocfit.com" },
  { name: "Coach Dev", email: "dev@ocfit.com" },
];

// ── Mock WODs ────────────────────────────────────────────────────────────────
const WODS: {
  title: string;
  description: string;
  type: "AMRAP" | "ForTime" | "EMOM" | "Strength" | "Other";
  movements: string[];
  scalingNotes?: string;
}[] = [
  {
    title: "Fran",
    description: "21-15-9 reps for time of Thrusters and Pull-ups",
    type: "ForTime",
    movements: ["Thrusters (95/65 lb)", "Pull-ups"],
    scalingNotes:
      "Scale thrusters to 65/45 lb. Use banded pull-ups or ring rows.",
  },
  {
    title: "Murph",
    description:
      "1 mile Run, 100 Pull-ups, 200 Push-ups, 300 Air Squats, 1 mile Run. Partition the pull-ups, push-ups, and squats as needed.",
    type: "ForTime",
    movements: [
      "Run (1 mile)",
      "Pull-ups",
      "Push-ups",
      "Air Squats",
      "Run (1 mile)",
    ],
    scalingNotes: "Half Murph: 800m run, 50 pull-ups, 100 push-ups, 150 squats, 800m run.",
  },
  {
    title: "AMRAP Hustle",
    description: "20-minute AMRAP: 5 Power Cleans, 10 Box Jumps, 15 Wall Balls",
    type: "AMRAP",
    movements: [
      "Power Cleans (135/95 lb)",
      "Box Jumps (24/20 in)",
      "Wall Balls (20/14 lb)",
    ],
    scalingNotes: "Reduce barbell to 95/65 lb. Step-ups instead of box jumps.",
  },
  {
    title: "Deadlift Day",
    description:
      "Build to a heavy 3-rep max Deadlift, then 3x5 at 80%. Finish with 3 rounds of 12 Romanian Deadlifts and 20 GHD Sit-ups.",
    type: "Strength",
    movements: [
      "Deadlift 3RM",
      "Deadlift 3x5 @ 80%",
      "Romanian Deadlifts (12 reps)",
      "GHD Sit-ups (20 reps)",
    ],
    scalingNotes: "Sub GHD sit-ups with AbMat sit-ups if needed.",
  },
  {
    title: "EMOM Grinder",
    description:
      "Every minute on the minute for 24 minutes: Min 1 — 12 Cal Row, Min 2 — 8 Dumbbell Snatches, Min 3 — 6 Burpee Box Jump-Overs",
    type: "EMOM",
    movements: [
      "Calorie Row",
      "Dumbbell Snatches (50/35 lb)",
      "Burpee Box Jump-Overs (24/20 in)",
    ],
    scalingNotes: "Reduce calories to 10. Use 35/20 lb dumbbell.",
  },
  {
    title: "DT",
    description:
      "5 rounds for time: 12 Deadlifts, 9 Hang Power Cleans, 6 Push Jerks (155/105 lb)",
    type: "ForTime",
    movements: [
      "Deadlifts (155/105 lb)",
      "Hang Power Cleans (155/105 lb)",
      "Push Jerks (155/105 lb)",
    ],
    scalingNotes: "Scale barbell to 115/75 lb or 95/65 lb.",
  },
  {
    title: "Gymnastics Conditioning",
    description:
      "For time: 50-40-30-20-10 Double-Unders, 5-4-3-2-1 Muscle-Ups. Complete all double-unders then all muscle-ups at each station.",
    type: "Other",
    movements: [
      "Double-Unders",
      "Ring Muscle-Ups",
    ],
    scalingNotes:
      "Sub double-unders with 2x single-unders. Sub muscle-ups with chest-to-bar pull-ups + ring dips.",
  },
];

// ── Class time slots ─────────────────────────────────────────────────────────
const TIME_SLOTS = ["05:30", "07:00", "09:00", "12:00", "16:30", "17:30"];

function getDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

// ── Seed: insert mock data ──────────────────────────────────────────────────
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 1. Create mock coaches
    const coachIds = await Promise.all(
      COACHES.map((c) =>
        ctx.db.insert("users", {
          name: c.name,
          email: c.email,
          role: "coach",
        })
      )
    );

    // 2. Create a WOD per day for the next 7 days + link classes
    for (let day = 0; day < 7; day++) {
      const date = getDateStr(day);
      const wod = WODS[day % WODS.length];

      const wodId = await ctx.db.insert("wods", {
        date,
        ...wod,
        createdBy: coachIds[0],
      });

      // Pick 3-4 time slots for this day
      const numClasses = 3 + (day % 2); // alternates 3 and 4
      const slots = TIME_SLOTS.slice(0, numClasses);

      for (let i = 0; i < slots.length; i++) {
        const coachId = coachIds[i % coachIds.length];
        const bookedCount = Math.floor(Math.random() * 13); // 0-12 of 16

        await ctx.db.insert("classes", {
          date,
          startTime: slots[i],
          capacity: 16,
          bookedCount,
          coachId,
          wodId,
        });
      }
    }

    console.log("✅ Seed complete — 3 coaches, 7 WODs, ~25 classes inserted.");
  },
});

// ── Clear: remove all seed data ─────────────────────────────────────────────
export const clear = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = ["bookings", "results", "classes", "wods"] as const;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      await Promise.all(docs.map((d) => ctx.db.delete(d._id)));
    }

    // Remove mock coaches (by email domain)
    const users = await ctx.db.query("users").collect();
    await Promise.all(
      users
        .filter((u) => u.email?.endsWith("@ocfit.com"))
        .map((u) => ctx.db.delete(u._id))
    );

    console.log("🗑️  Cleared all seed data.");
  },
});
