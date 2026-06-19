// all the regex patterns the app uses for input validation
// each one is exported so tests.html can import and test them directly

// no leading/trailing spaces - one char alone is fine too
export const descRe = /^\S(?:.*\S)?$|^\S$/;

// positive number, whole or up to 2 decimal places, no leading zeros (so "05" fails)
export const amountRe = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

// YYYY-MM-DD only, basic range check so month 13 and day 0 fail
export const dateRe = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// letters only, words can be separated by a single space or hyphen
export const categoryRe = /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/;

// back-reference advanced pattern, flags "the the" or "at at" typed by accident
export const dupWordRe = /\b(\w+)\s+\1\b/i;

// these two are used as search demo examples in tests.html
export const centsRe    = /\b\d+\.\d{2}\b/;
export const beverageRe = /(coffee|tea|juice|drink)/i;


// checks the description field - rejects blank or anything with edge spaces
export function validateDescription(value) {
  if (!value) return { valid: false, message: 'Description is required.' };
  if (!descRe.test(value)) {
    return { valid: false, message: 'No leading or trailing spaces allowed.' };
  }
  return { valid: true, message: '' };
}

// checks the amount - must be a real positive number with max 2 decimal places
export function validateAmount(value) {
  if (value === null || value === undefined || value === '') {
    return { valid: false, message: 'Amount is required.' };
  }
  if (!amountRe.test(String(value).trim())) {
    return { valid: false, message: 'Enter a positive number with up to 2 decimal places.' };
  }
  return { valid: true, message: '' };
}

// checks the date field is in YYYY-MM-DD format with a valid month/day range
export function validateDate(value) {
  if (!value) return { valid: false, message: 'Date is required.' };
  if (!dateRe.test(value)) {
    return { valid: false, message: 'Date must be in YYYY-MM-DD format.' };
  }
  return { valid: true, message: '' };
}

// checks a category name - letters and hyphens/spaces only, no numbers or symbols
export function validateCategory(value) {
  if (!value) return { valid: false, message: 'Category is required.' };
  if (!categoryRe.test(value)) {
    return { valid: false, message: 'Letters, spaces, and hyphens only.' };
  }
  return { valid: true, message: '' };
}

// runs the duplicate word check on a string, returns true if it finds a repeat
export function checkDuplicateWords(str) {
  return dupWordRe.test(str);
}

// checks a single record from an imported JSON file has all the right fields
// returns an array of error strings, empty array means the record is fine
export function validateImportedRecord(item) {
  const errs = [];
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return ['Record must be an object.'];
  }
  if (typeof item.id !== 'string' || !item.id.trim())       errs.push('Missing "id".');
  if (typeof item.description !== 'string')                  errs.push('Missing "description".');
  if (typeof item.amount !== 'number' || isNaN(item.amount) || item.amount < 0) {
    errs.push('"amount" must be a non-negative number.');
  }
  if (typeof item.category !== 'string' || !item.category.trim()) errs.push('Missing "category".');
  if (typeof item.date !== 'string' || !dateRe.test(item.date)) {
    errs.push('"date" must be YYYY-MM-DD.');
  }
  return errs;
}

// validates the whole import file - checks it's an array, then validates each record
// returns { valid, records (good ones only), errors (list of what was wrong) }
export function validateImportPayload(data) {
  if (!Array.isArray(data)) {
    return { valid: false, records: [], errors: ['JSON must be an array.'] };
  }
  if (data.length === 0) {
    return { valid: false, records: [], errors: ['Array is empty, nothing to import.'] };
  }

  const errors = [];
  const valid  = [];

  data.forEach((item, i) => {
    const errs = validateImportedRecord(item);
    if (errs.length > 0) {
      errors.push(`Record ${i + 1}: ${errs.join(' ')}`);
    } else {
      valid.push(item);
    }
  });

  return { valid: errors.length === 0, records: valid, errors };
}

// checks a new custom category name - also rejects duplicates (case-insensitive)
export function validateCategoryName(value, existing = []) {
  const trimmed = (value || '').trim();
  if (!trimmed) return { valid: false, message: 'Category name is required.' };
  if (!categoryRe.test(trimmed)) {
    return { valid: false, message: 'Letters, spaces, and hyphens only.' };
  }
  if (existing.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
    return { valid: false, message: `"${trimmed}" already exists.` };
  }
  return { valid: true, message: '' };
}
