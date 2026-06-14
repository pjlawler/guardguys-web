import type {
  LoginResult,
  ScheduleEvent,
  User,
  UserInput,
  EventInput,
} from "./types";
import { clearSession, getToken } from "../lib/auth";

// Base path for API calls. Empty string means "same origin", which works in
// two setups:
//   - dev: Vite proxies /api/* to Heroku (see vite.config.ts)
//   - prod: the Cloudflare Worker serves the app and proxies /api/* (see /worker)
// Override with VITE_API_BASE if you ever point the app at an absolute URL.
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const isLogin = path.endsWith("/login");

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    // An expired/invalid token on a non-login request: drop the session and
    // send the user back to the login screen.
    if (res.status === 401 && !isLogin) {
      clearSession();
      window.location.reload();
    }
    const msg = extractErrorMessage(body) ?? `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return body as T;
}

function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body === "string") return body;
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    // Sequelize-style validation error array: { errors: [{ message }] }
    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
      const first = obj.errors[0] as Record<string, unknown>;
      if (typeof first.message === "string") return first.message;
    }
  }
  return undefined;
}

/** MM-dd-yyyy as required by /api/events/weekof/{date}. */
function formatWeekParam(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

export const api = {
  // --- Auth ---
  login(email: string, password: string): Promise<LoginResult> {
    return request<LoginResult>("/api/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  // --- Users ---
  getUsers(): Promise<User[]> {
    return request<User[]>("/api/users/");
  },
  createUser(input: UserInput): Promise<User> {
    return request<User>("/api/users/", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updateUser(id: number, input: Partial<UserInput>): Promise<User> {
    return request<User>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },
  deleteUser(id: number): Promise<void> {
    return request<void>(`/api/users/${id}`, { method: "DELETE" });
  },

  // --- Events ---
  getWeekEvents(weekStart: Date): Promise<ScheduleEvent[]> {
    return request<ScheduleEvent[]>(
      `/api/events/weekof/${formatWeekParam(weekStart)}`,
    );
  },
  createEvent(input: EventInput): Promise<ScheduleEvent> {
    return request<ScheduleEvent>("/api/events/", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updateEvent(id: number, input: Partial<EventInput>): Promise<ScheduleEvent> {
    return request<ScheduleEvent>(`/api/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },
  deleteEvent(id: number): Promise<void> {
    return request<void>(`/api/events/${id}`, { method: "DELETE" });
  },
};
