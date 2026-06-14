/**
 * GuardGuys Worker — Phase 1: thin CORS proxy in front of the Heroku API.
 *
 * Why this exists: the Heroku Express API sends no CORS headers, so a browser
 * app served from a different origin (Cloudflare Pages/Workers) cannot call it
 * directly. This Worker serves the built React app AND proxies /api/* to Heroku,
 * keeping everything same-origin from the browser's point of view.
 *
 * Phase 2: replace the proxy block below with real handlers backed by D1, then
 * decommission Heroku. The frontend never changes — it always calls /api/*.
 */

const UPSTREAM = "https://guardguys.herokuapp.com";

export interface Env {
  // Phase 2: add the D1 binding here, e.g.
  // DB: D1Database;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return proxyToHeroku(request, url);
    }

    // Everything else: serve the static React build (SPA).
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function proxyToHeroku(request: Request, url: URL): Promise<Response> {
  // CORS preflight (harmless here since we're same-origin, but future-proof).
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const upstreamUrl = UPSTREAM + url.pathname + url.search;
  const upstreamReq = new Request(upstreamUrl, {
    method: request.method,
    headers: stripHopByHop(request.headers),
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual",
  });

  const upstreamRes = await fetch(upstreamReq);
  const headers = new Headers(upstreamRes.headers);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers,
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function stripHopByHop(headers: Headers): Headers {
  const out = new Headers(headers);
  out.delete("host");
  return out;
}
