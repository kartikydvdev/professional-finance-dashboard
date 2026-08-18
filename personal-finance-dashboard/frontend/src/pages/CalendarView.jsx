import React, { useMemo, useState } from "react";
import { useData, useTheme } from "../store.jsx";
import { dailyAnalysis, MONTH_NAMES, todayISO } from "../analytics.js";
import { Card, Empty } from "../components/ui.jsx";

const pad = (n) => String(n).padStart(2, "0");
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarView() {
  const { earnings, expenses } = useData();
  const { money } = useTheme();
  const today = todayISO();

  const [view, setView] = useState(() => {
    const [y, m] = today.split("-").map(Number);
    return { year: y, month: m }; // month is 1-based
  });
  const [selected, setSelected] = useState(today);

  // Totals per ISO date for quick cell lookup.
  const totals = useMemo(() => {
    const map = {};
    for (const r of earnings) {
      (map[r.date] ||= { in: 0, out: 0 }).in += Number(r.amount);
    }
    for (const r of expenses) {
      (map[r.date] ||= { in: 0, out: 0 }).out += Number(r.amount);
    }
    return map;
  }, [earnings, expenses]);

  const cells = useMemo(() => {
    const first = new Date(view.year, view.month - 1, 1);
    const daysInMonth = new Date(view.year, view.month, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // Monday-first offset
    const out = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(`${view.year}-${pad(view.month)}-${pad(d)}`);
    }
    return out;
  }, [view]);

  const shift = (delta) =>
    setView((v) => {
      const d = new Date(v.year, v.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });

  const detail = dailyAnalysis(earnings, expenses, selected);

  return (
    <div className="grid grid-2" style={{ alignItems: "start" }}>
      <Card
        title={`${MONTH_NAMES[view.month - 1]} ${view.year}`}
        actions={
          <div className="segmented">
            <button onClick={() => shift(-1)}>‹</button>
            <button onClick={() => setView(() => {
              const [y, m] = today.split("-").map(Number);
              return { year: y, month: m };
            })}>Today</button>
            <button onClick={() => shift(1)}>›</button>
          </div>
        }
      >
        <div className="calendar">
          {DOW.map((d) => (
            <div className="cal-dow" key={d}>{d}</div>
          ))}
          {cells.map((iso, i) =>
            iso === null ? (
              <div className="cal-cell empty" key={`e${i}`} />
            ) : (
              <button
                key={iso}
                className={`cal-cell ${iso === today ? "today" : ""} ${iso === selected ? "selected" : ""}`}
                onClick={() => setSelected(iso)}
              >
                <span className="cal-day">{Number(iso.slice(8))}</span>
                {totals[iso]?.in ? <span className="cal-amt positive">+{money(totals[iso].in)}</span> : null}
                {totals[iso]?.out ? <span className="cal-amt negative">−{money(totals[iso].out)}</span> : null}
              </button>
            )
          )}
        </div>
      </Card>

      <Card title={`Details · ${selected}`}>
        <div className="grid grid-3" style={{ marginBottom: 16 }}>
          <div className="stat">
            <span className="stat-label">Earned</span>
            <strong className="positive">{money(detail.totalEarnings)}</strong>
          </div>
          <div className="stat">
            <span className="stat-label">Spent</span>
            <strong className="negative">{money(detail.totalExpenses)}</strong>
          </div>
          <div className="stat">
            <span className="stat-label">Net</span>
            <strong className={detail.net >= 0 ? "positive" : "negative"}>{money(detail.net)}</strong>
          </div>
        </div>

        <h3 style={{ marginBottom: 8 }}>Earnings</h3>
        {detail.earnings.length ? (
          <div className="list">
            {detail.earnings.map((r) => (
              <div className="list-row" key={`e${r.id}`}>
                <span className="grow">{r.category} · <span className="muted">{r.time_of_day}</span></span>
                <strong className="positive">{money(r.amount)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No earnings on this day.</p>
        )}

        <h3 style={{ margin: "16px 0 8px" }}>Expenses</h3>
        {detail.expenses.length ? (
          <div className="list">
            {detail.expenses.map((r) => (
              <div className="list-row" key={`x${r.id}`}>
                <span className="grow truncate">{r.category}{r.notes ? ` · ${r.notes}` : ""}</span>
                <strong className="negative">{money(r.amount)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No expenses on this day.</p>
        )}

        {!detail.earnings.length && !detail.expenses.length && (
          <Empty title="Nothing on this date" hint="Pick another day, or add an entry from the Earnings / Expenses pages." />
        )}
      </Card>
    </div>
  );
}
