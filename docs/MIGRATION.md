# Phase 2 — Migrate off Heroku to Cloudflare Worker + D1

Goal: replace the Heroku Express + Postgres backend with a Cloudflare Worker
backed by **D1** (SQLite). The React frontend does not change — it always calls
`/api/*`; we just swap what answers those routes.

## Strategy

1. **Stand up D1** with a schema mirroring the live Postgres tables.
2. **Export** live data from Heroku Postgres and **import** into D1.
3. **Implement `/api/*` in the Worker** against D1, replacing the proxy block in
   `worker/index.ts`.
4. **Cut over**: point production at the D1-backed Worker; verify; retire Heroku.

## 1. Create the D1 database

```bash
wrangler d1 create guardguys
# paste the returned database_id into wrangler.toml ([[d1_databases]])
wrangler d1 execute guardguys --file=./worker/schema.sql
```

The proposed schema is in [`../worker/schema.sql`](../worker/schema.sql).

### Postgres → SQLite type mapping

| Live (Postgres) | D1 (SQLite) | Notes |
|-----------------|-------------|-------|
| `id` serial int | `INTEGER PRIMARY KEY` | autoincrement rowid |
| `isAdmin` boolean | `INTEGER` (0/1) | SQLite has no bool |
| `onsite` boolean | `INTEGER` (0/1) | |
| `date` timestamp | `TEXT` ISO-8601 | store the same UTC string |
| `duration` bigint | `INTEGER` | milliseconds |
| `createdAt/updatedAt` | `TEXT` ISO-8601 | |
| `user_id` int (nullable) | `INTEGER NULL` | FK to users.id |

Keep `password` as the existing **bcrypt hash** — do not re-hash. The Worker must
verify with a bcrypt-compatible check (e.g. a WASM bcrypt lib) to keep existing
logins working.

## 2. Export from Heroku and import to D1

```bash
# Dump just the data we need as CSV (run against the Heroku DB):
heroku pg:psql -a <heroku-app> -c "\copy (SELECT * FROM users)  TO 'users.csv'  CSV HEADER"
heroku pg:psql -a <heroku-app> -c "\copy (SELECT * FROM events) TO 'events.csv' CSV HEADER"
```

Then transform CSV → SQL `INSERT`s (booleans → 0/1, keep ISO date strings) and
load:

```bash
wrangler d1 execute guardguys --file=./data-export/seed.sql
```

> `data-export/` and `*.csv`/`*.sql.gz` are git-ignored — never commit
> production data (it contains password hashes and PII).

A small Node script (`scripts/csv-to-d1.mjs`, to be written) can do the CSV →
INSERT transform deterministically.

## 3. Implement the Worker API against D1

In `worker/index.ts`, replace `proxyToHeroku()` with real handlers. Sketch:

```ts
// GET /api/events/weekof/:date  (MM-dd-yyyy, local week Sun..Sat)
const { results } = await env.DB
  .prepare("SELECT * FROM events WHERE date >= ? AND date < ? ORDER BY date")
  .bind(weekStartIso, weekEndIso)
  .all();
// join assigned user's username to match the current { user: { username } } shape
```

Match the **exact JSON shapes** in `src/api/types.ts` so the frontend is
untouched (note `user_id` and the nested `user: { username }` on events).

### Endpoints to implement (parity with Heroku)

- `POST /api/users/login` — look up by email, bcrypt-verify, return `{ user }`
- `GET/POST /api/users/`, `PUT/DELETE /api/users/:id`
- `GET /api/events/weekof/:date`
- `POST /api/events/`, `PUT/DELETE /api/events/:id`

## 4. Cutover & cleanup

- Deploy the D1-backed Worker to a staging route; smoke-test login + week view.
- Flip production DNS/route to the Worker.
- Monitor, then **retire the Heroku app and Postgres add-on**.
- Add real auth (tokens) — the current API has none. Consider doing this as part
  of the cutover since you control the backend now.

## Open questions to resolve before cutover

- **Auth**: introduce session tokens / JWT now, or preserve the
  no-token behavior to minimize change? (Recommend adding tokens.)
- **bcrypt in Workers**: pick a WASM/pure-JS bcrypt that runs in the Workers
  runtime, or migrate hashes to a Workers-native algorithm on next login.
- **ID strategy**: keep integer IDs (simplest migration) vs. switch to UUIDs.
