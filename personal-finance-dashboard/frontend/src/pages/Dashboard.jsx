import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData, useTheme } from "../store.jsx";
import {
  dailySeries,
  headlineTotals,
  monthlySeries,
  savingsGrowth,
  todayISO,
  yearOf,
} from "../analytics.js";
import { Card, Empty, StatCard } from "../components/ui.jsx";
import {
  CategoryDoughnut,
  EarningsVsExpensesChart,
  SavingsGrowthChart,
} from "../components/Charts.jsx";
import { totalsBy } from "../analytics.js";

export default function Dashboard() {
  const { earnings, expenses } = useData();
  const { money } = useTheme();
  const today = todayISO();

  const t = useMemo(() => headlineTotals(earnings, expenses, today), [earnings, expenses, today]);
  const series = useMemo(() => dailySeries(earnings, expenses, 30, today), [earnings, expenses, today]);
  const growth = useMemo(() => savingsGrowth(series), [series]);
  const monthly = useMemo(
    () => monthlySeries(earnings, expenses, yearOf(today)),
    [earnings, expenses, today]
  );
  const spendSplit = useMemo(() => totalsBy(expenses, (r) => r.category), [expenses]);

  const recent = useMemo(
    () =>
      [
        ...earnings.map((r) => ({ ...r, kind: "Earning", label: r.category })),
        ...expenses.map((r) => ({ ...r, kind: "Expense", label: r.category })),
      ]
        .sort((a, b) => (b.date === a.date ? b.id - a.id : b.date.localeCompare(a.date)))
        .slice(0, 8),
    [earnings, expenses]
  );

  const hasData = earnings.length + expenses.length > 0;

  return (
    <>
      <div className="grid grid-3">
        <StatCard label="Total earnings" value={money(t.totalEarnings)} icon="↑" tone="positive"
          foot={`${earnings.length} entries recorded`} />
        <StatCard label="Total expenses" value={money(t.totalExpenses)} icon="↓" tone="negative"
          foot={`${expenses.length} entries recorded`} />
        <StatCard label="Net savings" value={money(t.netSavings)} icon="◎"
          tone={t.netSavings >= 0 ? "positive" : "negative"}
          foot={
            t.totalEarnings
              ? `${((t.netSavings / t.totalEarnings) * 100).toFixed(1)}% of everything earned`
              : "No earnings yet"
          } />
        <StatCard label="Today's earnings" value={money(t.todayEarnings)} icon="☀"
          foot={`Spent today: ${money(t.todayExpenses)} · Net ${money(t.todayEarnings - t.todayExpenses)}`} />
        <StatCard label="This month" value={money(t.monthEarnings)} icon="▤"
          foot={`Spent: ${money(t.monthExpenses)} · Saved ${money(t.monthEarnings - t.monthExpenses)}`} />
        <StatCard label="This year" value={money(t.yearEarnings)} icon="▦"
          foot={`Spent: ${money(t.yearExpenses)} · Saved ${money(t.yearEarnings - t.yearExpenses)}`} />
      </div>

      {!hasData && (
        <Card>
          <Empty
            icon="✎"
            title="Nothing logged yet"
            hint="Add your first earning or expense — every chart and report on this dashboard fills in automatically."
          />
          <div className="form-actions" style={{ justifyContent: "center" }}>
            <Link className="btn btn-primary" to="/earnings">Add earnings</Link>
            <Link className="btn" to="/expenses">Add expense</Link>
          </div>
        </Card>
      )}

      <Card title="Earnings vs expenses — last 30 days">
        <EarningsVsExpensesChart series={series} />
      </Card>

      <div className="grid grid-2">
        <Card title="Savings growth">
          <SavingsGrowthChart series={growth} />
        </Card>
        <Card title="Where the money goes">
          <CategoryDoughnut totals={spendSplit} />
        </Card>
      </div>

      <div className="grid grid-2">
        <Card title="This week">
          <div className="list">
            <div className="list-row">
              <span className="grow">Earned</span>
              <strong className="positive">{money(t.weekEarnings)}</strong>
            </div>
            <div className="list-row">
              <span className="grow">Spent</span>
              <strong className="negative">{money(t.weekExpenses)}</strong>
            </div>
            <div className="list-row">
              <span className="grow">Net</span>
              <strong className={t.weekEarnings - t.weekExpenses >= 0 ? "positive" : "negative"}>
                {money(t.weekEarnings - t.weekExpenses)}
              </strong>
            </div>
            <div className="list-row">
              <span className="grow muted">Months active this year</span>
              <span className="pill">
                {monthly.filter((m) => m.earnings || m.expenses).length} / 12
              </span>
            </div>
          </div>
        </Card>

        <Card
          title="Recent activity"
          actions={<Link className="btn btn-sm" to="/reports">View all</Link>}
        >
          {recent.length ? (
            <div className="list">
              {recent.map((r) => (
                <div className="list-row" key={`${r.kind}-${r.id}`}>
                  <span className="stat-icon">{r.kind === "Earning" ? "↑" : "↓"}</span>
                  <div className="grow">
                    <div className="truncate" style={{ fontWeight: 600 }}>{r.label}</div>
                    <div className="stat-foot">
                      {r.date}
                      {r.kind === "Earning" ? ` · ${r.time_of_day}` : ""}
                    </div>
                  </div>
                  <strong className={r.kind === "Earning" ? "positive" : "negative"}>
                    {r.kind === "Earning" ? "+" : "−"}
                    {money(r.amount)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No activity yet" hint="Entries you add will appear here." />
          )}
        </Card>
      </div>
    </>
  );
}
