import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// During local dev the browser would be blocked by CORS if it called the
// Heroku API directly (the API sends no Access-Control-Allow-Origin header).
// Vite's dev server proxies /api/* to Heroku so requests are same-origin.
// In production the React app talks to the Cloudflare Worker (see /worker),
// which proxies to Heroku in Phase 1 and becomes the D1-backed API in Phase 2.
// GitHub Pages serves the app under /<repo>/, so assets need that base path.
// Set GITHUB_PAGES=1 at build time for a Pages build (the workflow does this).
const base = process.env.GITHUB_PAGES ? "/guardguys-web/" : "/";

export default defineConfig({
  base,
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
        target: "https://guardguys.herokuapp.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
