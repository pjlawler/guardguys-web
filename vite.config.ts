import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During local dev the browser would be blocked by CORS if it called the
// Heroku API directly (the API sends no Access-Control-Allow-Origin header).
// Vite's dev server proxies /api/* to Heroku so requests are same-origin.
// In production the React app talks to the Cloudflare Worker (see /worker),
// which proxies to Heroku in Phase 1 and becomes the D1-backed API in Phase 2.
export default defineConfig({
  plugins: [react()],
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
