import { Routes, Route, Navigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import GymSettings from "./pages/GymSettings";
import Invites from "./pages/Invites";
import Members from "./pages/Members";
import Staff from "./pages/Staff";
import GymCreate from "./pages/GymCreate";
import SuperAdmin from "./pages/SuperAdmin";
import AcceptInvite from "./pages/AcceptInvite";
import AthleteMobileOnly from "./pages/AthleteMobileOnly";
import Layout from "./components/Layout";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GymGuard({ children }: { children: React.ReactNode }) {
  const me = useQuery(api.users.getMe);
  const pendingInvite = useQuery(api.invites.getMyPendingInvite);
  const isSuperAdmin = useQuery(api.users.isSuperAdmin);
  if (me === undefined || pendingInvite === undefined || isSuperAdmin === undefined) return <Spinner />;
  if (!me?.gymId) {
    if (pendingInvite?.role === "athlete") return <Navigate to="/mobile-app" replace />;
    if (pendingInvite) return <Navigate to="/accept-invite" replace />;
    if (isSuperAdmin) return <Navigate to="/super" replace />;
    return <Navigate to="/gym/create" replace />;
  }
  if (me.role === "athlete") return <Navigate to="/mobile-app" replace />;
  return <>{children}</>;
}

function GymAdminGuard({ children }: { children: React.ReactNode }) {
  const me = useQuery(api.users.getMe);
  if (me === undefined) return <Spinner />;
  if (me?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const isAdmin = useQuery(api.users.isSuperAdmin);
  if (isAdmin === undefined) return <Spinner />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function GymCreateGuard() {
  const isSuperAdmin = useQuery(api.users.isSuperAdmin);
  if (isSuperAdmin === undefined) return <Spinner />;
  if (isSuperAdmin) return <Navigate to="/super" replace />;
  return <GymCreate />;
}

export function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #333", borderTopColor: "#1BBFBF", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/createaccount" element={<Login initialStep="signup" />} />
      <Route path="/create-account" element={<Login initialStep="signup" />} />

      <Route path="/mobile-app" element={<AuthGuard><AthleteMobileOnly /></AuthGuard>} />

      {/* Protected app routes — shared Layout shell */}
      <Route
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route path="/dashboard" element={<GymGuard><Dashboard /></GymGuard>} />
        <Route path="/gym/settings" element={<GymGuard><GymSettings /></GymGuard>} />
        <Route path="/gym/invites" element={<GymGuard><Invites /></GymGuard>} />
        <Route path="/gym/staff" element={<GymGuard><GymAdminGuard><Staff /></GymAdminGuard></GymGuard>} />
        <Route path="/gym/members" element={<GymGuard><Members /></GymGuard>} />
        <Route path="/gym/create" element={<GymCreateGuard />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/super" element={<SuperAdminGuard><SuperAdmin /></SuperAdminGuard>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
