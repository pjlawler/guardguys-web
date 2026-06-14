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
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogin(u: User, token: string) {
    saveSession(u, token);
    setUser(u);
    setTab("schedule");
  }

  function handleLogout() {
    clearSession();
    setUser(null);
  }

  function selectTab(next: Tab) {
    setTab(next);
    setMenuOpen(false);
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>GuardGuys</h1>

        <button
          className="hamburger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <nav className={menuOpen ? "app-nav open" : "app-nav"}>
          <button
            className={tab === "schedule" ? "tab active" : "tab"}
            onClick={() => selectTab("schedule")}
          >
            Schedule
          </button>
          {user.isAdmin && (
            <button
              className={tab === "admin" ? "tab active" : "tab"}
              onClick={() => selectTab("admin")}
            >
              Admin
            </button>
          )}
          <span className="nav-spacer" />
          <span className="user-chip">
            {user.username}
            {user.isAdmin ? " · admin" : ""}
          </span>
          <button className="btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </nav>
      </header>

      {menuOpen && (
        <div className="nav-backdrop" onClick={() => setMenuOpen(false)} />
      )}

      <main className="app-main">
        {tab === "schedule" ? <ScheduleWeek /> : <Admin />}
      </main>
    </div>
  );
}
