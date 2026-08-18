import React, { useMemo, useState } from "react";
import { useData, useTheme } from "../store.jsx";
import { monthOf, sum, todayISO, totalsBy, highest } from "../analytics.js";
import { Card, ConfirmDelete, Empty, Field, Flash, StatCard, useFlash } from "../components/ui.jsx";
import { CategoryDoughnut } from "../components/Charts.jsx";

const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Education", "Other"];
const blank = () => ({ amount: "", date: todayISO(), category: "Food", notes: "" });

export default function Expenses() {
  const { expenses, addExpense, updateExpense, deleteExpense } = useData();
  const { money } = useTheme();
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useFlash();

  const thisMonth = monthOf(todayISO());
  const byCategory = useMemo(() => totalsBy(expenses, (r) => r.category), [expenses]);
  const top = highest(byCategory);
  const stats = {
    total: sum(expenses),
    month: sum(expenses.filter((r) => monthOf(r.date) === thisMonth)),
    today: sum(expenses.filter((r) => r.date === todayISO())),
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const reset = () => {
    setForm(blank());
    setEditingId(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return setFlash({ message: "Enter an amount greater than zero." });
    setBusy(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editingId) {
        await updateExpense(editingId, payload);
        setFlash({ ok: true, message: "Expense updated." });
      } else {
        await addExpense(payload);
        setFlash({ ok: true, message: "Expense added." });
      }
      reset();
    } catch (err) {
      setFlash({ message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({ amount: String(row.amount), date: row.date, category: row.category, notes: row.notes || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async () => {
    try {
      await deleteExpense(pendingDelete.id);
      setFlash({ ok: true, message: "Entry deleted." });
      if (editingId === pendingDelete.id) reset();
    } catch (err) {
      setFlash({ message: err.message });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <div className="grid grid-auto">
        <StatCard label="All-time expenses" value={money(stats.total)} icon="↓" tone="negative" />
        <StatCard label="This month" value={money(stats.month)} icon="▤" />
        <StatCard label="Today" value={money(stats.today)} icon="☀" />
        <StatCard label="Biggest category" value={top ? top.key : "—"} icon="◆"
          foot={top ? money(top.value) : "Nothing logged yet"} />
      </div>

      <Card title={editingId ? "Edit expense" : "Add expense"}>
        <Flash flash={flash} />
        <form onSubmit={submit} style={{ marginTop: flash ? 14 : 0 }}>
          <div className="form-grid">
            <Field label="Amount" htmlFor="xamount">
              <input id="xamount" className="input" type="number" min="0" step="0.01"
                placeholder="0.00" value={form.amount} onChange={set("amount")} required />
            </Field>
            <Field label="Date" htmlFor="xdate">
              <input id="xdate" className="input" type="date" value={form.date} onChange={set("date")} required />
            </Field>
            <Field label="Category" htmlFor="xcat">
              <select id="xcat" className="select" value={form.category} onChange={set("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="xnotes">Notes</label>
            <textarea id="xnotes" className="textarea" value={form.notes} onChange={set("notes")}
              placeholder="What was this for?" />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>
              {editingId ? "Save changes" : "Add expense"}
            </button>
            {editingId && (
              <>
                <button type="button" className="btn" onClick={reset}>Cancel edit</button>
                <button type="button" className="btn btn-danger"
                  onClick={() => setPendingDelete(expenses.find((r) => r.id === editingId))}>
                  Delete
                </button>
              </>
            )}
          </div>
        </form>
      </Card>

      <div className="grid grid-2">
        <Card title="Spending by category">
          <CategoryDoughnut totals={byCategory} />
        </Card>
        <Card title="Category totals">
          {Object.keys(byCategory).length ? (
            <div className="list">
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, total]) => (
                  <div className="list-row" key={cat}>
                    <span className="grow">{cat}</span>
                    <span className="pill">{((total / (stats.total || 1)) * 100).toFixed(0)}%</span>
                    <strong className="negative">{money(total)}</strong>
                  </div>
                ))}
            </div>
          ) : (
            <Empty title="No expenses yet" />
          )}
        </Card>
      </div>

      <Card title={`All expenses (${expenses.length})`}>
        {expenses.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Notes</th>
                  <th className="num">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {expenses.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td><span className="pill">{row.category}</span></td>
                    <td className="muted">{row.notes || "—"}</td>
                    <td className="num negative">{money(row.amount)}</td>
                    <td className="num">
                      <button className="btn btn-sm btn-ghost" onClick={() => startEdit(row)}>Edit</button>
                      <button className="btn btn-sm btn-ghost negative" onClick={() => setPendingDelete(row)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="↓" title="No expenses logged" hint="Use the form above to add your first entry." />
        )}
      </Card>

      <ConfirmDelete
        open={Boolean(pendingDelete)}
        label={pendingDelete ? `${money(pendingDelete.amount)} on ${pendingDelete.date}` : ""}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
