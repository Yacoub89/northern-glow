import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useMediaQuery } from "../components/useMediaQuery";

const S = {
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub: { color: "#777", fontSize: 14, margin: "0 0 28px" },
  sectionTitle: { fontSize: 16, fontWeight: 700, margin: "0 0 14px" },
  form: { display: "grid", gridTemplateColumns: "repeat(5, minmax(140px, 1fr)) auto", gap: 12, alignItems: "end", marginBottom: 34 },
  group: { display: "flex", flexDirection: "column" as const, gap: 6 },
  label: { fontSize: 13, color: "#aaa" },
  input: {
    background: "#1e1e1e",
    border: "1px solid #333",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  select: {
    background: "#1e1e1e",
    border: "1px solid #333",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  btn: (primary: boolean) => ({
    padding: "10px 18px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    border: "none",
    background: primary ? "#1BBFBF" : "#1e1e1e",
    color: primary ? "#000" : "#aaa",
    whiteSpace: "nowrap" as const,
  }),
  days: { display: "grid", gridTemplateColumns: "repeat(7, minmax(150px, 1fr))", gap: 12 },
  day: { background: "#141414", border: "1px solid #252525", borderRadius: 8, minHeight: 180, padding: 12 },
  dayHead: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", marginBottom: 12 },
  dayName: { fontSize: 13, fontWeight: 700, color: "#fff" },
  dayDate: { fontSize: 12, color: "#777" },
  classRow: { borderTop: "1px solid #252525", paddingTop: 10, marginTop: 10 },
  time: { color: "#1BBFBF", fontSize: 18, fontWeight: 700 },
  meta: { color: "#aaa", fontSize: 13, marginTop: 4 },
  muted: { color: "#666", fontSize: 13 },
  error: { color: "#ff453a", fontSize: 13, marginTop: -18, marginBottom: 20 },
  toolbar: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 18, flexWrap: "wrap" as const },
};

function todayString() {
  const date = new Date();
  return toDateInputValue(date);
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  return toDateInputValue(new Date(year, month - 1, day + days));
}

function shortDay(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: "short" });
}

function shortDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Schedule() {
  const isMobile = useMediaQuery("(max-width: 900px)");
  const [startDate, setStartDate] = useState(todayString());
  const [date, setDate] = useState(todayString());
  const [startTime, setStartTime] = useState("06:00");
  const [capacity, setCapacity] = useState(12);
  const [coachId, setCoachId] = useState("");
  const [wodId, setWodId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const classes = useQuery(api.classes.getUpcoming, { startDate, days: 7 });
  const staff = useQuery(api.staff.list);
  const wods = useQuery(api.wods.getSchedule, { startDate, days: 7 });
  const createClass = useMutation(api.classes.create);
  const removeClass = useMutation(api.classes.remove);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startDate, index)), [startDate]);
  const activeCoaches = staff?.filter((member) => member.canCoach && member.staffStatus !== "inactive") ?? [];
  const wodOptions = wods?.filter((item) => item.wod !== null) ?? [];

  const classesByDate = useMemo(() => {
    const grouped = new Map<string, NonNullable<typeof classes>>();
    for (const day of days) grouped.set(day, []);
    for (const cls of classes ?? []) {
      grouped.set(cls.date, [...(grouped.get(cls.date) ?? []), cls]);
    }
    return grouped;
  }, [classes, days]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (!coachId) throw new Error("Choose a coach");
      await createClass({
        date,
        startTime,
        capacity,
        coachId: coachId as Id<"users">,
        ...(wodId ? { wodId: wodId as Id<"wods"> } : {}),
      });
      setStartDate(date);
      setWodId("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create class");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={S.h1}>Schedule</h1>
      <p style={S.sub}>Create classes and assign active coaches.</p>

      <h2 style={S.sectionTitle}>Create class</h2>
      <form
        style={{
          ...S.form,
          gridTemplateColumns: isMobile ? "1fr" : S.form.gridTemplateColumns,
        }}
        onSubmit={handleSubmit}
      >
        <div style={S.group}>
          <label style={S.label}>Date</label>
          <input style={S.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div style={S.group}>
          <label style={S.label}>Start time</label>
          <input style={S.input} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        </div>
        <div style={S.group}>
          <label style={S.label}>Capacity</label>
          <input
            style={S.input}
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            required
          />
        </div>
        <div style={S.group}>
          <label style={S.label}>Coach</label>
          <select style={S.select} value={coachId} onChange={(e) => setCoachId(e.target.value)} required>
            <option value="">Select coach</option>
            {activeCoaches.map((coach) => (
              <option key={coach._id} value={coach._id}>
                {coach.name ?? coach.email ?? "Coach"}
              </option>
            ))}
          </select>
        </div>
        <div style={S.group}>
          <label style={S.label}>WOD</label>
          <select style={S.select} value={wodId} onChange={(e) => setWodId(e.target.value)}>
            <option value="">No WOD</option>
            {wodOptions.map(({ date: wodDate, wod }) => (
              <option key={wod!._id} value={wod!._id}>
                {shortDate(wodDate)} - {wod!.title}
              </option>
            ))}
          </select>
        </div>
        <button style={{ ...S.btn(true), width: isMobile ? "100%" : "auto" }} disabled={saving} type="submit">
          {saving ? "Creating..." : "Create class"}
        </button>
      </form>
      {error && <p style={S.error}>{error}</p>}

      <div style={S.toolbar}>
        <h2 style={{ ...S.sectionTitle, margin: 0 }}>Week</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button style={S.btn(false)} onClick={() => setStartDate(addDays(startDate, -7))}>
            Previous
          </button>
          <input style={{ ...S.input, width: 160 }} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <button style={S.btn(false)} onClick={() => setStartDate(todayString())}>
            Today
          </button>
          <button style={S.btn(false)} onClick={() => setStartDate(addDays(startDate, 7))}>
            Next
          </button>
        </div>
      </div>

      <div style={{ ...S.days, gridTemplateColumns: isMobile ? "1fr" : S.days.gridTemplateColumns }}>
        {days.map((day) => {
          const dayClasses = classesByDate.get(day) ?? [];
          return (
            <section key={day} style={S.day}>
              <div style={S.dayHead}>
                <div style={S.dayName}>{shortDay(day)}</div>
                <div style={S.dayDate}>{shortDate(day)}</div>
              </div>
              {dayClasses.length === 0 ? (
                <p style={S.muted}>No classes</p>
              ) : (
                dayClasses.map((cls) => (
                  <div key={cls._id} style={S.classRow}>
                    <div style={S.time}>{cls.startTime}</div>
                    <div style={S.meta}>{cls.coachName}</div>
                    <div style={S.meta}>
                      {cls.bookedCount}/{cls.capacity} booked
                    </div>
                    {cls.wodTitle && <div style={S.meta}>{cls.wodTitle}</div>}
                    <button
                      style={{ ...S.btn(false), padding: "6px 10px", fontSize: 12, marginTop: 10 }}
                      onClick={() => removeClass({ id: cls._id })}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
