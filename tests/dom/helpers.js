/**
 * Boots the real application against the real index.html inside a jsdom
 * document, with the rate endpoints stubbed.
 *
 * One boot per test file. Node's test runner gives each file its own process,
 * which is what keeps the boots independent: `main.js` could be re-imported
 * under a query string, but its own imports would resolve to cached module
 * instances still holding element references from the first document.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Figures published on 2026-08-19, the ones the acceptance criteria use. */
export const RATES = {
  usd: [
    { fuente: 'oficial', promedio: 775.3356, fechaActualizacion: '2026-08-19T00:00:00-04:00' },
    { fuente: 'paralelo', promedio: 881.054062 },
  ],
  eur: [
    { fuente: 'oficial', promedio: 897.82311808 },
    { fuente: 'paralelo', promedio: 1021.853166 },
  ],
};

export const STORAGE_KEYS = {
  preferences: 'tasazo.preferences',
  theme: 'tasazo.theme',
  rates: 'tasazo.rates',
};

/** Lets pending promises and timers settle before assertions run. */
export const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * @param {{preferences?: object, rates?: object}} [options]
 * @returns {Promise<object>} handles for driving and inspecting the page
 */
export async function bootApp({ preferences, rates = RATES } = {}) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true });

  /*
   * The app schedules a refresh cycle and a clock tick that run for as long as
   * the page is open. Left alive they would hold the test process open for
   * ever, and none of them is under test here, so scheduling is recorded
   * rather than performed.
   */
  const scheduled = [];
  globalThis.setInterval = (handler, delay) => scheduled.push({ handler, delay });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.fetch = async (url) => ({
    ok: true,
    json: async () => (url.includes('/euros') ? rates.eur : rates.usd),
  });

  if (preferences) {
    dom.window.localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(preferences));
  }

  await import(pathToFileURL(path.join(ROOT, 'src/main.js')).href);
  await tick();
  await tick();

  const { document: page } = dom.window;

  return {
    dom,
    document: page,
    /** Timers the app asked for, so their cadence can be asserted. */
    scheduled,
    /** Element by id. */
    $: (id) => page.getElementById(id),
    /** A conversion row, queried live: the list is rebuilt on every render. */
    row: (key) => page.querySelector(`.result[data-rate="${key}"]`),
    /** A comparison card. */
    card: (reference) => page.querySelector(`[data-reference="${reference}"]`),
    /** Types into a field the way a person would, then lets the app react. */
    async type(element, value) {
      element.value = value;
      element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      await tick();
    },
    async click(element) {
      element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      await tick();
    },
    stored: (key) => JSON.parse(dom.window.localStorage.getItem(key)),
  };
}
