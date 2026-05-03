import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Doc, Id } from "@convex/_generated/dataModel";

const S = {
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub: { color: "#888", fontSize: 14, marginBottom: 32 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" } as const,
  card: { background: "#141414", border: "1px solid #252525", borderRadius: 10, padding: 24, marginBottom: 24 },
  cardTitle: { fontSize: 16, fontWeight: 600, marginBottom: 20 },
  group: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 },
  labelHint: { fontSize: 11, color: "#555", marginTop: 4 },
  input: {
    width: "100%", background: "#1e1e1e", border: "1px solid #333", borderRadius: 8,
    padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const,
  },
  btn: {
    width: "100%", padding: "11px 0", borderRadius: 8, fontWeight: 600, fontSize: 14,
    cursor: "pointer", border: "none", background: "#1BBFBF", color: "#000", marginTop: 4,
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
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "8px 12px", fontSize: 12, color: "#666", borderBottom: "1px solid #252525" },
  td: { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #1a1a1a", verticalAlign: "middle" as const },
  idRow: { display: "inline-flex", alignItems: "center", gap: 5, marginLeft: 8 },
  idText: { color: "#666", fontFamily: "monospace", fontSize: 11 },
  copyBtn: {
    width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center",
    border: "1px solid #2b2b2b", borderRadius: 5, background: "#1a1a1a", color: "#888",
    cursor: "pointer", padding: 0,
  },
  dot: (color: string) => ({
    display: "inline-block", width: 8, height: 8, borderRadius: "50%",
    background: color, marginRight: 6,
  }),
  badge: (bg: string, color: string) => ({
    display: "inline-block", padding: "2px 7px", borderRadius: 4, fontSize: 11, background: bg, color,
  }),
  codeBlock: {
    background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 6,
    padding: "10px 12px", fontFamily: "monospace", fontSize: 12, color: "#ccc",
    overflowX: "auto" as const, marginBottom: 8,
  },
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

// ── DNS Records panel ─────────────────────────────────────────────────────────

type DnsRecord = {
  record: string;
  name: string;
  type: string;
  ttl: string;
  status: string;
  value: string;
  priority?: number;
};

type Gym = {
  _id: Id<"gyms">;
  name: string;
  timezone: string;
  primaryColor: string;
  customDomain?: string;
  emailDomain?: string;
  emailDomainStatus?: "pending" | "verified" | "failed";
  emailDomainRecords?: DnsRecord[];
  resendDomainId?: string;
};

function statusBadge(status?: string) {
  if (status === "verified") return <span style={S.badge("#34C75922", "#34C759")}>verified</span>;
  if (status === "failed") return <span style={S.badge("#ff453a22", "#ff453a")}>failed</span>;
  if (status === "pending") return <span style={S.badge("#FF9F0A22", "#FF9F0A")}>pending DNS</span>;
  return null;
}

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

function DnsRecordsPanel({ gym }: { gym: Gym }) {
  const verify = useMutation(api.gyms.superAdminVerifyEmailDomain);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyMsg("");
    try {
      await verify({ gymId: gym._id });
      setVerifyMsg("Verification triggered — refresh in a moment.");
    } catch (e: any) {
      setVerifyMsg(e.message ?? "Failed");
    } finally {
      setVerifying(false);
    }
  };

  if (!gym.emailDomain) return null;

  return (
    <div style={{ marginTop: 12, padding: "12px 16px", background: "#0f0f0f", borderRadius: 8, border: "1px solid #222" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>
          Email domain: {gym.emailDomain}
        </span>
        {statusBadge(gym.emailDomainStatus)}
      </div>

      {gym.customDomain && (
        <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
          Portal: <span style={{ color: "#aaa" }}>{gym.customDomain}</span>
          <span style={{ color: "#555", marginLeft: 8 }}>→ CNAME to your deployment URL</span>
        </div>
      )}

      {gym.emailDomainStatus !== "verified" && gym.emailDomainRecords && gym.emailDomainRecords.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
            Ask the gym to add these DNS records, then click Verify:
          </div>
          {gym.emailDomainRecords.map((r, i) => (
            <div key={i} style={S.codeBlock}>
              <span style={{ color: "#888" }}>{r.type} </span>
              <span style={{ color: "#1BBFBF" }}>{r.name}.{gym.emailDomain}</span>
              {r.priority !== undefined && <span style={{ color: "#888" }}> (priority {r.priority})</span>}
              <br />
              <span style={{ color: "#eee" }}>{r.value}</span>
              <span style={{ float: "right", color: r.status === "verified" ? "#34C759" : "#555" }}>
                {r.status}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <button style={S.btnSmall} onClick={handleVerify} disabled={verifying}>
              {verifying ? "Checking…" : "Verify DNS"}
            </button>
            {verifyMsg && <span style={{ fontSize: 12, color: "#aaa" }}>{verifyMsg}</span>}
          </div>
        </>
      )}

      {gym.emailDomainStatus === "verified" && (
        <div style={{ fontSize: 12, color: "#34C759" }}>
          Emails will send from noreply@{gym.emailDomain}
        </div>
      )}

      {(!gym.emailDomainRecords || gym.emailDomainRecords.length === 0) && gym.emailDomainStatus !== "verified" && (
        <div style={{ fontSize: 12, color: "#555" }}>Registering with Resend…</div>
      )}
    </div>
  );
}

// ── Pending invites table ─────────────────────────────────────────────────────

function PendingInvites() {
  const invites = useQuery(api.invites.listPendingAdminInvites);
  const resend = useMutation(api.invites.superAdminResendInvite);
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

  if (invites === undefined) return <p style={{ color: "#666", fontSize: 13 }}>Loading…</p>;
  if (invites.length === 0) return <p style={{ color: "#666", fontSize: 13 }}>No pending admin invites.</p>;

  const now = Date.now();

  return (
    <table style={S.table}>
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
  );
}

// ── Domain editor (inline in gyms list) ──────────────────────────────────────

function DomainEditor({ gym, onClose }: { gym: Gym; onClose: () => void }) {
  const updateDomains = useMutation(api.gyms.superAdminUpdateGymDomains);
  const [customDomain, setCustomDomain] = useState(gym.customDomain ?? "");
  const [emailDomain, setEmailDomain] = useState(gym.emailDomain ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      await updateDomains({
        gymId: gym._id,
        customDomain: customDomain.trim() || undefined,
        emailDomain: emailDomain.trim() || undefined,
      });
      setMsg("Saved.");
      setTimeout(onClose, 800);
    } catch (e: any) {
      setMsg(e.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "14px 16px", background: "#0f0f0f", borderRadius: 8, border: "1px solid #333", marginTop: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Domain settings — {gym.name}</div>
      <div style={S.group}>
        <label style={S.label}>Custom portal domain</label>
        <input
          style={S.input}
          value={customDomain}
          onChange={(e) => setCustomDomain(e.target.value)}
          placeholder="admin.theirgym.com"
        />
        <div style={S.labelHint}>Gym adds a CNAME record pointing to your deployment. Leave blank to use the default portal URL.</div>
      </div>
      <div style={S.group}>
        <label style={S.label}>Email sending domain</label>
        <input
          style={S.input}
          value={emailDomain}
          onChange={(e) => setEmailDomain(e.target.value)}
          placeholder="theirgym.com"
        />
        <div style={S.labelHint}>Emails send as noreply@domain. Changing this re-registers with Resend and resets DNS verification.</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button style={{ ...S.btnSmall, padding: "7px 16px" }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button style={{ ...S.btnSmall, background: "#1e1e1e", color: "#666" }} onClick={onClose}>
          Cancel
        </button>
        {msg && <span style={{ fontSize: 12, color: "#aaa" }}>{msg}</span>}
      </div>
    </div>
  );
}

// ── Leads panel ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, [string, string]> = {
  new: ["#1BBFBF22", "#1BBFBF"],
  contacted: ["#FF9F0A22", "#FF9F0A"],
  converted: ["#34C75922", "#34C759"],
  dismissed: ["#55555522", "#555555"],
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

  if (leads === undefined) return <p style={{ color: "#666", fontSize: 13 }}>Loading…</p>;
  if (leads.length === 0) return <p style={{ color: "#666", fontSize: 13 }}>No leads yet.</p>;

  return (
    <table style={S.table}>
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
          const [bg, color] = STATUS_COLORS[lead.status] ?? ["#33333322", "#aaa"];
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
              <td style={{ ...S.td, fontSize: 12, color: "#aaa", maxWidth: 200 }}>
                {lead.gymName && <div>{lead.gymName}</div>}
                {lead.city && <div style={{ color: "#666" }}>{lead.city}</div>}
                {lead.memberCount && <div style={{ color: "#666" }}>{lead.memberCount} members</div>}
                {lead.message && <div style={{ color: "#666", fontStyle: "italic" }}>{lead.message.slice(0, 60)}{lead.message.length > 60 ? "…" : ""}</div>}
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
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SuperAdmin() {
  const gyms = useQuery(api.gyms.list) as Gym[] | undefined;
  const superAdminCreateGym = useMutation(api.invites.superAdminCreateGym);

  const [form, setForm] = useState({
    gymName: "",
    tagline: "Powered by NorthernGlow",
    primaryColor: "#1BBFBF",
    timezone: "America/New_York",
    adminEmail: "",
    customDomain: "",
    emailDomain: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedGym, setExpandedGym] = useState<Id<"gyms"> | null>(null);
  const [editingDomains, setEditingDomains] = useState<Id<"gyms"> | null>(null);

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
        ...(form.customDomain.trim() ? { customDomain: form.customDomain.trim() } : {}),
        ...(form.emailDomain.trim() ? { emailDomain: form.emailDomain.trim() } : {}),
      });
      setSuccess(`Gym "${form.gymName}" created. Invite sent to ${form.adminEmail}.`);
      setForm({
        gymName: "",
        tagline: "Powered by NorthernGlow",
        primaryColor: "#1BBFBF",
        timezone: "America/New_York",
        adminEmail: "",
        customDomain: "",
        emailDomain: "",
      });
    } catch (err: any) {
      setError(err.message ?? "Failed to create gym");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={S.h1}>Super Admin</h1>
      <p style={S.sub}>Create and manage all gyms on the NorthernGlow platform.</p>

      <div style={S.grid}>
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
              <div style={S.group}>
                <label style={S.label}>Custom portal domain <span style={{ color: "#555" }}>(optional)</span></label>
                <input style={S.input} value={form.customDomain} onChange={set("customDomain")} placeholder="admin.theirgym.com" />
                <div style={S.labelHint}>If set, invite links point here. Gym adds a CNAME to your deployment.</div>
              </div>
              <div style={S.group}>
                <label style={S.label}>Email sending domain <span style={{ color: "#555" }}>(optional)</span></label>
                <input style={S.input} value={form.emailDomain} onChange={set("emailDomain")} placeholder="theirgym.com" />
                <div style={S.labelHint}>All emails send as noreply@domain once DNS is verified with Resend.</div>
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
        <div style={S.card}>
          <div style={S.cardTitle}>All gyms ({gyms?.length ?? "…"})</div>
          {gyms === undefined ? (
            <p style={{ color: "#666", fontSize: 13 }}>Loading…</p>
          ) : gyms.length === 0 ? (
            <p style={{ color: "#666", fontSize: 13 }}>No gyms yet.</p>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Name</th>
                  <th style={S.th}>Timezone</th>
                  <th style={S.th}>Colour</th>
                  <th style={S.th}>Email domain</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {gyms.map((gym) => (
                  <>
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
                      <td style={S.td}>
                        {gym.emailDomain ? (
                          <span
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              setExpandedGym(expandedGym === gym._id ? null : gym._id)
                            }
                          >
                            {gym.emailDomain} {statusBadge(gym.emailDomainStatus)}
                          </span>
                        ) : (
                          <span style={{ color: "#444", fontSize: 12 }}>none</span>
                        )}
                      </td>
                      <td style={S.td}>
                        <button
                          style={S.btnSmall}
                          onClick={() =>
                            setEditingDomains(editingDomains === gym._id ? null : gym._id)
                          }
                        >
                          Domains
                        </button>
                      </td>
                    </tr>
                    {expandedGym === gym._id && (
                      <tr key={`${gym._id}-dns`}>
                        <td colSpan={5} style={{ padding: "0 12px 12px" }}>
                          <DnsRecordsPanel gym={gym} />
                        </td>
                      </tr>
                    )}
                    {editingDomains === gym._id && (
                      <tr key={`${gym._id}-edit`}>
                        <td colSpan={5} style={{ padding: "0 12px 12px" }}>
                          <DomainEditor
                            gym={gym}
                            onClose={() => setEditingDomains(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Leads — full width */}
      <div style={{ ...S.card, marginTop: 0 }}>
        <div style={S.cardTitle}>Incoming leads</div>
        <Leads onPrefillForm={prefillForm} />
      </div>
    </div>
  );
}
