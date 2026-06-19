// user accounts stored in localStorage under a separate key from the app data
// passwords are SHA-256 hashed with a random salt — never stored plain text

const authKey = 'sft:auth';

function getAuthData() {
  try {
    return JSON.parse(localStorage.getItem(authKey) || '{"users":[],"currentUser":null}');
  } catch (_) {
    return { users: [], currentUser: null };
  }
}

function saveAuthData(data) {
  localStorage.setItem(authKey, JSON.stringify(data));
}

export function getCurrentUser() {
  return getAuthData().currentUser;
}

export function isLoggedIn() {
  return getAuthData().currentUser !== null;
}

export function logout() {
  const auth = getAuthData();
  auth.currentUser = null;
  saveAuthData(auth);
}

export async function register({ name, email, password }) {
  const emailKey = email.toLowerCase().trim();

  if (getAuthData().users.some(u => u.email === emailKey)) {
    return { success: false, message: 'An account with this email already exists.' };
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  // re-read auth after the async hash — avoids overwriting another account
  // that could theoretically be saved while the hash was running
  const auth = getAuthData();

  if (auth.users.some(u => u.email === emailKey)) {
    return { success: false, message: 'An account with this email already exists.' };
  }

  const user = {
    id: `usr_${Date.now().toString(36)}`,
    name: name.trim(),
    email: emailKey,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  };

  auth.users.push(user);
  auth.currentUser = { id: user.id, name: user.name, email: user.email };
  saveAuthData(auth);

  return { success: true, user: auth.currentUser };
}

export async function login({ email, password }) {
  const auth = getAuthData();
  const user = auth.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

  if (!user) {
    return { success: false, message: 'No account found with this email.' };
  }

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    return { success: false, message: 'Incorrect password.' };
  }

  auth.currentUser = { id: user.id, name: user.name, email: user.email };
  saveAuthData(auth);

  return { success: true, user: auth.currentUser };
}

function generateSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// crypto.subtle only works on HTTPS or localhost, not file://
async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(password + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}
