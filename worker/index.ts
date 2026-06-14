/**
 * GuardGuys Worker — Phase 2: D1-backed API with token auth.
 *
 * Serves the static React SPA and implements /api/* against a D1 (SQLite)
 * database. Login issues an HS256 JWT; data/admin endpoints require it.
 * Response shapes match what the frontend already expects (see src/api/types.ts):
 * passwords are never returned, booleans are real booleans, and events carry a
 * nested `user: { username } | null`.
 */
import bcrypt from "bcryptjs";
import { bearerToken, signToken, verifyToken, type TokenPayload } from "./auth";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
}

// --- Response helpers ---------------------------------------------------

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function error(message: string, status: number): Response {
  return json({ message }, status);
}

// --- Row mappers --------------------------------------------------------

interface UserRow {
  id: number;
  username: string;
  email: string;
  password: string;
  isAdmin: number;
  createdAt: string;
  updatedAt: string;
}

function userToJson(r: UserRow) {
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    isAdmin: !!r.isAdmin,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

interface EventRow {
  id: number;
  date: string;
  event: string;
  onsite: number;
  notes: string;
  duration: number;
  user_id: number | null;
  createdAt: string;
  updatedAt: string;
  assigned_username?: string | null;
}

function eventToJson(r: EventRow) {
  return {
    id: r.id,
    date: r.date,
    event: r.event,
    onsite: !!r.onsite,
    notes: r.notes,
    duration: r.duration,
    user_id: r.user_id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    user: r.assigned_username ? { username: r.assigned_username } : null,
  };
}

const EVENT_SELECT = `
  SELECT e.*, u.username AS assigned_username
  FROM events e LEFT JOIN users u ON u.id = e.user_id`;

async function eventById(env: Env, id: number) {
  const row = await env.DB.prepare(`${EVENT_SELECT} WHERE e.id = ?`)
    .bind(id)
    .first<EventRow>();
  return row ? eventToJson(row) : null;
}

function nowIso(): string {
  return new Date().toISOString();
}

// --- Handlers -----------------------------------------------------------

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  if (!email || !password) return error("Email and password are required.", 400);

  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE email = ? COLLATE NOCASE",
  )
    .bind(email)
    .first<UserRow>();

  const INVALID = "Invalid email or password.";
  if (!user) return error(INVALID, 401);

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return error(INVALID, 401);

  const token = await signToken(
    { sub: user.id, username: user.username, isAdmin: !!user.isAdmin },
    env.JWT_SECRET,
    Math.floor(Date.now() / 1000),
  );
  return json({ user: userToJson(user), token });
}

async function listUsers(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM users ORDER BY username COLLATE NOCASE",
  ).all<UserRow>();
  return json(results.map(userToJson));
}

async function createUser(request: Request, env: Env): Promise<Response> {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const username = String(b.username ?? "").trim();
  const email = String(b.email ?? "").trim();
  const password = String(b.password ?? "");
  const isAdmin = b.isAdmin ? 1 : 0;
  if (!username || !email || !password)
    return error("Username, email, and password are required.", 400);

  const hash = await bcrypt.hash(password, 10);
  const ts = nowIso();
  try {
    const row = await env.DB.prepare(
      `INSERT INTO users (username, email, password, isAdmin, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
    )
      .bind(username, email, hash, isAdmin, ts, ts)
      .first<UserRow>();
    return json(userToJson(row!), 201);
  } catch (e) {
    if (String(e).includes("UNIQUE")) return error("Email already in use.", 409);
    throw e;
  }
}

async function updateUser(
  request: Request,
  env: Env,
  id: number,
): Promise<Response> {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (b.username !== undefined) {
    sets.push("username = ?");
    vals.push(String(b.username).trim());
  }
  if (b.email !== undefined) {
    sets.push("email = ?");
    vals.push(String(b.email).trim());
  }
  if (b.isAdmin !== undefined) {
    sets.push("isAdmin = ?");
    vals.push(b.isAdmin ? 1 : 0);
  }
  // Only change the password when a non-empty one is provided.
  if (typeof b.password === "string" && b.password !== "") {
    sets.push("password = ?");
    vals.push(await bcrypt.hash(b.password, 10));
  }
  sets.push("updatedAt = ?");
  vals.push(nowIso());
  vals.push(id);

  const row = await env.DB.prepare(
    `UPDATE users SET ${sets.join(", ")} WHERE id = ? RETURNING *`,
  )
    .bind(...vals)
    .first<UserRow>();
  if (!row) return error("User not found.", 404);
  return json(userToJson(row));
}

async function deleteUser(env: Env, id: number): Promise<Response> {
  // Unassign this user's events first (FK enforcement is not guaranteed in D1).
  await env.DB.prepare("UPDATE events SET user_id = NULL WHERE user_id = ?")
    .bind(id)
    .run();
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

async function weekEvents(env: Env, dateParam: string): Promise<Response> {
  // dateParam is MM-dd-yyyy (the week's Sunday). Over-fetch a day either side
  // so timezone differences can't drop edge events; the frontend buckets by
  // local day, so extra rows are harmless.
  const [mm, dd, yyyy] = dateParam.split("-").map(Number);
  if (!mm || !dd || !yyyy) return error("Bad date.", 400);
  const ws = new Date(Date.UTC(yyyy, mm - 1, dd));
  const lower = new Date(ws);
  lower.setUTCDate(lower.getUTCDate() - 1);
  const upper = new Date(ws);
  upper.setUTCDate(upper.getUTCDate() + 8);

  const { results } = await env.DB.prepare(
    `${EVENT_SELECT} WHERE e.date >= ? AND e.date < ? ORDER BY e.date`,
  )
    .bind(lower.toISOString(), upper.toISOString())
    .all<EventRow>();
  return json(results.map(eventToJson));
}

async function createEvent(request: Request, env: Env): Promise<Response> {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const ts = nowIso();
  const row = await env.DB.prepare(
    `INSERT INTO events (date, event, onsite, notes, duration, user_id, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  )
    .bind(
      String(b.date ?? ts),
      String(b.event ?? ""),
      b.onsite ? 1 : 0,
      String(b.notes ?? ""),
      Number(b.duration ?? 0),
      b.user_id == null ? null : Number(b.user_id),
      ts,
      ts,
    )
    .first<{ id: number }>();
  return json(await eventById(env, row!.id), 201);
}

async function updateEvent(
  request: Request,
  env: Env,
  id: number,
): Promise<Response> {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const sets: string[] = [];
  const vals: unknown[] = [];
  const setIf = (key: string, col: string, transform: (v: unknown) => unknown) => {
    if (b[key] !== undefined) {
      sets.push(`${col} = ?`);
      vals.push(transform(b[key]));
    }
  };
  setIf("date", "date", (v) => String(v));
  setIf("event", "event", (v) => String(v));
  setIf("onsite", "onsite", (v) => (v ? 1 : 0));
  setIf("notes", "notes", (v) => String(v));
  setIf("duration", "duration", (v) => Number(v));
  setIf("user_id", "user_id", (v) => (v == null ? null : Number(v)));
  sets.push("updatedAt = ?");
  vals.push(nowIso());
  vals.push(id);

  const res = await env.DB.prepare(
    `UPDATE events SET ${sets.join(", ")} WHERE id = ?`,
  )
    .bind(...vals)
    .run();
  if (!res.meta.changes) return error("Event not found.", 404);
  return json(await eventById(env, id));
}

async function deleteEvent(env: Env, id: number): Promise<Response> {
  await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

// --- Router -------------------------------------------------------------

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders() });

  if (!env.JWT_SECRET) return error("Server auth not configured.", 500);

  const path = url.pathname.replace(/\/+$/, ""); // strip trailing slash
  const method = request.method;

  // Public: login
  if (path === "/api/users/login" && method === "POST") {
    return handleLogin(request, env);
  }

  // Everything else requires a valid token.
  const token = bearerToken(request);
  const auth: TokenPayload | null = token
    ? await verifyToken(token, env.JWT_SECRET, Math.floor(Date.now() / 1000))
    : null;
  if (!auth) return error("Authentication required.", 401);

  const requireAdmin = () => auth.isAdmin;

  // Users
  if (path === "/api/users" && method === "GET") return listUsers(env);
  if (path === "/api/users" && method === "POST")
    return requireAdmin() ? createUser(request, env) : error("Admin only.", 403);

  const userIdMatch = path.match(/^\/api\/users\/(\d+)$/);
  if (userIdMatch) {
    const id = Number(userIdMatch[1]);
    if (!requireAdmin()) return error("Admin only.", 403);
    if (method === "PUT") return updateUser(request, env, id);
    if (method === "DELETE") return deleteUser(env, id);
  }

  // Events
  const weekMatch = path.match(/^\/api\/events\/weekof\/(.+)$/);
  if (weekMatch && method === "GET") return weekEvents(env, weekMatch[1]);

  if (path === "/api/events" && method === "POST")
    return createEvent(request, env);

  const eventIdMatch = path.match(/^\/api\/events\/(\d+)$/);
  if (eventIdMatch) {
    const id = Number(eventIdMatch[1]);
    if (method === "PUT") return updateEvent(request, env, id);
    if (method === "DELETE") return deleteEvent(env, id);
  }

  return error("Not found.", 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (e) {
        return error(`Server error: ${String(e)}`, 500);
      }
    }
    // Serve the static React SPA for everything else.
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
