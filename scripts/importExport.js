import { getState, setState, generateId } from './state.js';
import { validateImportPayload } from './validators.js';

export function exportJSON() {
  const { transactions } = getState();
  if (!transactions.length) return { success: false, message: 'No transactions to export.' };

  const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // programmatic download — create a link, click it, remove it
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `sft-export-${ts}.json`,
    style: 'display:none',
  });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

  return { success: true, message: `Exported ${transactions.length} record(s).` };
}

// mode 'merge' skips duplicates (same id), 'replace' wipes everything first
export function importJSON(file, { mode = 'merge' } = {}) {
  return new Promise(resolve => {
    if (!file) return resolve({ success: false, message: 'No file selected.' });

    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      return resolve({ success: false, message: 'File must be a .json file.' });
    }

    const reader = new FileReader();
    reader.onerror = () => resolve({ success: false, message: 'Could not read file.' });

    reader.onload = e => {
      let parsed;
      try {
        parsed = JSON.parse(e.target.result);
      } catch (err) {
        return resolve({ success: false, message: `Invalid JSON: ${err.message}` });
      }

      const validation = validateImportPayload(parsed);
      if (!validation.valid) {
        return resolve({
          success: false,
          message: `Import failed, ${validation.errors.length} error(s).`,
          errors: validation.errors,
        });
      }

      const now = new Date().toISOString();
      const normalised = validation.records.map(r => ({
        id: r.id || generateId(),
        type: r.type || 'expense',   // preserve income/savings if present
        description: String(r.description).trim(),
        amount: Number(r.amount),
        category: String(r.category).trim(),
        date: r.date,
        createdAt: r.createdAt || now,
        updatedAt: r.updatedAt || now,
      }));

      const { transactions: existing } = getState();
      let final, added = 0, skipped = 0;

      if (mode === 'replace') {
        final = normalised;
        added = normalised.length;
      } else {
        const ids = new Set(existing.map(t => t.id));
        const fresh = normalised.filter(r => {
          if (ids.has(r.id)) { skipped++; return false; }
          added++;
          return true;
        });
        final = [...existing, ...fresh];
      }

      setState({ transactions: final });

      const note = skipped > 0 ? ` (${skipped} duplicate(s) skipped)` : '';
      resolve({ success: true, message: `Imported ${added} record(s)${note}.`, count: added });
    };

    reader.readAsText(file);
  });
}
