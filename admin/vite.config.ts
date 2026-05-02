import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const configDir = dirname(fileURLToPath(import.meta.url));
const tsconfigRaw = readFileSync(resolve(configDir, "tsconfig.json"), "utf-8");

export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Prevent esbuild from walking up to the repo root tsconfig (Expo-based)
    tsconfigRaw,
  },
  resolve: {
    alias: {
      "@convex": resolve(configDir, "../convex"),
      // Force convex bare imports in ../convex/ files to resolve from admin's node_modules
      convex: resolve(configDir, "node_modules/convex"),
    },
  },
});
