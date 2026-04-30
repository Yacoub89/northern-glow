import { useNavigate } from "react-router-dom";

// ── Tokens ────────────────────────────────────────────────────────────────────
// Colors derived from the app icon: deep navy bg + electric cyan glow

const TEAL = "#1CD6F0";
const TEAL_DIM = "#1CD6F015";
const TEAL_BORDER = "#1CD6F038";
const BG = "#0B1525";
const SURFACE = "#0F1E36";
const CARD = "#131F33";
const BORDER = "#1C2D45";
const BORDER_BRIGHT = "#243650";
const TEXT = "#ffffff";
const MUTED = "#7A99BB";
const DIM = "#3A5270";

// ── Shared style objects ──────────────────────────────────────────────────────

const S = {
  // Layout
  page: { background: BG, color: TEXT, minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" } as const,
  section: (bg = BG) => ({ background: bg, padding: "96px 0" }) as const,
  inner: { maxWidth: 1120, margin: "0 auto", padding: "0 32px" } as const,

  // Nav
  nav: {
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
    background: "#0B1525cc",
    backdropFilter: "blur(12px)",
    borderBottom: `1px solid ${BORDER}`,
    padding: "0 32px",
  },
  navInner: { maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 } as const,
  logo: { display: "flex", alignItems: "center", gap: 10 } as const,
  logoMark: {
    width: 32, height: 32, borderRadius: 8,
    overflow: "hidden", flexShrink: 0,
  } as const,
  logoText: { fontSize: 17, fontWeight: 700, color: TEXT } as const,
  navRight: { display: "flex", alignItems: "center", gap: 12 } as const,
  btnGhost: {
    padding: "8px 18px", borderRadius: 8, border: `1px solid ${BORDER_BRIGHT}`,
    background: "transparent", color: MUTED, fontSize: 14, fontWeight: 500,
    cursor: "pointer",
  } as const,
  btnPrimary: {
    padding: "9px 20px", borderRadius: 8, border: "none",
    background: TEAL, color: "#000", fontSize: 14, fontWeight: 700,
    cursor: "pointer",
  } as const,

  // Hero
  hero: { padding: "120px 32px 96px", textAlign: "center" as const, maxWidth: 800, margin: "0 auto" },
  pill: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "5px 14px", borderRadius: 999,
    background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}`,
    color: TEAL, fontSize: 12, fontWeight: 600, marginBottom: 32,
  } as const,
  h1: { fontSize: 58, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5, marginBottom: 24 } as const,
  heroSub: { fontSize: 20, color: MUTED, lineHeight: 1.6, marginBottom: 48, maxWidth: 600, margin: "0 auto 48px" } as const,
  heroActions: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const } as const,
  btnHeroPrimary: {
    padding: "14px 32px", borderRadius: 10, border: "none",
    background: TEAL, color: "#000", fontSize: 16, fontWeight: 700,
    cursor: "pointer",
  } as const,
  btnHeroGhost: {
    padding: "14px 32px", borderRadius: 10, border: `1px solid ${BORDER_BRIGHT}`,
    background: "transparent", color: TEXT, fontSize: 16, fontWeight: 600,
    cursor: "pointer",
  } as const,

  // Stats row
  statsRow: { display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" as const, padding: "0 32px 96px" } as const,
  stat: { textAlign: "center" as const } as const,
  statNum: { fontSize: 36, fontWeight: 800, color: TEAL, display: "block" } as const,
  statLabel: { fontSize: 14, color: MUTED, marginTop: 4 } as const,

  // Section headings
  sectionLabel: { fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: 2, textTransform: "uppercase" as const, marginBottom: 12 } as const,
  h2: { fontSize: 40, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.8, marginBottom: 16 } as const,
  h2Sub: { fontSize: 18, color: MUTED, lineHeight: 1.6, maxWidth: 560 } as const,

  // Features grid
  featuresGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 56 } as const,
  featureCard: {
    background: CARD, border: `1px solid ${BORDER}`,
    borderRadius: 14, padding: "28px 24px",
  } as const,
  featureIcon: {
    width: 44, height: 44, borderRadius: 10,
    background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, marginBottom: 16,
  } as const,
  featureTitle: { fontSize: 17, fontWeight: 700, marginBottom: 8 } as const,
  featureDesc: { fontSize: 14, color: MUTED, lineHeight: 1.6 } as const,

  // PRVN spotlight
  spotlightGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" } as const,
  spotlightLeft: {} as const,
  spotlightRight: {
    background: CARD, border: `1px solid ${BORDER_BRIGHT}`,
    borderRadius: 16, padding: 32, fontFamily: "monospace",
  } as const,
  docsHeader: {
    display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
    paddingBottom: 16, borderBottom: `1px solid ${BORDER}`,
  } as const,
  docsIcon: {
    width: 28, height: 28, borderRadius: 4,
    background: "#4285F422", border: "1px solid #4285F440",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
  } as const,
  docsTitle: { fontSize: 13, color: "#aaa" } as const,
  wodRow: { marginBottom: 14 } as const,
  wodType: { fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: 1, textTransform: "uppercase" as const } as const,
  wodText: { fontSize: 13, color: "#ccc", lineHeight: 1.5, marginTop: 4 } as const,
  arrowRow: {
    display: "flex", alignItems: "center", gap: 8, padding: "14px 0",
    borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
    margin: "16px 0",
  } as const,
  arrowLabel: { fontSize: 12, color: DIM } as const,
  arrowTeal: { fontSize: 12, color: TEAL, fontWeight: 600 } as const,
  importedBadge: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "3px 9px", borderRadius: 5,
    background: "#34C75920", border: "1px solid #34C75940",
    color: "#34C759", fontSize: 11, fontWeight: 600,
  } as const,

  // How it works
  stepsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, marginTop: 56 } as const,
  stepNum: {
    width: 36, height: 36, borderRadius: "50%",
    background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 800, color: TEAL, marginBottom: 16,
  } as const,
  stepTitle: { fontSize: 17, fontWeight: 700, marginBottom: 8 } as const,
  stepDesc: { fontSize: 14, color: MUTED, lineHeight: 1.6 } as const,

  // CTA banner
  ctaBanner: {
    background: CARD, border: `1px solid ${BORDER_BRIGHT}`,
    borderRadius: 20, padding: "64px 48px", textAlign: "center" as const,
  } as const,
  ctaH2: { fontSize: 40, fontWeight: 800, letterSpacing: -0.8, marginBottom: 16 } as const,
  ctaSub: { fontSize: 18, color: MUTED, marginBottom: 40 } as const,

  // Footer
  footer: { borderTop: `1px solid ${BORDER}`, padding: "40px 32px" } as const,
  footerInner: { maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" } as const,
  footerLeft: { display: "flex", alignItems: "center", gap: 10 } as const,
  footerRight: { fontSize: 13, color: DIM } as const,
};

// ── Components ────────────────────────────────────────────────────────────────

function Nav({ onLogin }: { onLogin: () => void }) {
  return (
    <nav style={S.nav}>
      <div style={S.navInner}>
        <div style={S.logo}>
          <div style={S.logoMark}>
            <img src="/icon.png" alt="NorthernGlow" style={{ width: "100%", height: "100%", display: "block" }} />
          </div>
          <span style={S.logoText}>NorthernGlow</span>
        </div>
        <div style={S.navRight}>
          <button style={S.btnGhost} onClick={onLogin}>Sign in</button>
          <button style={S.btnPrimary} onClick={onLogin}>Get started</button>
        </div>
      </div>
    </nav>
  );
}

function Hero({ onLogin }: { onLogin: () => void }) {
  return (
    <div style={S.hero}>
      <div style={S.pill}>
        <span>⚡</span>
        Built for CrossFit gyms
      </div>
      <h1 style={S.h1}>
        Run your gym.<br />
        <span style={{ color: TEAL }}>Not your spreadsheets.</span>
      </h1>
      <p style={S.heroSub}>
        NorthernGlow handles athlete management, WOD programming, class bookings,
        and billing — so you can focus on coaching.
      </p>
      <div style={S.heroActions}>
        <button style={S.btnHeroPrimary} onClick={onLogin}>
          Get your gym set up →
        </button>
        <button style={S.btnHeroGhost} onClick={() => document.getElementById("prvn-section")?.scrollIntoView({ behavior: "smooth" })}>
          See PRVN integration
        </button>
      </div>
    </div>
  );
}

function Stats() {
  const items = [
    { num: "100%", label: "CrossFit-focused" },
    { num: "< 5 min", label: "Gym onboarding time" },
    { num: "PRVN", label: "Programming integrated" },
    { num: "Stripe", label: "Billing built-in" },
  ];
  return (
    <div style={S.statsRow}>
      {items.map(({ num, label }) => (
        <div key={label} style={S.stat}>
          <span style={S.statNum}>{num}</span>
          <div style={S.statLabel}>{label}</div>
        </div>
      ))}
    </div>
  );
}

const FEATURES = [
  {
    icon: "📋",
    title: "Class scheduling",
    desc: "Athletes book classes from their phone. Coaches see live rosters. Waitlists, caps, and cancellations handled automatically.",
  },
  {
    icon: "🏋️",
    title: "WOD programming",
    desc: "Publish daily WODs in AMRAP, ForTime, EMOM, Strength, or custom formats. Athletes track scores and progress over time.",
  },
  {
    icon: "📄",
    title: "Google Docs import",
    desc: "Paste a Google Doc link and import your programming block in seconds. No copy-paste, no reformatting.",
  },
  {
    icon: "💳",
    title: "Memberships & billing",
    desc: "Stripe-powered recurring billing with monthly and annual plans. Members manage their own subscriptions from the app.",
  },
  {
    icon: "📨",
    title: "Custom email domain",
    desc: "Send emails as noreply@yourgym.com. DNS verified, Resend-powered — your brand, not ours.",
  },
  {
    icon: "🎨",
    title: "White-label branding",
    desc: "Your gym name, your colors, your domain. Athletes see your brand everywhere — not a generic platform name.",
  },
];

function Features() {
  return (
    <div style={S.section(SURFACE)}>
      <div style={S.inner}>
        <div style={S.sectionLabel}>Everything you need</div>
        <h2 style={S.h2}>One platform,<br />zero duct tape.</h2>
        <p style={S.h2Sub}>
          Stop juggling six apps. NorthernGlow replaces your scheduling tool,
          WOD tracker, billing software, and member portal.
        </p>
        <div style={S.featuresGrid}>
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} style={S.featureCard}>
              <div style={S.featureIcon}>{icon}</div>
              <div style={S.featureTitle}>{title}</div>
              <div style={S.featureDesc}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrvnSpotlight() {
  return (
    <div id="prvn-section" style={S.section(BG)}>
      <div style={S.inner}>
        <div style={S.spotlightGrid}>
          {/* Left — copy */}
          <div style={S.spotlightLeft}>
            <div style={S.sectionLabel}>PRVN integration</div>
            <h2 style={S.h2}>
              Import PRVN programming<br />
              <span style={{ color: TEAL }}>straight from Google Docs.</span>
            </h2>
            <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.7, marginBottom: 32 }}>
              If your gym runs PRVN Fitness programming, you already get your
              weekly blocks in a Google Doc. NorthernGlow reads that doc directly
              — parsing each WOD, labeling it by type, and publishing it to your
              athletes automatically.
            </p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
              {[
                "Paste a Google Doc URL — nothing to install",
                "WODs parsed by type: AMRAP, ForTime, EMOM, Strength",
                "Athletes see tomorrow's workout the moment you publish",
                "Score tracking and leaderboards included",
              ].map((point) => (
                <div key={point} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: TEAL, marginTop: 2, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 15, color: "#ccc" }}>{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mock doc preview */}
          <div style={S.spotlightRight}>
            <div style={S.docsHeader}>
              <div style={S.docsIcon}>📄</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                  PRVN Week 14 Programming
                </div>
                <div style={S.docsTitle}>docs.google.com/document/d/…</div>
              </div>
            </div>

            <div style={S.wodRow}>
              <div style={S.wodType}>Monday · AMRAP 20</div>
              <div style={S.wodText}>
                5 Pull-ups<br />
                10 Push-ups<br />
                15 Air Squats
              </div>
            </div>

            <div style={S.wodRow}>
              <div style={S.wodType}>Tuesday · Strength</div>
              <div style={S.wodText}>
                Back Squat — 5×5<br />
                @ 80% 1RM
              </div>
            </div>

            <div style={S.arrowRow}>
              <span style={S.arrowLabel}>Importing via NorthernGlow</span>
              <span style={{ color: TEAL, fontSize: 16 }}>→</span>
              <div style={S.importedBadge}>
                <span>✓</span> 5 WODs imported
              </div>
            </div>

            <div style={{ fontSize: 12, color: DIM }}>
              Athletes notified · Score tracking enabled · Leaderboard live
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: "1",
    title: "We set up your gym",
    desc: "You give us your gym name, timezone, and brand color. We create your account and send your admin an invite link. Takes under 5 minutes.",
  },
  {
    n: "2",
    title: "Invite your athletes",
    desc: "Athletes download the NorthernGlow app, enter your gym code, and they're in. No spreadsheets, no manual imports.",
  },
  {
    n: "3",
    title: "Coach like you always have",
    desc: "Paste your Google Doc link for the week's programming, post WODs, manage classes, and let the platform handle the rest.",
  },
];

function HowItWorks() {
  return (
    <div style={S.section(SURFACE)}>
      <div style={S.inner}>
        <div style={S.sectionLabel}>How it works</div>
        <h2 style={S.h2}>Up and running<br />in one afternoon.</h2>
        <div style={S.stepsGrid}>
          {STEPS.map(({ n, title, desc }) => (
            <div key={n}>
              <div style={S.stepNum}>{n}</div>
              <div style={S.stepTitle}>{title}</div>
              <div style={S.stepDesc}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CtaBanner({ onLogin }: { onLogin: () => void }) {
  return (
    <div style={S.section(BG)}>
      <div style={S.inner}>
        <div style={S.ctaBanner}>
          <div style={{ ...S.sectionLabel, marginBottom: 20 }}>Ready to go?</div>
          <h2 style={S.ctaH2}>
            Your athletes deserve<br />
            <span style={{ color: TEAL }}>better than a WhatsApp group.</span>
          </h2>
          <p style={S.ctaSub}>
            Get NorthernGlow set up for your gym today. No contract, no setup fee.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button style={{ ...S.btnHeroPrimary, fontSize: 15 }} onClick={onLogin}>
              Get started →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer style={S.footer}>
      <div style={S.footerInner}>
        <div style={S.footerLeft}>
          <div style={{ width: 24, height: 24, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
            <img src="/icon.png" alt="NorthernGlow" style={{ width: "100%", height: "100%", display: "block" }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#666" }}>NorthernGlow</span>
        </div>
        <div style={S.footerRight}>
          © {new Date().getFullYear()} NorthernGlow. Built for CrossFit gyms.
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const goLogin = () => navigate("/login");

  return (
    <div style={S.page}>
      <Nav onLogin={goLogin} />
      <Hero onLogin={goLogin} />
      <Stats />
      <Features />
      <PrvnSpotlight />
      <HowItWorks />
      <CtaBanner onLogin={goLogin} />
      <Footer />
    </div>
  );
}
