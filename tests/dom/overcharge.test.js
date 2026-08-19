/**
 * The optional half: comparing a merchant's rate against the references.
 * Covers AC-1, AC-3 through AC-7, and the tone contract the themes rest on.
 */

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { bootApp } from './helpers.js';

describe('overcharge', () => {
  let app;

  before(async () => {
    app = await bootApp();
    await app.type(app.$('amountInput'), '10000');
    await app.type(app.$('merchantRateInput'), '700');
  });

  it('reads the overcharge against the official rate', () => {
    assert.equal(app.$('readingValue').textContent, '10,8%');
    assert.equal(app.$('readingLabel').textContent, 'Sobreprecio vs. BCV');
  });

  it('names the damage in plain language', () => {
    assert.equal(app.$('verdictTitle').textContent, 'Ay papá, eso duele');
    assert.match(app.$('verdictTitle').className, /tone-bad/);
  });

  it('states the difference in both currencies', () => {
    const card = app.card('official');
    assert.equal(card.querySelector('.comparison-usd').textContent, '+$1,39');
    assert.equal(card.querySelector('.comparison-eur').textContent, '+€1,20');
    assert.match(card.querySelector('.comparison-percent').textContent, /10,8% de sobreprecio/);
  });

  it('compares against the parallel rate too', () => {
    assert.match(
      app.card('parallel').querySelector('.comparison-percent').textContent,
      /25,9% de sobreprecio/,
    );
  });

  it('takes the harsher reference in worst-case mode', async () => {
    await app.click(app.document.querySelector('[data-mode="worst"]'));

    assert.equal(app.$('readingValue').textContent, '25,9%');
    assert.equal(app.$('readingLabel').textContent, 'Sobreprecio vs. paralela');
    assert.equal(app.$('verdictTitle').textContent, '¡Llamen a la ambulancia!');

    await app.click(app.document.querySelector('[data-mode="official"]'));
  });

  it('recognises a charge in the customer\'s favour', async () => {
    await app.type(app.$('merchantRateInput'), '800');

    assert.equal(app.$('readingValue').textContent, '−3,1%');
    assert.equal(app.$('readingLabel').textContent, 'Descuento vs. BCV');
    assert.equal(app.$('verdictTitle').textContent, '¡Te están dando chance!');
    assert.equal(app.$('verdictBox').dataset.tone, 'bargain');
  });

  it('saturates the needle without altering the figure', async () => {
    await app.type(app.$('merchantRateInput'), '400');

    assert.equal(app.$('readingValue').textContent, '93,8%');
    assert.equal(app.$('gaugeNeedle').style.transform, 'rotate(180.00deg)');
    assert.equal(app.$('verdictTitle').textContent, 'Código azul, traigan el desfibrilador');
  });

  it('reads a percentage before any amount is typed', async () => {
    await app.type(app.$('amountInput'), '');

    assert.equal(app.$('readingValue').textContent, '93,8%');
    assert.match(app.card('official').querySelector('.comparison-percent').textContent, /93,8%/);
    assert.equal(app.card('official').querySelector('.comparison-usd').textContent, '—');
    assert.equal(app.document.querySelectorAll('.result').length, 0);
  });

  it('carries a tone rather than a colour, so themes can restyle it', () => {
    assert.equal(app.$('readingValue').dataset.tone, 'critical');
    assert.equal(app.$('verdictBox').dataset.tone, 'critical');
    assert.equal(app.$('readingValue').style.color, '');

    const bands = app.$('gaugeZones').children;
    assert.equal(bands.length, 4);
    assert.equal(bands[0].dataset.tone, 'good');
    assert.equal(bands[3].dataset.tone, 'critical');
    assert.equal(bands[0].getAttribute('stroke'), null);
  });

  it('exposes the reading to assistive technology', () => {
    assert.match(app.$('gauge').getAttribute('aria-label'), /93,8 por ciento/);
    assert.equal(app.$('verdictBox').getAttribute('aria-live'), 'polite');
    assert.equal(app.$('statusBar').getAttribute('aria-live'), 'polite');
  });
});
