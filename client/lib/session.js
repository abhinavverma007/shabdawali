// The room code and private token that let this browser reclaim its seat after a refresh.
// localStorage so it also survives a closed-and-reopened tab; every access is guarded because
// storage can be blocked (private mode, strict browser settings).
const KEY = 'shabdawali.session';

export function saveSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {}
}

export function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s?.code && s?.token ? s : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
