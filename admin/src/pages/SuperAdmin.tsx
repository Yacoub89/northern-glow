import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Doc, Id } from "@convex/_generated/dataModel";
import { useMediaQuery } from "../components/useMediaQuery";

const S = {
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub: { color: "#6b7280", fontSize: 14, marginBottom: 32 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" } as const,
  card: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 24, marginBottom: 24 },
  cardTitle: { fontSize: 16, fontWeight: 600, marginBottom: 20 },
  group: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, color: "#4b5563", marginBottom: 6 },
  input: {
    width: "100%", background: "#f8fafc", border: "1px solid #d1d5db", borderRadius: 8,
    padding: "10px 12px", color: "#111827", fontSize: 14, outline: "none", boxSizing: "border-box" as const,
  },
  btn: {
    width: "100%", padding: "11px 0", borderRadius: 8, fontWeight: 600, fontSize: 14,
    cursor: "pointer", border: "none", background: "#1BBFBF", color: "#062a2a", marginTop: 4,
  },
  btnSmall: {
    padding: "5px 12px", borderRadius: 6, fontWeight: 600, fontSize: 12,
    cursor: "pointer", border: "none", background: "#1BBFBF22", color: "#1BBFBF",
  },
  btnDanger: {
    padding: "5px 12px", borderRadius: 6, fontWeight: 600, fontSize: 12,
    cursor: "pointer", border: "none", background: "#ff453a22", color: "#ff453a",
  },
  success: { color: "#34C759", fontSize: 13, marginTop: 12 },
  error: { color: "#ff453a", fontSize: 13, marginTop: 12 },
  tableWrap: { width: "100%", overflowX: "auto" as const },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "8px 12px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #e5e7eb" },
  td: { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f8fafc", verticalAlign: "middle" as const },
  idRow: { display: "inline-flex", alignItems: "center", gap: 5, marginLeft: 8, maxWidth: "100%" },
  idText: { color: "#6b7280", fontFamily: "monospace", fontSize: 11, overflowWrap: "anywhere" as const },
  copyBtn: {
    width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center",
    border: "1px solid #d1d5db", borderRadius: 5, background: "#f8fafc", color: "#6b7280",
    cursor: "pointer", padding: 0,
  },
  dot: (color: string) => ({
    display: "inline-block", width: 8, height: 8, borderRadius: "50%",
    background: color, marginRight: 6,
  }),
  badge: (bg: string, color: string) => ({
    display: "inline-block", padding: "2px 7px", borderRadius: 4, fontSize: 11, background: bg, color,
  }),
};

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris",
  "Australia/Sydney",
  "Australia/Melbourne",
];

function errorMessage(error: unknown, fallback = "Failed") {
  return error instanceof Error ? error.message : fallback;
}

type Gym = {
  _id: Id<"gyms">;
  name: string;
  timezone: string;
  primaryColor: string;
};

function CopyGymIdButton({ gymId }: { gymId: Id<"gyms"> }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(gymId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      style={{ ...S.copyBtn, color: copied ? "#34C759" : S.copyBtn.color }}
      onClick={handleCopy}
      aria-label={`Copy gym id ${gymId}`}
      title={copied ? "Copied" : "Copy gym id"}
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

function GymIdLabel({ gymId }: { gymId: Id<"gyms"> }) {
  return (
    <span style={S.idRow}>
      <span style={S.idText}>{gymId}</span>
      <CopyGymIdButton gymId={gymId} />
    </span>
  );
}

// ── Pending invites table ─────────────────────────────────────────────────────

function PendingInvites() {
  const invites = useQuery(api.adminInvites.listPendingAdminInvites);
  const resend = useMutation(api.adminInvites.superAdminResendInvite);
  const [resending, setResending] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const handleResend = async (gymId: Id<"gyms">, email: string, inviteId: string) => {
    setResending(inviteId);
    setResendSuccess(null);
    try {
      await resend({ gymId, adminEmail: email });
      setResendSuccess(inviteId);
      setTimeout(() => setResendSuccess(null), 3000);
    } finally {
      setResending(null);
    }
  };

  if (invites === undefined) return <p style={{ color: "#6b7280", fontSize: 13 }}>Loading…</p>;
  if (invites.length === 0) return <p style={{ color: "#6b7280", fontSize: 13 }}>No pending admin invites.</p>;

  const now = Date.now();

  return (
    <div style={S.tableWrap}>
      <table style={{ ...S.table, minWidth: 560 }}>
        <thead>
          <tr>
            <th style={S.th}>Gym</th>
            <th style={S.th}>Email</th>
            <th style={S.th}>Expires</th>
            <th style={S.th}></th>
          </tr>
        </thead>
        <tbody>
          {invites.map((inv) => {
            const expired = inv.expiresAt < now;
            return (
              <tr key={inv._id}>
                <td style={S.td}>
                  {inv.gymName}
                  <GymIdLabel gymId={inv.gymId} />
                </td>
                <td style={S.td}>{inv.email}</td>
                <td style={S.td}>
                  {new Date(inv.expiresAt).toLocaleDateString()}
                  {expired && (
                    <span style={S.badge("#FF9F0A22", "#FF9F0A")}>expired</span>
                  )}
                </td>
                <td style={S.td}>
                  {resendSuccess === inv._id ? (
                    <span style={{ color: "#34C759", fontSize: 12 }}>Sent!</span>
                  ) : (
                    <button
                      style={S.btnSmall}
                      disabled={resending === inv._id}
                      onClick={() => handleResend(inv.gymId, inv.email, inv._id)}
                    >
                      {resending === inv._id ? "Sending…" : "Resend"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Leads panel ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, [string, string]> = {
  new: ["#1BBFBF22", "#1BBFBF"],
  contacted: ["#FF9F0A22", "#FF9F0A"],
  converted: ["#34C75922", "#34C759"],
  dismissed: ["#9ca3af55522", "#9ca3af555"],
};

function Leads({ onPrefillForm }: { onPrefillForm: (fields: { gymName: string; adminEmail: string }) => void }) {
  const leads = useQuery(api.leads.listLeads);
  const updateStatus = useMutation(api.leads.updateLeadStatus);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStatus = async (leadId: Id<"gymLeads">, status: Doc<"gymLeads">["status"]) => {
    setUpdating(leadId);
    try {
      await updateStatus({ leadId, status });
    } finally {
      setUpdating(null);
    }
  };

  if (leads === undefined) return <p style={{ color: "#6b7280", fontSize: 13 }}>Loading…</p>;
  if (leads.length === 0) return <p style={{ color: "#6b7280", fontSize: 13 }}>No leads yet.</p>;

  return (
    <div style={S.tableWrap}>
      <table style={{ ...S.table, minWidth: 760 }}>
        <thead>
          <tr>
            <th style={S.th}>Type</th>
            <th style={S.th}>Name</th>
            <th style={S.th}>Email</th>
            <th style={S.th}>Gym / Details</th>
            <th style={S.th}>Status</th>
            <th style={S.th}></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const [bg, color] = STATUS_COLORS[lead.status] ?? ["#e5e7eb", "#4b5563"];
            const isUpdating = updating === lead._id;
            return (
              <tr key={lead._id}>
                <td style={S.td}>
                  <span style={S.badge(lead.type === "signup" ? "#1BBFBF22" : "#FF9F0A22", lead.type === "signup" ? "#1BBFBF" : "#FF9F0A")}>
                    {lead.type === "signup" ? "signup" : "info"}
                  </span>
                </td>
                <td style={S.td}>{lead.name}</td>
                <td style={S.td}>{lead.email}</td>
                <td style={{ ...S.td, fontSize: 12, color: "#4b5563", maxWidth: 200 }}>
                  {lead.gymName && <div>{lead.gymName}</div>}
                  {lead.city && <div style={{ color: "#6b7280" }}>{lead.city}</div>}
                  {lead.memberCount && <div style={{ color: "#6b7280" }}>{lead.memberCount} members</div>}
                  {lead.message && <div style={{ color: "#6b7280", fontStyle: "italic" }}>{lead.message.slice(0, 60)}{lead.message.length > 60 ? "…" : ""}</div>}
                </td>
                <td style={S.td}>
                  <span style={S.badge(bg, color)}>{lead.status}</span>
                </td>
                <td style={{ ...S.td, whiteSpace: "nowrap" as const }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                    {lead.status === "new" && (
                      <button style={S.btnSmall} disabled={isUpdating} onClick={() => handleStatus(lead._id, "contacted")}>
                        Contacted
                      </button>
                    )}
                    {lead.type === "signup" && lead.status !== "converted" && lead.status !== "dismissed" && (
                      <button
                        style={S.btnSmall}
                        disabled={isUpdating}
                        onClick={() => {
                          onPrefillForm({ gymName: lead.gymName ?? lead.name, adminEmail: lead.email });
                          handleStatus(lead._id, "converted");
                        }}
                      >
                        Create gym
                      </button>
                    )}
                    {lead.status !== "dismissed" && lead.status !== "converted" && (
                      <button style={S.btnDanger} disabled={isUpdating} onClick={() => handleStatus(lead._id, "dismissed")}>
                        Dismiss
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SuperAdmin() {
  const gyms = useQuery(api.gyms.list) as Gym[] | undefined;
  const superAdminCreateGym = useMutation(api.gymProvisioning.superAdminCreateGym);

  const [form, setForm] = useState({
    gymName: "",
    tagline: "Powered by NorthernGlow",
    primaryColor: "#1BBFBF",
    timezone: "America/New_York",
    adminEmail: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isMobile = useMediaQuery("(max-width: 980px)");

  const prefillForm = ({ gymName, adminEmail }: { gymName: string; adminEmail: string }) => {
    setForm((f) => ({ ...f, gymName, adminEmail }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await superAdminCreateGym({
        gymName: form.gymName,
        tagline: form.tagline,
        primaryColor: form.primaryColor,
        timezone: form.timezone,
        adminEmail: form.adminEmail,
      });
      setSuccess(`Gym "${form.gymName}" created. Invite sent to ${form.adminEmail}.`);
      setForm({
        gymName: "",
        tagline: "Powered by NorthernGlow",
        primaryColor: "#1BBFBF",
        timezone: "America/New_York",
        adminEmail: "",
      });
    } catch (err: unknown) {
      setError(errorMessage(err, "Failed to create gym"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={S.h1}>Super Admin</h1>
      <p style={S.sub}>Create and manage all gyms on the NorthernGlow platform.</p>

      <div style={{ ...S.grid, gridTemplateColumns: isMobile ? "1fr" : S.grid.gridTemplateColumns, gap: isMobile ? 18 : S.grid.gap }}>
        {/* Left column */}
        <div>
          {/* Create gym form */}
          <div style={S.card}>
            <div style={S.cardTitle}>Create gym for a client</div>
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
                <select style={{ ...S.input, cursor: "pointer" }} value={form.timezone} onChange={set("timezone")}>
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div style={S.group}>
                <label style={S.label}>Gym admin email (they'll receive an invite)</label>
                <input style={S.input} type="email" value={form.adminEmail} onChange={set("adminEmail")} placeholder="owner@theirgym.com" required />
              </div>
              <button style={S.btn} type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create gym & send invite"}
              </button>
              {success && <p style={S.success}>{success}</p>}
              {error && <p style={S.error}>{error}</p>}
            </form>
          </div>

          {/* Pending invites */}
          <div style={S.card}>
            <div style={S.cardTitle}>Pending admin invites</div>
            <PendingInvites />
          </div>
        </div>

        {/* Right column — gyms list */}
        <div style={{ ...S.card, padding: isMobile ? 18 : S.card.padding }}>
          <div style={S.cardTitle}>All gyms ({gyms?.length ?? "…"})</div>
          {gyms === undefined ? (
            <p style={{ color: "#6b7280", fontSize: 13 }}>Loading…</p>
          ) : gyms.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: 13 }}>No gyms yet.</p>
          ) : (
            <div style={S.tableWrap}>
              <table style={{ ...S.table, minWidth: 560 }}>
                <thead>
                  <tr>
                    <th style={S.th}>Name</th>
                    <th style={S.th}>Timezone</th>
                    <th style={S.th}>Colour</th>
                  </tr>
                </thead>
                <tbody>
                  {gyms.map((gym) => (
                    <tr key={gym._id}>
                      <td style={S.td}>
                        {gym.name}
                        <GymIdLabel gymId={gym._id} />
                      </td>
                      <td style={S.td}>{gym.timezone}</td>
                      <td style={S.td}>
                        <span style={S.dot(gym.primaryColor)} />
                        {gym.primaryColor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Leads — full width */}
      <div style={{ ...S.card, marginTop: 0, padding: isMobile ? 18 : S.card.padding }}>
        <div style={S.cardTitle}>Incoming leads</div>
        <Leads onPrefillForm={prefillForm} />
      </div>
    </div>
  );
}
