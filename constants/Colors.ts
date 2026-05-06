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
  primary:          "#1BBFBF",
  primaryContainer: "#77e6e6",
  onPrimary:        "#062a2a",
  primaryGlow:      "rgba(27, 191, 191, 0.12)",

  // Tertiary
  tertiary: "#0f766e",

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
  primaryDark:     "#0f8f8f",
};

// Gradient arrays — used with expo-linear-gradient
export const Gradients = {
  primaryCta:    ["#1BBFBF", "#77e6e6"] as const,
  primaryCtaStr: ["#1BBFBF", "#77e6e6"] as const,
};
