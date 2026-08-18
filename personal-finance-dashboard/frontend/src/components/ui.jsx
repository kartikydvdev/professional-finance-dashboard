import React, { useEffect, useState } from "react";

export function StatCard({ label, value, foot, icon, tone }) {
  return (
    <div className="card stat">
      <div className="row-between">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <span className={`stat-value ${tone || ""}`}>{value}</span>
      {foot && <span className="stat-foot">{foot}</span>}
    </div>
  );
}

export function Card({ title, actions, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          <h2>{title}</h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ icon = "◌", title, hint }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div style={{ fontWeight: 600 }}>{title}</div>
      {hint && <div className="stat-foot">{hint}</div>}
    </div>
  );
}

export function Field({ label, children, htmlFor }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="card-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDelete({ open, label, onCancel, onConfirm }) {
  return (
    <Modal open={open} title="Delete entry" onClose={onCancel}>
      <p>
        Delete <strong>{label}</strong>? This cannot be undone.
      </p>
      <div className="form-actions">
        <button className="btn btn-danger" onClick={onConfirm}>
          Delete permanently
        </button>
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

/** Small helper for pages that show a transient success/error banner. */
export function useFlash() {
  const [flash, setFlash] = useState(null);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3200);
    return () => clearTimeout(t);
  }, [flash]);
  return [flash, setFlash];
}

export function Flash({ flash }) {
  if (!flash) return null;
  return <div className={`banner ${flash.ok ? "ok" : ""}`}>{flash.message}</div>;
}

export function ChangePill({ percent }) {
  if (percent === null || percent === undefined || !Number.isFinite(percent))
    return <span className="pill">no prior data</span>;
  const up = percent >= 0;
  return (
    <span className={`pill ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {Math.abs(percent).toFixed(1)}%
    </span>
  );
}
