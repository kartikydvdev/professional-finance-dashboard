/* All financial maths lives here so pages stay presentational. */

export const todayISO = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local
export const monthOf = (iso) => iso.slice(0, 7);
export const yearOf = (iso) => iso.slice(0, 4);

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const monthLabel = (ym) => {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
};

export const sum = (rows) => rows.reduce((t, r) => t + Number(r.amount || 0), 0);

const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Start (Monday) of the ISO week containing `iso`. */
export function startOfWeek(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toLocaleDateString("en-CA");
}

/** Group rows by a key function into { key: total }. */
export function totalsBy(rows, keyFn) {
  const out = {};
  for (const r of rows) {
    const k = keyFn(r);
    out[k] = (out[k] || 0) + Number(r.amount || 0);
  }
  return out;
}

const extreme = (map, pick) => {
  const entries = Object.entries(map);
  if (!entries.length) return null;
  return entries.reduce((best, cur) => (pick(cur[1], best[1]) ? cur : best));
};

export const highest = (map) => {
  const e = extreme(map, (a, b) => a > b);
  return e ? { key: e[0], value: e[1] } : null;
};
export const lowest = (map) => {
  const e = extreme(map, (a, b) => a < b);
  return e ? { key: e[0], value: e[1] } : null;
};

/* --------------------------------------------------------- headline cards */

export function headlineTotals(earnings, expenses, today = todayISO()) {
  const month = monthOf(today);
  const year = yearOf(today);
  const week = startOfWeek(today);

  const totalEarnings = sum(earnings);
  const totalExpenses = sum(expenses);

  return {
    totalEarnings,
    totalExpenses,
    netSavings: totalEarnings - totalExpenses,
    todayEarnings: sum(earnings.filter((r) => r.date === today)),
    todayExpenses: sum(expenses.filter((r) => r.date === today)),
    weekEarnings: sum(earnings.filter((r) => r.date >= week && r.date <= today)),
    weekExpenses: sum(expenses.filter((r) => r.date >= week && r.date <= today)),
    monthEarnings: sum(earnings.filter((r) => monthOf(r.date) === month)),
    monthExpenses: sum(expenses.filter((r) => monthOf(r.date) === month)),
    yearEarnings: sum(earnings.filter((r) => yearOf(r.date) === year)),
    yearExpenses: sum(expenses.filter((r) => yearOf(r.date) === year)),
  };
}

/* ------------------------------------------------------------ daily view */

export function dailyAnalysis(earnings, expenses, date) {
  const dayEarnings = earnings.filter((r) => r.date === date);
  const dayExpenses = expenses.filter((r) => r.date === date);
  const income = sum(dayEarnings);
  const spend = sum(dayExpenses);
  return {
    date,
    earnings: dayEarnings,
    expenses: dayExpenses,
    totalEarnings: income,
    totalExpenses: spend,
    net: income - spend,
  };
}

/** Continuous per-day series between the first and last entry (or a window). */
export function dailySeries(earnings, expenses, days = 30, endDate = todayISO()) {
  const byDayE = totalsBy(earnings, (r) => r.date);
  const byDayX = totalsBy(expenses, (r) => r.date);
  const out = [];
  const end = new Date(`${endDate}T00:00:00`);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const iso = d.toLocaleDateString("en-CA");
    const income = byDayE[iso] || 0;
    const spend = byDayX[iso] || 0;
    out.push({ date: iso, earnings: income, expenses: spend, net: income - spend });
  }
  return out;
}

/* ---------------------------------------------------------- monthly view */

export function monthlyAnalysis(earnings, expenses, month) {
  const inMonth = (r) => monthOf(r.date) === month;
  const me = earnings.filter(inMonth);
  const mx = expenses.filter(inMonth);
  const prev = shiftMonth(month, -1);
  const pe = sum(earnings.filter((r) => monthOf(r.date) === prev));
  const px = sum(expenses.filter((r) => monthOf(r.date) === prev));

  const totalEarnings = sum(me);
  const totalExpenses = sum(mx);
  const prevSavings = pe - px;
  const savings = totalEarnings - totalExpenses;

  return {
    month,
    label: monthLabel(month),
    totalEarnings,
    totalExpenses,
    savings,
    previous: { month: prev, label: monthLabel(prev), earnings: pe, expenses: px, savings: prevSavings },
    change: {
      earnings: pe ? ((totalEarnings - pe) / pe) * 100 : null,
      expenses: px ? ((totalExpenses - px) / px) * 100 : null,
      savings: prevSavings ? ((savings - prevSavings) / Math.abs(prevSavings)) * 100 : null,
    },
    highestEarningDay: highest(totalsBy(me, (r) => r.date)),
    highestExpenseDay: highest(totalsBy(mx, (r) => r.date)),
    byCategoryEarnings: totalsBy(me, (r) => r.category),
    byCategoryExpenses: totalsBy(mx, (r) => r.category),
    entries: me.length + mx.length,
  };
}

/** Per-month series for a year: [{ month, label, earnings, expenses, savings }] */
export function monthlySeries(earnings, expenses, year) {
  return Array.from({ length: 12 }, (_, i) => {
    const ym = `${year}-${String(i + 1).padStart(2, "0")}`;
    const income = sum(earnings.filter((r) => monthOf(r.date) === ym));
    const spend = sum(expenses.filter((r) => monthOf(r.date) === ym));
    return { month: ym, label: MONTH_NAMES[i].slice(0, 3), earnings: income, expenses: spend, savings: income - spend };
  });
}

/* ----------------------------------------------------------- yearly view */

export function yearlyAnalysis(earnings, expenses, year) {
  const ye = earnings.filter((r) => yearOf(r.date) === year);
  const yx = expenses.filter((r) => yearOf(r.date) === year);
  const series = monthlySeries(earnings, expenses, year);
  const active = series.filter((m) => m.earnings > 0 || m.expenses > 0);

  const totalEarnings = sum(ye);
  const totalExpenses = sum(yx);
  const divisor = active.length || 1;

  const best = active.length
    ? active.reduce((a, b) => (b.savings > a.savings ? b : a))
    : null;
  const worst = active.length
    ? active.reduce((a, b) => (b.savings < a.savings ? b : a))
    : null;

  return {
    year,
    totalEarnings,
    totalExpenses,
    savings: totalEarnings - totalExpenses,
    avgMonthlyIncome: totalEarnings / divisor,
    avgMonthlySpending: totalExpenses / divisor,
    activeMonths: active.length,
    bestMonth: best && { label: monthLabel(best.month), ...best },
    worstMonth: worst && { label: monthLabel(worst.month), ...worst },
    series,
    byCategoryExpenses: totalsBy(yx, (r) => r.category),
    savingsRate: totalEarnings ? ((totalEarnings - totalExpenses) / totalEarnings) * 100 : 0,
  };
}

export function availableYears(earnings, expenses) {
  const set = new Set([...earnings, ...expenses].map((r) => yearOf(r.date)));
  set.add(yearOf(todayISO()));
  return [...set].sort().reverse();
}

/** Cumulative savings growth over the daily series. */
export function savingsGrowth(series) {
  let running = 0;
  return series.map((d) => {
    running += d.net ?? d.savings ?? 0;
    return { ...d, cumulative: running };
  });
}

/** Merge earnings + expenses into ledger rows for the data table. */
export function ledgerRows(earnings, expenses) {
  const rows = [
    ...earnings.map((r) => ({
      key: `e${r.id}`,
      id: r.id,
      kind: "Earning",
      date: r.date,
      time: r.time_of_day,
      category: r.category,
      income: Number(r.amount),
      expense: 0,
      notes: r.note || "",
    })),
    ...expenses.map((r) => ({
      key: `x${r.id}`,
      id: r.id,
      kind: "Expense",
      date: r.date,
      time: "—",
      category: r.category,
      income: 0,
      expense: Number(r.amount),
      notes: r.notes || "",
    })),
  ];
  return rows.map((r) => ({ ...r, net: r.income - r.expense }));
}
