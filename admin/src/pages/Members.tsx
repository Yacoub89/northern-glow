import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useMediaQuery } from "../components/useMediaQuery";

const S = {
  page: { maxWidth: 1180 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 24,
    alignItems: "flex-start",
    marginBottom: 26,
  },
  h1: { fontSize: 28, fontWeight: 750, margin: "0 0 8px", color: "#111827" },
  sub: { color: "#6b7280", fontSize: 14, margin: 0, maxWidth: 520, lineHeight: 1.5 },
  panel: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 18 },
  invitePanel: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 18, minWidth: 340 },
  panelTitle: { fontSize: 13, color: "#4b5563", fontWeight: 700, margin: "0 0 12px" },
  form: { display: "flex", gap: 10, alignItems: "center" },
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
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, margin: "26px 0 12px" },
  sectionTitle: { fontSize: 16, fontWeight: 750, margin: 0, color: "#111827" },
  sectionMeta: { fontSize: 13, color: "#6b7280" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 },
  memberCard: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 },
  avatar: {
    width: 38,
    height: 38,
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
  personRow: { display: "flex", gap: 12, alignItems: "center" },
  name: { color: "#111827", fontSize: 14, fontWeight: 750, overflowWrap: "anywhere" as const },
  email: { color: "#6b7280", fontSize: 13, marginTop: 3, overflowWrap: "anywhere" as const },
  detail: { color: "#6b7280", fontSize: 12, marginTop: 14 },
  inviteList: { display: "grid", gap: 8 },
  inviteRow: {
    display: "grid",
    gridTemplateColumns: "minmax(180px, 1fr) 120px 110px auto",
    gap: 12,
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "12px 14px",
  },
  badge: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: 12,
    background: "#FF9F0A22",
    color: "#FF9F0A",
    width: "fit-content",
  },
  empty: { color: "#6b7280", fontSize: 14, padding: "22px 0" },
  error: { color: "#ff453a", fontSize: 13, margin: "10px 0 0" },
};

function initials(name?: string, email?: string) {
  const source = name?.trim() || email?.trim() || "?";
  return source.slice(0, 2).toUpperCase();
}

export default function Members() {
  const members = useQuery(api.users.listMembers);
  const invites = useQuery(api.invites.list);
  const sendInvite = useMutation(api.invites.send);
  const revokeInvite = useMutation(api.invites.revoke);
  const isMobile = useMediaQuery("(max-width: 820px)");

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const athletes = members?.filter((member) => (member.role ?? "athlete") === "athlete") ?? [];
  const pendingAthleteInvites =
    invites?.filter((invite) => invite.role === "athlete" && invite.status === "pending") ?? [];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await sendInvite({ email, role: "athlete" });
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
          <h1 style={S.h1}>Members</h1>
          <p style={S.sub}>Invite athletes, review the active member list, and keep pending athlete invites tidy.</p>
        </div>
        <section style={{ ...S.invitePanel, width: isMobile ? "100%" : S.invitePanel.minWidth, boxSizing: "border-box" }}>
          <h2 style={S.panelTitle}>Invite athlete</h2>
          <form style={{ ...S.form, flexDirection: isMobile ? "column" : "row" }} onSubmit={handleInvite}>
            <input
              style={S.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="athlete@example.com"
              required
            />
            <button style={{ ...S.btn(true), width: isMobile ? "100%" : "auto" }} type="submit" disabled={sending}>
              {sending ? "Sending..." : "Invite"}
            </button>
          </form>
          {error && <p style={S.error}>{error}</p>}
        </section>
      </div>

      <div style={{ ...S.stats, gridTemplateColumns: isMobile ? "1fr" : S.stats.gridTemplateColumns }}>
        <div style={S.stat}>
          <div style={S.statValue}>{athletes.length}</div>
          <div style={S.statLabel}>Active athletes</div>
        </div>
        <div style={S.stat}>
          <div style={S.statValue}>{pendingAthleteInvites.length}</div>
          <div style={S.statLabel}>Pending invites</div>
        </div>
        <div style={S.stat}>
          <div style={S.statValue}>{members?.length ?? "-"}</div>
          <div style={S.statLabel}>Total gym users</div>
        </div>
      </div>

      <div style={S.sectionHead}>
        <h2 style={S.sectionTitle}>Athletes</h2>
        <span style={S.sectionMeta}>{athletes.length} listed</span>
      </div>
      {athletes.length === 0 ? (
        <p style={S.empty}>No athletes yet. Send an invite to get started.</p>
      ) : (
        <div style={S.grid}>
          {athletes.map((member) => (
            <article key={member._id} style={S.memberCard}>
              <div style={S.personRow}>
                <div style={S.avatar}>{initials(member.name, member.email)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={S.name}>{member.name ?? "Unnamed athlete"}</div>
                  <div style={S.email}>{member.email ?? "No email"}</div>
                </div>
              </div>
              <div style={S.detail}>Joined {new Date(member._creationTime).toLocaleDateString()}</div>
            </article>
          ))}
        </div>
      )}

      <div style={S.sectionHead}>
        <h2 style={S.sectionTitle}>Pending Invites</h2>
        <span style={S.sectionMeta}>{pendingAthleteInvites.length} open</span>
      </div>
      {pendingAthleteInvites.length === 0 ? (
        <p style={S.empty}>No pending athlete invites.</p>
      ) : (
        <div style={S.inviteList}>
          {pendingAthleteInvites.map((invite) => (
            <div
              key={invite._id}
              style={{ ...S.inviteRow, gridTemplateColumns: isMobile ? "1fr" : S.inviteRow.gridTemplateColumns }}
            >
              <div>
                <div style={S.name}>{invite.email}</div>
                <div style={S.email}>Invited by {invite.invitedByName}</div>
              </div>
              <span style={S.badge}>{invite.status}</span>
              <div style={S.email}>{new Date(invite.expiresAt).toLocaleDateString()}</div>
              <button style={{ ...S.btn(false), padding: "7px 10px" }} onClick={() => revokeInvite({ inviteId: invite._id })}>
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
