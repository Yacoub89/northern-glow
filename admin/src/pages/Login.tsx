import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex, useConvexAuth, useQuery } from "convex/react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "@convex/_generated/api";
import { SiteNav, SiteFooter, navBtnGhost } from "../components/SiteChrome";

type Step = "signin" | "signup" | "verify";

const TEAL = "var(--admin-primary-bright)";
const BG = "var(--admin-bg)";
const CARD = "var(--admin-surface)";
const BORDER_BRIGHT = "var(--admin-border-strong)";
const TEXT = "var(--admin-text)";
const MUTED = "var(--admin-text-muted)";
const DIM = "var(--admin-text-subtle)";

const S = {
  page: {
    background: BG,
    color: TEXT,
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column" as const,
  },
  body: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 20px" } as const,
  card: {
    background: CARD,
    border: `1px solid ${BORDER_BRIGHT}`,
    borderRadius: 16,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 420,
  },

  // Form
  title: { fontSize: 22, fontWeight: 800, marginBottom: 8, color: TEXT } as const,
  sub: { fontSize: 14, color: MUTED, marginBottom: 28, lineHeight: 1.6 } as const,
  group: { marginBottom: 18 } as const,
  label: { display: "block", fontSize: 13, color: MUTED, marginBottom: 6, fontWeight: 500 } as const,
  input: {
    width: "100%", background: BG, border: `1px solid ${BORDER_BRIGHT}`,
    borderRadius: 8, padding: "11px 14px", color: TEXT, fontSize: 14,
    outline: "none", boxSizing: "border-box" as const,
  },
  passwordWrap: { position: "relative" as const },
  eyeBtn: {
    position: "absolute" as const,
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: MUTED,
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  btnSubmit: {
    width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
    background: TEAL, color: "var(--admin-on-primary)", fontSize: 14, fontWeight: 700,
    cursor: "pointer", marginTop: 8,
  } as const,
  btnSecondary: {
    width: "100%", padding: "12px 0", borderRadius: 8,
    border: `1px solid ${BORDER_BRIGHT}`,
    background: "transparent", color: MUTED, fontSize: 14,
    cursor: "pointer", marginTop: 8,
  } as const,
  toggle: { textAlign: "center" as const, marginTop: 20, fontSize: 13, color: DIM },
  toggleLink: { color: TEAL, cursor: "pointer", marginLeft: 4 },
  error: { color: "var(--admin-error)", fontSize: 13, marginTop: 10 },
  success: { color: TEAL, fontSize: 13, marginTop: 10, lineHeight: 1.5 },
};

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function authErrorMessage(err: unknown, fallback: string) {
  const raw = err instanceof Error ? err.message : String(err ?? "");

  if (raw.includes("InvalidSecret") || raw.includes("InvalidAccountId")) {
    return "That email or password doesn't look right. Please try again.";
  }

  if (raw.includes("InvalidVerificationCode") || raw.includes("InvalidCode")) {
    return "That verification code is invalid or expired. Please check the code and try again.";
  }

  if (raw.includes("AccountAlreadyExists")) {
    return "An account already exists for this email. Sign in instead.";
  }

  return raw || fallback;
}

export default function Login({ initialStep = "signin" }: { initialStep?: Step }) {
  const { isAuthenticated } = useConvexAuth();
  const convex = useConvex();
  const { signIn, signOut } = useAuthActions();
  const navigate = useNavigate();
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  const gymBranding = useQuery(
    api.gyms.getByCustomDomain,
    host && host !== "localhost" && host !== "127.0.0.1"
      ? { customDomain: host }
      : "skip"
  );
  const [step, setStep] = useState<Step>(initialStep);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const goToStep = (s: Step) => {
    setStep(s);
    setError("");
    setSuccess("");
    setShowPassword(false);
  };

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const brandName = gymBranding?.name ?? "NorthernGlow Admin";
  const brandTagline = gymBranding?.tagline ?? "Sign in to manage your gym.";
  const brandPrimary = gymBranding?.primaryColor ?? TEAL;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn("password", { email, password, flow: "signIn" });
    } catch (err: any) {
      setError(authErrorMessage(err, "Invalid email or password"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const canCreate = await convex.query(api.users.canCreateAccount, {
        email: email.trim(),
      });
      if (!canCreate) {
        setError("This email is not invited yet. Ask your gym admin or NorthernGlow to send an invite.");
        return;
      }
      await signIn("password", { name, email, password, flow: "signUp" });
      goToStep("verify");
    } catch (err: any) {
      setError(authErrorMessage(err, "Could not create account"));
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
      await signOut();
      setPassword("");
      setCode("");
      setStep("signin");
      setSuccess("Account verified. Sign in to continue.");
    } catch (err: any) {
      setError(authErrorMessage(err, "Invalid or expired code"));
    } finally {
      setLoading(false);
    }
  };

  const formContent = () => {
    if (step === "verify") {
      return (
        <>
          <div style={S.title}>Check your email</div>
          <div style={S.sub}>We sent a 6-digit code to <strong style={{ color: TEXT }}>{email}</strong>.</div>
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
            {error && <div style={S.error}>{error}</div>}
            <button style={{ ...S.btnSubmit, background: brandPrimary }} type="submit" disabled={loading}>
              {loading ? "Verifying…" : "Verify & continue"}
            </button>
            <button style={S.btnSecondary} type="button" onClick={() => goToStep("signup")}>
              Back
            </button>
          </form>
        </>
      );
    }

    if (step === "signup") {
      return (
        <>
          <div style={S.title}>Create account</div>
          <div style={S.sub}>Use the same email address your gym invited.</div>
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
              <div style={S.passwordWrap}>
                <input
                  style={{ ...S.input, paddingRight: 40 }}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  minLength={8}
                  required
                />
                <button style={S.eyeBtn} type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>
            {error && <div style={S.error}>{error}</div>}
            <button style={S.btnSubmit} type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
          <div style={S.toggle}>
            Already have an account?
            <span style={{ ...S.toggleLink, color: brandPrimary }} onClick={() => goToStep("signin")}>Sign in</span>
          </div>
        </>
      );
    }

    return (
      <>
        <div style={S.title}>{brandName}</div>
        <div style={S.sub}>{brandTagline}</div>
        <form onSubmit={handleSignIn}>
          <div style={S.group}>
            <label style={S.label}>Email address</label>
            <input style={S.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
          </div>
          <div style={S.group}>
            <label style={S.label}>Password</label>
            <div style={S.passwordWrap}>
              <input
                style={{ ...S.input, paddingRight: 40 }}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
              <button style={S.eyeBtn} type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>
          {error && <div style={S.error}>{error}</div>}
          {success && <div style={S.success}>{success}</div>}
          <button style={{ ...S.btnSubmit, background: brandPrimary }} type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div style={S.toggle}>
          Don't have an account?
          <span style={{ ...S.toggleLink, color: brandPrimary }} onClick={() => goToStep("signup")}>Create one</span>
        </div>
      </>
    );
  };

  return (
    <div style={S.page}>
      <SiteNav onLogoClick={() => navigate("/")} rightSlot={<button style={navBtnGhost} onClick={() => navigate("/")}>Home</button>} />
      <div style={S.body}>
        <div style={S.card}>
          {formContent()}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
