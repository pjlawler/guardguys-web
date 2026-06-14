# GuardGuys Web

Web app for GuardGuys scheduling — a port of the iOS **GuardGuys Calendar**
(`guardguyscalendar`) app to the browser, built on Cloudflare.

## Status

**Phase 2 — Cloudflare Worker + D1, with token auth (live).**
The Worker implements `/api/*` against a Cloudflare **D1** (SQLite) database.
Login issues a JWT; data endpoints require it; user management is admin-only.
Heroku is retained as a fallback until the new backend is fully confirmed, then
retired. See [`docs/MIGRATION.md`](docs/MIGRATION.md).

Hosted at:
- **https://calendar.guardguys.com** (GitHub Pages, calls the Worker API)
- **https://guardguys-web.pat-e8d.workers.dev** (Cloudflare: serves the app + API)

## How it works

```
Browser ──/api/*──▶  Cloudflare Worker ──▶ D1 (SQLite)   ← login = JWT, Bearer-gated
        ──/    ──▶   Cloudflare Worker ──▶ static SPA assets
```

The frontend always calls `/api/*` and sends `Authorization: Bearer <jwt>`. On
Cloudflare the Worker serves both the app and the API (same origin); on GitHub
Pages the app calls the Worker cross-origin (the Worker sends CORS headers).

Auth: `worker/auth.ts` (HS256 JWT via Web Crypto) + `bcryptjs` for password
verification. The signing secret is a Worker secret (`JWT_SECRET`); for local
`wrangler dev` put it in `.dev.vars`.

## The live API (verified 2026-06-14)

Express/Node + Postgres on Heroku. Integer IDs, bcrypt-hashed passwords, no auth
tokens on data endpoints. (Note: the `../guardguys-api` Vapor folder is an
unrelated rewrite with a **different** schema — it is **not** what production
runs. Ignore it for this project.)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/users/login` | `{ email, password }` → `{ user }` |
| GET | `/api/users/` | list users |
| POST | `/api/users/` | create user |
| PUT | `/api/users/{id}` | update user |
| DELETE | `/api/users/{id}` | delete user |
| GET | `/api/events/weekof/{MM-dd-yyyy}` | events for the week |
| POST | `/api/events/` | create event |
| PUT | `/api/events/{id}` | update event |
| DELETE | `/api/events/{id}` | delete event |

Data shapes live in [`src/api/types.ts`](src/api/types.ts).

## Develop

```bash
npm install
npm run dev          # http://localhost:5173 (proxies /api to Heroku)
```

Sign in with a real GuardGuys account. The week view loads live schedule data.

## Build & deploy (Cloudflare)

```bash
npm run build          # tsc + vite build -> dist/
npm run worker:dev     # run the Worker + static assets locally
npm run worker:deploy  # wrangler deploy
```

## Scripts

| Script | Does |
|--------|------|
| `npm run dev` | Vite dev server with Heroku proxy |
| `npm run build` | Type-check and build to `dist/` |
| `npm run typecheck` | Type-check only |
| `npm run worker:dev` | Local Worker (serves `dist/` + proxies `/api`) |
| `npm run worker:deploy` | Deploy the Worker to Cloudflare |

## Roadmap

- [x] Project scaffold, API client, auth/session, weekly schedule view
- [x] Event create / edit / delete UI (with assignment + on-site + notes)
- [x] Admin: user management UI (create / edit / delete, admin-only tab)
- [x] Installable PWA (manifest + service worker)
- [x] Custom domain (calendar.guardguys.com) with HTTPS
- [x] Phase 2: Cloudflare Worker + D1 backend, token auth, data migrated
- [ ] Confirm real-user login on production, then retire the Heroku app

## Layout

```
src/
  api/         types.ts, client.ts    (API contract + fetch wrapper)
  lib/         date.ts, auth.ts        (helpers + local session)
  components/  Modal, EventModal, UserModal
  views/       Login, ScheduleWeek, Admin
  App.tsx, main.tsx, index.css
worker/        index.ts, schema.sql    (Cloudflare Worker + Phase 2 D1 schema)
docs/          MIGRATION.md            (Phase 2 plan)
```
