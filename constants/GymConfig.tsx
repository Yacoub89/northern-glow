import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Colors } from "./Colors";

export type GymConfig = {
  name: string;
  tagline: string;
  primaryColor: string;
  timezone: string;
  logoUrl: string | null;
};

// Baked in at build time by build-gym.sh via app.config.js
const DEFAULT_CONFIG: GymConfig = {
  name: process.env.EXPO_PUBLIC_GYM_NAME ?? "NorthernGlow",
  tagline: "",
  primaryColor: process.env.EXPO_PUBLIC_PRIMARY_COLOR ?? "#1BBFBF",
  timezone: "America/New_York",
  logoUrl: null,
};

/**
 * Returns the gym configuration for the currently authenticated user.
 * Before login (or while loading), falls back to build-time defaults
 * baked in via EXPO_PUBLIC_GYM_NAME and EXPO_PUBLIC_PRIMARY_COLOR.
 */
export function useGymConfig(): GymConfig {
  const gym = useQuery(api.gyms.getMyGymFull);

  if (gym) {
    return {
      name: gym.name,
      tagline: gym.tagline,
      primaryColor: gym.primaryColor,
      timezone: gym.timezone,
      logoUrl: gym.logoUrl ?? null,
    };
  }

  return DEFAULT_CONFIG;
}

/**
 * Returns Colors with primary overridden by the current gym's brand color.
 * Use this instead of the static Colors.primary anywhere color theming is needed.
 */
export function useGymColors() {
  const gym = useGymConfig();
  return { ...Colors, primary: gym.primaryColor };
}
