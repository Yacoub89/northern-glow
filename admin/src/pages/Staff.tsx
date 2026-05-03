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
  staffTitle: string;
  staffPhone: string;
  staffNotes: string;
};

const S = {
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub: { color: "#777", fontSize: 14, margin: "0 0 28px" },
  sectionTitle: { fontSize: 16, fontWeight: 700, margin: "0 0 14px" },
  form: { display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 34, flexWrap: "wrap" as const },
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
    width: 260,
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
    width: 132,
    boxSizing: "border-box" as const,
  },
  tableWrap: { width: "100%", overflowX: "auto" as const },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: {
    textAlign: "left" as const,
    padding: "8px 10px",
    fontSize: 12,
    color: "#666",
    borderBottom: "1px solid #252525",
    whiteSpace: "nowrap" as const,
  },
  td: { padding: "10px", fontSize: 13, borderBottom: "1px solid #1a1a1a", verticalAlign: "top" as const },
  compactInput: {
    background: "#1e1e1e",
    border: "1px solid #333",
    borderRadius: 6,
    padding: "7px 8px",
    color: "#fff",
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  compactSelect: {
    background: "#1e1e1e",
    border: "1px solid #333",
    borderRadius: 6,
    padding: "7px 8px",
    color: "#fff",
    fontSize: 13,
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
  smallBtn: (primary: boolean) => ({
    padding: "7px 10px",
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer",
    border: "none",
    background: primary ? "#1BBFBF" : "#1e1e1e",
    color: primary ? "#000" : "#aaa",
    whiteSpace: "nowrap" as const,
  }),
  badge: (status: StaffStatus) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 12,
    background: status === "active" ? "#34C75922" : "#88888822",
    color: status === "active" ? "#34C759" : "#888",
  }),
  error: { color: "#ff453a", fontSize: 13, marginTop: 8 },
  empty: { color: "#666", fontSize: 14, padding: "32px 0", textAlign: "center" as const },
};

function draftFor(member: {
  role?: "athlete" | "coach" | "admin";
  staffStatus?: StaffStatus;
  staffTitle?: string;
  staffPhone?: string;
  staffNotes?: string;
}): Draft {
  return {
    role: member.role === "admin" ? "admin" : "coach",
    staffStatus: member.staffStatus ?? "active",
    staffTitle: member.staffTitle ?? "",
    staffPhone: member.staffPhone ?? "",
    staffNotes: member.staffNotes ?? "",
  };
}

export default function Staff() {
  const staff = useQuery(api.staff.list);
  const sendInvite = useMutation(api.invites.send);
  const updateProfile = useMutation(api.staff.updateProfile);
  const isMobile = useMediaQuery("(max-width: 760px)");

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("coach");
  const [sending, setSending] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

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
    <div>
      <h1 style={S.h1}>Staff</h1>
      <p style={S.sub}>Manage admins and coaches for this gym.</p>

      <h2 style={S.sectionTitle}>Invite staff</h2>
      <form
        style={{
          ...S.form,
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "flex-end",
        }}
        onSubmit={handleInvite}
      >
        <div style={{ ...S.group, width: isMobile ? "100%" : "auto" }}>
          <label style={S.label}>Email address</label>
          <input
            style={{ ...S.input, width: isMobile ? "100%" : S.input.width }}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coach@example.com"
            required
          />
        </div>
        <div style={{ ...S.group, width: isMobile ? "100%" : "auto" }}>
          <label style={S.label}>Role</label>
          <select
            style={{ ...S.select, width: isMobile ? "100%" : S.select.width }}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as StaffRole)}
          >
            <option value="coach">Coach</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button style={{ ...S.btn(true), width: isMobile ? "100%" : "auto" }} type="submit" disabled={sending}>
          {sending ? "Sending..." : "Send invite"}
        </button>
      </form>

      <h2 style={S.sectionTitle}>Roster</h2>
      {error && <p style={S.error}>{error}</p>}
      {staff?.length === 0 ? (
        <p style={S.empty}>No staff yet. Invite a coach to get started.</p>
      ) : (
        <div style={S.tableWrap}>
          <table style={{ ...S.table, minWidth: 980 }}>
            <thead>
              <tr>
                <th style={S.th}>Name</th>
                <th style={S.th}>Email</th>
                <th style={S.th}>Role</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Title</th>
                <th style={S.th}>Phone</th>
                <th style={S.th}>Notes</th>
                <th style={S.th} />
              </tr>
            </thead>
            <tbody>
              {staff?.map((member) => {
                const draft = drafts[member._id] ?? draftFor(member);
                return (
                  <tr key={member._id}>
                    <td style={S.td}>{member.name ?? "-"}</td>
                    <td style={S.td}>{member.email ?? "-"}</td>
                    <td style={S.td}>
                      <select
                        style={S.compactSelect}
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
                    </td>
                    <td style={S.td}>
                      <select
                        style={S.compactSelect}
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
                      <div style={{ marginTop: 6 }}>
                        <span style={S.badge(draft.staffStatus)}>{draft.staffStatus}</span>
                      </div>
                    </td>
                    <td style={S.td}>
                      <input
                        style={S.compactInput}
                        value={draft.staffTitle}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [member._id]: { ...draft, staffTitle: e.target.value },
                          }))
                        }
                        placeholder="Head coach"
                      />
                    </td>
                    <td style={S.td}>
                      <input
                        style={S.compactInput}
                        value={draft.staffPhone}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [member._id]: { ...draft, staffPhone: e.target.value },
                          }))
                        }
                        placeholder="(555) 123-4567"
                      />
                    </td>
                    <td style={S.td}>
                      <input
                        style={S.compactInput}
                        value={draft.staffNotes}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [member._id]: { ...draft, staffNotes: e.target.value },
                          }))
                        }
                        placeholder="Certs, focus, notes"
                      />
                    </td>
                    <td style={S.td}>
                      <button
                        style={S.smallBtn(true)}
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
                        {savingId === member._id ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
