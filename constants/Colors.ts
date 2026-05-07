// Mobile app theme — light, gym-branded, readable by default.
export const Colors = {
  // Surfaces
  background:              "#ffffff",
  surfaceContainerLow:     "#f8fafc",
  surface:                 "#f1f5f9",
  surfaceContainerHighest: "#e2e8f0",
  surfaceBright:           "#e5edf5",
  surfaceVariant:          "#f8fafc",

  // Brand / accent
  primary:          "#0E7490",
  primaryContainer: "#A5F3FC",
  onPrimary:        "#ffffff",
  primaryGlow:      "rgba(14, 116, 144, 0.12)",

  // Tertiary
  tertiary: "#164e63",

  // Text
  text:          "#0f172a",
  textSecondary: "#475569",
  textMuted:     "#94a3b8",

  // Semantic
  success: "#34C759",
  warning: "#FF9F0A",
  error:   "#D92D20",

  // Borders
  outlineVariant: "#cbd5e1",

  // Aliases kept for backward compatibility with screens not yet redesigned
  border:          "#dbe3ea",
  surfaceElevated: "#eaf0f6",
  primaryDark:     "#0f6b78",
};

// Gradient arrays — used with expo-linear-gradient
export const Gradients = {
  primaryCta:    ["#0E7490", "#22D3EE"] as const,
  primaryCtaStr: ["#0E7490", "#22D3EE"] as const,
};
