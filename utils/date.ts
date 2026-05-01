export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getTodayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** Formats a YYYY-MM-DD string. Optionally resolves "Today" / "Tomorrow". */
export function formatDate(
  dateStr: string,
  opts: { relative?: boolean; weekday?: "long" | "short" } = {}
): string {
  const { relative = false, weekday = "long" } = opts;

  if (relative) {
    const today = getTodayDate();
    if (dateStr === today) return "Today";
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === tomorrow.toISOString().split("T")[0]) return "Tomorrow";
  }

  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday,
    month: "short",
    day: "numeric",
    ...(weekday === "long" ? { month: "long" } : {}),
  });
}
