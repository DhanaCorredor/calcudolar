/**
 * A first visit: the conversion should need nothing but an amount, and
 * everything else should stay out of the way. Covers AC-7b and UI-9.
 */

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { bootApp, STORAGE_KEYS } from './helpers.js';

describe('cold start', () => {
  let app;

  before(async () => {
    app = await bootApp({ preferences: { amount: '10000' } });
  });

  it('answers from the amount alone', () => {
    assert.equal(app.document.querySelectorAll('.result').length, 2);
    assert.equal(app.row('official').querySelector('.result-usd').textContent, '$12,90');
    assert.equal(app.row('parallel').querySelector('.result-usd').textContent, '$11,35');
  });

  it('keeps both disclosure groups closed', () => {
    assert.equal(app.$('merchantDisclosure').open, false);
    assert.equal(app.$('ratesDisclosure').open, false);
  });

  it('opens in the light theme regardless of the device preference', () => {
    assert.equal(app.document.documentElement.dataset.theme, 'light');
  });

  it('offers the dark theme on the toggle', () => {
    assert.match(app.$('themeToggle').getAttribute('aria-label'), /tema oscuro/);
  });

  it('remembers a theme choice', async () => {
    await app.click(app.$('themeToggle'));

    assert.equal(app.document.documentElement.dataset.theme, 'dark');
    assert.equal(app.stored(STORAGE_KEYS.theme), 'dark');
    assert.match(app.$('themeToggle').getAttribute('aria-label'), /tema claro/);
  });

  it('caches the rates it fetched', () => {
    assert.equal(app.stored(STORAGE_KEYS.rates).usd.official, 775.3356);
    assert.equal(app.stored(STORAGE_KEYS.rates).eur.parallel, 1021.853166);
  });

  it('persists only what the user owns', async () => {
    // Loading does not rewrite storage; a save follows an interaction.
    await app.type(app.$('amountInput'), '10000');
    const saved = app.stored(STORAGE_KEYS.preferences);

    assert.equal(saved.amount, '10000');
    // Automatic rates come back from the feed; storing them would go stale.
    assert.equal(saved.rates.official, null);
    assert.equal(saved.rates.parallel, null);
  });

  it('clears the user\'s data but keeps the public rates', async () => {
    await app.click(app.$('clearButton'));

    assert.equal(app.$('amountInput').value, '');
    assert.equal(app.stored(STORAGE_KEYS.preferences), null);
    assert.notEqual(app.stored(STORAGE_KEYS.rates), null);
    assert.equal(app.$('officialRateInput').value, '775,3356');
  });
});
