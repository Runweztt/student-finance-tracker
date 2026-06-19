// all app data lives here. anything that needs data calls getState(),
// anything that changes data calls setState()

import { loadFromStorage, saveToStorage } from './storage.js';

const storageKey = 'sft:v1';

const defaultCats = ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'];

const defaultState = {
  transactions: [],
  settings: {
    baseCurrency: 'USD',
    rates: { EUR: 0.92, RWF: 1450 },
    budgetCap: 0,
    initialBalance: 0,
    categories: [...defaultCats],
  },
  ui: {
    activeSection: 'dashboard',
    sort: { field: 'date', direction: 'desc' },
    search: { query: '', caseSensitive: false },
    filterCategory: '',
    editingId: null,
  },
};

let _state = structuredClone(defaultState);
const _listeners = new Set();

export function getState() {
  return _state;
}

export function setState(partial) {
  _state = deepMerge(_state, partial);
  // don't bother persisting ui state, it resets fine on reload
  saveToStorage(storageKey, {
    transactions: _state.transactions,
    settings: _state.settings,
  });
  _listeners.forEach(fn => fn(_state));
}

export function subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function initState() {
  const stored = loadFromStorage(storageKey);
  if (!stored || typeof stored !== 'object') return;

  _state = {
    ...defaultState,
    // older records didn't have a type field, default them to expense
    transactions: Array.isArray(stored.transactions)
      ? stored.transactions.map(t => ({ type: 'expense', ...t }))
      : [],
    settings: {
      ...defaultState.settings,
      ...(stored.settings && typeof stored.settings === 'object' ? stored.settings : {}),
      categories: Array.isArray(stored.settings?.categories)
        ? stored.settings.categories
        : [...defaultCats],
    },
    ui: { ...defaultState.ui },
  };
}

export function generateId() {
  return `txn_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// merges nested objects instead of replacing them whole
// so setState({ ui: { sort: x } }) doesn't wipe ui.search
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv !== null && typeof sv === 'object' && !Array.isArray(sv) &&
      typeof tv === 'object' && tv !== null && !Array.isArray(tv)
    ) {
      result[key] = deepMerge(tv, sv);
    } else {
      result[key] = sv;
    }
  }
  return result;
}
