import { AccessLevel, WodProgram, WodType } from "./types";

export const WOD_TYPES: Array<{ value: WodType; label: string }> = [
  { value: "AMRAP", label: "AMRAP" },
  { value: "ForTime", label: "For Time" },
  { value: "EMOM", label: "EMOM" },
  { value: "Strength", label: "Strength" },
  { value: "Other", label: "Other" },
];

export const ACCESS_LEVELS: Array<
  { value: ""; label: string } | { value: AccessLevel; label: string }
> = [
  { value: "", label: "Default access" },
  { value: "PUBLIC_CLASS", label: "Public class" },
  { value: "MEMBERS_ONLY", label: "Members only" },
  { value: "ADVANCED", label: "Advanced" },
];

export const WOD_PROGRAMS: Array<{ value: WodProgram; label: string }> = [
  { value: "Challenge of the Month", label: "Challenge of the Month" },
  { value: "OC-60", label: "OC-60" },
  { value: "OC-Flex", label: "OC-Flex" },
  { value: "OC-Home", label: "OC-Home" },
  { value: "OC-Hyrox", label: "OC-Hyrox" },
  { value: "OC-Lift", label: "OC-Lift" },
  { value: "OC-Teens", label: "OC-Teens" },
];

export const DEFAULT_WOD_PROGRAM: WodProgram = "OC-60";
