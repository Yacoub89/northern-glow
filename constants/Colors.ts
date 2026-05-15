// Mobile app theme — performance gym UI: high contrast, fast scanning, clear action states.
export const Colors = {
  // Surfaces
  background:              "#0B0D10",
  surfaceContainerLow:     "#14181D",
  surface:                 "#1B2027",
  surfaceContainerHighest: "#2A313B",
  surfaceBright:           "#F4F1EA",
  surfaceVariant:          "#101419",

  // Brand / accent
  primary:          "#F04438",
  primaryContainer: "#3A1715",
  onPrimary:        "#ffffff",
  primaryGlow:      "rgba(240, 68, 56, 0.20)",

  // Tertiary
  tertiary: "#F7B731",

  // Text
  text:          "#F7F3EA",
  textSecondary: "#B8B3A7",
  textMuted:     "#777F8A",

  // Semantic
  success: "#2ECC71",
  warning: "#F7B731",
  error:   "#FF5A4F",

  // Borders
  outlineVariant: "#303844",

  // Aliases kept for backward compatibility with screens not yet redesigned
  border:          "#2B333E",
  surfaceElevated: "#242B34",
  primaryDark:     "#B42318",
};

// Gradient arrays — used with expo-linear-gradient
export const Gradients = {
  primaryCta:    ["#F04438", "#F7B731"] as const,
  primaryCtaStr: ["#F04438", "#F7B731"] as const,
};
