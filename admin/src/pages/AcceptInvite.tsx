import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useNavigate } from "react-router-dom";

const TERMS_VERSION = "v1";

const TERMS_TEXT = `NorthernGlow Gym Partner Agreement — Version 1

By accepting this invitation you agree to the following:

1. Responsibility. You confirm that you are authorised to operate the gym listed above on the NorthernGlow platform, and that all information you provide is accurate.

2. Member data. You are responsible for managing your members' personal data in compliance with all applicable privacy laws (including GDPR where applicable). NorthernGlow processes this data on your behalf as a data processor.

3. Payments. You agree to pay the applicable subscription fees for your chosen plan. Failure to pay may result in suspension of your gym's account.

4. Acceptable use. You will not use the platform for any unlawful purpose, and will not attempt to misuse, reverse-engineer, or compromise the security of the platform.

5. Liability. NorthernGlow is provided "as is". We are not liable for any loss of data, revenue, or business arising from use of the platform.

6. Termination. Either party may terminate this agreement with 30 days notice. On termination your gym's data will be retained for 30 days then permanently deleted.

This is a placeholder agreement. Full legal terms will be provided before launch.`;

const S = {
  page: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" } as const,
  card: { background: "#141414", border: "1px solid #252525", borderRadius: 12, padding: 40, width: 480 },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  sub: { color: "#888", fontSize: 14, marginBottom: 28 },
  gymBox: {
    background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 8,
    padding: "16px 20px", marginBottom: 24,
  },
  gymName: { fontSize: 20, fontWeight: 700, color: "#fff" },
  gymLabel: { fontSize: 13, color: "#666", marginTop: 4 },
  termsBox: {
    background: "#0e0e0e", border: "1px solid #252525", borderRadius: 8,
    padding: 16, height: 200, overflowY: "auto" as const,
    fontSize: 12, color: "#aaa", lineHeight: 1.7, marginBottom: 16,
    whiteSpace: "pre-wrap" as const,
  },
  checkRow: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 24 },
  checkbox: { marginTop: 2, accentColor: "#1BBFBF", width: 16, height: 16, flexShrink: 0, cursor: "pointer" },
  checkLabel: { fontSize: 13, color: "#ccc", lineHeight: 1.5, cursor: "pointer" },
  btn: (disabled: boolean) => ({
    width: "100%", padding: "12px 0", borderRadius: 8, fontWeight: 600, fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer", border: "none",
    background: disabled ? "#333" : "#1BBFBF",
    color: disabled ? "#666" : "#000",
    transition: "background 0.15s",
  }),
  error: { color: "#ff453a", fontSize: 13, marginTop: 12 },
  loading: { color: "#666", fontSize: 14, textAlign: "center" as const },
  noInvite: { color: "#888", fontSize: 14, lineHeight: 1.6 },
};

export default function AcceptInvite() {
  const navigate = useNavigate();
  const invite = useQuery(api.invites.getMyAdminInvite);
  const acceptAdminInvite = useMutation(api.invites.acceptAdminInvite);
  const agreeToTerms = useMutation(api.users.agreeToTerms);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    if (!agreed) return;
    setLoading(true);
    setError("");
    try {
      await agreeToTerms({ version: TERMS_VERSION });
      await acceptAdminInvite({});
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Failed to accept invite");
    } finally {
      setLoading(false);
    }
  };

  if (invite === undefined) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <p style={S.loading}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <h1 style={S.h1}>No invite found</h1>
          <p style={S.noInvite}>
            We couldn't find a pending invite for your email address. Make sure
            you're signed in with the same email the invite was sent to, or
            contact NorthernGlow to resend it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>You've been invited!</h1>
        <p style={S.sub}>You've been given web portal access for this gym.</p>

        <div style={S.gymBox}>
          <div style={S.gymName}>{invite.gymName}</div>
          <div style={S.gymLabel}>
            Invited {new Date(invite._creationTime).toLocaleDateString()} · Expires {new Date(invite.expiresAt).toLocaleDateString()}
          </div>
        </div>

        <div style={S.termsBox}>{TERMS_TEXT}</div>

        <div style={S.checkRow}>
          <input
            id="agree"
            type="checkbox"
            style={S.checkbox}
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <label htmlFor="agree" style={S.checkLabel}>
            I have read and agree to the NorthernGlow Gym Partner Agreement (Version 1)
          </label>
        </div>

        <button style={S.btn(!agreed || loading)} onClick={handleAccept} disabled={!agreed || loading}>
          {loading ? "Accepting…" : "Accept & go to dashboard"}
        </button>
        {error && <p style={S.error}>{error}</p>}
      </div>
    </div>
  );
}
