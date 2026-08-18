import React, { useState } from "react";
import { useData, useTheme } from "../store.jsx";
import { api, downloadBlob } from "../api.js";
import { Card, Field, Flash, Segmented, useFlash } from "../components/ui.jsx";

const CURRENCIES = ["₹", "$", "€", "£", "¥", "₩", "﷼", "R$"];

export default function Settings() {
  const { theme, toggleTheme, currency, setCurrency } = useTheme();
  const { earnings, expenses, refresh } = useData();
  const [flash, setFlash] = useFlash();

  const [cur, setCur] = useState({ current: "", next: "", confirm: "" });
  const [restoreMode, setRestoreMode] = useState("replace");
  const [busy, setBusy] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    if (cur.next !== cur.confirm) return setFlash({ message: "New passwords don't match." });
    if (cur.next.length < 4) return setFlash({ message: "New password must be at least 4 characters." });
    setBusy(true);
    try {
      await api.changePassword(cur.current, cur.next);
      setCur({ current: "", next: "", confirm: "" });
      setFlash({ ok: true, message: "Password changed." });
    } catch (err) {
      setFlash({ message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const downloadBackup = async () => {
    try {
      const data = await api.backup();
      downloadBlob(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
        `finance-backup-${new Date().toISOString().slice(0, 10)}.json`
      );
      setFlash({ ok: true, message: "Backup downloaded." });
    } catch (err) {
      setFlash({ message: err.message });
    }
  };

  const restoreBackup = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      await api.restore({ ...parsed, mode: restoreMode });
      await refresh();
      setFlash({ ok: true, message: "Backup restored." });
    } catch (err) {
      setFlash({ message: `Restore failed: ${err.message}` });
    }
  };

  const exportCsv = async (type) => {
    try {
      downloadBlob(await api.csv(type), `finance-${type}.csv`);
    } catch (err) {
      setFlash({ message: err.message });
    }
  };

  return (
    <>
      <Flash flash={flash} />

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Card title="Appearance">
          <div className="list">
            <div className="list-row">
              <span className="grow">Theme</span>
              <Segmented
                options={[{ value: "light", label: "☀ Light" }, { value: "dark", label: "☾ Dark" }]}
                value={theme}
                onChange={() => toggleTheme()}
              />
            </div>
            <div className="list-row">
              <span className="grow">Currency symbol</span>
              <select className="select" style={{ maxWidth: 110 }} value={currency}
                onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card title="Your data">
          <div className="list">
            <div className="list-row">
              <span className="grow">Earnings stored</span>
              <span className="pill">{earnings.length}</span>
            </div>
            <div className="list-row">
              <span className="grow">Expenses stored</span>
              <span className="pill">{expenses.length}</span>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn" onClick={() => exportCsv("all")}>Export CSV</button>
            <button className="btn" onClick={downloadBackup}>Download backup (JSON)</button>
          </div>
        </Card>
      </div>

      <Card title="Restore from backup">
        <p className="muted" style={{ marginBottom: 12 }}>
          Import a previously downloaded JSON backup. Choose whether to replace everything or add the
          entries on top of what you already have.
        </p>
        <div className="wrap-gap">
          <Segmented
            options={[{ value: "replace", label: "Replace all" }, { value: "merge", label: "Add to existing" }]}
            value={restoreMode}
            onChange={setRestoreMode}
          />
          <label className="btn btn-primary" style={{ cursor: "pointer" }}>
            Choose backup file…
            <input type="file" accept="application/json" hidden onChange={restoreBackup} />
          </label>
        </div>
      </Card>

      <Card title="Security">
        <form onSubmit={changePassword} style={{ maxWidth: 420 }}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Current password</label>
            <input className="input" type="password" value={cur.current}
              onChange={(e) => setCur({ ...cur, current: e.target.value })} autoComplete="current-password" />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>New password</label>
            <input className="input" type="password" value={cur.next}
              onChange={(e) => setCur({ ...cur, next: e.target.value })} autoComplete="new-password" />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Confirm new password</label>
            <input className="input" type="password" value={cur.confirm}
              onChange={(e) => setCur({ ...cur, confirm: e.target.value })} autoComplete="new-password" />
          </div>
          <button className="btn btn-primary" disabled={busy}>Change password</button>
        </form>
      </Card>

      <Card title="About">
        <p className="muted">
          Personal Finance Dashboard · data is stored in a local SQLite database on the server and
          cached in your browser for instant loads. Copy the database file or use the JSON backup to
          keep a safe copy.
        </p>
      </Card>
    </>
  );
}
