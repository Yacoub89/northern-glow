import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { readFileSync } from "fs";

const tsconfigRaw = readFileSync(new URL("./tsconfig.json", import.meta.url), "utf-8");

export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Prevent esbuild from walking up to the repo root tsconfig (Expo-based)
    tsconfigRaw,
  },
  resolve: {
    alias: {
      "@convex": resolve(__dirname, "../convex"),
      // Force convex bare imports in ../convex/ files to resolve from admin's node_modules
      convex: resolve(__dirname, "node_modules/convex"),
    },
  },
});
