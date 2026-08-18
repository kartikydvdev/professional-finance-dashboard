import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "./api.js";

/* ------------------------------------------------------------------ theme */

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem("pf_theme") ||
      (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
  const [currency, setCurrency] = useState(() => localStorage.getItem("pf_currency") || "₹");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("pf_theme", theme);
  }, [theme]);

  useEffect(() => localStorage.setItem("pf_currency", currency), [currency]);

  const value = useMemo(
    () => ({
      theme,
      currency,
      setCurrency,
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      money: (n) =>
        `${currency}${Number(n || 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
    }),
    [theme, currency]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/* ------------------------------------------------------------------- auth */

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [configured, setConfigured] = useState(null); // null = still checking
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .authStatus()
      .then((s) => setConfigured(s.configured))
      .catch(() => setConfigured(true))
      .finally(() => setChecking(false));

    const onUnauthorised = () => setAuthed(false);
    window.addEventListener("pf:unauthorised", onUnauthorised);
    return () => window.removeEventListener("pf:unauthorised", onUnauthorised);
  }, []);

  const login = useCallback(async (password) => {
    const { token } = await api.login(password);
    setToken(token);
    setAuthed(true);
  }, []);

  const setup = useCallback(async (password) => {
    const { token } = await api.setup(password);
    setToken(token);
    setConfigured(true);
    setAuthed(true);
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setAuthed(false);
  }, []);

  return (
    <AuthContext.Provider value={{ authed, configured, checking, login, setup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ------------------------------------------------------------------- data */

const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

const CACHE_EARNINGS = "pf_cache_earnings";
const CACHE_EXPENSES = "pf_cache_expenses";

const readCache = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

export function DataProvider({ children }) {
  const { authed } = useAuth();
  const [earnings, setEarnings] = useState(() => readCache(CACHE_EARNINGS));
  const [expenses, setExpenses] = useState(() => readCache(CACHE_EXPENSES));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true);
    setError("");
    try {
      const [e, x] = await Promise.all([api.listEarnings(), api.listExpenses()]);
      setEarnings(e);
      setExpenses(x);
      localStorage.setItem(CACHE_EARNINGS, JSON.stringify(e));
      localStorage.setItem(CACHE_EXPENSES, JSON.stringify(x));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) refresh();
  }, [authed, refresh]);

  const wrap = (fn) => async (...args) => {
    const result = await fn(...args);
    await refresh();
    return result;
  };

  const value = useMemo(
    () => ({
      earnings,
      expenses,
      loading,
      error,
      refresh,
      addEarning: wrap(api.createEarning),
      updateEarning: wrap(api.updateEarning),
      deleteEarning: wrap(api.deleteEarning),
      addExpense: wrap(api.createExpense),
      updateExpense: wrap(api.updateExpense),
      deleteExpense: wrap(api.deleteExpense),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [earnings, expenses, loading, error, refresh]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
