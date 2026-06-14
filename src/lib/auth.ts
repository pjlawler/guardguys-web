import type { User } from "../api/types";

// Local session: the logged-in user plus the JWT issued at login. The token is
// sent as a Bearer header on every API request (see api/client.ts).
const USER_KEY = "guardguys.session.user";
const TOKEN_KEY = "guardguys.session.token";

export function loadSession(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveSession(user: User, token: string): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}
