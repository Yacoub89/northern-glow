export const WOD_TYPES = [
  "AMRAP",
  "ForTime",
  "EMOM",
  "Strength",
  "Other",
] as const;

export type WodType = (typeof WOD_TYPES)[number];

export const WOD_PROGRAMS = [
  "Challenge of the Month",
  "OC-60",
  "OC-Flex",
  "OC-Home",
  "OC-Hyrox",
  "OC-Lift",
  "OC-Teens",
] as const;

export const DEFAULT_WOD_PROGRAM = "OC-60";

export type WodProgram = (typeof WOD_PROGRAMS)[number];
