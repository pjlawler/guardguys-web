import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Vite's dev server proxies /api/* to the production Cloudflare Worker so dev
// writes land on the D1-backed API (the same backend production uses), keeping
// local and prod in sync. The Worker sends CORS headers, but proxying keeps
// requests same-origin so cookies/headers behave exactly as in production.
//
// Base is "/" everywhere: the app is served at the root on Cloudflare
// (guardguys-web.pat-e8d.workers.dev) and on the GitHub Pages custom domain
// (calendar.guardguys.com). See public/CNAME.
export default defineConfig({
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "GuardGuys Calendar",
        short_name: "GuardGuys",
        description: "View and manage the GuardGuys schedule.",
        theme_color: "#0f1720",
        background_color: "#0f1720",
        display: "standalone",
        orientation: "portrait",
        // start_url/scope are resolved against Vite's `base`, so the same
        // config works on Cloudflare (/) and GitHub Pages (/guardguys-web/).
        start_url: ".",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the built app shell so it loads offline. API calls are
        // cross-origin to the Worker and intentionally not cached.
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "https://guardguys-web.pat-e8d.workers.dev",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
