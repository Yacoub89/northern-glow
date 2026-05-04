import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useMediaQuery } from "../components/useMediaQuery";

type WodType = "AMRAP" | "ForTime" | "EMOM" | "Strength" | "Other";
type AccessLevel = "PUBLIC_CLASS" | "MEMBERS_ONLY" | "ADVANCED";
type PartDraft = {
  label: string;
  name: string;
  type: "" | WodType;
  movement: string;
  sets: string;
  reps: string;
  percentMax: string;
  timeCap: string;
  description: string;
  coachNotes: string;
};

const WOD_TYPES: Array<{ value: WodType; label: string }> = [
  { value: "AMRAP", label: "AMRAP" },
  { value: "ForTime", label: "For Time" },
  { value: "EMOM", label: "EMOM" },
  { value: "Strength", label: "Strength" },
  { value: "Other", label: "Other" },
];

const ACCESS_LEVELS: Array<{ value: ""; label: string } | { value: AccessLevel; label: string }> = [
  { value: "", label: "Default access" },
  { value: "PUBLIC_CLASS", label: "Public class" },
  { value: "MEMBERS_ONLY", label: "Members only" },
  { value: "ADVANCED", label: "Advanced" },
];

const S = {
  page: { maxWidth: 1240 },
  header: { display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start", marginBottom: 24 },
  h1: { fontSize: 28, fontWeight: 750, margin: "0 0 8px", color: "#fff" },
  sub: { color: "#888", fontSize: 14, margin: 0, maxWidth: 560, lineHeight: 1.5 },
  controls: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const },
  panel: { background: "#141414", border: "1px solid #252525", borderRadius: 8, padding: 18, marginBottom: 24 },
  panelHead: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", marginBottom: 16 },
  panelTitle: { fontSize: 15, color: "#fff", fontWeight: 750, margin: 0 },
  panelMeta: { fontSize: 13, color: "#666" },
  formGrid: { display: "grid", gridTemplateColumns: "150px minmax(180px, 1fr) 170px 190px", gap: 12, marginBottom: 12 },
  field: { display: "flex", flexDirection: "column" as const, gap: 6 },
  label: { fontSize: 12, color: "#777", fontWeight: 650 },
  input: {
    background: "#1e1e1e",
    border: "1px solid #333",
    borderRadius: 7,
    padding: "10px 11px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  select: {
    background: "#1e1e1e",
    border: "1px solid #333",
    borderRadius: 7,
    padding: "10px 11px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  textarea: {
    background: "#1e1e1e",
    border: "1px solid #333",
    borderRadius: 7,
    padding: "10px 11px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    width: "100%",
    minHeight: 92,
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
  },
  btn: (primary: boolean) => ({
    padding: "10px 14px",
    borderRadius: 7,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    border: primary ? "none" : "1px solid #333",
    background: primary ? "#1BBFBF" : "#1e1e1e",
    color: primary ? "#001313" : "#aaa",
    whiteSpace: "nowrap" as const,
  }),
  stats: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 24 },
  stat: { background: "#101010", border: "1px solid #242424", borderRadius: 8, padding: 16 },
  statValue: { fontSize: 26, color: "#1BBFBF", fontWeight: 800 },
  statLabel: { fontSize: 12, color: "#777", marginTop: 3 },
  split: { display: "grid", gridTemplateColumns: "minmax(360px, 460px) 1fr", gap: 16 },
  schedule: { display: "grid", gap: 10 },
  dayCard: { background: "#141414", border: "1px solid #252525", borderRadius: 8, padding: 14 },
  dayTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", marginBottom: 12 },
  dayTitle: { color: "#fff", fontSize: 14, fontWeight: 800 },
  dayDate: { color: "#777", fontSize: 12 },
  wodTitle: { color: "#fff", fontSize: 16, fontWeight: 800, marginBottom: 5, overflowWrap: "anywhere" as const },
  wodMeta: { color: "#1BBFBF", fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" as const },
  desc: { color: "#aaa", fontSize: 13, lineHeight: 1.5, marginTop: 10, whiteSpace: "pre-wrap" as const },
  chips: { display: "flex", gap: 6, flexWrap: "wrap" as const, marginTop: 12 },
  chip: { color: "#ddd", background: "#1e1e1e", border: "1px solid #303030", borderRadius: 4, padding: "4px 8px", fontSize: 12 },
  scaling: { color: "#888", fontSize: 13, fontStyle: "italic", marginTop: 10, lineHeight: 1.4 },
  empty: { color: "#666", fontSize: 13, padding: "10px 0" },
  partGrid: { display: "grid", gap: 10, marginTop: 12 },
  partCard: { background: "#101010", border: "1px solid #242424", borderRadius: 8, padding: 12 },
  partFields: { display: "grid", gridTemplateColumns: "80px 1fr 130px", gap: 10, marginBottom: 10 },
  formActions: { display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #252525", paddingTop: 14, marginTop: 16 },
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

function movementList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function newPart(index: number): PartDraft {
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

export default function Workouts() {
  const isMobile = useMediaQuery("(max-width: 980px)");
  const [startDate, setStartDate] = useState(todayString());
  const [editingId, setEditingId] = useState<Id<"wods"> | null>(null);
  const [date, setDate] = useState(todayString());
  const [title, setTitle] = useState("");
  const [type, setType] = useState<WodType>("AMRAP");
  const [accessLevel, setAccessLevel] = useState<"" | AccessLevel>("");
  const [description, setDescription] = useState("");
  const [movements, setMovements] = useState("");
  const [scalingNotes, setScalingNotes] = useState("");
  const [parts, setParts] = useState<PartDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const schedule = useQuery(api.wods.getSchedule, { startDate, days: 7 });
  const createWod = useMutation(api.wods.create);
  const updateWod = useMutation(api.wods.update);

  const programmed = schedule?.filter((item) => item.wod !== null) ?? [];
  const movementCount = programmed.reduce((sum, item) => sum + (item.wod?.movements.length ?? 0), 0);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startDate, index)), [startDate]);

  const resetForm = () => {
    setEditingId(null);
    setDate(todayString());
    setTitle("");
    setType("AMRAP");
    setAccessLevel("");
    setDescription("");
    setMovements("");
    setScalingNotes("");
    setParts([]);
    setError("");
  };

  const editWod = (wod: NonNullable<NonNullable<typeof schedule>[number]["wod"]>) => {
    setEditingId(wod._id);
    setDate(wod.date);
    setTitle(wod.title);
    setType(wod.type);
    setAccessLevel(wod.accessLevel ?? "");
    setDescription(wod.description);
    setMovements(wod.movements.join("\n"));
    setScalingNotes(wod.scalingNotes ?? "");
    setParts(
      (wod.parts ?? []).map((part) => ({
        label: part.label,
        name: part.name,
        type: part.type ?? "",
        movement: part.movement ?? "",
        sets: part.sets ?? "",
        reps: part.reps ?? "",
        percentMax: part.percentMax ?? "",
        timeCap: part.timeCap ?? "",
        description: part.description ?? "",
        coachNotes: part.coachNotes ?? "",
      }))
    );
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const cleanParts = parts
        .filter((part) => part.label.trim() && part.name.trim())
        .map((part) => ({
          label: part.label.trim(),
          name: part.name.trim(),
          ...(part.type ? { type: part.type } : {}),
          ...(part.movement.trim() ? { movement: part.movement.trim() } : {}),
          ...(part.sets.trim() ? { sets: part.sets.trim() } : {}),
          ...(part.reps.trim() ? { reps: part.reps.trim() } : {}),
          ...(part.percentMax.trim() ? { percentMax: part.percentMax.trim() } : {}),
          ...(part.timeCap.trim() ? { timeCap: part.timeCap.trim() } : {}),
          ...(part.description.trim() ? { description: part.description.trim() } : {}),
          ...(part.coachNotes.trim() ? { coachNotes: part.coachNotes.trim() } : {}),
        }));
      const payload = {
        date,
        title: title.trim(),
        description: description.trim(),
        type,
        movements: movementList(movements),
        ...(scalingNotes.trim() ? { scalingNotes: scalingNotes.trim() } : {}),
        ...(accessLevel ? { accessLevel } : {}),
        ...(cleanParts.length > 0 ? { parts: cleanParts } : {}),
      };
      if (!payload.title) throw new Error("Title is required");
      if (editingId) {
        await updateWod({ id: editingId, ...payload });
      } else {
        await createWod(payload);
      }
      setStartDate(date);
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save WOD");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={{ ...S.header, flexDirection: isMobile ? "column" : "row" }}>
        <div>
          <h1 style={S.h1}>Workouts</h1>
          <p style={S.sub}>Program WODs for web and mobile from the same fields athletes see in the app.</p>
        </div>
        <div style={S.controls}>
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

      <div style={{ ...S.stats, gridTemplateColumns: isMobile ? "1fr" : S.stats.gridTemplateColumns }}>
        <div style={S.stat}>
          <div style={S.statValue}>{programmed.length}</div>
          <div style={S.statLabel}>Programmed days</div>
        </div>
        <div style={S.stat}>
          <div style={S.statValue}>{movementCount}</div>
          <div style={S.statLabel}>Movement entries</div>
        </div>
        <div style={S.stat}>
          <div style={S.statValue}>{days.length}</div>
          <div style={S.statLabel}>Days in view</div>
        </div>
      </div>

      <div style={{ ...S.split, gridTemplateColumns: isMobile ? "1fr" : S.split.gridTemplateColumns }}>
        <section style={S.panel}>
          <div style={S.panelHead}>
            <h2 style={S.panelTitle}>{editingId ? "Edit WOD" : "Create WOD"}</h2>
            {editingId && (
              <button style={{ ...S.btn(false), padding: "7px 10px" }} onClick={resetForm} type="button">
                New WOD
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ ...S.formGrid, gridTemplateColumns: isMobile ? "1fr" : S.formGrid.gridTemplateColumns }}>
              <label style={S.field}>
                <span style={S.label}>Date</span>
                <input style={S.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <label style={S.field}>
                <span style={S.label}>Title</span>
                <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fran" required />
              </label>
              <label style={S.field}>
                <span style={S.label}>Type</span>
                <select style={S.select} value={type} onChange={(e) => setType(e.target.value as WodType)}>
                  {WOD_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={S.field}>
                <span style={S.label}>Access</span>
                <select style={S.select} value={accessLevel} onChange={(e) => setAccessLevel(e.target.value as "" | AccessLevel)}>
                  {ACCESS_LEVELS.map((option) => (
                    <option key={option.value || "default"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={{ ...S.field, marginBottom: 12 }}>
              <span style={S.label}>Description</span>
              <textarea
                style={S.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="20 min AMRAP: 5 pull-ups, 10 push-ups, 15 air squats"
                required
              />
            </label>
            <label style={{ ...S.field, marginBottom: 12 }}>
              <span style={S.label}>Movements</span>
              <textarea
                style={{ ...S.textarea, minHeight: 78 }}
                value={movements}
                onChange={(e) => setMovements(e.target.value)}
                placeholder={"Pull-up\nPush-up\nAir Squat"}
              />
            </label>
            <label style={{ ...S.field, marginBottom: 12 }}>
              <span style={S.label}>Scaling notes</span>
              <textarea
                style={{ ...S.textarea, minHeight: 70 }}
                value={scalingNotes}
                onChange={(e) => setScalingNotes(e.target.value)}
                placeholder="Ring rows, knee push-ups, air squats to target"
              />
            </label>

            <div style={S.panelHead}>
              <h3 style={S.panelTitle}>Structured Parts</h3>
              <button
                style={{ ...S.btn(false), padding: "7px 10px" }}
                type="button"
                onClick={() => setParts((prev) => [...prev, newPart(prev.length)])}
              >
                Add part
              </button>
            </div>
            <div style={S.partGrid}>
              {parts.length === 0 ? (
                <div style={S.empty}>No parts added. The mobile WOD card still uses the main fields above.</div>
              ) : (
                parts.map((part, index) => (
                  <div key={index} style={S.partCard}>
                    <div style={{ ...S.partFields, gridTemplateColumns: isMobile ? "1fr" : S.partFields.gridTemplateColumns }}>
                      <input
                        style={S.input}
                        value={part.label}
                        onChange={(e) => setParts((prev) => prev.map((p, i) => (i === index ? { ...p, label: e.target.value } : p)))}
                        placeholder="A"
                      />
                      <input
                        style={S.input}
                        value={part.name}
                        onChange={(e) => setParts((prev) => prev.map((p, i) => (i === index ? { ...p, name: e.target.value } : p)))}
                        placeholder="Strength"
                      />
                      <select
                        style={S.select}
                        value={part.type}
                        onChange={(e) => setParts((prev) => prev.map((p, i) => (i === index ? { ...p, type: e.target.value as "" | WodType } : p)))}
                      >
                        <option value="">No type</option>
                        {WOD_TYPES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ ...S.formGrid, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr 1fr" }}>
                      <input style={S.input} value={part.movement} onChange={(e) => setParts((prev) => prev.map((p, i) => (i === index ? { ...p, movement: e.target.value } : p)))} placeholder="Movement" />
                      <input style={S.input} value={part.sets} onChange={(e) => setParts((prev) => prev.map((p, i) => (i === index ? { ...p, sets: e.target.value } : p)))} placeholder="Sets" />
                      <input style={S.input} value={part.reps} onChange={(e) => setParts((prev) => prev.map((p, i) => (i === index ? { ...p, reps: e.target.value } : p)))} placeholder="Reps" />
                      <input style={S.input} value={part.timeCap} onChange={(e) => setParts((prev) => prev.map((p, i) => (i === index ? { ...p, timeCap: e.target.value } : p)))} placeholder="Time cap" />
                    </div>
                    <textarea style={{ ...S.textarea, minHeight: 58, marginTop: 10 }} value={part.description} onChange={(e) => setParts((prev) => prev.map((p, i) => (i === index ? { ...p, description: e.target.value } : p)))} placeholder="Part description" />
                    <div style={S.formActions}>
                      <button style={{ ...S.btn(false), padding: "7px 10px" }} type="button" onClick={() => setParts((prev) => prev.filter((_, i) => i !== index))}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={S.formActions}>
              <button style={S.btn(false)} type="button" onClick={resetForm}>
                {editingId ? "Cancel" : "Clear"}
              </button>
              <button style={S.btn(true)} type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update WOD" : "Create WOD"}
              </button>
            </div>
            {error && <p style={S.error}>{error}</p>}
          </form>
        </section>

        <section>
          <div style={S.panelHead}>
            <h2 style={S.panelTitle}>Week Preview</h2>
            <span style={S.panelMeta}>
              {shortDate(startDate)} - {shortDate(addDays(startDate, 6))}
            </span>
          </div>
          <div style={S.schedule}>
            {(schedule ?? days.map((day) => ({ date: day, wod: null }))).map(({ date: wodDate, wod }) => (
              <article key={wodDate} style={S.dayCard}>
                <div style={S.dayTop}>
                  <div style={S.dayTitle}>{shortDay(wodDate)}</div>
                  <div style={S.dayDate}>{shortDate(wodDate)}</div>
                </div>
                {wod ? (
                  <>
                    <div style={S.wodMeta}>{wod.type}</div>
                    <div style={S.wodTitle}>{wod.title}</div>
                    <div style={S.desc}>{wod.description}</div>
                    {wod.movements.length > 0 && (
                      <div style={S.chips}>
                        {wod.movements.map((movement) => (
                          <span key={movement} style={S.chip}>
                            {movement}
                          </span>
                        ))}
                      </div>
                    )}
                    {wod.scalingNotes && <div style={S.scaling}>Scaling: {wod.scalingNotes}</div>}
                    <div style={S.formActions}>
                      <button style={{ ...S.btn(false), padding: "7px 10px" }} type="button" onClick={() => editWod(wod)}>
                        Edit
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={S.empty}>No WOD posted.</div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
