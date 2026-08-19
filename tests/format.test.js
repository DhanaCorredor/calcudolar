import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { formatMoney, parseAmount, timeAgo } from '../src/format.js';

describe('parseAmount', () => {
  it('reads a plain number', () => {
    assert.equal(parseAmount('700'), 700);
    assert.equal(parseAmount('775.3356'), 775.3356);
  });

  it('treats either separator as the decimal mark', () => {
    assert.equal(parseAmount('1234,56'), 1234.56);
    assert.equal(parseAmount('1234.56'), 1234.56);
  });

  it('reads both thousand-separator conventions as the same number', () => {
    assert.equal(parseAmount('1.234,56'), 1234.56);
    assert.equal(parseAmount('1,234.56'), 1234.56);
  });

  it('recognises grouping without any decimals', () => {
    assert.equal(parseAmount('1.234'), 1234);
    assert.equal(parseAmount('1,234'), 1234);
    assert.equal(parseAmount('10.000.000'), 10_000_000);
  });

  it('keeps a lone group-sized decimal as a decimal', () => {
    // Ambiguous by nature; four digits after the mark cannot be grouping.
    assert.equal(parseAmount('1,2345'), 1.2345);
  });

  it('ignores currency symbols and whitespace', () => {
    assert.equal(parseAmount(' Bs. 1.500,00 '), 1500);
    assert.equal(parseAmount('$25'), 25);
    assert.equal(parseAmount('€25'), 25);
  });

  it('rejects input that is not fully numeric', () => {
    assert.equal(parseAmount('100abc'), null);
    assert.equal(parseAmount('abc'), null);
    assert.equal(parseAmount('12..5'), null);
    assert.equal(parseAmount('-50'), null);
  });

  it('rejects empty and non-string input', () => {
    assert.equal(parseAmount(''), null);
    assert.equal(parseAmount('   '), null);
    assert.equal(parseAmount(undefined), null);
    assert.equal(parseAmount(null), null);
  });

  it('accepts zero, which callers reject on their own terms', () => {
    assert.equal(parseAmount('0'), 0);
  });
});

describe('formatMoney', () => {
  it('survives a round trip through the parser', () => {
    for (const value of [0.5, 25, 1234.56, 10_000, 1_234_567.89]) {
      assert.equal(parseAmount(formatMoney(value)), value);
    }
  });

  it('always shows two decimals', () => {
    assert.match(formatMoney(25), /25\D\d{2}$/);
  });
});

describe('timeAgo', () => {
  const now = 1_700_000_000_000;
  const ago = (ms) => timeAgo(now - ms, now);

  it('describes the last minute as seconds', () => {
    assert.equal(ago(0), 'hace segundos');
    assert.equal(ago(59_000), 'hace segundos');
  });

  it('switches to minutes, hours and days in turn', () => {
    assert.equal(ago(60_000), 'hace 1 min');
    assert.equal(ago(45 * 60_000), 'hace 45 min');
    assert.equal(ago(2 * 3_600_000), 'hace 2 h');
    assert.equal(ago(3 * 86_400_000), 'hace 3 d');
  });

  it('never reports a future timestamp as negative', () => {
    assert.equal(timeAgo(now + 60_000, now), 'hace segundos');
  });
});
