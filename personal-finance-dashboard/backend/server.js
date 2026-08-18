import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

/* ------------------------------------------------------------------ setup */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "finance.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS earnings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    amount      REAL    NOT NULL,
    date        TEXT    NOT NULL,
    time_of_day TEXT    NOT NULL DEFAULT 'Day',
    category    TEXT    NOT NULL DEFAULT 'Other',
    note        TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    amount      REAL    NOT NULL,
    date        TEXT    NOT NULL,
    category    TEXT    NOT NULL DEFAULT 'Other',
    notes       TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_earnings_date ON earnings(date);
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
`);

const getSetting = (key) =>
  db.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value ?? null;
const setSetting = (key, value) =>
  db
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(key, value);

/* ------------------------------------------------------------------- auth */

let SECRET = getSetting("app_secret");
if (!SECRET) {
  SECRET = crypto.randomBytes(32).toString("hex");
  setSetting("app_secret", SECRET);
}

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, expected] = stored.split(":");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(expected, "hex"));
}

function signToken() {
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString(
    "base64url"
  );
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function tokenIsValid(token) {
  if (!token || !token.includes(".")) return false;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()).exp > Date.now();
  } catch {
    return false;
  }
}

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!tokenIsValid(token)) return res.status(401).json({ error: "Not authorised" });
  next();
}

/* -------------------------------------------------------------- validation */

const EARNING_CATEGORIES = ["Day Income", "Night Income", "Other"];
const EXPENSE_CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Education", "Other"];
const TIMES_OF_DAY = ["Day", "Night"];

class BadRequest extends Error {}

function num(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new BadRequest(`${field} must be a positive number`);
  return Math.round(n * 100) / 100;
}

function isoDate(value, field) {
  const s = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new BadRequest(`${field} must look like YYYY-MM-DD`);
  return s;
}

function oneOf(value, allowed, field) {
  if (!allowed.includes(value)) throw new BadRequest(`${field} must be one of: ${allowed.join(", ")}`);
  return value;
}

const now = () => new Date().toISOString();

/* -------------------------------------------------------------------- app */

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.get("/api/auth/status", (_req, res) =>
  res.json({ configured: Boolean(getSetting("password_hash")) })
);

app.post("/api/auth/setup", (req, res) => {
  if (getSetting("password_hash")) return res.status(409).json({ error: "Password already set" });
  const { password } = req.body || {};
  if (!password || String(password).length < 4)
    return res.status(400).json({ error: "Password must be at least 4 characters" });
  setSetting("password_hash", hashPassword(String(password)));
  res.json({ token: signToken() });
});

app.post("/api/auth/login", (req, res) => {
  const stored = getSetting("password_hash");
  if (!stored) return res.status(409).json({ error: "No password set yet" });
  if (!verifyPassword(String(req.body?.password || ""), stored))
    return res.status(401).json({ error: "Wrong password" });
  res.json({ token: signToken() });
});

app.post("/api/auth/password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!verifyPassword(String(currentPassword || ""), getSetting("password_hash")))
    return res.status(401).json({ error: "Current password is wrong" });
  if (!newPassword || String(newPassword).length < 4)
    return res.status(400).json({ error: "New password must be at least 4 characters" });
  setSetting("password_hash", hashPassword(String(newPassword)));
  res.json({ token: signToken() });
});

/* --------------------------------------------------------------- earnings */

app.get("/api/earnings", requireAuth, (req, res) => {
  const { from, to } = req.query;
  let sql = "SELECT * FROM earnings";
  const params = [];
  if (from && to) {
    sql += " WHERE date BETWEEN ? AND ?";
    params.push(isoDate(from, "from"), isoDate(to, "to"));
  }
  sql += " ORDER BY date DESC, id DESC";
  res.json(db.prepare(sql).all(...params));
});

app.post("/api/earnings", requireAuth, (req, res) => {
  const b = req.body || {};
  const row = {
    amount: num(b.amount, "Amount"),
    date: isoDate(b.date, "Date"),
    time_of_day: oneOf(b.time_of_day || "Day", TIMES_OF_DAY, "Time"),
    category: oneOf(b.category || "Other", EARNING_CATEGORIES, "Category"),
    note: String(b.note || "").slice(0, 500),
  };
  const ts = now();
  const info = db
    .prepare(
      `INSERT INTO earnings (amount, date, time_of_day, category, note, created_at, updated_at)
       VALUES (@amount, @date, @time_of_day, @category, @note, @ts, @ts)`
    )
    .run({ ...row, ts });
  res.status(201).json(db.prepare("SELECT * FROM earnings WHERE id = ?").get(info.lastInsertRowid));
});

app.put("/api/earnings/:id", requireAuth, (req, res) => {
  const existing = db.prepare("SELECT * FROM earnings WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Entry not found" });
  const b = req.body || {};
  const row = {
    id: existing.id,
    amount: num(b.amount ?? existing.amount, "Amount"),
    date: isoDate(b.date ?? existing.date, "Date"),
    time_of_day: oneOf(b.time_of_day ?? existing.time_of_day, TIMES_OF_DAY, "Time"),
    category: oneOf(b.category ?? existing.category, EARNING_CATEGORIES, "Category"),
    note: String(b.note ?? existing.note).slice(0, 500),
    ts: now(),
  };
  db.prepare(
    `UPDATE earnings SET amount=@amount, date=@date, time_of_day=@time_of_day,
     category=@category, note=@note, updated_at=@ts WHERE id=@id`
  ).run(row);
  res.json(db.prepare("SELECT * FROM earnings WHERE id = ?").get(existing.id));
});

app.delete("/api/earnings/:id", requireAuth, (req, res) => {
  const info = db.prepare("DELETE FROM earnings WHERE id = ?").run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: "Entry not found" });
  res.json({ ok: true });
});

/* --------------------------------------------------------------- expenses */

app.get("/api/expenses", requireAuth, (req, res) => {
  const { from, to } = req.query;
  let sql = "SELECT * FROM expenses";
  const params = [];
  if (from && to) {
    sql += " WHERE date BETWEEN ? AND ?";
    params.push(isoDate(from, "from"), isoDate(to, "to"));
  }
  sql += " ORDER BY date DESC, id DESC";
  res.json(db.prepare(sql).all(...params));
});

app.post("/api/expenses", requireAuth, (req, res) => {
  const b = req.body || {};
  const row = {
    amount: num(b.amount, "Amount"),
    date: isoDate(b.date, "Date"),
    category: oneOf(b.category || "Other", EXPENSE_CATEGORIES, "Category"),
    notes: String(b.notes || "").slice(0, 500),
    ts: now(),
  };
  const info = db
    .prepare(
      `INSERT INTO expenses (amount, date, category, notes, created_at, updated_at)
       VALUES (@amount, @date, @category, @notes, @ts, @ts)`
    )
    .run(row);
  res.status(201).json(db.prepare("SELECT * FROM expenses WHERE id = ?").get(info.lastInsertRowid));
});

app.put("/api/expenses/:id", requireAuth, (req, res) => {
  const existing = db.prepare("SELECT * FROM expenses WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Entry not found" });
  const b = req.body || {};
  const row = {
    id: existing.id,
    amount: num(b.amount ?? existing.amount, "Amount"),
    date: isoDate(b.date ?? existing.date, "Date"),
    category: oneOf(b.category ?? existing.category, EXPENSE_CATEGORIES, "Category"),
    notes: String(b.notes ?? existing.notes).slice(0, 500),
    ts: now(),
  };
  db.prepare(
    `UPDATE expenses SET amount=@amount, date=@date, category=@category,
     notes=@notes, updated_at=@ts WHERE id=@id`
  ).run(row);
  res.json(db.prepare("SELECT * FROM expenses WHERE id = ?").get(existing.id));
});

app.delete("/api/expenses/:id", requireAuth, (req, res) => {
  const info = db.prepare("DELETE FROM expenses WHERE id = ?").run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: "Entry not found" });
  res.json({ ok: true });
});

/* -------------------------------------------------------------- analytics */

app.get("/api/analytics/summary", requireAuth, (req, res) => {
  const today = isoDate(req.query.today || new Date().toISOString(), "today");
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  const sum = (table, where, param) =>
    db.prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM ${table} ${where}`).get(param)
      .total;

  const totals = {
    earnings: sum("earnings", ""),
    expenses: sum("expenses", ""),
    todayEarnings: sum("earnings", "WHERE date = ?", today),
    todayExpenses: sum("expenses", "WHERE date = ?", today),
    monthEarnings: sum("earnings", "WHERE substr(date,1,7) = ?", month),
    monthExpenses: sum("expenses", "WHERE substr(date,1,7) = ?", month),
    yearEarnings: sum("earnings", "WHERE substr(date,1,4) = ?", year),
    yearExpenses: sum("expenses", "WHERE substr(date,1,4) = ?", year),
  };
  totals.netSavings = totals.earnings - totals.expenses;
  res.json(totals);
});

/* ---------------------------------------------------------- export/backup */

function toCsv(rows, columns) {
  const escape = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => escape(r[c])).join(","))].join(
    "\n"
  );
}

app.get("/api/export/csv", requireAuth, (req, res) => {
  const type = String(req.query.type || "all");
  const earnings = db.prepare("SELECT * FROM earnings ORDER BY date, id").all();
  const expenses = db.prepare("SELECT * FROM expenses ORDER BY date, id").all();
  let csv;
  if (type === "earnings") {
    csv = toCsv(earnings, ["id", "date", "time_of_day", "category", "amount", "note"]);
  } else if (type === "expenses") {
    csv = toCsv(expenses, ["id", "date", "category", "amount", "notes"]);
  } else {
    const merged = [
      ...earnings.map((e) => ({
        date: e.date,
        type: "Earning",
        time: e.time_of_day,
        category: e.category,
        income: e.amount,
        expense: "",
        notes: e.note,
      })),
      ...expenses.map((e) => ({
        date: e.date,
        type: "Expense",
        time: "",
        category: e.category,
        income: "",
        expense: e.amount,
        notes: e.notes,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    csv = toCsv(merged, ["date", "type", "time", "category", "income", "expense", "notes"]);
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="finance-${type}.csv"`);
  res.send(csv);
});

app.get("/api/backup", requireAuth, (_req, res) => {
  res.json({
    version: 1,
    exportedAt: now(),
    earnings: db.prepare("SELECT * FROM earnings").all(),
    expenses: db.prepare("SELECT * FROM expenses").all(),
  });
});

app.post("/api/restore", requireAuth, (req, res) => {
  const { earnings = [], expenses = [], mode = "replace" } = req.body || {};
  if (!Array.isArray(earnings) || !Array.isArray(expenses))
    return res.status(400).json({ error: "Backup file is not in the expected format" });

  const run = db.transaction(() => {
    if (mode === "replace") {
      db.prepare("DELETE FROM earnings").run();
      db.prepare("DELETE FROM expenses").run();
    }
    const insE = db.prepare(
      `INSERT INTO earnings (amount, date, time_of_day, category, note, created_at, updated_at)
       VALUES (@amount, @date, @time_of_day, @category, @note, @ts, @ts)`
    );
    const insX = db.prepare(
      `INSERT INTO expenses (amount, date, category, notes, created_at, updated_at)
       VALUES (@amount, @date, @category, @notes, @ts, @ts)`
    );
    const ts = now();
    for (const e of earnings)
      insE.run({
        amount: num(e.amount, "Amount"),
        date: isoDate(e.date, "Date"),
        time_of_day: TIMES_OF_DAY.includes(e.time_of_day) ? e.time_of_day : "Day",
        category: EARNING_CATEGORIES.includes(e.category) ? e.category : "Other",
        note: String(e.note || ""),
        ts,
      });
    for (const e of expenses)
      insX.run({
        amount: num(e.amount, "Amount"),
        date: isoDate(e.date, "Date"),
        category: EXPENSE_CATEGORIES.includes(e.category) ? e.category : "Other",
        notes: String(e.notes || ""),
        ts,
      });
  });

  run();
  res.json({ ok: true, earnings: earnings.length, expenses: expenses.length });
});

/* ------------------------------------------------- static build + errors */

const dist = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err, _req, res, _next) => {
  if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

app.listen(PORT, () => {
  console.log(`Finance API listening on http://localhost:${PORT}`);
  console.log(`Database: ${path.join(DATA_DIR, "finance.db")}`);
});
