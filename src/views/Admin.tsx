import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { User } from "../api/types";
import { UserModal } from "../components/UserModal";

type Editing = { user: User | null } | null;

export function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers();
      data.sort((a, b) => a.username.localeCompare(b.username));
      setUsers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="admin">
      <div className="section-toolbar">
        <h2>Employees</h2>
        <button className="btn-primary" onClick={() => setEditing({ user: null })}>
          + New employee
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && (
        <table className="user-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td className="muted">{u.email}</td>
                <td>{u.isAdmin ? <span className="badge admin">Admin</span> : "Employee"}</td>
                <td className="right">
                  <button className="btn-ghost" onClick={() => setEditing({ user: u })}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No employees yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {editing && (
        <UserModal
          user={editing.user}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </section>
  );
}
