import React, { useMemo, useState } from "react";
import { useData, useTheme } from "../store.jsx";
import { ledgerRows } from "../analytics.js";
import { api, downloadBlob } from "../api.js";
import { Card, Empty } from "../components/ui.jsx";

const COLUMNS = [
  { key: "date", label: "Date" },
  { key: "kind", label: "Type" },
  { key: "time", label: "Time" },
  { key: "category", label: "Category" },
  { key: "income", label: "Income", num: true },
  { key: "expense", label: "Expense", num: true },
  { key: "net", label: "Net balance", num: true },
  { key: "notes", label: "Notes" },
];

export default function Reports() {
  const { earnings, expenses } = useData();
  const { money } = useTheme();

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState({ key: "date", dir: "desc" });

  const rows = useMemo(() => ledgerRows(earnings, expenses), [earnings, expenses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (kind !== "All" && r.kind !== kind) return false;
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      if (q && !`${r.category} ${r.notes} ${r.kind} ${r.time}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return out;
  }, [rows, search, kind, from, to, sort]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (t, r) => ({ income: t.income + r.income, expense: t.expense + r.expense }),
        { income: 0, expense: 0 }
      ),
    [filtered]
  );

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const exportCsv = async (type) => {
    try {
      const blob = await api.csv(type);
      downloadBlob(blob, `finance-${type}.csv`);
    } catch {
      // client-side fallback: export the current filtered view
      const header = COLUMNS.map((c) => c.label).join(",");
      const body = filtered
        .map((r) => COLUMNS.map((c) => `"${String(r[c.key]).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      downloadBlob(new Blob([`${header}\n${body}`], { type: "text/csv" }), "finance-view.csv");
    }
  };

  return (
    <Card
      title="Ledger & reports"
      actions={
        <div className="segmented">
          <button onClick={() => exportCsv("all")}>Export all CSV</button>
          <button onClick={() => exportCsv("earnings")}>Earnings</button>
          <button onClick={() => exportCsv("expenses")}>Expenses</button>
        </div>
      }
    >
      <div className="wrap-gap" style={{ marginBottom: 16 }}>
        <div className="field" style={{ flex: "1 1 220px" }}>
          <label>Search</label>
          <input className="input" placeholder="Category, note, type…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="field">
          <label>Type</label>
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option>All</option>
            <option>Earning</option>
            <option>Expense</option>
          </select>
        </div>
        <div className="field">
          <label>From</label>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label>To</label>
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn" onClick={() => { setSearch(""); setKind("All"); setFrom(""); setTo(""); }}>
          Clear
        </button>
      </div>

      <div className="wrap-gap" style={{ marginBottom: 12 }}>
        <span className="pill">{filtered.length} rows</span>
        <span className="pill up">Income {money(totals.income)}</span>
        <span className="pill down">Expense {money(totals.expense)}</span>
        <span className="pill">Net {money(totals.income - totals.expense)}</span>
      </div>

      {filtered.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} className={`sortable ${c.num ? "num" : ""}`} onClick={() => toggleSort(c.key)}>
                    {c.label}
                    {sort.key === c.key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.key}>
                  <td>{r.date}</td>
                  <td><span className={`pill ${r.kind === "Earning" ? "up" : "down"}`}>{r.kind}</span></td>
                  <td>{r.time}</td>
                  <td>{r.category}</td>
                  <td className="num positive">{r.income ? money(r.income) : "—"}</td>
                  <td className="num negative">{r.expense ? money(r.expense) : "—"}</td>
                  <td className={`num ${r.net >= 0 ? "positive" : "negative"}`}>{money(r.net)}</td>
                  <td className="muted truncate" style={{ maxWidth: 220 }}>{r.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="≡" title="No matching rows" hint="Adjust the search or filters above." />
      )}
    </Card>
  );
}
