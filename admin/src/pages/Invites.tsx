import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

type Role = "athlete" | "coach" | "admin";

const S = {
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 28 },
  form: { display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap" as const },
  group: { display: "flex", flexDirection: "column" as const, gap: 6 },
  label: { fontSize: 13, color: "#aaa" },
  input: {
    background: "#1e1e1e", border: "1px solid #333", borderRadius: 8,
    padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", width: 260,
  },
  select: {
    background: "#1e1e1e", border: "1px solid #333", borderRadius: 8,
    padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", width: 140,
  },
  btn: (primary: boolean) => ({
    padding: "10px 20px", borderRadius: 8, fontWeight: 600, fontSize: 14,
    cursor: "pointer", border: "none",
    background: primary ? "#1BBFBF" : "#1e1e1e",
    color: primary ? "#000" : "#888",
  }),
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "8px 12px", fontSize: 12, color: "#666", borderBottom: "1px solid #252525" },
  td: { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #1a1a1a" },
  badge: (status: string) => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 12,
    background: status === "pending" ? "#FF9F0A22" : status === "accepted" ? "#34C75922" : "#88888822",
    color: status === "pending" ? "#FF9F0A" : status === "accepted" ? "#34C759" : "#888",
  }),
  empty: { color: "#666", fontSize: 14, padding: "32px 0", textAlign: "center" as const },
  error: { color: "#ff453a", fontSize: 13, marginTop: 8 },
};

export default function Invites() {
  const invites = useQuery(api.invites.list);
  const sendInvite = useMutation(api.invites.send);
  const revokeInvite = useMutation(api.invites.revoke);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("athlete");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await sendInvite({ email, role });
      setEmail("");
    } catch (err: any) {
      setError(err.message ?? "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1 style={S.h1}>Invites</h1>

      <form style={S.form} onSubmit={handleSend}>
        <div style={S.group}>
          <label style={S.label}>Email address</label>
          <input
            style={S.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="athlete@example.com"
            required
          />
        </div>
        <div style={S.group}>
          <label style={S.label}>Role</label>
          <select style={S.select} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="athlete">Athlete</option>
            <option value="coach">Coach</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button style={S.btn(true)} type="submit" disabled={sending}>
          {sending ? "Sending…" : "Send invite"}
        </button>
        {error && <p style={S.error}>{error}</p>}
      </form>

      {invites?.length === 0 ? (
        <p style={S.empty}>No invites yet. Send one above.</p>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Email</th>
              <th style={S.th}>Role</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Invited by</th>
              <th style={S.th}>Expires</th>
              <th style={S.th} />
            </tr>
          </thead>
          <tbody>
            {invites?.map((inv) => (
              <tr key={inv._id}>
                <td style={S.td}>{inv.email}</td>
                <td style={S.td}>{inv.role}</td>
                <td style={S.td}><span style={S.badge(inv.status)}>{inv.status}</span></td>
                <td style={S.td}>{inv.invitedByName}</td>
                <td style={S.td}>{new Date(inv.expiresAt).toLocaleDateString()}</td>
                <td style={S.td}>
                  {inv.status === "pending" && (
                    <button
                      style={{ ...S.btn(false), padding: "4px 10px", fontSize: 12 }}
                      onClick={() => revokeInvite({ inviteId: inv._id })}
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
