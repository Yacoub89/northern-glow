import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const GYM_NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/gym/settings", label: "Gym Settings" },
  { to: "/gym/invites", label: "Invites" },
  { to: "/gym/members", label: "Members" },
];

const S = {
  shell: { display: "flex", minHeight: "100vh" } as const,
  sidebar: {
    width: 220,
    background: "#141414",
    borderRight: "1px solid #252525",
    display: "flex",
    flexDirection: "column" as const,
    padding: "24px 0",
    flexShrink: 0,
  },
  brand: { padding: "0 20px 24px", borderBottom: "1px solid #252525", marginBottom: 16 },
  brandTitle: { fontSize: 16, fontWeight: 700, color: "#fff" },
  brandSub: { fontSize: 12, color: "#666", marginTop: 2 },
  nav: { flex: 1, padding: "0 8px" },
  link: (active: boolean) => ({
    display: "block",
    padding: "9px 12px",
    borderRadius: 6,
    color: active ? "#fff" : "#888",
    background: active ? "#1BBFBF22" : "transparent",
    textDecoration: "none",
    fontSize: 14,
    marginBottom: 2,
    fontWeight: active ? 600 : 400,
  }),
  signOut: {
    margin: "0 8px",
    padding: "9px 12px",
    borderRadius: 6,
    background: "transparent",
    color: "#666",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    textAlign: "left" as const,
    width: "calc(100% - 16px)",
  },
  main: { flex: 1, padding: 32, overflowY: "auto" as const },
};

export default function Layout() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const gym = useQuery(api.gyms.getMyGym);
  const isAdmin = useQuery(api.users.isSuperAdmin);

  return (
    <div style={S.shell}>
      <aside style={S.sidebar}>
        <div style={S.brand}>
          <div style={S.brandTitle}>{gym?.name ?? "NorthernGlow"}</div>
          <div style={S.brandSub}>Admin Portal</div>
        </div>
        <nav style={S.nav}>
          {GYM_NAV.map(({ to, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => S.link(isActive)}>
              {label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/super" style={({ isActive }) => ({
              ...S.link(isActive),
              marginTop: 16,
              borderTop: "1px solid #252525",
              paddingTop: 16,
            })}>
              Super Admin
            </NavLink>
          )}
        </nav>
        <button
          style={S.signOut}
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
        >
          Sign out
        </button>
      </aside>
      <main style={S.main}>
        <Outlet />
      </main>
    </div>
  );
}
