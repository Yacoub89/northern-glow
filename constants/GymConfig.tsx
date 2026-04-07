import React, { createContext, useContext } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export type GymConfig = {
  name: string;
  tagline: string;
  primaryColor: string;
  timezone: string;
};

const DEFAULTS: GymConfig = {
  name: "OCFit",
  tagline: "Powered by OCFit",
  primaryColor: "#1BBFBF",
  timezone: "America/New_York",
};

const GymConfigContext = createContext<GymConfig>(DEFAULTS);

export function GymConfigProvider({ children }: { children: React.ReactNode }) {
  const raw = useQuery(api.gymConfig.get);

  const config: GymConfig = {
    name: raw?.name ?? DEFAULTS.name,
    tagline: raw?.tagline ?? DEFAULTS.tagline,
    primaryColor: raw?.primaryColor ?? DEFAULTS.primaryColor,
    timezone: raw?.timezone ?? DEFAULTS.timezone,
  };

  return (
    <GymConfigContext.Provider value={config}>
      {children}
    </GymConfigContext.Provider>
  );
}

export function useGymConfig() {
  return useContext(GymConfigContext);
}
