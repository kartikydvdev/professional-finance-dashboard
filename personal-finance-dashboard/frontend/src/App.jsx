import React, { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth, useData, useTheme } from "./store.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Earnings from "./pages/Earnings.jsx";
import Expenses from "./pages/Expenses.jsx";
import Analytics from "./pages/Analytics.jsx";
import CalendarView from "./pages/CalendarView.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";

const NAV = [
  { to: "/", label: "Dashboard", icon: "◧", end: true },
  { to: "/earnings", label: "Earnings", icon: "↑" },
  { to: "/expenses", label: "Expenses", icon: "↓" },
  { to: "/analytics", label: "Analytics", icon: "◔" },
  { to: "/calendar", label: "Calendar", icon: "▦" },
  { to: "/reports", label: "Reports", icon: "≡" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

const SUBTITLE = {
  "/": "Your money at a glance",
  "/earnings": "Log what you earned",
  "/expenses": "Log what you spent",
  "/analytics": "Daily, monthly and yearly breakdown",
  "/calendar": "Pick a date to see that day",
  "/reports": "Full ledger with search and filters",
  "/settings": "Appearance, security and backups",
};

/* ------------------------------------------------------------ auth gate */

function AuthScreen() {
  const { configured, login, setup } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const firstRun = configured === false;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (firstRun && password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      if (firstRun) await setup(password);
      else await login(password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand">
          <div className="brand-mark">₹</div>
          <div>
            <div className="brand-name">Finance Dashboard</div>
            <div className="brand-sub">{firstRun ? "Create your password" : "Enter your password"}</div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="pw">Password</label>
          <input
            id="pw"
            className="input"
            type="password"
            value={password}
            autoFocus
            autoComplete={firstRun ? "new-password" : "current-password"}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {firstRun && (
          <div className="field">
            <label htmlFor="pw2">Confirm password</label>
            <input
              id="pw2"
              className="input"
              type="password"
              value={confirm}
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        )}

        {error && <div className="banner">{error}</div>}

        <button className="btn btn-primary" disabled={busy || password.length < 4}>
          {busy ? "Please wait…" : firstRun ? "Create password & continue" : "Unlock"}
        </button>

        <p className="stat-foot">
          {firstRun
            ? "This password protects the app on this device. There is no recovery link, so store it somewhere safe."
            : "Forgot it? Delete backend/data/finance.db to start over."}
        </p>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------- shell */

export default function App() {
  const { authed, checking, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { refresh, loading, error } = useData();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  if (checking) {
    return (
      <div className="auth-screen">
        <div className="muted">Loading…</div>
      </div>
    );
  }

  if (!authed) return <AuthScreen />;

  return (
    <div className="shell">
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">₹</div>
          <div>
            <div className="brand-name">Finance</div>
            <div className="brand-sub">Personal dashboard</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-ghost" onClick={toggleTheme}>
            {theme === "dark" ? "☀ Light mode" : "☾ Dark mode"}
          </button>
          <button className="btn btn-ghost" onClick={logout}>
            ⎋ Lock app
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            className="btn btn-icon menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <div className="topbar-title">
            <strong>{NAV.find((n) => n.to === location.pathname)?.label || "Dashboard"}</strong>
            <small>{SUBTITLE[location.pathname] || ""}</small>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-sm" onClick={refresh} disabled={loading}>
              {loading ? "Syncing…" : "↻ Refresh"}
            </button>
            <button className="btn btn-icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? "☀" : "☾"}
            </button>
          </div>
        </header>

        <main className="page">
          {error && <div className="banner">{error}</div>}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/earnings" element={<Earnings />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
