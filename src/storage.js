/**
 * A forgiving wrapper around localStorage.
 *
 * Private browsing modes and restrictive policies can make storage throw on
 * access rather than simply be empty. Persistence is a convenience here, never
 * a requirement, so every failure degrades to "no stored value" in silence.
 */

/** @returns {unknown|null} the stored value, or null if absent or unreadable */
export function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the session simply won't be remembered */
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to clean up if storage was never reachable */
  }
}
