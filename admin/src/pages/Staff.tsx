import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useMediaQuery } from "../components/useMediaQuery";

type StaffRole = "coach" | "admin";
type StaffStatus = "active" | "inactive";
type Draft = {
  role: StaffRole;
  staffStatus: StaffStatus;
  canCoach: boolean;
  staffTitle: string;
  staffPhone: string;
  staffNotes: string;
};

const S = {
  page: { maxWidth: 1180 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 24,
    alignItems: "flex-start",
    marginBottom: 26,
  },
  h1: { fontSize: 28, fontWeight: 750, margin: "0 0 8px", color: "#fff" },
  sub: { color: "#888", fontSize: 14, margin: 0, maxWidth: 560, lineHeight: 1.5 },
  invitePanel: { background: "#141414", border: "1px solid #252525", borderRadius: 8, padding: 18, minWidth: 390 },
  panelTitle: { fontSize: 13, color: "#aaa", fontWeight: 700, margin: "0 0 12px" },
  form: { display: "grid", gridTemplateColumns: "1fr 128px auto", gap: 10, alignItems: "center" },
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
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, margin: "26px 0 12px" },
  sectionTitle: { fontSize: 16, fontWeight: 750, margin: 0, color: "#fff" },
  sectionMeta: { fontSize: 13, color: "#666" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 14 },
  card: { background: "#141414", border: "1px solid #252525", borderRadius: 8, padding: 16 },
  cardHead: { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 16 },
  personRow: { display: "flex", gap: 12, alignItems: "center", minWidth: 0 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#1BBFBF22",
    color: "#1BBFBF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 14,
    flexShrink: 0,
  },
  name: { color: "#fff", fontSize: 14, fontWeight: 750, overflowWrap: "anywhere" as const },
  email: { color: "#888", fontSize: 13, marginTop: 3, overflowWrap: "anywhere" as const },
  badges: { display: "flex", gap: 6, flexWrap: "wrap" as const, justifyContent: "flex-end" },
  badge: (tone: "admin" | "coach" | "active" | "inactive") => ({
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: 12,
    background:
      tone === "admin" ? "#1BBFBF22" : tone === "coach" ? "#FF9F0A22" : tone === "active" ? "#34C75922" : "#88888822",
    color:
      tone === "admin" ? "#1BBFBF" : tone === "coach" ? "#FF9F0A" : tone === "active" ? "#34C759" : "#888",
  }),
  fieldGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 },
  field: { display: "flex", flexDirection: "column" as const, gap: 6 },
  label: { fontSize: 12, color: "#777", fontWeight: 650 },
  textarea: {
    background: "#1e1e1e",
    border: "1px solid #333",
    borderRadius: 7,
    padding: "9px 10px",
    color: "#fff",
    fontSize: 13,
    outline: "none",
    width: "100%",
    minHeight: 62,
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    color: "#ddd",
    fontSize: 13,
    padding: "10px 0 14px",
  },
  checkbox: { width: 16, height: 16, accentColor: "#1BBFBF" },
  cardActions: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 },
  error: { color: "#ff453a", fontSize: 13, margin: "10px 0 0" },
  empty: { color: "#666", fontSize: 14, padding: "22px 0" },
};

function initials(name?: string, email?: string) {
  const source = name?.trim() || email?.trim() || "?";
  return source.slice(0, 2).toUpperCase();
}

function draftFor(member: {
  role?: "athlete" | "coach" | "admin";
  staffStatus?: StaffStatus;
  canCoach?: boolean;
  staffTitle?: string;
  staffPhone?: string;
  staffNotes?: string;
}): Draft {
  return {
    role: member.role === "admin" ? "admin" : "coach",
    staffStatus: member.staffStatus ?? "active",
    canCoach: member.canCoach ?? member.role === "coach",
    staffTitle: member.staffTitle ?? "",
    staffPhone: member.staffPhone ?? "",
    staffNotes: member.staffNotes ?? "",
  };
}

export default function Staff() {
  const staff = useQuery(api.staff.list);
  const sendInvite = useMutation(api.invites.send);
  const updateProfile = useMutation(api.staff.updateProfile);
  const isMobile = useMediaQuery("(max-width: 820px)");

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("coach");
  const [sending, setSending] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const activeStaff = staff?.filter((member) => (member.staffStatus ?? "active") === "active").length ?? 0;
  const coachEnabled = staff?.filter((member) => member.canCoach).length ?? 0;
  const admins = staff?.filter((member) => member.role === "admin").length ?? 0;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await sendInvite({ email, role: inviteRole });
      setEmail("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={{ ...S.header, flexDirection: isMobile ? "column" : "row" }}>
        <div>
          <h1 style={S.h1}>Staff</h1>
          <p style={S.sub}>Invite coaches and admins, set who can coach classes, and keep staff details ready for scheduling.</p>
        </div>
        <section style={{ ...S.invitePanel, width: isMobile ? "100%" : S.invitePanel.minWidth, boxSizing: "border-box" }}>
          <h2 style={S.panelTitle}>Invite staff</h2>
          <form style={{ ...S.form, gridTemplateColumns: isMobile ? "1fr" : S.form.gridTemplateColumns }} onSubmit={handleInvite}>
            <input
              style={S.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coach@example.com"
              required
            />
            <select style={S.select} value={inviteRole} onChange={(e) => setInviteRole(e.target.value as StaffRole)}>
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
            </select>
            <button style={{ ...S.btn(true), width: isMobile ? "100%" : "auto" }} type="submit" disabled={sending}>
              {sending ? "Sending..." : "Invite"}
            </button>
          </form>
          {error && <p style={S.error}>{error}</p>}
        </section>
      </div>

      <div style={{ ...S.stats, gridTemplateColumns: isMobile ? "1fr" : S.stats.gridTemplateColumns }}>
        <div style={S.stat}>
          <div style={S.statValue}>{activeStaff}</div>
          <div style={S.statLabel}>Active staff</div>
        </div>
        <div style={S.stat}>
          <div style={S.statValue}>{coachEnabled}</div>
          <div style={S.statLabel}>Can coach classes</div>
        </div>
        <div style={S.stat}>
          <div style={S.statValue}>{admins}</div>
          <div style={S.statLabel}>Admins</div>
        </div>
      </div>

      <div style={S.sectionHead}>
        <h2 style={S.sectionTitle}>Staff Roster</h2>
        <span style={S.sectionMeta}>{staff?.length ?? 0} listed</span>
      </div>
      {staff?.length === 0 ? (
        <p style={S.empty}>No staff yet. Invite a coach to get started.</p>
      ) : (
        <div style={{ ...S.grid, gridTemplateColumns: isMobile ? "1fr" : S.grid.gridTemplateColumns }}>
          {staff?.map((member) => {
            const draft = drafts[member._id] ?? draftFor(member);
            return (
              <article key={member._id} style={S.card}>
                <div style={S.cardHead}>
                  <div style={S.personRow}>
                    <div style={S.avatar}>{initials(member.name, member.email)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={S.name}>{member.name ?? "Unnamed staff"}</div>
                      <div style={S.email}>{member.email ?? "No email"}</div>
                    </div>
                  </div>
                  <div style={S.badges}>
                    <span style={S.badge(draft.role)}>{draft.role}</span>
                    <span style={S.badge(draft.staffStatus)}>{draft.staffStatus}</span>
                  </div>
                </div>

                <div style={{ ...S.fieldGrid, gridTemplateColumns: isMobile ? "1fr" : S.fieldGrid.gridTemplateColumns }}>
                  <label style={S.field}>
                    <span style={S.label}>Access role</span>
                    <select
                      style={S.select}
                      value={draft.role}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [member._id]: { ...draft, role: e.target.value as StaffRole },
                        }))
                      }
                    >
                      <option value="coach">Coach</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label style={S.field}>
                    <span style={S.label}>Status</span>
                    <select
                      style={S.select}
                      value={draft.staffStatus}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [member._id]: { ...draft, staffStatus: e.target.value as StaffStatus },
                        }))
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                  <label style={S.field}>
                    <span style={S.label}>Title</span>
                    <input
                      style={S.input}
                      value={draft.staffTitle}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [member._id]: { ...draft, staffTitle: e.target.value },
                        }))
                      }
                      placeholder="Head coach"
                    />
                  </label>
                  <label style={S.field}>
                    <span style={S.label}>Phone</span>
                    <input
                      style={S.input}
                      value={draft.staffPhone}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [member._id]: { ...draft, staffPhone: e.target.value },
                        }))
                      }
                      placeholder="(555) 123-4567"
                    />
                  </label>
                </div>

                <label style={S.checkboxRow}>
                  <input
                    style={S.checkbox}
                    type="checkbox"
                    checked={draft.canCoach}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [member._id]: { ...draft, canCoach: e.target.checked },
                      }))
                    }
                  />
                  Can be assigned to coach classes
                </label>

                <label style={S.field}>
                  <span style={S.label}>Internal notes</span>
                  <textarea
                    style={S.textarea}
                    value={draft.staffNotes}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [member._id]: { ...draft, staffNotes: e.target.value },
                      }))
                    }
                    placeholder="Certifications, focus areas, payroll notes"
                  />
                </label>

                <div style={S.cardActions}>
                  <button
                    style={S.btn(true)}
                    disabled={savingId === member._id}
                    onClick={async () => {
                      setSavingId(member._id);
                      setError("");
                      try {
                        await updateProfile({
                          userId: member._id as Id<"users">,
                          ...draft,
                        });
                        setDrafts((prev) => {
                          const next = { ...prev };
                          delete next[member._id];
                          return next;
                        });
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : "Failed to save staff member");
                      } finally {
                        setSavingId(null);
                      }
                    }}
                  >
                    {savingId === member._id ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
