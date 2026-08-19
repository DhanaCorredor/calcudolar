/**
 * Light and dark themes.
 *
 * Three states, not two: light, dark, and *no stored choice*. Without a stored
 * choice the page follows the operating system and keeps following it, so a
 * phone that dims at sunset dims the app too. Pressing the toggle is what turns
 * a preference into a decision.
 */

import { STORAGE_KEYS, THEMES } from './config.js';
import { readJson, writeJson } from './storage.js';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const systemTheme = () =>
  window.matchMedia?.(DARK_QUERY).matches ? THEMES.dark : THEMES.light;

/** @returns {'light'|'dark'|null} the stored choice, or null if never made */
function storedTheme() {
  const stored = readJson(STORAGE_KEYS.theme);
  return stored === THEMES.light || stored === THEMES.dark ? stored : null;
}

/** The theme actually in force, whether chosen or inherited. */
export function currentTheme() {
  return storedTheme() ?? systemTheme();
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
}

/**
 * Applies the theme in force and keeps following the system until the user
 * makes a choice of their own.
 *
 * @param {(theme: string) => void} onChange notified whenever the theme settles
 */
export function initTheme(onChange) {
  apply(currentTheme());
  onChange(currentTheme());

  window.matchMedia?.(DARK_QUERY).addEventListener?.('change', () => {
    if (storedTheme() !== null) return; // an explicit choice outranks the system
    apply(systemTheme());
    onChange(systemTheme());
  });
}

/** Flips the theme and remembers the result as a deliberate choice. */
export function toggleTheme() {
  const next = currentTheme() === THEMES.dark ? THEMES.light : THEMES.dark;
  writeJson(STORAGE_KEYS.theme, next);
  apply(next);
  return next;
}
