import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const localModules = path.resolve(__dirname, "node_modules");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Ensure React 19 from frontend-v2's local node_modules is used,
      // not React 18 hoisted from the monorepo root.
      "react": path.resolve(localModules, "react"),
      "react-dom": path.resolve(localModules, "react-dom"),
      "react-dom/client": path.resolve(localModules, "react-dom/client"),
      "react/jsx-runtime": path.resolve(localModules, "react/jsx-runtime"),
      "react/jsx-dev-runtime": path.resolve(localModules, "react/jsx-dev-runtime"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    server: {
      deps: {
        inline: [/@testing-library/],
      },
    },
  },
});
