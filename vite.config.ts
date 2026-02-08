import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Pulseboard Subscription Tracker",
        short_name: "Pulseboard",
        description: "Track recurring subscriptions with local-first privacy.",
        theme_color: "#101830",
        background_color: "#f5f7fb",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml"
          },
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        mode: "development",
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"]
      }
    })
  ]
});
