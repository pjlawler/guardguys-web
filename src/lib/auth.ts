import type { User } from "../api/types";

// Mirrors the iOS app's @AppStorage session: the logged-in user is persisted
// locally (the API has no token, so the browser just remembers who logged in).
const KEY = "guardguys.session.user";

export function loadSession(): User | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveSession(user: User): void {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}
