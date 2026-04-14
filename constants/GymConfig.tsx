import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
import { Colors } from "./Colors";

import * as SecureStore from "expo-secure-store";
const CACHE_KEY = "gymConfig";

export type GymConfig = {
  name: string;
  tagline: string;
  primaryColor: string;
  timezone: string;
};

const DEFAULT_CONFIG: GymConfig = {
  name: "NorthernGlow",
  tagline: "Powered by NorthernGlow",
  primaryColor: "#1BBFBF",
  timezone: "America/New_York",
};

/**
 * Returns the gym configuration for the currently authenticated user.
 * Falls back to the last cached gym config (persisted across logouts),
 * then to the platform default if no cache exists.
 */
export function useGymConfig(): GymConfig {
  const [cached, setCached] = useState<GymConfig | null>(null);
  const gym = useQuery(api.gyms.getMyGym);

  // Load cache on mount
  useEffect(() => {
    SecureStore.getItemAsync(CACHE_KEY).then((raw: string | null) => {
      if (raw) {
        try {
          setCached(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  // When a live gym loads, update cache
  useEffect(() => {
    if (!gym) return;
    const config: GymConfig = {
      name: gym.name,
      tagline: gym.tagline,
      primaryColor: gym.primaryColor,
      timezone: gym.timezone,
    };
    setCached(config);
    SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(config));
  }, [gym]);

  if (gym) {
    return {
      name: gym.name,
      tagline: gym.tagline,
      primaryColor: gym.primaryColor,
      timezone: gym.timezone,
    };
  }

  return cached ?? DEFAULT_CONFIG;
}

/**
 * Returns Colors with primary overridden by the current gym's brand color.
 * Use this instead of the static Colors.primary anywhere color theming is needed.
 */
export function useGymColors() {
  const gym = useGymConfig();
  return { ...Colors, primary: gym.primaryColor };
}
