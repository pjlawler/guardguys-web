// Data shapes returned by the live Heroku Express API.
// Verified against https://guardguys.herokuapp.com on 2026-06-14.

export interface User {
  id: number;
  username: string;
  email: string;
  /** bcrypt hash on read; plaintext only when creating/updating. */
  password?: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Minimal user object nested inside an event ({ username }). */
export interface EventUser {
  username: string;
}

export interface ScheduleEvent {
  id: number;
  /** ISO 8601 UTC, e.g. "2026-06-08T11:30:00.000Z". */
  date: string;
  /** The event title/description text. */
  event: string;
  onsite: boolean;
  notes: string;
  /** Duration in milliseconds (can be negative in legacy data). */
  duration: number;
  /** Assigned user id; null when unassigned. */
  user_id: number | null;
  createdAt: string;
  updatedAt: string;
  /** Populated on the weekof endpoint; null when unassigned. */
  user: EventUser | null;
}

/** Payload for creating/updating an event. */
export interface EventInput {
  event: string;
  date: string;
  duration: number;
  onsite: boolean;
  notes: string;
  user_id: number | null;
}

/** Payload for creating/updating a user. */
export interface UserInput {
  username: string;
  email: string;
  password?: string;
  isAdmin: boolean;
}

export interface LoginResult {
  user?: User;
  /** JWT issued on successful login; sent as a Bearer token on later requests. */
  token?: string;
  message?: string;
}
