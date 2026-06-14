import { useState } from "react";
import { api, ApiError } from "../api/client";
import type { User, UserInput } from "../api/types";
import { Modal } from "./Modal";

interface UserModalProps {
  /** Existing user to edit, or null to create a new one. */
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}

export function UserModal({ user, onClose, onSaved }: UserModalProps) {
  const isEdit = user !== null;

  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(user?.isAdmin ?? false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    // On edit, only send password when the admin actually typed a new one.
    const payload: UserInput = {
      username: username.trim(),
      email: email.trim(),
      isAdmin,
      ...(password ? { password } : {}),
    };

    try {
      if (isEdit) {
        await api.updateUser(user!.id, payload);
      } else {
        await api.createUser(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save user.");
      setBusy(false);
    }
  }

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      await api.deleteUser(user!.id);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete user.");
      setBusy(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit employee" : "New employee"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEdit ? "Leave blank to keep current" : ""}
            autoComplete="new-password"
            required={!isEdit}
          />
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />
          Administrator
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
