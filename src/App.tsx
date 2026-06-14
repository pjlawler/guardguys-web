import { useState } from "react";
import type { User } from "./api/types";
import { clearSession, loadSession, saveSession } from "./lib/auth";
import { Login } from "./views/Login";
import { ScheduleWeek } from "./views/ScheduleWeek";
import { Admin } from "./views/Admin";

type Tab = "schedule" | "admin";

export function App() {
  const [user, setUser] = useState<User | null>(() => loadSession());
  const [tab, setTab] = useState<Tab>("schedule");

  function handleLogin(u: User, token: string) {
    saveSession(u, token);
    setUser(u);
    setTab("schedule");
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
        <div className="app-header-left">
          <h1>GuardGuys</h1>
          <nav className="tabs">
            <button
              className={tab === "schedule" ? "tab active" : "tab"}
              onClick={() => setTab("schedule")}
            >
              Schedule
            </button>
            {user.isAdmin && (
              <button
                className={tab === "admin" ? "tab active" : "tab"}
                onClick={() => setTab("admin")}
              >
                Admin
              </button>
            )}
          </nav>
        </div>
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
        {tab === "schedule" ? <ScheduleWeek /> : <Admin />}
      </main>
    </div>
  );
}
