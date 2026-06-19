import { getState, setState } from './state.js';
import { computeStats, computeBreakdown, computeTrend } from './stats.js';
import { highlight, compileRegex, filterTransactions, sortTransactions } from './search.js';
import { formatCurrency, getCurrencySymbol } from './settings.js';

export function announce(message) {
  liveUpdate('status-region', message);
}

export function announceAlert(message) {
  liveUpdate('alert-region', message);
}

function liveUpdate(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  // clear first so screen readers re-announce even if the text hasn't changed
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = message; });
}

const toastTimers = new Map();

export function showToast(message, type = 'default', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast${type !== 'default' ? ` toast--${type}` : ''}`;
  toast.setAttribute('role', 'status');

  const msg = document.createElement('span');
  msg.className = 'toast-message';
  msg.textContent = message;

  const close = document.createElement('button');
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'Dismiss');
  close.innerHTML = '&times;';
  close.addEventListener('click', () => dismissToast(toast));

  toast.append(msg, close);
  container.appendChild(toast);

  if (duration > 0) {
    toastTimers.set(toast, setTimeout(() => dismissToast(toast), duration));
  }
}

function dismissToast(toast) {
  clearTimeout(toastTimers.get(toast));
  toastTimers.delete(toast);
  toast.classList.add('removing');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
  setTimeout(() => toast.isConnected && toast.remove(), 400);
}

export function renderStats(state) {
  const { transactions, settings } = state;
  const s = computeStats(transactions, settings);

  const balCard = document.getElementById('stat-balance-card');
  const balVal = document.getElementById('stat-balance');
  const balSub = document.getElementById('stat-balance-sub');

  if (balVal) balVal.textContent = formatCurrency(s.currentBalance, settings);
  if (balSub) {
    if (s.capExceeded) {
      balSub.textContent = `Over cap by ${formatCurrency(Math.abs(s.capRemaining), settings)}`;
    } else if (s.capRemaining !== null) {
      balSub.textContent = `${formatCurrency(s.capRemaining, settings)} below cap`;
    } else if (s.initialBalance > 0) {
      // show this so users understand why balance > just their income
      balSub.textContent = `Includes ${formatCurrency(s.initialBalance, settings)} starting balance`;
    } else {
      balSub.textContent = s.currentBalance >= 0 ? 'Your balance' : 'In the red';
    }
  }
  if (balCard) {
    balCard.classList.toggle('stat-card--positive', s.currentBalance >= 0 && !s.capExceeded);
    balCard.classList.toggle('stat-card--over-budget', s.capExceeded || s.currentBalance < 0);
  }

  setText('stat-income', formatCurrency(s.totalIncome, settings));
  setText('stat-expense', formatCurrency(s.totalExpenses, settings));
  setText('stat-savings', formatCurrency(s.totalSavings, settings));

  // two separate live regions because aria-live can't be changed dynamically
  const polite = document.getElementById('budget-polite');
  const assertive = document.getElementById('budget-assertive');
  if (polite && assertive) {
    if (s.capRemaining === null) {
      polite.textContent = assertive.textContent = '';
    } else if (s.capExceeded) {
      polite.textContent = '';
      assertive.textContent = `Budget exceeded by ${formatCurrency(Math.abs(s.capRemaining), settings)}`;
    } else {
      assertive.textContent = '';
      polite.textContent = `${formatCurrency(s.capRemaining, settings)} remaining in budget`;
    }
  }

  const symbol = getCurrencySymbol(settings);
  document.querySelectorAll('.currency-symbol').forEach(el => { el.textContent = symbol; });
}

export function renderChart(state) {
  const { transactions, settings } = state;
  const trend = computeTrend(transactions, 7);
  const chartEl = document.getElementById('bar-chart');
  if (!chartEl) return;

  const maxTotal = Math.max(...trend.map(d => d.total), 0.01);

  chartEl.innerHTML = '';
  trend.forEach(day => {
    const pct = Math.round((day.total / maxTotal) * 100);
    const item = document.createElement('div');
    item.className = 'bar-chart-item';

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.dataset.zero = day.total === 0 ? 'true' : 'false';
    bar.title = `${day.date}: ${formatCurrency(day.total, settings)}`;
    bar.style.height = '0px';

    if (day.total > 0) {
      const val = document.createElement('span');
      val.className = 'bar-value';
      val.textContent = formatCurrency(day.total, settings);
      item.appendChild(val);
    }

    item.appendChild(bar);
    chartEl.appendChild(item);

    // two rAFs so the browser paints height:0 before the CSS transition kicks in
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bar.style.height = `${pct}%`;
    }));
  });

  const labelsEl = document.getElementById('chart-labels');
  if (labelsEl) {
    labelsEl.innerHTML = '';
    trend.forEach(day => {
      const span = document.createElement('span');
      span.className = 'chart-label';
      span.textContent = day.label;
      labelsEl.appendChild(span);
    });
  }

  // accessible table hidden from view so screen readers can still read the chart
  const tbody = document.getElementById('chart-data-body');
  if (tbody) {
    tbody.innerHTML = '';
    trend.forEach(day => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${day.date}</td><td>${formatCurrency(day.total, settings)}</td>`;
      tbody.appendChild(tr);
    });
  }
}

export function renderBreakdown(state) {
  const { transactions, settings } = state;
  const breakdown = computeBreakdown(transactions);
  const listEl = document.getElementById('breakdown-list');
  if (!listEl) return;

  if (!breakdown.length) {
    listEl.innerHTML = '<p class="breakdown-empty">Nothing to show yet.</p>';
    return;
  }

  listEl.innerHTML = '';
  breakdown.forEach(item => {
    const row = document.createElement('div');
    row.className = 'breakdown-item';
    row.setAttribute('role', 'listitem');

    const nameEl = document.createElement('span');
    nameEl.className = 'breakdown-name';
    nameEl.textContent = item.category;

    const barWrap = document.createElement('div');
    barWrap.className = 'breakdown-bar-wrap';
    barWrap.setAttribute('aria-hidden', 'true');

    const bar = document.createElement('div');
    bar.className = 'breakdown-bar';
    bar.style.width = '0%';
    barWrap.appendChild(bar);

    const amtEl = document.createElement('span');
    amtEl.className = 'breakdown-amount';
    amtEl.textContent = formatCurrency(item.total, settings);

    const pctEl = document.createElement('span');
    pctEl.className = 'breakdown-pct';
    pctEl.setAttribute('aria-label', `${item.percentage.toFixed(1)} percent`);
    pctEl.textContent = `${item.percentage.toFixed(1)}%`;

    row.append(nameEl, barWrap, amtEl, pctEl);
    listEl.appendChild(row);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      bar.style.width = `${item.percentage}%`;
    }));
  });
}

export function renderTable(state) {
  const { transactions, settings, ui } = state;
  const { sort, search, filterCategory } = ui;

  const tbody = document.getElementById('transactions-tbody');
  const emptyState = document.getElementById('empty-state');
  const countLabel = document.getElementById('transactions-count-label');
  const statusEl = document.getElementById('search-status');

  if (!tbody) return;

  const re = compileRegex(search.query, search.caseSensitive);
  const badRegex = search.query && !re;

  const filtered = filterTransactions(transactions, re, filterCategory);
  const sorted = sortTransactions(filtered, sort.field, sort.direction);

  document.querySelectorAll('.sort-btn').forEach(btn => {
    const active = btn.dataset.sort === sort.field;
    btn.setAttribute('aria-sort', active
      ? (sort.direction === 'asc' ? 'ascending' : 'descending')
      : 'none'
    );
    btn.querySelector('.sort-icon').textContent = active
      ? (sort.direction === 'asc' ? '↑' : '↓')
      : '↕';
  });

  if (countLabel) {
    const total = transactions.length;
    countLabel.textContent = filtered.length < total
      ? `${filtered.length} of ${total} record${total !== 1 ? 's' : ''}`
      : `${total} record${total !== 1 ? 's' : ''}`;
  }

  if (statusEl) {
    if (badRegex) {
      statusEl.textContent = '⚠ Invalid regex pattern';
      statusEl.style.color = 'var(--color-error)';
    } else if (search.query && !filtered.length) {
      statusEl.textContent = 'No matches found';
      statusEl.style.color = 'var(--color-text-secondary)';
    } else if (search.query) {
      statusEl.textContent = `${filtered.length} match${filtered.length !== 1 ? 'es' : ''}`;
      statusEl.style.color = 'var(--color-interactive)';
    } else {
      statusEl.textContent = '';
    }
  }

  if (emptyState) {
    if (!transactions.length) {
      emptyState.removeAttribute('hidden');
      tbody.innerHTML = '';
      return;
    }
    emptyState.setAttribute('hidden', '');
  }

  tbody.innerHTML = '';

  if (!sorted.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" style="text-align:center;padding:var(--space-8) var(--space-4);color:var(--color-text-secondary);font-size:var(--text-sm)">Nothing matched your search.</td>`;
    tbody.appendChild(tr);
    return;
  }

  sorted.forEach(t => tbody.appendChild(buildRow(t, re, settings)));
}

const knownCats = ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'];

function buildRow(t, re, settings) {
  const tr = document.createElement('tr');
  tr.dataset.id = t.id;

  const dateTd = Object.assign(document.createElement('td'), { className: 'cell-date', textContent: t.date });
  dateTd.setAttribute('data-label', 'Date');

  const descTd = document.createElement('td');
  descTd.className = 'cell-description';
  descTd.setAttribute('data-label', 'Description');
  descTd.innerHTML = highlight(t.description, re);

  const catTd = document.createElement('td');
  catTd.setAttribute('data-label', 'Type / Category');
  const typeBadge = document.createElement('span');
  typeBadge.className = `txn-type-badge txn-type-badge--${t.type ?? 'expense'}`;
  typeBadge.textContent = t.type === 'income' ? '↑ In' : t.type === 'savings' ? '🏦' : '↓ Out';
  const catBadge = document.createElement('span');
  catBadge.className = knownCats.includes(t.category)
    ? `category-badge category-badge--${t.category}`
    : 'category-badge category-badge--default';
  catBadge.textContent = t.category;
  catTd.style.cssText = 'display:flex;gap:0.375rem;align-items:center;flex-wrap:wrap';
  catTd.append(typeBadge, catBadge);

  const prefix = t.type === 'income' ? '+' : t.type === 'savings' ? '🏦 ' : '−';
  const amtTd = Object.assign(document.createElement('td'), {
    className: `cell-amount${t.type === 'income' ? ' cell-amount--income' : t.type === 'savings' ? ' cell-amount--savings' : ''}`,
    textContent: prefix + formatCurrency(t.amount, settings),
  });
  amtTd.setAttribute('data-label', 'Amount');

  const actionsTd = document.createElement('td');
  actionsTd.setAttribute('data-label', 'Actions');
  actionsTd.className = 'row-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-icon';
  editBtn.dataset.action = 'edit';
  editBtn.dataset.id = t.id;
  editBtn.setAttribute('aria-label', `Edit: ${t.description}`);
  editBtn.title = 'Edit';
  editBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  actionsTd.appendChild(editBtn);

  // savings are permanent by design — no delete button
  if (t.type !== 'savings') {
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-icon btn-icon--danger';
    delBtn.dataset.action = 'delete';
    delBtn.dataset.id = t.id;
    delBtn.setAttribute('aria-label', `Delete: ${t.description}`);
    delBtn.title = 'Delete';
    delBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    actionsTd.appendChild(delBtn);
  }

  tr.append(dateTd, descTd, catTd, amtTd, actionsTd);
  return tr;
}

const panelInfo = {
  income:  { icon: '↑', label: 'Money In',  emptyMsg: 'Nothing here yet. Tap "+ In" to add income.' },
  expense: { icon: '↓', label: 'Money Out', emptyMsg: 'Nothing here yet. Tap "- Out" to add an expense.' },
  savings: { icon: '🏦', label: 'Savings',  emptyMsg: 'Nothing here yet. Tap "Save" to put money away.' },
};

export function renderExpenses(state) {
  const { transactions, settings } = state;
  const panels = document.getElementById('fin-panels');
  if (!panels) return;

  const income = transactions.filter(t => t.type === 'income');
  const expense = transactions.filter(t => t.type === 'expense');
  const savings = transactions.filter(t => t.type === 'savings');

  const r2 = n => Math.round(n * 100) / 100;
  const totalIncome = r2(income.reduce((s, t) => s + t.amount, 0));
  const totalExpense = r2(expense.reduce((s, t) => s + t.amount, 0));
  const totalSavings = r2(savings.reduce((s, t) => s + t.amount, 0));
  const balance = r2((Number(settings.initialBalance) || 0) + totalIncome - totalExpense);

  setText('fin-balance', formatCurrency(balance, settings));
  setText('fin-income', formatCurrency(totalIncome, settings));
  setText('fin-expense', formatCurrency(totalExpense, settings));
  setText('fin-savings', formatCurrency(totalSavings, settings));

  const balEl = document.getElementById('fin-balance');
  if (balEl) {
    balEl.className = 'fin-summary-value' + (balance < 0 ? ' fin-summary-value--negative' : ' fin-summary-value--positive');
  }

  const initBal = Number(settings.initialBalance) || 0;
  const finBalLabel = document.querySelector('.fin-summary-item--balance .fin-summary-label');
  if (finBalLabel) {
    finBalLabel.textContent = initBal > 0
      ? `Balance (incl. ${formatCurrency(initBal, settings)} starting)`
      : 'Balance';
  }

  panels.innerHTML = '';
  panels.appendChild(makeFinPanel('income', income, totalIncome, settings));
  panels.appendChild(makeFinPanel('expense', expense, totalExpense, settings));
  panels.appendChild(makeFinPanel('savings', savings, totalSavings, settings));
}

function makeFinPanel(type, txns, total, settings) {
  const meta = panelInfo[type];
  const panel = document.createElement('div');
  panel.className = `fin-panel fin-panel--${type}`;

  const header = document.createElement('div');
  header.className = 'fin-panel-header';

  const titleEl = document.createElement('span');
  titleEl.className = 'fin-panel-title';
  titleEl.textContent = `${meta.icon} ${meta.label}`;

  const countEl = document.createElement('span');
  countEl.className = 'fin-panel-count';
  countEl.textContent = txns.length
    ? `${txns.length} item${txns.length !== 1 ? 's' : ''} · ${formatCurrency(total, settings)}`
    : '—';

  header.append(titleEl, countEl);
  panel.appendChild(header);

  const body = document.createElement('div');
  body.className = 'fin-panel-body';

  if (!txns.length) {
    const empty = document.createElement('p');
    empty.className = 'fin-panel-empty';
    empty.textContent = meta.emptyMsg;
    body.appendChild(empty);
    panel.appendChild(body);
    return panel;
  }

  const groups = {};
  txns.forEach(t => {
    if (!groups[t.category]) groups[t.category] = { total: 0, txns: [] };
    groups[t.category].total += t.amount;
    groups[t.category].txns.push(t);
  });

  Object.entries(groups)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([cat, group]) => {
      const pct = total > 0 ? (group.total / total) * 100 : 0;
      const rows = [...group.txns].sort((a, b) => b.date.localeCompare(a.date));
      body.appendChild(makeCatGroup(cat, group.total, pct, rows, type, settings));
    });

  panel.appendChild(body);
  return panel;
}

function makeCatGroup(category, total, pct, txns, type, settings) {
  const slug = knownCats.includes(category) ? category : 'default';
  const group = document.createElement('div');
  group.className = 'expense-cat-group';

  const header = document.createElement('button');
  header.className = 'expense-cat-header';
  header.setAttribute('aria-expanded', 'true');
  header.setAttribute('type', 'button');

  const badge = document.createElement('span');
  badge.className = `category-badge category-badge--${slug}`;
  badge.textContent = category;
  badge.setAttribute('aria-hidden', 'true');

  const meta = document.createElement('span');
  meta.className = 'expense-cat-meta';

  const countEl = document.createElement('span');
  countEl.className = 'expense-cat-count';
  countEl.textContent = `${txns.length}×`;

  const barWrap = document.createElement('span');
  barWrap.className = 'expense-cat-bar-wrap';
  barWrap.setAttribute('aria-hidden', 'true');
  const bar = document.createElement('span');
  bar.className = `expense-cat-bar expense-cat-bar--${type}`;
  bar.style.width = '0%';
  barWrap.appendChild(bar);

  const pctEl = document.createElement('span');
  pctEl.className = 'expense-cat-pct';
  pctEl.textContent = `${pct.toFixed(0)}%`;

  meta.append(countEl, barWrap, pctEl);

  const amtEl = document.createElement('span');
  amtEl.className = 'expense-cat-amount';
  amtEl.textContent = formatCurrency(total, settings);

  const chevron = document.createElement('span');
  chevron.className = 'expense-cat-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  header.append(badge, meta, amtEl, chevron);

  const txnList = document.createElement('div');
  txnList.className = 'expense-cat-txns';

  txns.forEach(t => {
    const row = document.createElement('div');
    row.className = 'expense-txn-row';

    const dateEl = document.createElement('span');
    dateEl.className = 'expense-txn-date';
    dateEl.textContent = t.date;

    const descEl = document.createElement('span');
    descEl.className = 'expense-txn-desc';
    descEl.textContent = t.description;

    const amtTxn = document.createElement('span');
    amtTxn.className = `expense-txn-amt expense-txn-amt--${type}`;
    amtTxn.textContent = formatCurrency(t.amount, settings);

    const actions = document.createElement('span');
    actions.className = 'expense-txn-actions';

    if (type !== 'savings') {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-icon btn-icon--danger btn-icon--xs';
      delBtn.dataset.action = 'delete';
      delBtn.dataset.id = t.id;
      delBtn.setAttribute('aria-label', `Delete: ${t.description}`);
      delBtn.title = 'Remove';
      delBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        const s = getState();
        setState({ transactions: s.transactions.filter(tx => tx.id !== t.id) });
        const next = getState();
        renderExpenses(next);
        renderStats(next);
        renderChart(next);
        renderBreakdown(next);
        renderTable(next);
        showToast(`"${t.description}" removed.`);
      });
      actions.appendChild(delBtn);
    }

    row.append(dateEl, descEl, amtTxn, actions);
    txnList.appendChild(row);
  });

  header.addEventListener('click', () => {
    const expanded = header.getAttribute('aria-expanded') === 'true';
    header.setAttribute('aria-expanded', String(!expanded));
    txnList.hidden = expanded;
    chevron.classList.toggle('expense-cat-chevron--up', !expanded);
  });

  group.append(header, txnList);
  requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = `${pct}%`; }));
  return group;
}

let lastFocus = null;

export function openModal(id, trigger = null) {
  const modal = document.getElementById(id);
  if (!modal) return;
  lastFocus = trigger || document.activeElement;
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    focusableIn(modal)[0]?.focus();
  });
  modal.addEventListener('keydown', trapFocus);
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
  modal.removeEventListener('keydown', trapFocus);
  lastFocus?.focus();
  lastFocus = null;
}

function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const els = focusableIn(e.currentTarget);
  const first = els[0];
  const last = els.at(-1);
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last?.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first?.focus();
  }
}

export function focusableElements(container) {
  return focusableIn(container);
}

function focusableIn(container) {
  return Array.from(container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ));
}

export function setFieldError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

export function markInputValidity(input, isValid) {
  if (!input) return;
  input.classList.toggle('invalid', !isValid);
  input.classList.toggle('valid', isValid);
  input.setAttribute('aria-invalid', String(!isValid));
}

export function navigateTo(sectionId) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const active = btn.dataset.section === sectionId;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('.app-section').forEach(section => {
    const active = section.id === `section-${sectionId}`;
    section.classList.toggle('active', active);
    section.setAttribute('aria-hidden', String(!active));
  });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
