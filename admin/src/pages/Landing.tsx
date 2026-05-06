import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { SiteNav, SiteFooter, navBtnGhost } from "../components/SiteChrome";
import "./Landing.css";

// ── Tokens ────────────────────────────────────────────────────────────────────

const TEAL = "#1CD6F0";
const TEAL_DIM = "#1CD6F015";
const TEAL_BORDER = "#1CD6F038";
const BG = "#f8fafc";
const SURFACE = "#ffffff";
const CARD = "#ffffff";
const BORDER = "#e5e7eb";
const BORDER_BRIGHT = "#d1d5db";
const TEXT = "#111827";
const MUTED = "#4b5563";
const DIM = "#6b7280";

// ── Shared inline tokens (colors only — layout lives in Landing.css) ──────────

const T = {
  btnGhost: {
    padding: "8px 16px", borderRadius: 8, border: `1px solid ${BORDER_BRIGHT}`,
    background: "transparent", color: MUTED, fontSize: 14, fontWeight: 500,
    cursor: "pointer", whiteSpace: "nowrap",
  } as const,
  btnPrimary: {
    padding: "14px 28px", borderRadius: 10, border: "none",
    background: TEAL, color: "#062a2a", fontSize: 16, fontWeight: 700,
    cursor: "pointer",
  } as const,
  btnGhostLg: {
    padding: "14px 28px", borderRadius: 10, border: `1px solid ${BORDER_BRIGHT}`,
    background: "transparent", color: TEXT, fontSize: 16, fontWeight: 600,
    cursor: "pointer",
  } as const,
  pill: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "5px 14px", borderRadius: 999,
    background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}`,
    color: TEAL, fontSize: 12, fontWeight: 600, marginBottom: 28,
  } as const,
  sectionLabel: {
    fontSize: 12, fontWeight: 700, color: TEAL,
    letterSpacing: 2, textTransform: "uppercase" as const, marginBottom: 12,
  },
  card: {
    background: CARD, border: `1px solid ${BORDER}`,
    borderRadius: 14, padding: "24px 20px",
  } as const,
  featureIcon: {
    width: 44, height: 44, borderRadius: 10,
    background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, marginBottom: 14,
  } as const,
  stepNum: {
    width: 36, height: 36, borderRadius: "50%",
    background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 800, color: TEAL, marginBottom: 14,
  } as const,
};

// ── Modal ─────────────────────────────────────────────────────────────────────

const M = {
  overlay: {
    position: "fixed" as const, inset: 0,
    background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16,
  },
  box: {
    background: "#ffffff", border: `1px solid ${BORDER_BRIGHT}`,
    borderRadius: 16, padding: "32px 28px", width: "100%", maxWidth: 480,
  },
  title: { fontSize: 22, fontWeight: 800, marginBottom: 8, color: TEXT } as const,
  sub: { fontSize: 14, color: MUTED, marginBottom: 24, lineHeight: 1.6 } as const,
  group: { marginBottom: 16 } as const,
  label: { display: "block", fontSize: 13, color: MUTED, marginBottom: 6, fontWeight: 500 } as const,
  input: {
    width: "100%", background: "#f8fafc", border: `1px solid ${BORDER_BRIGHT}`,
    borderRadius: 8, padding: "11px 14px", color: TEXT, fontSize: 14,
    outline: "none", boxSizing: "border-box" as const,
  },
  textarea: {
    width: "100%", background: "#f8fafc", border: `1px solid ${BORDER_BRIGHT}`,
    borderRadius: 8, padding: "11px 14px", color: TEXT, fontSize: 14,
    outline: "none", boxSizing: "border-box" as const,
    resize: "vertical" as const, minHeight: 90, fontFamily: "inherit",
  },
  actions: { display: "flex", gap: 10, marginTop: 24 } as const,
  btnSubmit: {
    flex: 1, padding: "12px 0", borderRadius: 8, border: "none",
    background: TEAL, color: "#062a2a", fontSize: 14, fontWeight: 700, cursor: "pointer",
  } as const,
  btnCancel: {
    padding: "12px 20px", borderRadius: 8, border: `1px solid ${BORDER_BRIGHT}`,
    background: "transparent", color: MUTED, fontSize: 14, cursor: "pointer",
  } as const,
  success: { color: "#34C759", fontSize: 13, marginTop: 14, textAlign: "center" as const } as const,
  error: { color: "#ff453a", fontSize: 13, marginTop: 14 } as const,
};

function LearnMoreModal({ onClose }: { onClose: () => void }) {
  const submitLead = useMutation(api.leads.submitGymLead);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      await submitLead({ type: "info", name: name.trim(), email: email.trim(), message: message.trim() || undefined });
      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <div style={M.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={M.box}>
        <div style={M.title}>Want to learn more?</div>
        <div style={M.sub}>Drop your details and we'll reach out with info on how NorthernGlow can work for your gym.</div>
        {status === "done" ? (
          <div style={M.success}>Got it! We'll be in touch soon.</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={M.group}>
              <label style={M.label}>Your name</label>
              <input style={M.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Smith" required />
            </div>
            <div style={M.group}>
              <label style={M.label}>Email address</label>
              <input style={M.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@yourgym.com" required />
            </div>
            <div style={M.group}>
              <label style={M.label}>Anything specific? <span style={{ color: DIM }}>(optional)</span></label>
              <textarea style={M.textarea} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. pricing, integrations, how onboarding works…" />
            </div>
            {status === "error" && <div style={M.error}>{errorMsg}</div>}
            <div style={M.actions}>
              <button style={M.btnCancel} type="button" onClick={onClose}>Cancel</button>
              <button style={M.btnSubmit} type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Sending…" : "Send request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ApplyModal({ onClose }: { onClose: () => void }) {
  const submitLead = useMutation(api.leads.submitGymLead);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gymName, setGymName] = useState("");
  const [city, setCity] = useState("");
  const [memberCount, setMemberCount] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      await submitLead({
        type: "signup",
        name: name.trim(),
        email: email.trim(),
        gymName: gymName.trim(),
        city: city.trim() || undefined,
        memberCount: memberCount.trim() || undefined,
      });
      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <div style={M.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={M.box}>
        <div style={M.title}>Apply for access</div>
        <div style={M.sub}>Tell us about your gym and we'll get you set up. Takes under 2 minutes.</div>
        {status === "done" ? (
          <div style={M.success}>Application received! We'll be in touch within 24 hours.</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={M.group}>
              <label style={M.label}>Your name</label>
              <input style={M.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Smith" required />
            </div>
            <div style={M.group}>
              <label style={M.label}>Email address</label>
              <input style={M.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@yourgym.com" required />
            </div>
            <div style={M.group}>
              <label style={M.label}>Gym name</label>
              <input style={M.input} value={gymName} onChange={(e) => setGymName(e.target.value)} placeholder="CrossFit Northside" required />
            </div>
            <div style={M.group}>
              <label style={M.label}>City / location <span style={{ color: DIM }}>(optional)</span></label>
              <input style={M.input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Toronto, ON" />
            </div>
            <div style={M.group}>
              <label style={M.label}>Approx. member count <span style={{ color: DIM }}>(optional)</span></label>
              <input style={M.input} value={memberCount} onChange={(e) => setMemberCount(e.target.value)} placeholder="e.g. 80" />
            </div>
            {status === "error" && <div style={M.error}>{errorMsg}</div>}
            <div style={M.actions}>
              <button style={M.btnCancel} type="button" onClick={onClose}>Cancel</button>
              <button style={M.btnSubmit} type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Submitting…" : "Submit application"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Sections ──────────────────────────────────────────────────────────────────

function Hero({ onApply, onLearnMore }: { onApply: () => void; onLearnMore: () => void }) {
  return (
    <div className="l-hero">
      <div style={T.pill}>
        <span>⚡</span>
        Built for CrossFit gyms
      </div>
      <h1 className="l-h1">
        Run your gym.<br />
        <span style={{ color: TEAL }}>Not your spreadsheets.</span>
      </h1>
      <p className="l-hero-sub" style={{ color: MUTED, maxWidth: 580, margin: "0 auto 36px" }}>
        NorthernGlow handles athlete management, WOD programming, class bookings,
        and member management — so you can focus on coaching.
      </p>
      <div className="l-hero-actions">
        <button style={T.btnPrimary} onClick={onApply}>Apply for access →</button>
        <button style={T.btnGhostLg} onClick={onLearnMore}>Learn more</button>
      </div>
    </div>
  );
}

function Stats() {
  const items = [
    { num: "100%", label: "CrossFit-focused" },
    { num: "< 5 min", label: "Gym onboarding time" },
    { num: "Docs", label: "Programming import" },
    { num: "Stripe", label: "Billing built-in" },
  ];
  return (
    <div className="l-stats-row">
      {items.map(({ num, label }) => (
        <div key={label} style={{ textAlign: "center" }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: TEAL, display: "block" }}>{num}</span>
          <div style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

const FEATURES = [
  { icon: "📋", title: "Class scheduling", desc: "Athletes book classes from their phone. Coaches see live rosters. Waitlists, caps, and cancellations handled automatically." },
  { icon: "🏋️", title: "WOD programming", desc: "Publish daily WODs in AMRAP, ForTime, EMOM, Strength, or custom formats. Athletes track scores and progress over time." },
  { icon: "📄", title: "Google Docs import", desc: "Paste a Google Doc link and import your programming block in seconds. No copy-paste, no reformatting." },
  { icon: "💳", title: "Memberships & billing", desc: "Stripe-powered recurring billing with monthly and annual plans. Members manage their own subscriptions from the app." },
  { icon: "🎨", title: "White-label branding", desc: "Your gym name, your colors, and your app visuals. Athletes see your brand everywhere — not a generic platform name." },
];

function Features() {
  return (
    <div className="l-section" style={{ background: SURFACE }}>
      <div className="l-inner">
        <div style={T.sectionLabel}>Everything you need</div>
        <h2 className="l-h2">One platform,<br />zero duct tape.</h2>
        <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.6, maxWidth: 520, marginTop: 8 }}>
          Stop juggling six apps. NorthernGlow replaces your scheduling tool,
          WOD tracker, and member portal.
        </p>
        <div className="l-features-grid">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} style={T.card}>
              <div style={T.featureIcon}>{icon}</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrvnSpotlight() {
  return (
    <div id="prvn-section" className="l-section" style={{ background: BG }}>
      <div className="l-inner">
        <div className="l-spotlight-grid">
          <div>
            <div style={T.sectionLabel}>Programming import</div>
            <h2 className="l-h2">
              Import your programming<br />
              <span style={{ color: TEAL }}>straight from Google Docs.</span>
            </h2>
            <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.7, marginBottom: 28, marginTop: 8 }}>
              Whether you follow PRVN-style programming, CompTrain, Misfit
              Athletics, or write your own programming, NorthernGlow reads your Google Doc directly —
              parsing each WOD, labeling it by type, and publishing it to your
              athletes automatically.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Works with PRVN-style, CompTrain-style, Misfit-style, or custom docs",
                "Paste a Google Doc URL — nothing to install",
                "WODs parsed by type: AMRAP, ForTime, EMOM, Strength",
                "Athletes see tomorrow's workout the moment you publish",
                "Score tracking and leaderboards included",
              ].map((point) => (
                <div key={point} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: TEAL, marginTop: 2, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 15, color: "#374151" }}>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: CARD, border: `1px solid ${BORDER_BRIGHT}`, borderRadius: 16, padding: 28, fontFamily: "monospace" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ width: 28, height: 28, borderRadius: 4, background: "#4285F422", border: "1px solid #4285F440", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📄</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Week 14 Programming</div>
                <div style={{ fontSize: 13, color: "#4b5563" }}>docs.google.com/document/d/…</div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: 1, textTransform: "uppercase" }}>Monday · AMRAP 20</div>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, marginTop: 4 }}>
                5 Pull-ups<br />10 Push-ups<br />15 Air Squats
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: 1, textTransform: "uppercase" }}>Tuesday · Strength</div>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, marginTop: 4 }}>
                Back Squat — 5×5<br />@ 80% 1RM
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 0", borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, margin: "16px 0" }}>
              <span style={{ fontSize: 12, color: DIM }}>Importing via NorthernGlow</span>
              <span style={{ color: TEAL, fontSize: 16 }}>→</span>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 5, background: "#34C75920", border: "1px solid #34C75940", color: "#34C759", fontSize: 11, fontWeight: 600 }}>
                <span>✓</span> 5 WODs imported
              </div>
            </div>

            <div style={{ fontSize: 12, color: DIM }}>Athletes notified · Score tracking enabled · Leaderboard live</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { n: "1", title: "We set up your gym", desc: "You give us your gym name, timezone, and brand color. We create your account and send your admin an invite link. Takes under 5 minutes." },
  { n: "2", title: "We migrate your data", desc: "Already on another platform? We transfer your member list, class history, and programming so you don't start from scratch." },
  { n: "3", title: "Invite your athletes", desc: "Athletes download the NorthernGlow app, enter your gym code, and they're in. No spreadsheets, no manual imports." },
  { n: "4", title: "Coach like you always have", desc: "Paste your Google Doc link for the week's programming, post WODs, manage classes, and let the platform handle the rest." },
];

function HowItWorks() {
  return (
    <div className="l-section" style={{ background: SURFACE }}>
      <div className="l-inner">
        <div style={T.sectionLabel}>How it works</div>
        <h2 className="l-h2">Up and running<br />in one afternoon.</h2>
        <div className="l-steps-grid">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n}>
              <div style={T.stepNum}>{n}</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CtaBanner({ onApply, onLearnMore }: { onApply: () => void; onLearnMore: () => void }) {
  return (
    <div className="l-section" style={{ background: BG }}>
      <div className="l-inner">
        <div className="l-cta-banner" style={{ background: CARD, border: `1px solid ${BORDER_BRIGHT}` }}>
          <div style={{ ...T.sectionLabel, marginBottom: 20 }}>Ready to go?</div>
          <h2 className="l-h2">
            Your athletes deserve<br />
            <span style={{ color: TEAL }}>better than a WhatsApp group.</span>
          </h2>
          <p style={{ fontSize: 17, color: MUTED, marginBottom: 36, marginTop: 8 }}>
            Get NorthernGlow set up for your gym today. No contract, no setup fee.
          </p>
          <div className="l-hero-actions">
            <button style={T.btnPrimary} onClick={onApply}>Apply for access →</button>
            <button style={T.btnGhostLg} onClick={onLearnMore}>Have questions?</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const [modal, setModal] = useState<"learn" | "apply" | null>(null);

  return (
    <div style={{ background: BG, color: TEXT, minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <SiteNav rightSlot={<button style={navBtnGhost} onClick={() => navigate("/login")}>Sign in</button>} />
      <Hero onApply={() => setModal("apply")} onLearnMore={() => setModal("learn")} />
      <Stats />
      <Features />
      <PrvnSpotlight />
      <HowItWorks />
      <CtaBanner onApply={() => setModal("apply")} onLearnMore={() => setModal("learn")} />
      <SiteFooter />
      {modal === "learn" && <LearnMoreModal onClose={() => setModal(null)} />}
      {modal === "apply" && <ApplyModal onClose={() => setModal(null)} />}
    </div>
  );
}
