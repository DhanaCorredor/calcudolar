/**
 * The conversion the app exists for, driven through the real DOM.
 * Covers AC-1, AC-2, AC-11 and AC-12.
 */

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { bootApp } from './helpers.js';

describe('conversion', () => {
  let app;

  before(async () => {
    app = await bootApp();
    await app.type(app.$('amountInput'), '10000');
  });

  it('fetches both currencies and fills the reference rates', () => {
    assert.equal(app.$('officialRateInput').value, '775,3356');
    assert.equal(app.$('officialEuroInput').value, '897,8231');
    assert.equal(app.$('parallelRateInput').value, '881,0541');
    assert.equal(app.$('parallelEuroInput').value, '1.021,8532');
  });

  it('reports the rates as live', () => {
    assert.match(app.$('statusBar').className, /is-live/);
    assert.match(app.$('statusDetail').textContent, /BCV 775,3356/);
    assert.match(app.$('statusDetail').textContent, /valor del/);
  });

  it('converts at the official rate in both currencies', () => {
    assert.equal(app.row('official').querySelector('.result-usd').textContent, '$12,90');
    assert.equal(app.row('official').querySelector('.result-eur').textContent, '€11,14');
  });

  it('converts at the parallel rate in both currencies', () => {
    assert.equal(app.row('parallel').querySelector('.result-usd').textContent, '$11,35');
    assert.equal(app.row('parallel').querySelector('.result-eur').textContent, '€9,79');
  });

  it('uses the published parallel euro rate rather than a cross', () => {
    // A cross from the official pair would give 881.054 × 1.15798 = 1020.22,
    // and €9,80. The published 1021.85 gives €9,79.
    assert.equal(app.row('parallel').querySelector('.result-eur').textContent, '€9,79');
  });

  it('shows nothing to compare against until a merchant rate is given', () => {
    assert.equal(app.row('merchant'), null);
    assert.equal(app.$('readingValue').textContent, '—%');
  });

  it('reads either thousands convention as the same number', async () => {
    await app.type(app.$('amountInput'), '1.234,56');
    const withDots = app.row('official').querySelector('.result-usd').textContent;

    await app.type(app.$('amountInput'), '1,234.56');
    assert.equal(app.row('official').querySelector('.result-usd').textContent, withDots);
  });

  it('flags input that is not a number and withholds the results', async () => {
    await app.type(app.$('amountInput'), '100abc');

    assert.match(app.$('amountInput').className, /is-invalid/);
    assert.equal(app.document.querySelectorAll('.result').length, 0);
    assert.equal(app.$('resultsList').querySelectorAll('.empty').length, 1);
  });

  it('recovers once the input is valid again', async () => {
    await app.type(app.$('amountInput'), '10000');

    assert.doesNotMatch(app.$('amountInput').className, /is-invalid/);
    assert.equal(app.document.querySelectorAll('.result').length, 2);
  });
});
