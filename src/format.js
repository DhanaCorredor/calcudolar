/**
 * Parsing of user input and formatting of everything shown back to them.
 *
 * These functions are pure and know nothing about the DOM, which makes the
 * trickiest part of the app — reading a number typed by a human — testable
 * in isolation.
 */

import { LOCALE } from './config.js';
import { strings } from './strings.js';

const NUMERIC = /^\d+(\.\d+)?$/;
const GROUPED_BY_COMMA = /^\d{1,3}(,\d{3})+$/;
const GROUPED_BY_DOT = /^\d{1,3}(\.\d{3})+$/;

/**
 * Reads an amount typed by a human, accepting either separator convention.
 *
 * `1.234,56` and `1,234.56` are the same number; when both separators are
 * present the rightmost one is the decimal mark. Currency symbols and spaces
 * are ignored. Anything that is not fully numeric afterwards is rejected —
 * `100abc` is a typo, not the number one hundred.
 *
 * @param {string} input
 * @returns {number|null} a non-negative number, or null when unreadable
 */
export function parseAmount(input) {
  if (typeof input !== 'string') return null;

  let text = input.trim().replace(/\s|Bs\.?|\$|€/gi, '');
  if (text === '') return null;

  const hasDot = text.includes('.');
  const hasComma = text.includes(',');

  if (hasDot && hasComma) {
    const decimalMark = text.lastIndexOf('.') > text.lastIndexOf(',') ? '.' : ',';
    const groupMark = decimalMark === '.' ? ',' : '.';
    text = text.split(groupMark).join('').replace(decimalMark, '.');
  } else if (hasComma) {
    text = GROUPED_BY_COMMA.test(text) ? text.split(',').join('') : text.replace(',', '.');
  } else if (hasDot && GROUPED_BY_DOT.test(text)) {
    text = text.split('.').join('');
  }

  if (!NUMERIC.test(text)) return null;

  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/** Formats a monetary amount with the two decimals prices are quoted in. */
export function formatMoney(value) {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats an exchange rate. Up to four decimals, because the BCV publishes
 * that precision and truncating it would silently change the result.
 */
export function formatRate(value) {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

/** Formats a percentage with the single decimal the gauge reads at. */
export function formatPercent(value) {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Formats the EUR/USD cross rate, where small differences matter. */
export function formatCrossRate(value) {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

/**
 * Turns an age into the phrase a person would use out loud.
 *
 * @param {number} timestamp epoch milliseconds
 * @param {number} [now] injectable clock, so tests need no fake timers
 */
export function timeAgo(timestamp, now = Date.now()) {
  const seconds = Math.max(0, (now - timestamp) / 1000);
  if (seconds < 60) return strings.time.justNow;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return strings.time.minutes(minutes);

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return strings.time.hours(hours);

  return strings.time.days(Math.floor(hours / 24));
}

/** Formats the BCV valuation date carried by the API response. */
export function formatDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
