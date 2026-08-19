/**
 * Light and dark themes.
 *
 * Light is the app's default and does not follow the operating system: a
 * calculator read in daylight at a till should look the same whatever the
 * phone happens to be set to. Dark is there for anyone who asks for it, and
 * the ask is remembered.
 */

import { STORAGE_KEYS, THEMES } from './config.js';
import { readJson, writeJson } from './storage.js';

/** @returns {'light'|'dark'|null} the stored choice, or null if never made */
function storedTheme() {
  const stored = readJson(STORAGE_KEYS.theme);
  return stored === THEMES.light || stored === THEMES.dark ? stored : null;
}

/** The theme in force: whatever was chosen, otherwise light. */
export function currentTheme() {
  return storedTheme() ?? THEMES.light;
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
}

/**
 * @param {(theme: string) => void} onChange notified whenever the theme settles
 */
export function initTheme(onChange) {
  apply(currentTheme());
  onChange(currentTheme());
}

/** Flips the theme and remembers the result as a deliberate choice. */
export function toggleTheme() {
  const next = currentTheme() === THEMES.dark ? THEMES.light : THEMES.dark;
  writeJson(STORAGE_KEYS.theme, next);
  apply(next);
  return next;
}
