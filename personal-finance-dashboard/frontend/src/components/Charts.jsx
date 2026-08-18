import React, { useMemo } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { useTheme } from "../store.jsx";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Filler, Tooltip, Legend
);

const PALETTE = {
  income: "#6366f1",
  expense: "#ef4444",
  savings: "#10b981",
  extra: ["#6366f1", "#22d3ee", "#f59e0b", "#ef4444", "#10b981", "#a855f7"],
};

function useChartTheme() {
  const { theme, currency } = useTheme();
  const dark = theme === "dark";
  const grid = dark ? "rgba(148,163,184,0.16)" : "rgba(16,19,28,0.08)";
  const tick = dark ? "#94a3b8" : "#6b7280";

  return useMemo(
    () => ({
      dark,
      base: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { color: tick, usePointStyle: true, boxWidth: 8, padding: 16 } },
          tooltip: {
            backgroundColor: dark ? "#1a2338" : "#10131c",
            padding: 12,
            cornerRadius: 10,
            titleColor: "#fff",
            bodyColor: "#e5e7eb",
            callbacks: {
              label: (ctx) =>
                ` ${ctx.dataset.label || ctx.label}: ${currency}${Number(
                  ctx.parsed.y ?? ctx.parsed
                ).toLocaleString()}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: tick, maxRotation: 0, autoSkipPadding: 16 } },
          y: {
            grid: { color: grid, drawBorder: false },
            ticks: { color: tick, callback: (v) => `${currency}${v}` },
          },
        },
      },
    }),
    [dark, grid, tick, currency]
  );
}

const fade = (hex, alpha) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/** Earnings vs Expenses over time. */
export function EarningsVsExpensesChart({ series }) {
  const { base } = useChartTheme();
  const data = {
    labels: series.map((d) => d.label ?? d.date.slice(5)),
    datasets: [
      {
        label: "Earnings",
        data: series.map((d) => d.earnings),
        borderColor: PALETTE.income,
        backgroundColor: fade(PALETTE.income, 0.16),
        fill: true, tension: 0.35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2,
      },
      {
        label: "Expenses",
        data: series.map((d) => d.expenses),
        borderColor: PALETTE.expense,
        backgroundColor: fade(PALETTE.expense, 0.14),
        fill: true, tension: 0.35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2,
      },
    ],
  };
  return (
    <div className="chart-box">
      <Line data={data} options={base} />
    </div>
  );
}

/** Monthly earnings / expenses bars for one year. */
export function MonthlyBarChart({ series }) {
  const { base } = useChartTheme();
  const data = {
    labels: series.map((m) => m.label),
    datasets: [
      { label: "Earnings", data: series.map((m) => m.earnings), backgroundColor: PALETTE.income, borderRadius: 6, maxBarThickness: 26 },
      { label: "Expenses", data: series.map((m) => m.expenses), backgroundColor: PALETTE.expense, borderRadius: 6, maxBarThickness: 26 },
    ],
  };
  return (
    <div className="chart-box">
      <Bar data={data} options={base} />
    </div>
  );
}

/** Year-over-year comparison. */
export function YearlyComparisonChart({ years }) {
  const { base } = useChartTheme();
  const data = {
    labels: years.map((y) => y.year),
    datasets: [
      { label: "Earnings", data: years.map((y) => y.totalEarnings), backgroundColor: PALETTE.income, borderRadius: 6, maxBarThickness: 44 },
      { label: "Expenses", data: years.map((y) => y.totalExpenses), backgroundColor: PALETTE.expense, borderRadius: 6, maxBarThickness: 44 },
      { label: "Savings", data: years.map((y) => y.savings), backgroundColor: PALETTE.savings, borderRadius: 6, maxBarThickness: 44 },
    ],
  };
  return (
    <div className="chart-box">
      <Bar data={data} options={base} />
    </div>
  );
}

/** Cumulative savings growth. */
export function SavingsGrowthChart({ series }) {
  const { base } = useChartTheme();
  const data = {
    labels: series.map((d) => d.label ?? d.date.slice(5)),
    datasets: [
      {
        label: "Cumulative savings",
        data: series.map((d) => d.cumulative),
        borderColor: PALETTE.savings,
        backgroundColor: fade(PALETTE.savings, 0.18),
        fill: true, tension: 0.35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2,
      },
    ],
  };
  return (
    <div className="chart-box">
      <Line data={data} options={base} />
    </div>
  );
}

/** Spending split by category. */
export function CategoryDoughnut({ totals }) {
  const { base, dark } = useChartTheme();
  const labels = Object.keys(totals);
  const data = {
    labels,
    datasets: [
      {
        data: labels.map((k) => totals[k]),
        backgroundColor: labels.map((_, i) => PALETTE.extra[i % PALETTE.extra.length]),
        borderColor: dark ? "#131a2c" : "#ffffff",
        borderWidth: 3,
      },
    ],
  };
  const options = {
    ...base,
    cutout: "62%",
    scales: {},
    plugins: { ...base.plugins, legend: { ...base.plugins.legend, position: "bottom" } },
  };
  return (
    <div className="chart-box">
      {labels.length ? <Doughnut data={data} options={options} /> : <div className="empty">No spending yet</div>}
    </div>
  );
}
