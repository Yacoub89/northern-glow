import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useMediaQuery } from "../components/useMediaQuery";

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
    width: 280,
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
  tableWrap: { width: "100%", overflowX: "auto" as const, marginBottom: 34 },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: {
    textAlign: "left" as const,
    padding: "8px 12px",
    fontSize: 12,
    color: "#666",
    borderBottom: "1px solid #252525",
    whiteSpace: "nowrap" as const,
  },
  td: { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #1a1a1a" },
  badge: (status: string) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 12,
    background: status === "pending" ? "#FF9F0A22" : "#34C75922",
    color: status === "pending" ? "#FF9F0A" : "#34C759",
  }),
  empty: { color: "#666", fontSize: 14, padding: "24px 0", textAlign: "center" as const },
  error: { color: "#ff453a", fontSize: 13, marginTop: 8 },
};

export default function Members() {
  const members = useQuery(api.users.listMembers);
  const invites = useQuery(api.invites.list);
  const sendInvite = useMutation(api.invites.send);
  const revokeInvite = useMutation(api.invites.revoke);
  const isMobile = useMediaQuery("(max-width: 760px)");

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
    <div>
      <h1 style={S.h1}>Members</h1>
      <p style={S.sub}>Invite and manage athletes in this gym.</p>

      <h2 style={S.sectionTitle}>Invite athlete</h2>
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
            placeholder="athlete@example.com"
            required
          />
        </div>
        <button style={{ ...S.btn(true), width: isMobile ? "100%" : "auto" }} type="submit" disabled={sending}>
          {sending ? "Sending..." : "Send invite"}
        </button>
        {error && <p style={S.error}>{error}</p>}
      </form>

      <h2 style={S.sectionTitle}>Athletes</h2>
      {athletes.length === 0 ? (
        <p style={S.empty}>No athletes yet. Send an invite to get started.</p>
      ) : (
        <div style={S.tableWrap}>
          <table style={{ ...S.table, minWidth: 520 }}>
            <thead>
              <tr>
                <th style={S.th}>Name</th>
                <th style={S.th}>Email</th>
                <th style={S.th}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((member) => (
                <tr key={member._id}>
                  <td style={S.td}>{member.name ?? "-"}</td>
                  <td style={S.td}>{member.email ?? "-"}</td>
                  <td style={S.td}>{new Date(member._creationTime).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={S.sectionTitle}>Pending athlete invites</h2>
      {pendingAthleteInvites.length === 0 ? (
        <p style={S.empty}>No pending athlete invites.</p>
      ) : (
        <div style={S.tableWrap}>
          <table style={{ ...S.table, minWidth: 620 }}>
            <thead>
              <tr>
                <th style={S.th}>Email</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Invited by</th>
                <th style={S.th}>Expires</th>
                <th style={S.th} />
              </tr>
            </thead>
            <tbody>
              {pendingAthleteInvites.map((invite) => (
                <tr key={invite._id}>
                  <td style={S.td}>{invite.email}</td>
                  <td style={S.td}>
                    <span style={S.badge(invite.status)}>{invite.status}</span>
                  </td>
                  <td style={S.td}>{invite.invitedByName}</td>
                  <td style={S.td}>{new Date(invite.expiresAt).toLocaleDateString()}</td>
                  <td style={S.td}>
                    <button
                      style={{ ...S.btn(false), padding: "6px 10px", fontSize: 12 }}
                      onClick={() => revokeInvite({ inviteId: invite._id })}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
