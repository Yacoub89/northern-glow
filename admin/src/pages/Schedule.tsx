import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useMediaQuery } from "../components/useMediaQuery";

const S = {
  page: { maxWidth: 1240 },
  header: { display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start", marginBottom: 24 },
  h1: { fontSize: 28, fontWeight: 750, margin: "0 0 8px", color: "#111827" },
  sub: { color: "#6b7280", fontSize: 14, margin: 0, maxWidth: 540, lineHeight: 1.5 },
  controls: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const },
  panel: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 18, marginBottom: 24 },
  panelHead: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", marginBottom: 16 },
  panelTitle: { fontSize: 15, color: "#111827", fontWeight: 750, margin: 0 },
  panelMeta: { fontSize: 13, color: "#6b7280" },
  form: { display: "grid", gridTemplateColumns: "150px 130px 100px minmax(180px, 1fr) minmax(180px, 1fr) auto", gap: 12, alignItems: "end" },
  field: { display: "flex", flexDirection: "column" as const, gap: 6 },
  label: { fontSize: 12, color: "#6b7280", fontWeight: 650 },
  input: {
    background: "#f8fafc",
    border: "1px solid #d1d5db",
    borderRadius: 7,
    padding: "10px 11px",
    color: "#111827",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  select: {
    background: "#f8fafc",
    border: "1px solid #d1d5db",
    borderRadius: 7,
    padding: "10px 11px",
    color: "#111827",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  btn: (primary: boolean) => ({
    padding: "10px 14px",
    borderRadius: 7,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    border: primary ? "none" : "1px solid #d1d5db",
    background: primary ? "#1BBFBF" : "#f8fafc",
    color: primary ? "#062a2a" : "#4b5563",
    whiteSpace: "nowrap" as const,
  }),
  stats: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 24 },
  stat: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 },
  statValue: { fontSize: 26, color: "#1BBFBF", fontWeight: 800 },
  statLabel: { fontSize: 12, color: "#6b7280", marginTop: 3 },
  weekGrid: { display: "grid", gridTemplateColumns: "repeat(7, minmax(160px, 1fr))", gap: 12 },
  day: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, minHeight: 210, overflow: "hidden" },
  dayHead: { padding: "12px 13px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", gap: 8 },
  dayName: { fontSize: 13, fontWeight: 800, color: "#111827" },
  dayDate: { fontSize: 12, color: "#6b7280" },
  dayBody: { padding: 12, display: "grid", gap: 10 },
  classCard: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 7, padding: 12 },
  classTop: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 8 },
  time: { color: "#1BBFBF", fontSize: 20, fontWeight: 800, lineHeight: 1 },
  capacity: { color: "#6b7280", fontSize: 12, background: "#f8fafc", border: "1px solid #d1d5db", borderRadius: 4, padding: "3px 7px" },
  meta: { color: "#4b5563", fontSize: 13, marginTop: 5, overflowWrap: "anywhere" as const },
  wod: { color: "#111827", fontSize: 13, marginTop: 9, fontWeight: 700, overflowWrap: "anywhere" as const },
  empty: { color: "#6b7280", fontSize: 13, padding: "12px 0" },
  error: { color: "#ff453a", fontSize: 13, margin: "12px 0 0" },
};

function todayString() {
  return toDateInputValue(new Date());
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  return toDateInputValue(new Date(year, month - 1, day + days));
}

function asDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shortDay(dateString: string) {
  return asDate(dateString).toLocaleDateString(undefined, { weekday: "short" });
}

function shortDate(dateString: string) {
  return asDate(dateString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dateRangeLabel(startDate: string) {
  return `${shortDate(startDate)} - ${shortDate(addDays(startDate, 6))}`;
}

export default function Schedule() {
  const isMobile = useMediaQuery("(max-width: 960px)");
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
  const selectedDateWod = useQuery(api.wods.getByDate, { date });
  const createClass = useMutation(api.classes.create);
  const removeClass = useMutation(api.classes.remove);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startDate, index)), [startDate]);
  const activeCoaches = staff?.filter((member) => member.canCoach && member.staffStatus !== "inactive") ?? [];
  const wodOptions = selectedDateWod ? [selectedDateWod] : [];
  const totalClasses = classes?.length ?? 0;
  const totalBooked = classes?.reduce((sum, cls) => sum + cls.bookedCount, 0) ?? 0;

  const classesByDate = useMemo(() => {
    const grouped = new Map<string, NonNullable<typeof classes>>();
    for (const day of days) grouped.set(day, []);
    for (const cls of classes ?? []) grouped.set(cls.date, [...(grouped.get(cls.date) ?? []), cls]);
    return grouped;
  }, [classes, days]);

  useEffect(() => {
    if (selectedDateWod === undefined) return;
    if (wodId && (!selectedDateWod || selectedDateWod._id !== wodId)) {
      setWodId("");
    }
  }, [selectedDateWod, wodId]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDate(event.target.value);
    if (event.target.value) event.currentTarget.blur();
  };

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
    <div style={S.page}>
      <div style={{ ...S.header, flexDirection: isMobile ? "column" : "row" }}>
        <div>
          <h1 style={S.h1}>Schedule</h1>
          <p style={S.sub}>Plan the class week, assign coach-enabled staff, and keep capacity visible at a glance.</p>
        </div>
        <div style={S.controls}>
          <button style={S.btn(false)} onClick={() => setStartDate(addDays(startDate, -7))}>
            Previous
          </button>
          <input
            style={{ ...S.input, width: 160 }}
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (e.target.value) e.currentTarget.blur();
            }}
          />
          <button style={S.btn(false)} onClick={() => setStartDate(todayString())}>
            Today
          </button>
          <button style={S.btn(false)} onClick={() => setStartDate(addDays(startDate, 7))}>
            Next
          </button>
        </div>
      </div>

      <div style={{ ...S.stats, gridTemplateColumns: isMobile ? "1fr" : S.stats.gridTemplateColumns }}>
        <div style={S.stat}>
          <div style={S.statValue}>{totalClasses}</div>
          <div style={S.statLabel}>Classes this week</div>
        </div>
        <div style={S.stat}>
          <div style={S.statValue}>{totalBooked}</div>
          <div style={S.statLabel}>Booked spots</div>
        </div>
        <div style={S.stat}>
          <div style={S.statValue}>{activeCoaches.length}</div>
          <div style={S.statLabel}>Available coaches</div>
        </div>
      </div>

      <section style={S.panel}>
        <div style={S.panelHead}>
          <h2 style={S.panelTitle}>Create Class</h2>
          <span style={S.panelMeta}>{dateRangeLabel(startDate)}</span>
        </div>
        <form style={{ ...S.form, gridTemplateColumns: isMobile ? "1fr" : S.form.gridTemplateColumns }} onSubmit={handleSubmit}>
          <label style={S.field}>
            <span style={S.label}>Date</span>
            <input style={S.input} type="date" value={date} onChange={handleDateChange} required />
          </label>
          <label style={S.field}>
            <span style={S.label}>Start time</span>
            <input style={S.input} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </label>
          <label style={S.field}>
            <span style={S.label}>Capacity</span>
            <input style={S.input} type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required />
          </label>
          <label style={S.field}>
            <span style={S.label}>Coach</span>
            <select style={S.select} value={coachId} onChange={(e) => setCoachId(e.target.value)} required>
              <option value="">Select coach</option>
              {activeCoaches.map((coach) => (
                <option key={coach._id} value={coach._id}>
                  {coach.name ?? coach.email ?? "Coach"}
                </option>
              ))}
            </select>
          </label>
          <label style={S.field}>
            <span style={S.label}>WOD</span>
            <select style={S.select} value={wodId} onChange={(e) => setWodId(e.target.value)}>
              <option value="">No WOD</option>
              {wodOptions.map((wod) => (
                <option key={wod._id} value={wod._id}>
                  {wod.title}
                </option>
              ))}
            </select>
          </label>
          <button style={{ ...S.btn(true), width: isMobile ? "100%" : "auto" }} disabled={saving} type="submit">
            {saving ? "Creating..." : "Create"}
          </button>
        </form>
        {error && <p style={S.error}>{error}</p>}
      </section>

      <div style={{ ...S.weekGrid, gridTemplateColumns: isMobile ? "1fr" : S.weekGrid.gridTemplateColumns }}>
        {days.map((day) => {
          const dayClasses = classesByDate.get(day) ?? [];
          return (
            <section key={day} style={S.day}>
              <div style={S.dayHead}>
                <div style={S.dayName}>{shortDay(day)}</div>
                <div style={S.dayDate}>{shortDate(day)}</div>
              </div>
              <div style={S.dayBody}>
                {dayClasses.length === 0 ? (
                  <p style={S.empty}>No classes</p>
                ) : (
                  dayClasses.map((cls) => (
                    <article key={cls._id} style={S.classCard}>
                      <div style={S.classTop}>
                        <div style={S.time}>{cls.startTime}</div>
                        <div style={S.capacity}>
                          {cls.bookedCount}/{cls.capacity}
                        </div>
                      </div>
                      <div style={S.meta}>{cls.coachName}</div>
                      {cls.wodTitle && <div style={S.wod}>{cls.wodTitle}</div>}
                      <button
                        style={{ ...S.btn(false), padding: "6px 10px", fontSize: 12, marginTop: 12 }}
                        onClick={() => removeClass({ id: cls._id })}
                      >
                        Delete
                      </button>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
