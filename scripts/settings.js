// currency formatting, settings form, and category management
import { getState, setState } from './state.js';
import { validateCategoryName } from './validators.js';

const currencies = {
  USD: { symbol: '$',   locale: 'en-US', code: 'USD' },
  EUR: { symbol: '€',   locale: 'de-DE', code: 'EUR' },
  RWF: { symbol: 'FRw', locale: 'rw-RW', code: 'RWF' },
};

const defaultCats = ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'];

// amounts are stored as USD; EUR and RWF are converted using user-set rates
export function formatCurrency(amount, settings) {
  const { baseCurrency = 'USD', rates = {} } = settings;
  const meta = currencies[baseCurrency] || currencies.USD;
  const converted =
    baseCurrency === 'RWF' ? amount * (Number(rates.RWF) || 1450) :
    baseCurrency === 'EUR' ? amount * (Number(rates.EUR) || 0.92)  :
    amount;

  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: meta.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  } catch (_) {
    return `${meta.symbol}${converted.toFixed(2)}`;
  }
}

export function getCurrencySymbol(settings) {
  return (currencies[settings.baseCurrency] || currencies.USD).symbol;
}

// called every time the settings tab is opened
export function populateSettingsForm() {
  const { settings } = getState();

  document.querySelectorAll('input[name="base-currency"]').forEach(r => {
    r.checked = r.value === settings.baseCurrency;
  });

  const rateEur = document.getElementById('rate-eur');
  const rateRwf = document.getElementById('rate-rwf');
  if (rateEur) rateEur.value = settings.rates.EUR ?? 0.92;
  if (rateRwf) rateRwf.value = settings.rates.RWF ?? 1450;

  const toDisplay = n => {
    if (settings.baseCurrency === 'RWF') return Math.round(n * (Number(settings.rates?.RWF) || 1450) * 100) / 100;
    if (settings.baseCurrency === 'EUR') return Math.round(n * (Number(settings.rates?.EUR) || 0.92)  * 100) / 100;
    return n;
  };

  const capInput = document.getElementById('budget-cap');
  if (capInput) capInput.value = settings.budgetCap > 0 ? toDisplay(settings.budgetCap) : '';

  const balInput = document.getElementById('initial-balance');
  if (balInput) balInput.value = settings.initialBalance > 0 ? toDisplay(settings.initialBalance) : '';

  updateCurrencySymbols(settings);
  renderCategoriesList(settings.categories);
}

export function saveSettingsFromForm() {
  const state  = getState();
  const picked = document.querySelector('input[name="base-currency"]:checked');

  const baseCurrency   = picked?.value ?? state.settings.baseCurrency;
  const rateEUR        = parseFloat(document.getElementById('rate-eur')?.value) || state.settings.rates.EUR;
  const rateRWF        = parseFloat(document.getElementById('rate-rwf')?.value) || state.settings.rates.RWF;
  const rawCap         = parseFloat(document.getElementById('budget-cap')?.value)      || 0;
  const rawBal         = parseFloat(document.getElementById('initial-balance')?.value) || 0;
  const fromDisplay    = n => {
    if (baseCurrency === 'RWF') return Math.round((n / rateRWF) * 100) / 100;
    if (baseCurrency === 'EUR') return Math.round((n / rateEUR) * 100) / 100;
    return n;
  };
  const budgetCap      = fromDisplay(rawCap);
  const initialBalance = fromDisplay(rawBal);

  setState({
    settings: { ...state.settings, baseCurrency, rates: { EUR: rateEUR, RWF: rateRWF }, budgetCap, initialBalance },
  });

  updateCurrencySymbols(getState().settings);
  return { success: true, message: 'Settings saved.' };
}

export function resetSettings() {
  setState({
    settings: {
      baseCurrency: 'USD',
      rates: { EUR: 0.92, RWF: 1450 },
      budgetCap: 0,
      initialBalance: 0,
      categories: [...defaultCats],
    },
  });
  populateSettingsForm();
}

// built-in categories get a different style and no × button
export function renderCategoriesList(categories) {
  const list = document.getElementById('categories-list');
  if (!list) return;

  list.innerHTML = '';
  categories.forEach(cat => {
    const isDefault = defaultCats.includes(cat);
    const tag       = document.createElement('div');
    tag.className   = `category-tag${isDefault ? ' category-tag--default' : ''}`;
    tag.setAttribute('role', 'listitem');

    const label = document.createElement('span');
    label.textContent = cat;
    tag.appendChild(label);

    if (!isDefault) {
      const btn = document.createElement('button');
      btn.type  = 'button';
      btn.className = 'category-tag__remove';
      btn.setAttribute('aria-label', `Remove ${cat}`);
      btn.textContent = '×';
      btn.addEventListener('click', () => removeCategory(cat));
      tag.appendChild(btn);
    }

    list.appendChild(tag);
  });
}

export function addCategoryFromInput() {
  const input   = document.getElementById('new-category-input');
  const errorEl = document.getElementById('new-category-error');
  if (!input || !errorEl) return { success: false, message: 'Form not found.' };

  const { settings } = getState();
  const result = validateCategoryName(input.value.trim(), settings.categories);

  if (!result.valid) {
    errorEl.textContent = result.message;
    input.setAttribute('aria-invalid', 'true');
    input.classList.add('invalid');
    return { success: false, message: result.message };
  }

  const cats = [...settings.categories, input.value.trim()];
  setState({ settings: { ...settings, categories: cats } });

  errorEl.textContent = '';
  input.removeAttribute('aria-invalid');
  input.classList.remove('invalid');
  input.value = '';
  input.focus();

  renderCategoriesList(cats);
  syncCategorySelects(cats);

  return { success: true, message: `Category "${cats.at(-1)}" added.` };
}

// built-in categories silently do nothing if you try to delete them
export function removeCategory(category) {
  if (defaultCats.includes(category)) return;
  const { settings } = getState();
  const cats = settings.categories.filter(c => c !== category);
  setState({ settings: { ...settings, categories: cats } });
  renderCategoriesList(cats);
  syncCategorySelects(cats);
}

// rebuild custom options in the category selects without touching the built-in ones
export function syncCategorySelects(categories) {
  document.querySelectorAll('#field-category, #filter-category').forEach(select => {
    const prev = select.value;
    Array.from(select.options).forEach(opt => {
      if (opt.value && !defaultCats.includes(opt.value)) opt.remove();
    });
    categories.filter(c => !defaultCats.includes(c)).forEach(c => {
      if (!select.querySelector(`option[value="${c}"]`)) {
        select.appendChild(new Option(c, c));
      }
    });
    if (prev && categories.includes(prev)) select.value = prev;
  });
}

function updateCurrencySymbols(settings) {
  const symbol = getCurrencySymbol(settings);
  document.querySelectorAll('.currency-symbol').forEach(el => { el.textContent = symbol; });
}
