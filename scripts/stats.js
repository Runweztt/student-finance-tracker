// number crunching only — no DOM touches in here

// floating point fix: 0.1 + 0.2 gives 0.30000000000000004 without this
const r2 = n => Math.round(n * 100) / 100;

export function computeStats(transactions, settings) {
  const expenses = transactions.filter(t => t.type === 'expense');
  const income = transactions.filter(t => t.type === 'income');
  const savings = transactions.filter(t => t.type === 'savings');

  const totalExpenses = r2(expenses.reduce((s, t) => s + t.amount, 0));
  const totalIncome = r2(income.reduce((s, t) => s + t.amount, 0));
  const totalSavings = r2(savings.reduce((s, t) => s + t.amount, 0));
  const initialBalance = Number(settings.initialBalance) || 0;
  const currentBalance = r2(initialBalance + totalIncome - totalExpenses);

  const byCategory = groupByCategory(expenses);
  let topCategory = 'None';
  let topCategoryTotal = 0;
  for (const [cat, catTotal] of Object.entries(byCategory)) {
    if (catTotal > topCategoryTotal) {
      topCategoryTotal = catTotal;
      topCategory = cat;
    }
  }

  const cap = Number(settings.budgetCap) || 0;
  const capRemaining = cap > 0 ? cap - totalExpenses : null;

  return {
    count: transactions.length,
    total: totalExpenses,
    totalExpenses,
    totalIncome,
    totalSavings,
    currentBalance,
    initialBalance,
    topCategory,
    topCategoryTotal,
    capRemaining,
    capExceeded: capRemaining !== null && capRemaining < 0,
  };
}

// expenses only — income and savings don't belong in the spending breakdown
export function computeBreakdown(transactions) {
  const expenseTxns = transactions.filter(t => t.type === 'expense');
  if (!expenseTxns.length) return [];

  const grandTotal = r2(expenseTxns.reduce((s, t) => s + t.amount, 0));
  const byCategory = {};

  for (const t of expenseTxns) {
    if (!byCategory[t.category]) byCategory[t.category] = { total: 0, count: 0 };
    byCategory[t.category].total += t.amount;
    byCategory[t.category].count += 1;
  }

  return Object.entries(byCategory)
    .map(([category, { total, count }]) => ({
      category,
      total: r2(total),
      count,
      percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function computeTrend(transactions, days = 7) {
  const expenseTxns = transactions.filter(t => t.type === 'expense');
  const today = new Date();
  const result = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;

    result.push({
      date: dateStr,
      label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      total: r2(expenseTxns.filter(t => t.date === dateStr).reduce((s, t) => s + t.amount, 0)),
    });
  }

  return result;
}

function groupByCategory(transactions) {
  return transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
}
