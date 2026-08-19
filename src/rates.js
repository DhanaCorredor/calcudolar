/**
 * Retrieval and caching of the reference exchange rates.
 *
 * @typedef {Object} RateSnapshot
 * @property {number} fetchedAt      epoch ms of the successful request
 * @property {string|null} valuationDate  the date the BCV assigned to the figure
 * @property {{official: number|null, parallel: number|null}} usd
 * @property {{official: number|null, parallel: number|null}} eur
 */

import { RATES_API, REQUEST_TIMEOUT_MS, STORAGE_KEYS } from './config.js';
import { readJson, writeJson } from './storage.js';

/** Source labels used by the upstream API. */
const SOURCE = { official: 'oficial', parallel: 'paralelo' };

async function getJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/** Extracts one source's average from an API payload, ignoring bad values. */
function readAverage(payload, source) {
  if (!Array.isArray(payload)) return null;

  const entry = payload.find((item) => item?.fuente === source);
  const value = entry ? Number(entry.promedio) : Number.NaN;

  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Fetches both currencies in parallel and folds them into one snapshot.
 *
 * The official dollar rate is the one figure the app cannot work without, so
 * its absence is treated as a failed request rather than a partial result.
 *
 * @returns {Promise<RateSnapshot>}
 * @throws when the network fails, times out, or the payload lacks the BCV rate
 */
export async function fetchRates() {
  const [dollars, euros] = await Promise.all([getJson(RATES_API.usd), getJson(RATES_API.eur)]);

  const officialDollar = readAverage(dollars, SOURCE.official);
  if (officialDollar === null) throw new Error('Response carried no official rate');

  const officialEntry = dollars.find((item) => item?.fuente === SOURCE.official);

  return {
    fetchedAt: Date.now(),
    valuationDate: officialEntry?.fechaActualizacion ?? null,
    usd: {
      official: officialDollar,
      parallel: readAverage(dollars, SOURCE.parallel),
    },
    eur: {
      official: readAverage(euros, SOURCE.official),
      parallel: readAverage(euros, SOURCE.parallel),
    },
  };
}

/** @returns {RateSnapshot|null} the last snapshot stored, if it looks usable */
export function loadCachedRates() {
  const cached = readJson(STORAGE_KEYS.ratesCache);
  return cached?.usd?.official ? cached : null;
}

export function cacheRates(snapshot) {
  writeJson(STORAGE_KEYS.ratesCache, snapshot);
}
