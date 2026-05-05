import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useNavigate } from "react-router-dom";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to create gym";
}

/**
 * Shown to an authenticated user who has no gymId yet.
 * Allows them to create a new gym and become its first admin.
 *
 * In a production setup you might want to restrict this to a whitelist of
 * NorthernGlow staff emails. For now, any authenticated user can create a gym.
 */

const S = {
  page: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 18, boxSizing: "border-box" as const },
  card: { background: "#141414", border: "1px solid #252525", borderRadius: 12, padding: 40, width: "100%", maxWidth: 420, boxSizing: "border-box" as const },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  sub: { color: "#888", fontSize: 14, marginBottom: 28 },
  group: { marginBottom: 18 },
  label: { display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 },
  input: {
    width: "100%", background: "#1e1e1e", border: "1px solid #333", borderRadius: 8,
    padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const,
  },
  btn: {
    width: "100%", padding: "11px 0", borderRadius: 8, fontWeight: 600, fontSize: 14,
    cursor: "pointer", border: "none", background: "#1BBFBF", color: "#000", marginTop: 8,
  },
  error: { color: "#ff453a", fontSize: 13, marginTop: 12 },
};

export default function GymCreate() {
  const navigate = useNavigate();
  const createGymWithAdmin = useMutation(api.invites.createGymWithAdmin);

  const [form, setForm] = useState({
    gymName: "",
    tagline: "Powered by NorthernGlow",
    primaryColor: "#1BBFBF",
    timezone: "America/New_York",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createGymWithAdmin({
        gymName: form.gymName,
        tagline: form.tagline,
        primaryColor: form.primaryColor,
        timezone: form.timezone,
      });
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.h1}>Create your gym</h1>
        <p style={S.sub}>You'll be set as the admin. You can change all settings later.</p>
        <form onSubmit={handleSubmit}>
          <div style={S.group}>
            <label style={S.label}>Gym name</label>
            <input style={S.input} value={form.gymName} onChange={set("gymName")} placeholder="CrossFit Springfield" required />
          </div>
          <div style={S.group}>
            <label style={S.label}>Tagline</label>
            <input style={S.input} value={form.tagline} onChange={set("tagline")} placeholder="Powered by NorthernGlow" />
          </div>
          <div style={S.group}>
            <label style={S.label}>Primary colour</label>
            <input style={S.input} value={form.primaryColor} onChange={set("primaryColor")} placeholder="#1BBFBF" />
          </div>
          <div style={S.group}>
            <label style={S.label}>Timezone</label>
            <input style={S.input} value={form.timezone} onChange={set("timezone")} placeholder="America/New_York" />
          </div>
          <button style={S.btn} type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create gym"}
          </button>
          {error && <p style={S.error}>{error}</p>}
        </form>
      </div>
    </div>
  );
}
