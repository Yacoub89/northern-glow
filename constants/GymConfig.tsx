import Constants from "expo-constants";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Colors } from "./Colors";

export type GymConfig = {
  name: string;
  tagline: string;
  primaryColor: string;
  timezone: string;
  logoUrl: string | null;
};

// The gymId is baked in at build time by build-gym.sh via app.config.js extra.
// null in dev (no gym-specific build), a real Id<"gyms"> in production gym builds.
const GYM_ID = (Constants.expoConfig?.extra?.gymId ?? null) as Id<"gyms"> | null;

// Fallback shown only while the DB query is loading (or in dev with no gymId).
const DEFAULT_CONFIG: GymConfig = {
  name: Constants.expoConfig?.name ?? "NorthernGlow",
  tagline: "",
  primaryColor: "#1BBFBF",
  timezone: "America/New_York",
  logoUrl: null,
};

let lastKnownGymConfig: GymConfig | null = null;

/**
 * Returns the gym configuration.
 *
 * - Pre-auth: fetches by the gymId baked into the build (public, no auth needed).
 * - Post-auth: fetches via the authenticated user's gym (also resolves logo URL).
 * - Falls back to build-time defaults only while loading or in dev.
 */
export function useGymConfig(): GymConfig {
  // Post-auth query — also resolves storage URLs for logo
  const gymFull = useQuery(api.gyms.getMyGymFull);

  // Pre-auth query — public, uses gymId baked in at build time
  const gymById = useQuery(
    api.gyms.get,
    GYM_ID ? { gymId: GYM_ID } : "skip"
  );

  // Prefer the post-auth result (has logo URL), fall back to pre-auth
  const gym = gymFull ?? gymById;

  if (gym) {
    lastKnownGymConfig = {
      name: gym.name,
      tagline: gym.tagline,
      primaryColor: gym.primaryColor,
      timezone: gym.timezone,
      logoUrl: gymFull?.logoUrl ?? null,
    };
    return lastKnownGymConfig;
  }

  if (lastKnownGymConfig) return lastKnownGymConfig;

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
