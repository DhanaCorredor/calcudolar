/**
 * A return visit. Anything the user left behind must come back visible, and
 * a rate they took over by hand must not be quietly overwritten by the feed.
 * Covers AC-7c, AC-8, AC-9 and RATE-6.
 */

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { bootApp } from './helpers.js';

describe('restored state', () => {
  let app;

  before(async () => {
    app = await bootApp({
      preferences: {
        amount: '10000',
        merchantRate: '700',
        autoRates: { official: false, parallel: true },
        rates: { official: { usd: '900', eur: '1.042,00' }, parallel: null },
      },
    });
  });

  it('reopens the group holding a merchant rate', () => {
    assert.equal(app.$('merchantDisclosure').open, true);
    assert.equal(app.$('merchantRateInput').value, '700');
  });

  it('reopens the group holding a hand-typed rate', () => {
    assert.equal(app.$('ratesDisclosure').open, true);
  });

  it('restores both currencies of the manual reference', () => {
    assert.equal(app.$('officialRateInput').value, '900');
    assert.equal(app.$('officialEuroInput').value, '1.042,00');
  });

  it('leaves the automatic reference to the feed', () => {
    assert.equal(app.$('parallelRateInput').value, '881,0541');
    assert.equal(app.$('parallelEuroInput').value, '1.021,8532');
  });

  it('calculates against the rate the user typed', () => {
    // 900 ÷ 700 − 1 = 28.6 %, not the 10.8 % the published rate would give.
    assert.equal(app.$('readingValue').textContent, '28,6%');
  });

  it('shows the manual reference as manual', () => {
    const toggle = app.document.querySelector('.mode-toggle[data-rate="official"]');

    assert.equal(toggle.textContent, 'manual');
    assert.equal(toggle.getAttribute('aria-pressed'), 'false');
    assert.doesNotMatch(toggle.className, /is-auto/);
  });

  it('hands a reference back to the feed on request', async () => {
    const toggle = app.document.querySelector('.mode-toggle[data-rate="official"]');
    await app.click(toggle);

    assert.equal(toggle.textContent, 'auto');
    assert.equal(app.$('officialRateInput').value, '775,3356');
    assert.equal(app.$('officialEuroInput').value, '897,8231');
  });

  it('takes a reference over the moment it is typed into', async () => {
    await app.type(app.$('parallelEuroInput'), '1100');

    const toggle = app.document.querySelector('.mode-toggle[data-rate="parallel"]');
    assert.equal(toggle.textContent, 'manual');
    // Typing the euro rate must not disturb the dollar rate beside it.
    assert.equal(app.$('parallelRateInput').value, '881,0541');
    assert.equal(app.row('parallel').querySelector('.result-eur').textContent, '€9,09');
  });
});
