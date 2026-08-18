import React, { useMemo, useState } from "react";
import { useData, useTheme } from "../store.jsx";
import {
  availableYears,
  dailyAnalysis,
  dailySeries,
  monthlyAnalysis,
  monthlySeries,
  savingsGrowth,
  todayISO,
  yearlyAnalysis,
  yearOf,
  monthOf,
} from "../analytics.js";
import { Card, ChangePill, Empty, Field, StatCard } from "../components/ui.jsx";
import {
  EarningsVsExpensesChart,
  MonthlyBarChart,
  SavingsGrowthChart,
  YearlyComparisonChart,
} from "../components/Charts.jsx";

export default function Analytics() {
  const { earnings, expenses } = useData();
  const { money } = useTheme();
  const today = todayISO();

  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(monthOf(today));
  const [year, setYear] = useState(yearOf(today));

  const years = useMemo(() => availableYears(earnings, expenses), [earnings, expenses]);
  const daily = useMemo(() => dailyAnalysis(earnings, expenses, day), [earnings, expenses, day]);
  const monthStats = useMemo(() => monthlyAnalysis(earnings, expenses, month), [earnings, expenses, month]);
  const yearStats = useMemo(() => yearlyAnalysis(earnings, expenses, year), [earnings, expenses, year]);
  const monthSeries = useMemo(() => monthlySeries(earnings, expenses, year), [earnings, expenses, year]);
  const last60 = useMemo(() => dailySeries(earnings, expenses, 60, today), [earnings, expenses, today]);
  const growth = useMemo(
    () => savingsGrowth(monthSeries.map((m) => ({ ...m, net: m.savings }))),
    [monthSeries]
  );
  const yearCards = useMemo(
    () => years.map((y) => yearlyAnalysis(earnings, expenses, y)).sort((a, b) => a.year.localeCompare(b.year)),
    [years, earnings, expenses]
  );

  return (
    <>
      {/* ------------------------------------------------------------ daily */}
      <Card
        title="Daily analysis"
        actions={
          <input className="input" style={{ maxWidth: 190 }} type="date" value={day}
            onChange={(e) => setDay(e.target.value)} />
        }
      >
        <div className="grid grid-3">
          <StatCard label="Earnings" value={money(daily.totalEarnings)} tone="positive"
            foot={`${daily.earnings.length} entries`} />
          <StatCard label="Expenses" value={money(daily.totalExpenses)} tone="negative"
            foot={`${daily.expenses.length} entries`} />
          <StatCard label="Net profit" value={money(daily.net)} tone={daily.net >= 0 ? "positive" : "negative"}
            foot={daily.net >= 0 ? "In profit for the day" : "Spent more than earned"} />
        </div>
      </Card>

      <Card title="Earnings vs expenses — last 60 days">
        <EarningsVsExpensesChart series={last60} />
      </Card>

      {/* ---------------------------------------------------------- monthly */}
      <Card
        title="Monthly analysis"
        actions={
          <input className="input" style={{ maxWidth: 190 }} type="month" value={month}
            onChange={(e) => setMonth(e.target.value)} />
        }
      >
        <div className="grid grid-3">
          <StatCard label={`${monthStats.label} earnings`} value={money(monthStats.totalEarnings)} tone="positive"
            foot={<ChangePill percent={monthStats.change.earnings} />} />
          <StatCard label="Expenses" value={money(monthStats.totalExpenses)} tone="negative"
            foot={<ChangePill percent={monthStats.change.expenses} />} />
          <StatCard label="Savings" value={money(monthStats.savings)}
            tone={monthStats.savings >= 0 ? "positive" : "negative"}
            foot={<ChangePill percent={monthStats.change.savings} />} />
        </div>

        <div className="list" style={{ marginTop: 18 }}>
          <div className="list-row">
            <span className="grow">Compared with {monthStats.previous.label}</span>
            <span className="muted">
              earned {money(monthStats.previous.earnings)} · spent {money(monthStats.previous.expenses)} · saved{" "}
              {money(monthStats.previous.savings)}
            </span>
          </div>
          <div className="list-row">
            <span className="grow">Highest earning day</span>
            <strong className="positive">
              {monthStats.highestEarningDay
                ? `${monthStats.highestEarningDay.key} · ${money(monthStats.highestEarningDay.value)}`
                : "—"}
            </strong>
          </div>
          <div className="list-row">
            <span className="grow">Highest expense day</span>
            <strong className="negative">
              {monthStats.highestExpenseDay
                ? `${monthStats.highestExpenseDay.key} · ${money(monthStats.highestExpenseDay.value)}`
                : "—"}
            </strong>
          </div>
          <div className="list-row">
            <span className="grow">Entries recorded</span>
            <span className="pill">{monthStats.entries}</span>
          </div>
        </div>
      </Card>

      {/* ----------------------------------------------------------- yearly */}
      <Card
        title="Yearly analysis"
        actions={
          <Field label="" htmlFor="yr">
            <select id="yr" className="select" style={{ maxWidth: 140 }} value={year}
              onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </Field>
        }
      >
        <div className="grid grid-3">
          <StatCard label="Yearly earnings" value={money(yearStats.totalEarnings)} tone="positive" />
          <StatCard label="Yearly expenses" value={money(yearStats.totalExpenses)} tone="negative" />
          <StatCard label="Total savings" value={money(yearStats.savings)}
            tone={yearStats.savings >= 0 ? "positive" : "negative"}
            foot={`Savings rate ${yearStats.savingsRate.toFixed(1)}%`} />
          <StatCard label="Average monthly income" value={money(yearStats.avgMonthlyIncome)}
            foot={`Across ${yearStats.activeMonths || 0} active month(s)`} />
          <StatCard label="Average monthly spending" value={money(yearStats.avgMonthlySpending)} />
          <StatCard label="Best month" value={yearStats.bestMonth ? yearStats.bestMonth.label : "—"}
            tone="positive"
            foot={yearStats.bestMonth ? `Saved ${money(yearStats.bestMonth.savings)}` : "No data yet"} />
        </div>

        <div className="list" style={{ marginTop: 18 }}>
          <div className="list-row">
            <span className="grow">Worst month</span>
            <strong className="negative">
              {yearStats.worstMonth
                ? `${yearStats.worstMonth.label} · ${money(yearStats.worstMonth.savings)}`
                : "—"}
            </strong>
          </div>
        </div>
      </Card>

      <Card title={`Monthly breakdown — ${year}`}>
        <MonthlyBarChart series={monthSeries} />
      </Card>

      <div className="grid grid-2">
        <Card title="Savings growth through the year">
          <SavingsGrowthChart series={growth} />
        </Card>
        <Card title="Year-on-year comparison">
          {yearCards.length ? <YearlyComparisonChart years={yearCards} /> : <Empty title="Not enough data yet" />}
        </Card>
      </div>
    </>
  );
}
