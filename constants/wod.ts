export const WOD_TYPES = [
  "AMRAP",
  "ForTime",
  "EMOM",
  "Strength",
  "Other",
] as const;

export type WodType = (typeof WOD_TYPES)[number];
