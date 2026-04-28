import type { WodType } from "../../constants/wod";

export type PartName = "STRENGTH" | "METCON" | "SKILL" | "ACCESSORY";
export type AccessLevel = "PUBLIC_CLASS" | "MEMBERS_ONLY" | "ADVANCED";

export interface WodPart {
  label: string;
  name: PartName;
  type: WodType;
  movement: string;
  sets: string;
  reps: string;
  percentMax: string;
  coachNotes: string;
  timeCap: string;
  description: string;
}

export const PART_NAMES: PartName[] = ["STRENGTH", "METCON", "SKILL", "ACCESSORY"];
export const PART_LABELS = ["A", "B", "C", "D", "E"];

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  PUBLIC_CLASS: "PUBLIC CLASS",
  MEMBERS_ONLY: "MEMBERS ONLY",
  ADVANCED: "ADVANCED",
};

export const TYPE_LABELS: Record<WodType, string> = {
  AMRAP: "AMRAP",
  ForTime: "For Time",
  EMOM: "EMOM",
  Strength: "Strength",
  Other: "Other",
};

export const SCALE_OPTIONS = ["Rx", "Scaled", "Rx+"] as const;
export type Scale = (typeof SCALE_OPTIONS)[number];

export function parseMovement(text: string): { num: string | null; label: string } {
  const match = text.match(/^(\d+(?:\+\d+)?)\s+(.+)/);
  if (match) return { num: match[1], label: match[2] };
  return { num: null, label: text };
}

export function defaultPart(index: number): WodPart {
  const name: PartName = index === 0 ? "STRENGTH" : "METCON";
  return {
    label: PART_LABELS[index] ?? String(index + 1),
    name,
    type: name === "STRENGTH" ? "Strength" : "AMRAP",
    movement: "",
    sets: "",
    reps: "",
    percentMax: "",
    coachNotes: "",
    timeCap: "",
    description: "",
  };
}

export function getDayAbbr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d)
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase()
    .slice(0, 3);
}

export function getDayNum(dateStr: string): string {
  return String(parseInt(dateStr.split("-")[2], 10));
}

export function formatNavDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
