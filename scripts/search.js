// compiles the search input into a regex, returns null if empty or invalid
export function compileRegex(input, caseSensitive = false) {
  if (!input || !input.trim()) return null;
  try {
    return new RegExp(input, caseSensitive ? 'g' : 'gi');
  } catch (_) {
    return null;
  }
}

// used to show a warning icon without crashing when someone types a bad pattern
export function isValidRegex(input) {
  if (!input) return true;
  try { new RegExp(input); return true; }
  catch (_) { return false; }
}

// wraps matches in <mark> — escape the text first so XSS isn't possible
export function highlight(text, re) {
  const escaped = escapeHtml(text);
  if (!re) return escaped;
  re.lastIndex = 0;
  return escaped.replace(re, m => `<mark>${m}</mark>`);
}

export function filterTransactions(transactions, re, categoryFilter = '') {
  return transactions.filter(t => {
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (re) {
      re.lastIndex = 0;
      // join all fields so one search box covers description, category, amount, date
      const blob = [t.description, t.category, String(t.amount), t.date].join(' ');
      if (!re.test(blob)) return false;
    }
    return true;
  });
}

export function sortTransactions(transactions, field, direction) {
  return [...transactions].sort((a, b) => {
    if (field === 'amount') {
      const diff = Number(a.amount) - Number(b.amount);
      return direction === 'asc' ? diff : -diff;
    }
    if (field === 'date') {
      return direction === 'asc'
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date);
    }
    return direction === 'asc'
      ? a[field].localeCompare(b[field], undefined, { sensitivity: 'base' })
      : b[field].localeCompare(a[field], undefined, { sensitivity: 'base' });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
