-- Phase 2 D1 schema — mirrors the live Heroku Postgres tables.
-- Apply with: wrangler d1 execute guardguys --file=./worker/schema.sql
-- SQLite has no boolean type; isAdmin/onsite are stored as 0/1.

CREATE TABLE IF NOT EXISTS users (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT    NOT NULL,
  email     TEXT    NOT NULL UNIQUE,
  password  TEXT    NOT NULL,          -- bcrypt hash (carried over as-is)
  isAdmin   INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT    NOT NULL,          -- ISO-8601 UTC
  updatedAt TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  date      TEXT    NOT NULL,          -- ISO-8601 UTC
  event     TEXT    NOT NULL DEFAULT '',
  onsite    INTEGER NOT NULL DEFAULT 0,
  notes     TEXT    NOT NULL DEFAULT '',
  duration  INTEGER NOT NULL DEFAULT 0, -- milliseconds
  user_id   INTEGER,                   -- FK -> users.id, nullable
  createdAt TEXT    NOT NULL,
  updatedAt TEXT    NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
