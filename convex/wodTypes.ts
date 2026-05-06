import { v } from "convex/values";

export const DEFAULT_WOD_PROGRAM = "OC-60";
export const MAX_SCHEDULE_DAYS = 31;

export const WodType = v.union(
  v.literal("AMRAP"),
  v.literal("ForTime"),
  v.literal("EMOM"),
  v.literal("Strength"),
  v.literal("Other")
);

export const WodPart = v.object({
  label: v.string(),
  name: v.string(),
  type: v.optional(WodType),
  movement: v.optional(v.string()),
  sets: v.optional(v.string()),
  reps: v.optional(v.string()),
  percentMax: v.optional(v.string()),
  coachNotes: v.optional(v.string()),
  timeCap: v.optional(v.string()),
  description: v.optional(v.string()),
});

export const WodImportItem = v.object({
  date: v.string(),
  program: v.optional(v.string()),
  title: v.string(),
  description: v.string(),
  type: WodType,
  movements: v.array(v.string()),
  scalingNotes: v.optional(v.string()),
  accessLevel: v.optional(v.union(
    v.literal("PUBLIC_CLASS"),
    v.literal("MEMBERS_ONLY"),
    v.literal("ADVANCED"),
  )),
  parts: v.optional(v.array(WodPart)),
});
