// localStorage helpers - wraps everything in { v: 1, data: ... } so I can
// tell if something is broken or from an old version

const version = 1;

export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ v: version, data: value }));
    return true;
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      console.warn('localStorage is full, save failed');
    }
    return false;
  }
}

export function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    // unwrap the envelope if it's there
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      return parsed.data;
    }
    return parsed;
  } catch (_) {
    console.warn('corrupt data in storage, cleared it');
    try { localStorage.removeItem(key); } catch (_) {}
    return null;
  }
}

export function removeFromStorage(key) {
  try { localStorage.removeItem(key); } catch (_) {}
}

// Firefox private mode and some iOS browsers block localStorage entirely
export function isStorageAvailable() {
  const probe = '__sft_probe__';
  try {
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch (_) {
    return false;
  }
}
