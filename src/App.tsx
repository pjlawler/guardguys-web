import { useState } from "react";
import type { User } from "./api/types";
import { clearSession, loadSession, saveSession } from "./lib/auth";
import { Login } from "./views/Login";
import { ScheduleWeek } from "./views/ScheduleWeek";

export function App() {
  const [user, setUser] = useState<User | null>(() => loadSession());

  function handleLogin(u: User) {
    saveSession(u);
    setUser(u);
  }

  function handleLogout() {
    clearSession();
    setUser(null);
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>GuardGuys Calendar</h1>
        <div className="app-header-right">
          <span className="user-chip">
            {user.username}
            {user.isAdmin ? " · admin" : ""}
          </span>
          <button className="btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="app-main">
        <ScheduleWeek />
      </main>
    </div>
  );
}
