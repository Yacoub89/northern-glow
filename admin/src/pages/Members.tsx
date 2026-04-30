import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

const S = {
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 28 },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "8px 12px", fontSize: 12, color: "#666", borderBottom: "1px solid #252525" },
  td: { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #1a1a1a" },
  badge: (role: string) => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 12,
    background: role === "admin" ? "#1BBFBF22" : role === "coach" ? "#FF9F0A22" : "#88888822",
    color: role === "admin" ? "#1BBFBF" : role === "coach" ? "#FF9F0A" : "#888",
  }),
  select: {
    background: "#1e1e1e", border: "1px solid #333", borderRadius: 6,
    padding: "4px 8px", color: "#fff", fontSize: 12, outline: "none",
  },
  empty: { color: "#666", fontSize: 14, padding: "32px 0", textAlign: "center" as const },
};

export default function Members() {
  const members = useQuery(api.users.listMembers);
  const setRole = useMutation(api.users.setRole);

  return (
    <div>
      <h1 style={S.h1}>Members</h1>

      {members?.length === 0 ? (
        <p style={S.empty}>No members yet. Send invites to get started.</p>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Name</th>
              <th style={S.th}>Email</th>
              <th style={S.th}>Role</th>
              <th style={S.th}>Change role</th>
            </tr>
          </thead>
          <tbody>
            {members?.map((member) => (
              <tr key={member._id}>
                <td style={S.td}>{member.name ?? "—"}</td>
                <td style={S.td}>{member.email ?? "—"}</td>
                <td style={S.td}>
                  <span style={S.badge(member.role ?? "athlete")}>{member.role ?? "athlete"}</span>
                </td>
                <td style={S.td}>
                  <select
                    style={S.select}
                    value={member.role ?? "athlete"}
                    onChange={async (e) => {
                      await setRole({
                        userId: member._id as Id<"users">,
                        role: e.target.value as "athlete" | "coach" | "admin",
                      });
                    }}
                  >
                    <option value="athlete">Athlete</option>
                    <option value="coach">Coach</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
