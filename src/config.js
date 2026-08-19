/**
 * Application-wide configuration.
 *
 * Thresholds, timings and endpoints live here so that tuning the app's
 * behaviour never requires touching calculation or rendering code.
 */

/** Locale used for every number the user reads. The UI targets Venezuela. */
export const LOCALE = 'es-VE';

/**
 * Exchange rate endpoints.
 *
 * The BCV website cannot be read from a browser: its TLS chain is incomplete
 * and it sends no CORS headers. This mirror republishes the official figures
 * with an open CORS policy. See SPEC.md, requirement RT-2.
 */
export const RATES_API = {
  usd: 'https://ve.dolarapi.com/v1/dolares',
  eur: 'https://ve.dolarapi.com/v1/euros',
};

export const REQUEST_TIMEOUT_MS = 9_000;
export const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/** Past this age, cached rates are shown but flagged as no longer fresh. */
export const STALE_AFTER_MS = 45 * 60 * 1000;

export const STORAGE_KEYS = {
  preferences: 'calcudolar.preferences',
  ratesCache: 'calcudolar.rates',
};

/** Highest overcharge the needle can point at. Larger values saturate it. */
export const GAUGE_MAX_PERCENT = 60;

/** Coloured bands of the gauge arc, as upper bounds in overcharge percent. */
export const GAUGE_ZONES = [
  { maxPercent: 3, color: '#22e08a' },
  { maxPercent: 10, color: '#ffd23f' },
  { maxPercent: 25, color: '#ff9f1c' },
  { maxPercent: 60, color: '#ff2e63' },
];

/**
 * Below this percentage the merchant is charging under the reference, which
 * favours the customer rather than harming them.
 */
export const BARGAIN_THRESHOLD_PERCENT = -0.5;

/**
 * Alarm levels, ordered from mildest to worst. The first level whose
 * `maxPercent` is not exceeded wins. Wording lives in `strings.js`.
 */
export const VERDICT_LEVELS = [
  { key: 'safe', maxPercent: 0.5, tone: 'good', color: '#22e08a' },
  { key: 'fair', maxPercent: 3, tone: 'good', color: '#22e08a' },
  { key: 'mild', maxPercent: 10, tone: 'warn', color: '#ffd23f' },
  { key: 'painful', maxPercent: 25, tone: 'bad', color: '#ff9f1c' },
  { key: 'severe', maxPercent: 50, tone: 'critical', color: '#ff2e63' },
  { key: 'critical', maxPercent: Infinity, tone: 'critical', color: '#ff2e63' },
];

export const BARGAIN_VERDICT = {
  key: 'bargain',
  tone: 'good',
  color: '#00e5ff',
};

/** Which reference rate the gauge measures the merchant against. */
export const REFERENCE_MODES = {
  official: 'official',
  parallel: 'parallel',
  worst: 'worst',
};
