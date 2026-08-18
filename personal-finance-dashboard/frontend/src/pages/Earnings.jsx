import React, { useMemo, useState } from "react";
import { useData, useTheme } from "../store.jsx";
import { sum, todayISO, monthOf } from "../analytics.js";
import { Card, ConfirmDelete, Empty, Field, Flash, StatCard, useFlash } from "../components/ui.jsx";

const CATEGORIES = ["Day Income", "Night Income", "Other"];
const blank = () => ({ amount: "", date: todayISO(), time_of_day: "Day", category: "Day Income", note: "" });

export default function Earnings() {
  const { earnings, addEarning, updateEarning, deleteEarning } = useData();
  const { money } = useTheme();
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useFlash();

  const thisMonth = monthOf(todayISO());
  const stats = useMemo(
    () => ({
      total: sum(earnings),
      month: sum(earnings.filter((r) => monthOf(r.date) === thisMonth)),
      day: sum(earnings.filter((r) => r.time_of_day === "Day")),
      night: sum(earnings.filter((r) => r.time_of_day === "Night")),
    }),
    [earnings, thisMonth]
  );

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
        await updateEarning(editingId, payload);
        setFlash({ ok: true, message: "Entry updated." });
      } else {
        await addEarning(payload);
        setFlash({ ok: true, message: "Earning added." });
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
    setForm({
      amount: String(row.amount),
      date: row.date,
      time_of_day: row.time_of_day,
      category: row.category,
      note: row.note || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = async () => {
    try {
      await deleteEarning(pendingDelete.id);
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
        <StatCard label="All-time earnings" value={money(stats.total)} icon="↑" tone="positive" />
        <StatCard label="This month" value={money(stats.month)} icon="▤" />
        <StatCard label="Day shifts" value={money(stats.day)} icon="☀" />
        <StatCard label="Night shifts" value={money(stats.night)} icon="☾" />
      </div>

      <Card title={editingId ? "Edit earning" : "Add earning"}>
        <Flash flash={flash} />
        <form onSubmit={submit} style={{ marginTop: flash ? 14 : 0 }}>
          <div className="form-grid">
            <Field label="Amount" htmlFor="amount">
              <input id="amount" className="input" type="number" min="0" step="0.01"
                placeholder="0.00" value={form.amount} onChange={set("amount")} required />
            </Field>
            <Field label="Date" htmlFor="date">
              <input id="date" className="input" type="date" value={form.date} onChange={set("date")} required />
            </Field>
            <Field label="Time" htmlFor="time">
              <select id="time" className="select" value={form.time_of_day} onChange={set("time_of_day")}>
                <option value="Day">Day</option>
                <option value="Night">Night</option>
              </select>
            </Field>
            <Field label="Category" htmlFor="category">
              <select id="category" className="select" value={form.category} onChange={set("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="note">Note (optional)</label>
            <input id="note" className="input" value={form.note} onChange={set("note")}
              placeholder="e.g. weekend shift, bonus, tips" />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>
              {editingId ? "Save changes" : "Add earning"}
            </button>
            {editingId && (
              <>
                <button type="button" className="btn" onClick={reset}>Cancel edit</button>
                <button type="button" className="btn btn-danger"
                  onClick={() => setPendingDelete(earnings.find((r) => r.id === editingId))}>
                  Delete
                </button>
              </>
            )}
          </div>
        </form>
      </Card>

      <Card title={`All earnings (${earnings.length})`}>
        {earnings.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Category</th>
                  <th>Note</th>
                  <th className="num">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {earnings.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td><span className="pill">{row.time_of_day}</span></td>
                    <td>{row.category}</td>
                    <td className="muted">{row.note || "—"}</td>
                    <td className="num positive">{money(row.amount)}</td>
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
          <Empty icon="↑" title="No earnings logged" hint="Use the form above to add your first entry." />
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
