# GuardGuys Web

Web app for GuardGuys scheduling — a port of the iOS **GuardGuys Calendar**
(`guardguyscalendar`) app to the browser, built on Cloudflare.

## Status

**Phase 1 — frontend against the existing backend (in progress).**
A React + TypeScript + Vite frontend that talks to the existing GuardGuys API
(`https://guardguys.herokuapp.com`). No backend rewrite yet.

**Phase 2 — migrate off Heroku (planned).**
Replace the Heroku Express + Postgres backend with a Cloudflare Worker + D1
(SQLite). The frontend won't change — it always calls `/api/*`. See
[`docs/MIGRATION.md`](docs/MIGRATION.md).

## How it works

```
Browser ──/api/*──▶  ┌─ dev:  Vite proxy ──▶ Heroku API
        ──/    ──▶   └─ prod: Cloudflare Worker ──▶ Heroku API (Phase 1)
                                                 └─▶ D1          (Phase 2)
```

The Heroku API sends **no CORS headers**, so the browser can't call it directly
from another origin. Two same-origin shims solve this:

- **Dev:** Vite's dev server proxies `/api/*` to Heroku (`vite.config.ts`).
- **Prod:** the Cloudflare Worker (`worker/index.ts`) serves the static app
  **and** proxies `/api/*` to Heroku. In Phase 2 that proxy becomes real D1
  handlers and Heroku goes away.

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
- [ ] Phase 2: Cloudflare Worker + D1 backend, data migration, retire Heroku

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
