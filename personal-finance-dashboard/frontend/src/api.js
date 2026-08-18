const BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "pf_token";

let token = localStorage.getItem(TOKEN_KEY) || "";

export function setToken(value) {
  token = value || "";
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return token;
}

async function request(path, { method = "GET", body, raw = false } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    setToken("");
    window.dispatchEvent(new Event("pf:unauthorised"));
    throw new Error("Session expired — please sign in again.");
  }
  if (raw) {
    if (!res.ok) throw new Error("Download failed");
    return res.blob();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  authStatus: () => request("/auth/status"),
  setup: (password) => request("/auth/setup", { method: "POST", body: { password } }),
  login: (password) => request("/auth/login", { method: "POST", body: { password } }),
  changePassword: (currentPassword, newPassword) =>
    request("/auth/password", { method: "POST", body: { currentPassword, newPassword } }),

  listEarnings: () => request("/earnings"),
  createEarning: (payload) => request("/earnings", { method: "POST", body: payload }),
  updateEarning: (id, payload) => request(`/earnings/${id}`, { method: "PUT", body: payload }),
  deleteEarning: (id) => request(`/earnings/${id}`, { method: "DELETE" }),

  listExpenses: () => request("/expenses"),
  createExpense: (payload) => request("/expenses", { method: "POST", body: payload }),
  updateExpense: (id, payload) => request(`/expenses/${id}`, { method: "PUT", body: payload }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: "DELETE" }),

  summary: (today) => request(`/analytics/summary?today=${today}`),
  backup: () => request("/backup"),
  restore: (payload) => request("/restore", { method: "POST", body: payload }),
  csv: (type) => request(`/export/csv?type=${type}`, { raw: true }),
};

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
