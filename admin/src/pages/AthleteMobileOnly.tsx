import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@convex/_generated/api";
import { SiteFooter, SiteNav, navBtnGhost } from "../components/SiteChrome";

const S = {
  page: {
    background: "#f8fafc",
    color: "#111827",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column" as const,
  },
  body: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 20px",
  },
  panel: {
    width: "100%",
    maxWidth: 480,
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: "36px 32px",
    boxSizing: "border-box" as const,
  },
  eyebrow: { color: "#1CD6F0", fontSize: 13, fontWeight: 700, marginBottom: 10 },
  h1: { fontSize: 24, fontWeight: 800, margin: "0 0 12px" },
  copy: { color: "#4b5563", fontSize: 15, lineHeight: 1.6, margin: "0 0 24px" },
  button: {
    width: "100%",
    padding: "12px 0",
    borderRadius: 8,
    border: "none",
    background: "#1CD6F0",
    color: "#062a2a",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
};

export default function AthleteMobileOnly() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const me = useQuery(api.users.getMe);
  const pendingInvite = useQuery(api.invites.getMyPendingInvite);
  const gym = useQuery(api.gyms.getMyGym);
  const gymName = gym?.name ?? pendingInvite?.gymName ?? "your gym";

  return (
    <div style={S.page}>
      <SiteNav
        onLogoClick={() => navigate("/")}
        rightSlot={
          <button
            style={navBtnGhost}
            onClick={async () => {
              await signOut();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        }
      />
      <div style={S.body}>
        <section style={S.panel}>
          <div style={S.eyebrow}>Account created</div>
          <h1 style={S.h1}>Use the NorthernGlow mobile app</h1>
          <p style={S.copy}>
            {me?.name ? `${me.name}, your` : "Your"} account is ready for {gymName}. Athlete accounts do not use the web admin portal. Open the mobile app and sign in with this same email address to book classes, view workouts, and track results.
          </p>
          <button
            style={S.button}
            onClick={async () => {
              await signOut();
              navigate("/login");
            }}
          >
            Back to sign in
          </button>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
