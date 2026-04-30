import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@convex": resolve(__dirname, "../convex"),
      // Force convex bare imports in ../convex/ files to resolve from admin's node_modules
      convex: resolve(__dirname, "node_modules/convex"),
    },
  },
});
