import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useMediaQuery } from "./useMediaQuery";

const GYM_NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/gym/settings", label: "Gym Settings" },
  { to: "/gym/staff", label: "Staff", adminOnly: true },
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
  main: { flex: 1, padding: 32, overflowY: "auto" as const, minWidth: 0 },
};

export default function Layout() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const gym = useQuery(api.gyms.getMyGym);
  const me = useQuery(api.users.getMe);
  const isAdmin = useQuery(api.users.isSuperAdmin);
  const isMobile = useMediaQuery("(max-width: 760px)");
  const navLink = (active: boolean) => S.link(active);
  const showGymNav = !!gym;
  const showSuperAdminNav = isAdmin === true;
  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div style={{ ...S.shell, flexDirection: isMobile ? "column" : "row" }}>
      <aside
        style={{
          ...S.sidebar,
          width: isMobile ? "100%" : S.sidebar.width,
          padding: isMobile ? "14px 0 10px" : S.sidebar.padding,
          borderRight: isMobile ? "none" : S.sidebar.borderRight,
          borderBottom: isMobile ? "1px solid #252525" : "none",
        }}
      >
        <div
          style={{
            ...S.brand,
            padding: isMobile ? "0 16px 12px" : S.brand.padding,
            marginBottom: isMobile ? 10 : S.brand.marginBottom,
          }}
        >
          <div style={S.brandTitle}>{gym?.name ?? "NorthernGlow"}</div>
          <div style={S.brandSub}>Admin Portal</div>
        </div>
        <nav
          style={{
            ...S.nav,
            display: isMobile ? "flex" : "block",
            gap: isMobile ? 6 : undefined,
            overflowX: isMobile ? "auto" : undefined,
            padding: isMobile ? "0 12px 4px" : S.nav.padding,
          }}
        >
          {showGymNav &&
            GYM_NAV.filter(({ adminOnly }) => !adminOnly || me?.role === "admin").map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  ...navLink(isActive),
                  whiteSpace: "nowrap",
                  marginBottom: isMobile ? 0 : navLink(isActive).marginBottom,
                })}
              >
                {label}
              </NavLink>
            ))}
          {showSuperAdminNav && (
            <NavLink to="/super" style={({ isActive }) => ({
              ...navLink(isActive),
              whiteSpace: "nowrap",
              marginTop: !showGymNav || isMobile ? 0 : 16,
              marginBottom: isMobile ? 0 : navLink(isActive).marginBottom,
              borderTop: !showGymNav || isMobile ? "none" : "1px solid #252525",
              paddingTop: !showGymNav || isMobile ? 9 : 16,
            })}>
              Super Admin
            </NavLink>
          )}
          {isMobile && (
            <button
              style={{
                ...S.signOut,
                flexShrink: 0,
                margin: 0,
                whiteSpace: "nowrap",
                width: "auto",
              }}
              onClick={handleSignOut}
            >
              Sign out
            </button>
          )}
        </nav>
        <button
          style={{
            ...S.signOut,
            display: isMobile ? "none" : "block",
          }}
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </aside>
      <main style={{ ...S.main, padding: isMobile ? 18 : S.main.padding }}>
        <Outlet />
      </main>
    </div>
  );
}
