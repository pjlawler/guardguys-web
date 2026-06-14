import { useState } from "react";
import { api, ApiError } from "../api/client";
import type { EventInput, ScheduleEvent, User } from "../api/types";
import { Modal } from "./Modal";
import {
  durationToMs,
  fromLocalInputValue,
  splitDuration,
  toLocalInputValue,
} from "../lib/date";

interface EventModalProps {
  /** Existing event to edit, or null to create a new one. */
  event: ScheduleEvent | null;
  /** Pre-filled datetime-local value for new events. */
  initialDateValue: string;
  users: User[];
  onClose: () => void;
  onSaved: () => void;
}

export function EventModal({
  event,
  initialDateValue,
  users,
  onClose,
  onSaved,
}: EventModalProps) {
  const isEdit = event !== null;
  const initialDuration = event ? splitDuration(event.duration) : { hours: 1, minutes: 0 };

  const [title, setTitle] = useState(event?.event ?? "");
  const [dateValue, setDateValue] = useState(
    event ? toLocalInputValue(event.date) : initialDateValue,
  );
  const [hours, setHours] = useState(initialDuration.hours);
  const [minutes, setMinutes] = useState(initialDuration.minutes);
  const [onsite, setOnsite] = useState(event?.onsite ?? false);
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [userId, setUserId] = useState<number | null>(event?.user_id ?? null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const payload: EventInput = {
      event: title.trim(),
      date: fromLocalInputValue(dateValue),
      duration: durationToMs(hours, minutes),
      onsite,
      notes: notes.trim(),
      user_id: userId,
    };
    try {
      if (isEdit) {
        await api.updateEvent(event!.id, payload);
      } else {
        await api.createEvent(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save event.");
      setBusy(false);
    }
  }

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      await api.deleteEvent(event!.id);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete event.");
      setBusy(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit event" : "New event"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Event
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. CPKC – Hastings"
            required
            autoFocus
          />
        </label>

        <label>
          Date &amp; time
          <input
            type="datetime-local"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            required
          />
        </label>

        <div className="form-row">
          <label>
            Hours
            <input
              type="number"
              min={0}
              value={hours}
              onChange={(e) => setHours(Math.max(0, Number(e.target.value)))}
            />
          </label>
          <label>
            Minutes
            <input
              type="number"
              min={0}
              max={59}
              value={minutes}
              onChange={(e) =>
                setMinutes(Math.min(59, Math.max(0, Number(e.target.value))))
              }
            />
          </label>
        </div>

        <label>
          Assigned to
          <select
            value={userId ?? ""}
            onChange={(e) =>
              setUserId(e.target.value === "" ? null : Number(e.target.value))
            }
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={onsite}
            onChange={(e) => setOnsite(e.target.checked)}
          />
          On-site
        </label>

        <label>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          {isEdit &&
            (confirmingDelete ? (
              <div className="confirm-delete">
                <span>Delete?</span>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={remove}
                  disabled={busy}
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-danger-ghost"
                onClick={() => setConfirmingDelete(true)}
                disabled={busy}
              >
                Delete
              </button>
            ))}
          <span className="spacer" />
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
