import { PartDraft } from "./types";

export function todayString() {
  return toDateInputValue(new Date());
}

export function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  return toDateInputValue(new Date(year, month - 1, day + days));
}

function asDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function shortDay(dateString: string) {
  return asDate(dateString).toLocaleDateString(undefined, { weekday: "short" });
}

export function shortDate(dateString: string) {
  return asDate(dateString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function movementList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function newPart(index: number): PartDraft {
  return {
    label: String.fromCharCode(65 + index),
    name: "",
    type: "",
    movement: "",
    sets: "",
    reps: "",
    percentMax: "",
    timeCap: "",
    description: "",
    coachNotes: "",
  };
}
