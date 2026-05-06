import "./site.css";

const BORDER = "var(--admin-border)";
const BORDER_BRIGHT = "var(--admin-border-strong)";
const TEXT = "var(--admin-text)";
const MUTED = "var(--admin-text-muted)";
const DIM = "var(--admin-text-subtle)";

export function SiteNav({ rightSlot, onLogoClick }: { rightSlot?: React.ReactNode; onLogoClick?: () => void }) {
  return (
    <nav className="l-nav" style={{ background: "var(--admin-bg-translucent)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}` }}>
      <div className="l-nav-inner">
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: onLogoClick ? "pointer" : "default" }}
          onClick={onLogoClick}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
            <img src="/icon.png" alt="NorthernGlow" style={{ width: "100%", height: "100%", display: "block" }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: TEXT }}>NorthernGlow</span>
        </div>
        {rightSlot}
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="l-footer" style={{ borderTop: `1px solid ${BORDER}` }}>
      <div className="l-footer-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
            <img src="/icon.png" alt="NorthernGlow" style={{ width: "100%", height: "100%", display: "block" }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: DIM }}>NorthernGlow</span>
        </div>
        <div style={{ fontSize: 13, color: DIM }}>© {new Date().getFullYear()} NorthernGlow. Built for CrossFit gyms.</div>
      </div>
    </footer>
  );
}

export const navBtnGhost: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8, border: `1px solid ${BORDER_BRIGHT}`,
  background: "transparent", color: MUTED, fontSize: 14, fontWeight: 500,
  cursor: "pointer", whiteSpace: "nowrap",
};
