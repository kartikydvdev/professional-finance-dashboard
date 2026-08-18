# Personal Finance Dashboard

A premium, minimal personal finance tracker. Manually log daily earnings and expenses, and get
automatic daily / weekly / monthly / yearly analytics, charts, a calendar view and a searchable ledger.

- **Frontend:** React 18 + Vite + React Router + Chart.js (react-chartjs-2)
- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3) — data is stored on disk, so it survives browser restarts
- **Extras:** dark mode, password protection, CSV export, JSON backup/restore, offline local-storage cache, mobile-first responsive layout

---

## 1. Requirements

- Node.js 18 or newer
- npm

## 2. Install

```bash
# backend
cd backend
npm install

# frontend (in a second terminal)
cd frontend
npm install
```

## 3. Run in development

```bash
# terminal 1 — API on http://localhost:4000
cd backend
npm run dev

# terminal 2 — app on http://localhost:5173
cd frontend
npm run dev
```

Open <http://localhost:5173>. The first screen asks you to **create a password** — this is the
password protection for the whole app. It is hashed with scrypt and stored in SQLite; there is no
recovery, so keep it safe (you can reset by deleting `backend/data/finance.db`).

## 4. Run in production (single server)

```bash
cd frontend && npm run build     # outputs frontend/dist
cd ../backend && npm start       # serves the API *and* the built app on http://localhost:4000
```

## 5. Where the data lives

| What | Where |
| --- | --- |
| Earnings, expenses, password, app secret | `backend/data/finance.db` (SQLite) |
| Offline cache for instant loads | Browser `localStorage` (`pf_cache_*`) |
| Manual backups | `Settings → Download backup` (JSON) |

Copy `backend/data/finance.db` anywhere to back up everything, or use the built-in
JSON backup/restore in **Settings**.

## 6. API summary

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/auth/status` | Whether a password has been set |
| `POST` | `/api/auth/setup` | Create the first password |
| `POST` | `/api/auth/login` | Exchange password for a 30-day token |
| `POST` | `/api/auth/password` | Change password |
| `GET/POST/PUT/DELETE` | `/api/earnings[/:id]` | Earnings CRUD |
| `GET/POST/PUT/DELETE` | `/api/expenses[/:id]` | Expenses CRUD |
| `GET` | `/api/analytics/summary` | Server-side totals (day / month / year) |
| `GET` | `/api/export/csv?type=all` | CSV export (`earnings`, `expenses`, `all`) |
| `GET` | `/api/backup` | Full JSON backup |
| `POST` | `/api/restore` | Restore from a JSON backup |

All endpoints except `/api/auth/*` require an `Authorization: Bearer <token>` header.

## 7. Project layout

```
backend/
  server.js          Express API, SQLite schema, auth, CSV/backup
  package.json
frontend/
  index.html
  vite.config.js
  src/
    main.jsx         entry
    App.jsx          sidebar, routing, login gate
    api.js           fetch wrapper + token handling
    store.jsx        theme + auth + data contexts, localStorage cache
    analytics.js     all daily/monthly/yearly maths
    styles.css       design system, dark mode, responsive rules
    components/ui.jsx      cards, modal, form controls, empty states
    components/Charts.jsx  four Chart.js charts
    pages/Dashboard.jsx
    pages/Earnings.jsx
    pages/Expenses.jsx
    pages/Analytics.jsx
    pages/CalendarView.jsx
    pages/Reports.jsx
    pages/Settings.jsx
```

## 8. Notes

- Amounts are stored as numbers; the display currency is configurable in **Settings**.
- Earnings carry a **Day / Night** flag plus a category (Day Income, Night Income, Other).
- Expenses carry a category (Food, Travel, Shopping, Bills, Education, Other) and free-text notes.
- The app is designed for a single user on a trusted machine. If you expose it to the internet,
  put it behind HTTPS and a reverse proxy first.
