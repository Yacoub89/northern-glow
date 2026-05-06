import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "@convex/_generated/api";
import { useMediaQuery } from "../components/useMediaQuery";

const S = {
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub: { color: "#6b7280", fontSize: 14, marginBottom: 32 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 },
  card: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20 },
  cardLink: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 20,
    textDecoration: "none",
    display: "block",
  },
  stat: { fontSize: 32, fontWeight: 700, color: "#1BBFBF" },
  statLabel: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  section: { marginTop: 32 },
  sectionTitle: { fontSize: 16, fontWeight: 600, marginBottom: 16 },
  badge: (status: string) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 12,
    background: status === "pending" ? "#FF9F0A22" : status === "accepted" ? "#34C75922" : "#6b728022",
    color: status === "pending" ? "#FF9F0A" : status === "accepted" ? "#34C759" : "#6b7280",
  }),
  tableWrap: { width: "100%", overflowX: "auto" as const },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "8px 12px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #e5e7eb" },
  td: { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f8fafc" },
};

export default function Dashboard() {
  const gym = useQuery(api.gyms.getMyGym);
  const me = useQuery(api.users.getMe);
  const members = useQuery(api.users.listMembers);
  const invites = useQuery(api.invites.list);
  const isMobile = useMediaQuery("(max-width: 760px)");

  const pendingInvites = invites?.filter((i) => i.status === "pending") ?? [];

  return (
    <div>
      <h1 style={S.h1}>{gym?.name ?? "Your Gym"}</h1>
      <p style={S.sub}>{gym?.tagline}</p>

      <div style={{ ...S.grid, gridTemplateColumns: isMobile ? "1fr" : S.grid.gridTemplateColumns }}>
        <div style={S.card}>
          <div style={S.stat}>{members?.length ?? "—"}</div>
          <div style={S.statLabel}>Total members</div>
        </div>
        <div style={S.card}>
          <div style={S.stat}>{pendingInvites.length}</div>
          <div style={S.statLabel}>Pending invites</div>
        </div>
        <div style={S.card}>
          <div style={{ ...S.stat, color: gym?.primaryColor, fontSize: isMobile ? 24 : S.stat.fontSize, overflowWrap: "anywhere" }}>
            {gym?.primaryColor ?? "—"}
          </div>
          <div style={S.statLabel}>Brand colour</div>
        </div>
        <div style={S.card}>
          <div style={{ ...S.stat, fontSize: 18, paddingTop: 6 }}>{gym?.timezone ?? "—"}</div>
          <div style={S.statLabel}>Timezone</div>
        </div>
        {me?.role === "admin" && (
          <>
            <Link to="/gym/schedule" style={S.cardLink}>
              <div style={{ ...S.stat, fontSize: 18, paddingTop: 6 }}>Schedule</div>
              <div style={S.statLabel}>Plan classes and coaches</div>
            </Link>
            <Link to="/gym/workouts" style={S.cardLink}>
              <div style={{ ...S.stat, fontSize: 18, paddingTop: 6 }}>Workouts</div>
              <div style={S.statLabel}>Program WODs for mobile</div>
            </Link>
            <Link to="/gym/staff" style={S.cardLink}>
              <div style={{ ...S.stat, fontSize: 18, paddingTop: 6 }}>Staff</div>
              <div style={S.statLabel}>Manage coaches and admins</div>
            </Link>
          </>
        )}
      </div>

      {pendingInvites.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Pending invites</div>
          <div style={S.tableWrap}>
            <table style={{ ...S.table, minWidth: 560 }}>
              <thead>
                <tr>
                  <th style={S.th}>Email</th>
                  <th style={S.th}>Role</th>
                  <th style={S.th}>Invited by</th>
                  <th style={S.th}>Expires</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((inv) => (
                  <tr key={inv._id}>
                    <td style={S.td}>{inv.email}</td>
                    <td style={S.td}>{inv.role}</td>
                    <td style={S.td}>{inv.invitedByName}</td>
                    <td style={S.td}>{new Date(inv.expiresAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
