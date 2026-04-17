// Arctic Performance — "The Luminous Glacier" palette
export const Colors = {
  // Surfaces (depth layers — no hard borders)
  background:              "#041329", // Deep ocean beneath the ice
  surfaceContainerLow:     "#0d1c32", // Base content sections
  surface:                 "#162236", // Mid elevation
  surfaceContainerHighest: "#27354c", // Top interaction layer / active state
  surfaceBright:           "#2c3951", // Brightest surface (for "carved out" contrast)
  surfaceVariant:          "#1a2840", // Subtle section backgrounds

  // Brand / accent
  primary:          "#c3f5ff", // Light crystal cyan — text/icons on dark
  primaryContainer: "#00e5ff", // Vivid cyan — gradient end, highlights
  onPrimary:        "#041329", // Dark text placed ON a primary-filled button
  primaryGlow:      "rgba(195, 245, 255, 0.08)", // 8% primary for ambient shadows

  // Tertiary (used on near-goal performance meters)
  tertiary: "#c5f5fc",

  // Text
  text:          "#FFFFFF",
  textSecondary: "#8899aa",
  textMuted:     "#3d5166",

  // Semantic
  success: "#34C759",
  warning: "#FF9F0A",
  error:   "#ffb4ab", // Frosted rose — not standard red

  // Ghost border fallback (for form fields only — 15% opacity primary)
  outlineVariant: "rgba(195, 245, 255, 0.15)",

  // Aliases kept for backward compatibility with screens not yet redesigned
  border:          "rgba(195, 245, 255, 0.10)",
  surfaceElevated: "#1a2840",
  primaryDark:     "#00b8cc",
};

// Gradient arrays — used with expo-linear-gradient
export const Gradients = {
  primaryCta:    ["#c3f5ff", "#00e5ff"] as const, // 135° — main CTAs
  primaryCtaStr: ["#c3f5ff", "#00e5ff"] as const,
};
