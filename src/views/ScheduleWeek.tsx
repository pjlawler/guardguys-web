import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import type { ScheduleEvent } from "../api/types";
import {
  addDays,
  formatDayHeader,
  formatDuration,
  formatTime,
  formatWeekRange,
  isSameDay,
  startOfWeek,
  weekDays,
} from "../lib/date";

export function ScheduleWeek() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (start: Date) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getWeekEvents(start);
      setEvents(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load schedule.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(weekStart);
  }, [weekStart, load]);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, ScheduleEvent[]>();
    for (const day of days) map.set(day.getTime(), []);
    for (const ev of events) {
      const d = new Date(ev.date);
      const bucket = days.find((day) => isSameDay(day, d));
      if (bucket) map.get(bucket.getTime())!.push(ev);
    }
    for (const list of map.values()) {
      list.sort((a, b) => +new Date(a.date) - +new Date(b.date));
    }
    return map;
  }, [events, days]);

  return (
    <section className="week">
      <div className="week-toolbar">
        <button className="btn-ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          ‹ Prev
        </button>
        <div className="week-range">
          <strong>{formatWeekRange(weekStart)}</strong>
          <button className="btn-link" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            Today
          </button>
        </div>
        <button className="btn-ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          Next ›
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      <div className="week-grid">
        {days.map((day) => {
          const dayEvents = eventsByDay.get(day.getTime()) ?? [];
          return (
            <div
              key={day.getTime()}
              className={`day-col${isSameDay(day, new Date()) ? " is-today" : ""}`}
            >
              <div className="day-head">{formatDayHeader(day)}</div>
              <div className="day-body">
                {dayEvents.length === 0 && !loading && (
                  <p className="muted small">No events</p>
                )}
                {dayEvents.map((ev) => (
                  <EventCard key={ev.id} ev={ev} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EventCard({ ev }: { ev: ScheduleEvent }) {
  return (
    <article className={`event-card${ev.onsite ? " onsite" : ""}`}>
      <div className="event-time">
        {formatTime(ev.date)} · {formatDuration(ev.duration)}
      </div>
      <div className="event-title">{ev.event || "(untitled)"}</div>
      {ev.user?.username && <div className="event-assignee">{ev.user.username}</div>}
      {ev.notes && <div className="event-notes">{ev.notes}</div>}
      {ev.onsite && <span className="badge">On-site</span>}
    </article>
  );
}
