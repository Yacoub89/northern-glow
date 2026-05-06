import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useMediaQuery } from "../components/useMediaQuery";
import { ACCESS_LEVELS, DEFAULT_WOD_PROGRAM, WOD_PROGRAMS, WOD_TYPES } from "./workouts/constants";
import { addDays, movementList, newPart, shortDate, shortDay, todayString } from "./workouts/helpers";
import { S } from "./workouts/styles";
import { AccessLevel, Announcement, ImportedWod, PartDraft, WodProgram, WodType, WorkoutsTab } from "./workouts/types";
import { AnnouncementsPanel } from "./workouts/AnnouncementsPanel";
import { WeekPreview } from "./workouts/WeekPreview";

export default function Workouts() {
  const isMobile = useMediaQuery("(max-width: 980px)");
  const [activeTab, setActiveTab] = useState<WorkoutsTab>("week");
  const [startDate, setStartDate] = useState(todayString());
  const [viewProgram, setViewProgram] = useState<WodProgram>(DEFAULT_WOD_PROGRAM);
  const [editingId, setEditingId] = useState<Id<"wods"> | null>(null);
  const [date, setDate] = useState(todayString());
  const [formProgram, setFormProgram] = useState<WodProgram>(DEFAULT_WOD_PROGRAM);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<WodType>("AMRAP");
  const [accessLevel, setAccessLevel] = useState<"" | AccessLevel>("");
  const [description, setDescription] = useState("");
  const [movements, setMovements] = useState("");
  const [scalingNotes, setScalingNotes] = useState("");
  const [parts, setParts] = useState<PartDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [importPreview, setImportPreview] = useState<ImportedWod[]>([]);
  const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set());
  const [overwriteImports, setOverwriteImports] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementStartDate, setAnnouncementStartDate] = useState(todayString());
  const [announcementEndDate, setAnnouncementEndDate] = useState("");
  const [announcementPinned, setAnnouncementPinned] = useState(true);
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [announcementError, setAnnouncementError] = useState("");
  const [announcementSuccess, setAnnouncementSuccess] = useState("");

  const schedule = useQuery(api.wods.getSchedule, { startDate, days: 7, program: viewProgram });
  const announcements = useQuery(api.announcements.listForAdmin) as Announcement[] | undefined;
  const createWod = useMutation(api.wods.create);
  const updateWod = useMutation(api.wods.update);
  const deleteWod = useMutation(api.wods.remove);
  const previewGoogleDoc = useAction(api.wodImport.previewGoogleDoc);
  const importMany = useMutation(api.wodImport.importMany);
  const createAnnouncement = useMutation(api.announcements.create);
  const deleteAnnouncement = useMutation(api.announcements.remove);

  const programmed = schedule?.filter((item) => item.wod !== null) ?? [];
  const movementCount = programmed.reduce((sum, item) => sum + (item.wod?.movements.length ?? 0), 0);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startDate, index)), [startDate]);

  const resetForm = () => {
    setEditingId(null);
    setDate(todayString());
    setFormProgram(DEFAULT_WOD_PROGRAM);
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
    setFormProgram((wod.program as WodProgram | undefined) ?? DEFAULT_WOD_PROGRAM);
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
    setActiveTab("create");
  };

  const createWodForDate = (wodDate: string) => {
    setEditingId(null);
    setDate(wodDate);
    setFormProgram(viewProgram);
    setTitle("");
    setType("AMRAP");
    setAccessLevel("");
    setDescription("");
    setMovements("");
    setScalingNotes("");
    setParts([]);
    setError("");
    setActiveTab("create");
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
        program: formProgram,
        title: title.trim(),
        description: description.trim(),
        type,
        movements: movementList(movements),
      };
      if (!payload.title) throw new Error("Title is required");
      const savedProgram = formProgram;
      if (editingId) {
        await updateWod({
          id: editingId,
          ...payload,
          scalingNotes: scalingNotes.trim() || null,
          accessLevel: accessLevel || null,
          parts: cleanParts.length > 0 ? cleanParts : null,
        });
      } else {
        await createWod({
          ...payload,
          ...(scalingNotes.trim() ? { scalingNotes: scalingNotes.trim() } : {}),
          ...(accessLevel ? { accessLevel } : {}),
          ...(cleanParts.length > 0 ? { parts: cleanParts } : {}),
        });
      }
      setStartDate(date);
      setViewProgram(savedProgram);
      resetForm();
      setActiveTab("week");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save WOD");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWod = async (wod: { _id: Id<"wods">; title: string; date: string }) => {
    const confirmed = window.confirm(`Delete ${wod.title} on ${shortDate(wod.date)}? Logged results for this WOD will also be removed.`);
    if (!confirmed) return;
    setSaving(true);
    setError("");
    try {
      await deleteWod({ id: wod._id });
      if (editingId === wod._id) resetForm();
      setActiveTab("week");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete WOD");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    setAnnouncementSaving(true);
    setAnnouncementError("");
    setAnnouncementSuccess("");
    try {
      const payload = {
        title: announcementTitle.trim(),
        body: announcementBody.trim(),
        startDate: announcementStartDate,
        pinned: announcementPinned,
        ...(announcementEndDate ? { endDate: announcementEndDate } : {}),
      };
      if (!payload.title || !payload.body) throw new Error("Title and message are required");
      await createAnnouncement(payload);
      setAnnouncementTitle("");
      setAnnouncementBody("");
      setAnnouncementStartDate(todayString());
      setAnnouncementEndDate("");
      setAnnouncementPinned(true);
      setAnnouncementSuccess("Announcement posted.");
    } catch (err: unknown) {
      setAnnouncementError(err instanceof Error ? err.message : "Failed to post announcement");
    } finally {
      setAnnouncementSaving(false);
    }
  };

  const handleDeleteAnnouncement = async (id: Id<"announcements">) => {
    const confirmed = window.confirm("Delete this announcement?");
    if (!confirmed) return;
    setAnnouncementError("");
    setAnnouncementSuccess("");
    try {
      await deleteAnnouncement({ id });
      setAnnouncementSuccess("Announcement deleted.");
    } catch (err: unknown) {
      setAnnouncementError(err instanceof Error ? err.message : "Failed to delete announcement");
    }
  };

  const handlePreviewImport = async (event: React.FormEvent) => {
    event.preventDefault();
    setPreviewing(true);
    setImportError("");
    setImportSuccess("");
    try {
      const result = await previewGoogleDoc({ url: docUrl.trim(), startDate });
      const items = result.items as ImportedWod[];
      setImportPreview(items);
      setSelectedImports(new Set(items.map((item) => item.date)));
      if (items.length === 0) {
        setImportError("No WOD sections were found in that doc.");
      }
    } catch (err: unknown) {
      setImportPreview([]);
      setSelectedImports(new Set());
      setImportError(err instanceof Error ? err.message : "Failed to preview Google Doc");
    } finally {
      setPreviewing(false);
    }
  };

  const updateImportedWod = (dateKey: string, updater: (item: ImportedWod) => ImportedWod) => {
    setImportPreview((prev) => prev.map((item) => (item.date === dateKey ? updater(item) : item)));
  };

  const handleImportSelected = async () => {
    const wods = importPreview
      .filter((item) => selectedImports.has(item.date))
      .map((item) => ({
        date: item.date,
        program: item.program ?? viewProgram,
        title: item.title.trim(),
        description: item.description.trim(),
        type: item.type,
        movements: item.movements.map((movement) => movement.trim()).filter(Boolean),
        ...(item.accessLevel ? { accessLevel: item.accessLevel } : {}),
        ...(item.scalingNotes?.trim() ? { scalingNotes: item.scalingNotes.trim() } : {}),
        ...(item.parts && item.parts.length > 0 ? { parts: item.parts } : {}),
      }));
    if (wods.length === 0) {
      setImportError("Select at least one WOD to import.");
      return;
    }
    if (wods.some((item) => !item.date || !item.title || !item.description)) {
      setImportError("Every selected WOD needs a date, title, and description.");
      return;
    }
    setImporting(true);
    setImportError("");
    setImportSuccess("");
    try {
      const result = await importMany({ wods, overwrite: overwriteImports });
      setStartDate(wods[0].date);
      setViewProgram((wods[0].program as WodProgram | undefined) ?? viewProgram);
      setActiveTab("week");
      setImportSuccess(
        `${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`
      );
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Failed to import WODs");
    } finally {
      setImporting(false);
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
          <select style={{ ...S.select, width: 190 }} value={viewProgram} onChange={(e) => setViewProgram(e.target.value as WodProgram)}>
            {WOD_PROGRAMS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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

      <div style={S.tabs} role="tablist" aria-label="Workout sections">
        <button style={S.tabBtn(activeTab === "week")} type="button" onClick={() => setActiveTab("week")}>
          Week Preview
        </button>
        <button style={S.tabBtn(activeTab === "create")} type="button" onClick={() => setActiveTab("create")}>
          {editingId ? "Edit WOD" : "Create WOD"}
        </button>
        <button style={S.tabBtn(activeTab === "import")} type="button" onClick={() => setActiveTab("import")}>
          Import
        </button>
        <button style={S.tabBtn(activeTab === "announcements")} type="button" onClick={() => setActiveTab("announcements")}>
          Announcements
        </button>
      </div>

      {activeTab === "announcements" && (
        <AnnouncementsPanel
          announcements={announcements}
          announcementBody={announcementBody}
          announcementEndDate={announcementEndDate}
          announcementError={announcementError}
          announcementPinned={announcementPinned}
          announcementSaving={announcementSaving}
          announcementStartDate={announcementStartDate}
          announcementSuccess={announcementSuccess}
          announcementTitle={announcementTitle}
          isMobile={isMobile}
          onCreateAnnouncement={handleCreateAnnouncement}
          onDeleteAnnouncement={handleDeleteAnnouncement}
          setAnnouncementBody={setAnnouncementBody}
          setAnnouncementEndDate={setAnnouncementEndDate}
          setAnnouncementPinned={setAnnouncementPinned}
          setAnnouncementStartDate={setAnnouncementStartDate}
          setAnnouncementTitle={setAnnouncementTitle}
        />
      )}

      {activeTab === "import" && (
      <section style={S.panel}>
        <div style={S.panelHead}>
          <div>
            <h2 style={S.panelTitle}>Import From Google Docs</h2>
            <p style={{ ...S.sub, marginTop: 6 }}>
              Paste a shareable or published Google Doc link. NorthernGlow reads the HTML export, then lets you edit the draft WODs before anything is saved.
            </p>
          </div>
        </div>
        <form onSubmit={handlePreviewImport}>
          <div style={{ ...S.importGrid, gridTemplateColumns: isMobile ? "1fr" : S.importGrid.gridTemplateColumns }}>
            <label style={S.field}>
              <span style={S.label}>Google Doc URL</span>
              <input
                style={S.input}
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
                required
              />
            </label>
            <button style={S.btn(true)} type="submit" disabled={previewing}>
              {previewing ? "Reading..." : "Preview Import"}
            </button>
          </div>
        </form>

        {importPreview.length > 0 && (
          <>
            <div style={S.importList}>
              {importPreview.map((item) => (
                <div
                  key={item.date}
                  style={S.importRow}
                >
                  <div
                    style={{
                      ...S.importTop,
                      gridTemplateColumns: isMobile ? "auto 1fr" : S.importTop.gridTemplateColumns,
                    }}
                  >
                    <input
                      style={S.check}
                      type="checkbox"
                      aria-label={`Select ${item.title}`}
                      checked={selectedImports.has(item.date)}
                      onChange={(e) => {
                        setSelectedImports((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(item.date);
                          else next.delete(item.date);
                          return next;
                        });
                      }}
                    />
                    <label style={S.field}>
                      <span style={S.label}>Date</span>
                      <input
                        style={S.input}
                        type="date"
                        value={item.date}
                        onChange={(e) => {
                          const nextDate = e.target.value;
                          setSelectedImports((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.date)) {
                              next.delete(item.date);
                              next.add(nextDate);
                            }
                            return next;
                          });
                          updateImportedWod(item.date, (current) => ({ ...current, date: nextDate }));
                        }}
                      />
                    </label>
                    <label style={S.field}>
                      <span style={S.label}>Title</span>
                      <input
                        style={S.input}
                        value={item.title}
                        onChange={(e) => updateImportedWod(item.date, (current) => ({ ...current, title: e.target.value }))}
                      />
                    </label>
                    <label style={S.field}>
                      <span style={S.label}>Type</span>
                      <select
                        style={S.select}
                        value={item.type}
                        onChange={(e) => updateImportedWod(item.date, (current) => ({ ...current, type: e.target.value as WodType }))}
                      >
                        {WOD_TYPES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={S.field}>
                      <span style={S.label}>Program</span>
                      <select
                        style={S.select}
                        value={(item.program as WodProgram | undefined) ?? viewProgram}
                        onChange={(e) => updateImportedWod(item.date, (current) => ({ ...current, program: e.target.value }))}
                      >
                        {WOD_PROGRAMS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div style={{ ...S.formGrid, gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr" }}>
                    <label style={S.field}>
                      <span style={S.label}>Description</span>
                      <textarea
                        style={{ ...S.textarea, minHeight: 110 }}
                        value={item.description}
                        onChange={(e) => updateImportedWod(item.date, (current) => ({ ...current, description: e.target.value }))}
                      />
                    </label>
                    <label style={S.field}>
                      <span style={S.label}>Movements</span>
                      <textarea
                        style={{ ...S.textarea, minHeight: 110 }}
                        value={item.movements.join("\n")}
                        onChange={(e) =>
                          updateImportedWod(item.date, (current) => ({
                            ...current,
                            movements: movementList(e.target.value),
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label style={S.field}>
                    <span style={S.label}>Scaling notes</span>
                    <textarea
                      style={{ ...S.textarea, minHeight: 62 }}
                      value={item.scalingNotes ?? ""}
                      onChange={(e) =>
                        updateImportedWod(item.date, (current) => ({
                          ...current,
                          scalingNotes: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
            <div style={{ ...S.formActions, justifyContent: "space-between" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--admin-text-muted)", fontSize: 13 }}>
                <input
                  style={S.check}
                  type="checkbox"
                  checked={overwriteImports}
                  onChange={(e) => setOverwriteImports(e.target.checked)}
                />
                Overwrite WODs on matching dates
              </label>
              <button style={S.btn(true)} type="button" disabled={importing} onClick={handleImportSelected}>
                {importing ? "Importing..." : "Import Selected"}
              </button>
            </div>
          </>
        )}
        {importError && <p style={S.error}>{importError}</p>}
        {importSuccess && <p style={S.success}>{importSuccess}</p>}
      </section>
      )}

      {activeTab === "create" && (
        <section style={S.panel}>
          <div style={S.panelHead}>
            <h2 style={S.panelTitle}>{editingId ? "Edit WOD" : "Create WOD"}</h2>
            {editingId && (
              <div style={S.controls}>
                <button style={{ ...S.btn(false), padding: "7px 10px" }} onClick={resetForm} type="button">
                  New WOD
                </button>
                <button
                  style={{ ...S.btn(false), padding: "7px 10px", color: "var(--admin-danger-text)" }}
                  onClick={() => {
                    const wod = schedule?.flatMap((item) => item.wod ? [item.wod] : []).find((item) => item._id === editingId);
                    void handleDeleteWod(wod ?? { _id: editingId, title: title || "this WOD", date });
                  }}
                  type="button"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ ...S.formGrid, gridTemplateColumns: isMobile ? "1fr" : S.formGrid.gridTemplateColumns }}>
              <label style={S.field}>
                <span style={S.label}>Date</span>
                <input style={S.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <label style={S.field}>
                <span style={S.label}>Program</span>
                <select style={S.select} value={formProgram} onChange={(e) => setFormProgram(e.target.value as WodProgram)}>
                  {WOD_PROGRAMS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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
      )}

      {activeTab === "week" && (
        <WeekPreview
          days={days}
          schedule={schedule}
          startDate={startDate}
          viewProgram={viewProgram}
          onCreate={createWodForDate}
          onDelete={handleDeleteWod}
          onEdit={editWod}
        />
      )}
    </div>
  );
}
