export type GymConfig = {
  name: string;
  tagline: string;
  primaryColor: string;
  timezone: string;
};

const CONFIG: GymConfig = {
  name: "OCFit",
  tagline: "Powered by OCFit",
  primaryColor: "#1BBFBF",
  timezone: "America/New_York",
};

export function useGymConfig(): GymConfig {
  return CONFIG;
}
