import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Navigate } from "react-router-dom";

type Step = "signin" | "signup" | "verify";

const S = {
  page: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" },
  card: { background: "#141414", border: "1px solid #252525", borderRadius: 12, padding: 40, width: 380 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 8 } as const,
  sub: { color: "#888", fontSize: 14, marginBottom: 28 },
  label: { display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 },
  input: {
    width: "100%", background: "#1e1e1e", border: "1px solid #333", borderRadius: 8,
    padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none",
  },
  group: { marginBottom: 16 },
  btn: (primary: boolean) => ({
    width: "100%", padding: "11px 0", borderRadius: 8, fontWeight: 600, fontSize: 14,
    cursor: "pointer", border: "none", marginTop: 8,
    background: primary ? "#1BBFBF" : "transparent",
    color: primary ? "#000" : "#888",
  }),
  toggle: { textAlign: "center" as const, marginTop: 20, fontSize: 13, color: "#666" },
  toggleLink: { color: "#1BBFBF", cursor: "pointer", marginLeft: 4 },
  error: { color: "#ff453a", fontSize: 13, marginTop: 10 },
};

export default function Login() {
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<Step>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn("password", { email, password, flow: "signIn" });
    } catch (err: any) {
      setError(err.message ?? "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn("password", { name, email, password, flow: "signUp" });
      setStep("verify");
    } catch (err: any) {
      setError(err.message ?? "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn("password", { email, code, flow: "email-verification" });
    } catch (err: any) {
      setError(err.message ?? "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────────
  if (step === "verify") {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <h1 style={S.title}>Check your email</h1>
          <p style={S.sub}>We sent a 6-digit code to <strong>{email}</strong>.</p>
          <form onSubmit={handleVerify}>
            <div style={S.group}>
              <label style={S.label}>Verification code</label>
              <input
                style={{ ...S.input, fontSize: 28, letterSpacing: 12, textAlign: "center" }}
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                autoFocus
              />
            </div>
            <button style={S.btn(true)} type="submit" disabled={loading}>
              {loading ? "Verifying…" : "Verify & continue"}
            </button>
            <button style={S.btn(false)} type="button" onClick={() => setStep("signup")}>
              Back
            </button>
            {error && <p style={S.error}>{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  // ── Sign up ───────────────────────────────────────────────────────────────────
  if (step === "signup") {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <h1 style={S.title}>NorthernGlow Admin</h1>
          <p style={S.sub}>Create your account to get started.</p>
          <form onSubmit={handleSignUp}>
            <div style={S.group}>
              <label style={S.label}>Full name</label>
              <input style={S.input} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" required autoFocus />
            </div>
            <div style={S.group}>
              <label style={S.label}>Email address</label>
              <input style={S.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div style={S.group}>
              <label style={S.label}>Password</label>
              <input style={S.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" minLength={8} required />
            </div>
            <button style={S.btn(true)} type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
            {error && <p style={S.error}>{error}</p>}
          </form>
          <p style={S.toggle}>
            Already have an account?
            <span style={S.toggleLink} onClick={() => setStep("signin")}>Sign in</span>
          </p>
        </div>
      </div>
    );
  }

  // ── Sign in ───────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.title}>NorthernGlow Admin</h1>
        <p style={S.sub}>Sign in to manage your gym.</p>
        <form onSubmit={handleSignIn}>
          <div style={S.group}>
            <label style={S.label}>Email address</label>
            <input style={S.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
          </div>
          <div style={S.group}>
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
          </div>
          <button style={S.btn(true)} type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          {error && <p style={S.error}>{error}</p>}
        </form>
        <p style={S.toggle}>
          Don't have an account?
          <span style={S.toggleLink} onClick={() => setStep("signup")}>Create one</span>
        </p>
      </div>
    </div>
  );
}
