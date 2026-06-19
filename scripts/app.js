import { initState, getState, setState, generateId } from './state.js';
import { isStorageAvailable } from './storage.js';
import {
  renderStats, renderChart, renderBreakdown, renderTable, renderExpenses,
  showToast, announce, announceAlert,
  openModal, closeModal, setFieldError, markInputValidity, navigateTo,
} from './ui.js';
import {
  validateDescription, validateAmount, validateDate, validateCategory, checkDuplicateWords,
} from './validators.js';
import { isValidRegex } from './search.js';
import { exportJSON, importJSON } from './importExport.js';
import {
  populateSettingsForm, saveSettingsFromForm, resetSettings,
  addCategoryFromInput, syncCategorySelects,
} from './settings.js';

document.addEventListener('DOMContentLoaded', init);

// input is in the selected currency, but we store everything as USD internally
function toUSD(amount, currency, settings) {
  if (currency === 'RWF') return Math.round((amount / (Number(settings.rates?.RWF) || 1450)) * 100) / 100;
  if (currency === 'EUR') return Math.round((amount / (Number(settings.rates?.EUR) || 0.92)) * 100) / 100;
  return amount;
}

function fromUSD(amount, currency, settings) {
  if (currency === 'RWF') return Math.round(amount * (Number(settings.rates?.RWF) || 1450) * 100) / 100;
  if (currency === 'EUR') return Math.round(amount * (Number(settings.rates?.EUR) || 0.92) * 100) / 100;
  return amount;
}

function init() {
  if (!isStorageAvailable()) {
    showToast("localStorage unavailable, data won't be saved.", 'warning', 0);
  }

  initState();

  const { settings } = getState();
  syncCategorySelects(settings.categories);
  populateSettingsForm();

  renderAll();
  setupNavigation();
  setupTable();
  setupTransactionModal();
  setupDeleteModal();
  setupSearch();
  setupImportExport();
  setupSettings();
  setupGlobalKeys();
}

function renderAll() {
  const state = getState();
  renderStats(state);
  renderChart(state);
  renderBreakdown(state);
  renderTable(state);
  renderExpenses(state);
}

function setupNavigation() {
  const navList = document.getElementById('main-nav-list');
  if (!navList) return;

  navList.addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (btn) goTo(btn.dataset.section);
  });

  // bottom nav on mobile — same handler, separate element
  document.querySelector('.bottom-nav')?.addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (btn?.dataset.section) goTo(btn.dataset.section);
  });

  // arrow keys per ARIA tablist spec
  navList.addEventListener('keydown', e => {
    const btns = Array.from(navList.querySelectorAll('.nav-btn'));
    const idx = btns.indexOf(e.target);
    if (idx === -1) return;

    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (dir[e.key] !== undefined) {
      e.preventDefault();
      const next = btns[(idx + dir[e.key] + btns.length) % btns.length];
      next.focus();
      next.click();
    } else if (e.key === 'Home') {
      e.preventDefault(); btns[0].focus(); btns[0].click();
    } else if (e.key === 'End') {
      e.preventDefault(); btns.at(-1).focus(); btns.at(-1).click();
    }
  });
}

function goTo(sectionId) {
  setState({ ui: { ...getState().ui, activeSection: sectionId } });
  navigateTo(sectionId);
  if (sectionId === 'settings') populateSettingsForm();
  announce(`${tabNames[sectionId] ?? sectionId} section`);
}

const tabNames = {
  dashboard: 'Dashboard',
  expenses: 'Finances',
  transactions: 'Transactions',
  settings: 'Settings',
  about: 'About',
};

function setupTable() {
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.sort;
      const { ui } = getState();
      const direction = ui.sort.field === field && ui.sort.direction === 'asc' ? 'desc' : 'asc';
      setState({ ui: { ...ui, sort: { field, direction } } });
      renderTable(getState());
      announce(`Sorted by ${field} ${direction === 'asc' ? 'ascending' : 'descending'}`);
    });
  });

  // event delegation so I don't have to re-attach listeners every time the table re-renders
  document.getElementById('transactions-tbody')?.addEventListener('click', e => {
    const edit = e.target.closest('[data-action="edit"]');
    const del = e.target.closest('[data-action="delete"]');
    if (edit) openEditModal(edit.dataset.id, edit);
    if (del) requestDelete(del.dataset.id, del);
  });

  document.getElementById('btn-add-first')?.addEventListener('click', () => {
    openAddModal(document.getElementById('btn-add-first'));
  });
}

let editingId = null;

function setupTransactionModal() {
  document.getElementById('btn-add-transaction')?.addEventListener('click', e => {
    openAddModal(e.currentTarget, 'expense');
  });

  document.getElementById('btn-add-income')?.addEventListener('click', e => {
    goTo('expenses');
    openAddModal(e.currentTarget, 'income');
  });
  document.getElementById('btn-add-expense')?.addEventListener('click', e => {
    goTo('expenses');
    openAddModal(e.currentTarget, 'expense');
  });
  document.getElementById('btn-add-savings')?.addEventListener('click', e => {
    goTo('expenses');
    openAddModal(e.currentTarget, 'savings');
  });

  document.querySelectorAll('input[name="txn-type"]').forEach(r => {
    r.addEventListener('change', () => updateDescLabel(r.value));
  });

  document.getElementById('modal-close')?.addEventListener('click', closeTransactionModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeTransactionModal);

  document.getElementById('transaction-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeTransactionModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!document.getElementById('transaction-modal')?.hasAttribute('hidden')) closeTransactionModal();
    if (!document.getElementById('delete-modal')?.hasAttribute('hidden')) closeDeleteModal();
  });

  const descInput = document.getElementById('field-description');
  const amtInput = document.getElementById('field-amount');
  const dateInput = document.getElementById('field-date');
  const catSelect = document.getElementById('field-category');
  const dupWarn = document.getElementById('duplicate-word-warning');

  descInput?.addEventListener('input', () => {
    const v = validateDescription(descInput.value);
    markInputValidity(descInput, v.valid);
    setFieldError('description-error', v.valid ? '' : v.message);
    if (dupWarn) dupWarn.hidden = !checkDuplicateWords(descInput.value);
  });

  amtInput?.addEventListener('input', () => {
    const v = validateAmount(amtInput.value);
    markInputValidity(amtInput, !amtInput.value || v.valid);
    setFieldError('amount-error', (amtInput.value && !v.valid) ? v.message : '');
  });

  dateInput?.addEventListener('change', () => {
    const v = validateDate(dateInput.value);
    markInputValidity(dateInput, v.valid);
    setFieldError('date-error', v.valid ? '' : v.message);
  });

  catSelect?.addEventListener('change', () => {
    const v = validateCategory(catSelect.value);
    markInputValidity(catSelect, v.valid);
    setFieldError('category-error', v.valid ? '' : v.message);
  });

  document.getElementById('transaction-form')?.addEventListener('submit', e => {
    e.preventDefault();
    submitTransaction();
  });
}

function openAddModal(trigger, defaultType = 'expense') {
  editingId = null;
  resetForm();
  setModalType(defaultType);
  document.getElementById('modal-heading').textContent = 'Add Transaction';
  document.getElementById('modal-submit').textContent = 'Add';

  const dateInput = document.getElementById('field-date');
  if (dateInput && !dateInput.value) dateInput.value = todayISO();

  const currencyEl = document.getElementById('field-currency');
  if (currencyEl) currencyEl.value = getState().settings.baseCurrency;

  openModal('transaction-modal', trigger);
}

function setModalType(type) {
  const radio = document.querySelector(`input[name="txn-type"][value="${type}"]`);
  if (radio) radio.checked = true;
  updateDescLabel(type);
}

function updateDescLabel(type) {
  const label = document.getElementById('label-description');
  if (!label) return;
  label.textContent = type === 'income' ? 'Source / Where from'
    : type === 'savings' ? 'Savings note'
    : 'What was it for?';
}

function openEditModal(id, trigger) {
  const t = getState().transactions.find(tx => tx.id === id);
  if (!t) return;

  editingId = id;
  resetForm();
  setModalType(t.type ?? 'expense');

  const { settings } = getState();
  const txnCurrency = t.inputCurrency ?? settings.baseCurrency;
  const currencyEl = document.getElementById('field-currency');
  if (currencyEl) currencyEl.value = txnCurrency;

  document.getElementById('field-description').value = t.description;
  document.getElementById('field-amount').value = fromUSD(t.amount, txnCurrency, settings);
  document.getElementById('field-date').value = t.date;
  document.getElementById('field-category').value = t.category;
  document.getElementById('modal-heading').textContent = 'Edit Transaction';
  document.getElementById('modal-submit').textContent = 'Save';

  openModal('transaction-modal', trigger);
}

function submitTransaction() {
  const descInput = document.getElementById('field-description');
  const amtInput = document.getElementById('field-amount');
  const dateInput = document.getElementById('field-date');
  const catSelect = document.getElementById('field-category');

  const description = descInput?.value.trim() ?? '';
  const amount = amtInput?.value.trim() ?? '';
  const date = dateInput?.value ?? '';
  const category = catSelect?.value ?? '';
  const type = document.querySelector('input[name="txn-type"]:checked')?.value ?? 'expense';

  const vDesc = validateDescription(description);
  const vAmt = validateAmount(amount);
  const vDate = validateDate(date);
  const vCat = validateCategory(category);

  let hasErrors = false;
  if (!vDesc.valid) { setFieldError('description-error', vDesc.message); markInputValidity(descInput, false); hasErrors = true; }
  if (!vAmt.valid)  { setFieldError('amount-error', vAmt.message); markInputValidity(amtInput, false); hasErrors = true; }
  if (!vDate.valid) { setFieldError('date-error', vDate.message); markInputValidity(dateInput, false); hasErrors = true; }
  if (!vCat.valid)  { setFieldError('category-error', vCat.message); markInputValidity(catSelect, false); hasErrors = true; }

  if (hasErrors) {
    document.querySelector('#transaction-form .invalid')?.focus();
    announceAlert('Please fix the errors before saving.');
    return;
  }

  const now = new Date().toISOString();
  const state = getState();
  const currency = document.getElementById('field-currency')?.value ?? state.settings.baseCurrency;
  const usdAmount = toUSD(parseFloat(amount), currency, state.settings);

  if (editingId) {
    setState({
      transactions: state.transactions.map(t =>
        t.id === editingId
          ? { ...t, description, amount: usdAmount, date, category, type, inputCurrency: currency, updatedAt: now }
          : t
      ),
    });
    showToast('Transaction updated.', 'success');
    announce('Transaction updated.');
  } else {
    setState({
      transactions: [
        { id: generateId(), description, amount: usdAmount, category, date, type, inputCurrency: currency, createdAt: now, updatedAt: now },
        ...state.transactions,
      ],
    });
    showToast('Transaction added.', 'success');
    announce('New transaction added.');
  }

  renderAll();
  closeTransactionModal();
}

function closeTransactionModal() {
  editingId = null;
  closeModal('transaction-modal');
  resetForm();
}

function resetForm() {
  const form = document.getElementById('transaction-form');
  if (!form) return;
  form.reset();
  form.querySelectorAll('.input, .select').forEach(el => {
    el.classList.remove('valid', 'invalid');
    el.removeAttribute('aria-invalid');
  });
  ['description-error', 'amount-error', 'date-error', 'category-error'].forEach(id => setFieldError(id, ''));
  const dupWarn = document.getElementById('duplicate-word-warning');
  if (dupWarn) dupWarn.hidden = true;
  const expenseRadio = document.querySelector('input[name="txn-type"][value="expense"]');
  if (expenseRadio) expenseRadio.checked = true;
  updateDescLabel('expense');
}

let pendingDeleteId = null;

function setupDeleteModal() {
  document.getElementById('delete-cancel')?.addEventListener('click', closeDeleteModal);
  document.getElementById('delete-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDeleteModal();
  });

  document.getElementById('delete-confirm')?.addEventListener('click', () => {
    if (!pendingDeleteId) return;
    const state = getState();
    const txn = state.transactions.find(t => t.id === pendingDeleteId);
    setState({ transactions: state.transactions.filter(t => t.id !== pendingDeleteId) });
    pendingDeleteId = null;
    closeDeleteModal();
    renderAll();
    showToast(`"${txn?.description ?? 'Transaction'}" deleted.`);
    announce('Transaction deleted.');
  });
}

function requestDelete(id, trigger) {
  const t = getState().transactions.find(tx => tx.id === id);
  if (!t) return;
  pendingDeleteId = id;
  const nameEl = document.getElementById('delete-item-name');
  if (nameEl) nameEl.textContent = t.description;
  openModal('delete-modal', trigger);
}

function closeDeleteModal() {
  pendingDeleteId = null;
  closeModal('delete-modal');
}

function setupSearch() {
  const searchInput = document.getElementById('search-input');
  const caseToggle = document.getElementById('search-case-sensitive');
  const filterCategory = document.getElementById('filter-category');

  function applySearch() {
    const query = searchInput?.value ?? '';
    const caseSensitive = caseToggle?.checked ?? false;

    if (query && !isValidRegex(query)) {
      searchInput?.classList.add('invalid');
      searchInput?.setAttribute('aria-invalid', 'true');
    } else {
      searchInput?.classList.remove('invalid');
      searchInput?.removeAttribute('aria-invalid');
    }

    setState({ ui: { ...getState().ui, search: { query, caseSensitive }, filterCategory: filterCategory?.value ?? '' } });
    renderTable(getState());
  }

  searchInput?.addEventListener('input', applySearch);
  filterCategory?.addEventListener('change', applySearch);
  caseToggle?.addEventListener('change', () => {
    caseToggle.setAttribute('aria-checked', String(caseToggle.checked));
    applySearch();
  });
}

function setupImportExport() {
  document.getElementById('btn-export')?.addEventListener('click', () => {
    const r = exportJSON();
    showToast(r.message, r.success ? 'success' : 'warning');
    if (r.success) announce(r.message);
  });

  const importBtn = document.getElementById('btn-import');
  const fileInput = document.getElementById('import-file-input');

  importBtn?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    showToast('Importing...', 'default', 1500);
    const r = await importJSON(file, { mode: 'merge' });
    if (r.success) {
      renderAll();
      showToast(r.message, 'success');
      announce(r.message);
    } else {
      showToast(`Import failed. ${r.errors?.slice(0, 2).join(' | ') ?? ''}`, 'error', 6000);
      announceAlert(`Import failed: ${r.message}`);
    }
    fileInput.value = '';
  });
}

function setupSettings() {
  // currency radio applies straight away without needing Save
  document.querySelectorAll('input[name="base-currency"]').forEach(radio => {
    radio.addEventListener('change', () => {
      saveSettingsFromForm();
      renderAll();
      const { settings } = getState();
      const names = { USD: 'US Dollar ($)', EUR: 'Euro (€)', RWF: 'Rwanda Franc (FRw)' };
      showToast(`Currency changed to ${names[settings.baseCurrency] ?? settings.baseCurrency}`, 'success', 3000);
      announce(`Currency changed to ${settings.baseCurrency}`);
    });
  });

  document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    const r = saveSettingsFromForm();
    renderAll();
    showToast(r.message, 'success');
    announce(r.message);
  });

  document.getElementById('btn-reset-settings')?.addEventListener('click', e => {
    openModal('reset-settings-modal', e.currentTarget);
  });

  document.getElementById('reset-settings-cancel')?.addEventListener('click', () => {
    closeModal('reset-settings-modal');
  });

  document.getElementById('reset-settings-confirm')?.addEventListener('click', () => {
    resetSettings();
    closeModal('reset-settings-modal');
    renderAll();
    showToast('Settings reset to defaults.', 'success');
    announce('Settings reset to defaults.');
  });

  document.getElementById('btn-clear-all-data')?.addEventListener('click', e => {
    openModal('clear-data-modal', e.currentTarget);
  });

  document.getElementById('clear-data-cancel')?.addEventListener('click', () => {
    closeModal('clear-data-modal');
  });

  document.getElementById('clear-data-confirm')?.addEventListener('click', () => {
    setState({ transactions: [] });
    closeModal('clear-data-modal');
    renderAll();
    showToast('All transactions cleared.', 'success');
    announce('All transactions cleared.');
  });

  document.getElementById('btn-add-category')?.addEventListener('click', () => {
    const r = addCategoryFromInput();
    if (r.success) { showToast(r.message, 'success'); announce(r.message); }
    else { announceAlert(r.message); }
  });

  document.getElementById('new-category-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-add-category')?.click(); }
  });
}

// Alt+1-5 jump to sections, Alt+N opens the add modal from anywhere
function setupGlobalKeys() {
  document.addEventListener('keydown', e => {
    if (!e.altKey) return;
    const sections = { '1': 'dashboard', '2': 'expenses', '3': 'transactions', '4': 'settings', '5': 'about' };
    if (sections[e.key]) {
      e.preventDefault();
      goTo(sections[e.key]);
    } else if (e.key === 'n') {
      e.preventDefault();
      goTo('transactions');
      // small delay so the section finishes showing before the modal opens
      setTimeout(() => openAddModal(document.getElementById('btn-add-transaction')), 50);
    }
  });
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
