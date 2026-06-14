// Date helpers for the weekly schedule view.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Returns the Sunday (local time) at 00:00 for the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay()); // 0 = Sunday
  return out;
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

/** The seven Date objects (Sun..Sat) for the week starting at `weekStart`. */
export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDayHeader(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Human-readable duration from milliseconds, e.g. "3h 45m". */
export function formatDuration(ms: number): string {
  const totalMin = Math.round(Math.abs(ms) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const sign = ms < 0 ? "-" : "";
  if (h && m) return `${sign}${h}h ${m}m`;
  if (h) return `${sign}${h}h`;
  return `${sign}${m}m`;
}

export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${weekStart.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
}

/** ISO UTC string -> value for an <input type="datetime-local"> (local time). */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value (local time) -> ISO UTC string for the API. */
export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

/** A datetime-local value for a given day at 09:00 local. */
export function defaultInputValueForDay(day: Date): string {
  const d = new Date(day);
  d.setHours(9, 0, 0, 0);
  return toLocalInputValue(d.toISOString());
}

/** Split a millisecond duration into whole hours and minutes (absolute). */
export function splitDuration(ms: number): { hours: number; minutes: number } {
  const totalMin = Math.round(Math.abs(ms) / 60000);
  return { hours: Math.floor(totalMin / 60), minutes: totalMin % 60 };
}

export function durationToMs(hours: number, minutes: number): number {
  return (hours * 60 + minutes) * 60000;
}
