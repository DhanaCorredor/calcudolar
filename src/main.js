/**
 * Application entry point: holds the state, wires the events and drives a
 * single recalculation pass whenever anything changes.
 */

import {
  convert,
  crossRate,
  difference,
  findVerdict,
  overchargePercent,
  selectReading,
  toEuroRate,
} from './calculator.js';
import { REFERENCE_MODES, REFRESH_INTERVAL_MS, STORAGE_KEYS } from './config.js';
import { formatRate, parseAmount } from './format.js';
import { cacheRates, fetchRates, loadCachedRates } from './rates.js';
import { readJson, remove, writeJson } from './storage.js';
import { strings } from './strings.js';
import {
  buildGauge,
  elements,
  markInvalid,
  rateInputs,
  renderComparison,
  renderGauge,
  renderResults,
  renderStatus,
  setRateMode,
  setRateValue,
  setReferenceMode,
  setRefreshBusy,
  showToast,
} from './ui.js';

const STATUS_TICK_MS = 30_000;

const state = {
  referenceMode: REFERENCE_MODES.official,
  /** Whether each reference rate follows the live feed or the user. */
  autoRates: { official: true, parallel: true },
  /** @type {import('./rates.js').RateSnapshot|null} */
  snapshot: null,
  isLoading: false,
  refreshTimer: null,
};

/* ----------------------------------------------------------- Persistence */

function savePreferences() {
  if (!elements.persistToggle.checked) return;

  writeJson(STORAGE_KEYS.preferences, {
    referenceMode: state.referenceMode,
    autoRates: state.autoRates,
    autoRefresh: elements.autoRefreshToggle.checked,
    amount: elements.amount.value,
    merchantRate: elements.merchantRate.value,
    // Automatic rates come back from the feed, so only manual ones are kept.
    officialRate: state.autoRates.official ? '' : elements.officialRate.value,
    parallelRate: state.autoRates.parallel ? '' : elements.parallelRate.value,
  });
}

function restorePreferences() {
  const saved = readJson(STORAGE_KEYS.preferences);
  if (!saved) return;

  state.referenceMode = Object.values(REFERENCE_MODES).includes(saved.referenceMode)
    ? saved.referenceMode
    : REFERENCE_MODES.official;

  state.autoRates = {
    official: saved.autoRates?.official !== false,
    parallel: saved.autoRates?.parallel !== false,
  };

  elements.autoRefreshToggle.checked = saved.autoRefresh !== false;
  elements.amount.value = saved.amount ?? '';
  elements.merchantRate.value = saved.merchantRate ?? '';
  if (!state.autoRates.official) elements.officialRate.value = saved.officialRate ?? '';
  if (!state.autoRates.parallel) elements.parallelRate.value = saved.parallelRate ?? '';

  revealGroupsHoldingState();
}

/**
 * Restored input must never sit hidden behind a closed group: a value the user
 * typed last time is exactly the thing they expect to find again (UI-9).
 */
function revealGroupsHoldingState() {
  elements.merchantDisclosure.open = elements.merchantRate.value.trim() !== '';
  elements.ratesDisclosure.open = !state.autoRates.official || !state.autoRates.parallel;
}

/* ------------------------------------------------------------ Live rates */

/** Copies the latest snapshot into whichever fields are still automatic. */
function applySnapshotToInputs({ flash = false } = {}) {
  if (!state.snapshot) return;

  const values = {
    official: state.snapshot.usd.official,
    parallel: state.snapshot.usd.parallel,
  };

  for (const [reference, value] of Object.entries(values)) {
    if (!state.autoRates[reference] || value === null) continue;
    setRateValue(rateInputs[reference], formatRate(value), { flash });
  }
}

async function refreshRates({ manual = false } = {}) {
  if (state.isLoading) return;

  state.isLoading = true;
  setRefreshBusy(true);
  renderStatus({ snapshot: state.snapshot, isLoading: true });

  try {
    state.snapshot = await fetchRates();
    cacheRates(state.snapshot);
    applySnapshotToInputs({ flash: true });
    if (manual) showToast(strings.toasts.ratesUpdated);
  } catch {
    // A failed request never discards what we already had: the previous
    // snapshot stays on screen and simply keeps ageing towards "stale".
    if (manual) {
      showToast(
        state.snapshot
          ? strings.toasts.ratesFailedWithCache
          : strings.toasts.ratesFailedNoCache,
      );
    }
  } finally {
    state.isLoading = false;
    setRefreshBusy(false);
    renderStatus({ snapshot: state.snapshot, isLoading: false });
    update();
  }
}

function scheduleAutoRefresh() {
  clearInterval(state.refreshTimer);
  if (!elements.autoRefreshToggle.checked) return;
  state.refreshTimer = setInterval(() => refreshRates(), REFRESH_INTERVAL_MS);
}

/* ---------------------------------------------------------------- Update */

/** Reads the form, recalculates everything and repaints. Cheap enough to run on every keystroke. */
function update() {
  const amount = readField(elements.amount);
  const merchantRate = readField(elements.merchantRate);
  const officialRate = readField(elements.officialRate);
  const parallelRate = readField(elements.parallelRate);

  const snapshot = state.snapshot;
  const cross = snapshot ? crossRate(snapshot.eur.official, snapshot.usd.official) : null;

  /** Published euro rates apply only while the field mirrors the live feed. */
  const publishedEuroRate = {
    official: state.autoRates.official && snapshot ? snapshot.eur.official : null,
    parallel: state.autoRates.parallel && snapshot ? snapshot.eur.parallel : null,
  };

  const charges = {
    merchant: chargeFor(amount, merchantRate, toEuroRate(merchantRate, cross)),
    official: chargeFor(
      amount,
      officialRate,
      publishedEuroRate.official ?? toEuroRate(officialRate, cross),
    ),
    parallel: chargeFor(
      amount,
      parallelRate,
      publishedEuroRate.parallel ?? toEuroRate(parallelRate, cross),
    ),
  };

  renderResults(
    Object.entries(charges)
      .filter(([, charge]) => charge.usd !== null)
      .map(([key, charge]) => ({ key, ...charge })),
  );

  const percentages = {
    official: overchargePercent(merchantRate, officialRate),
    parallel: overchargePercent(merchantRate, parallelRate),
  };

  for (const reference of ['official', 'parallel']) {
    renderComparison(reference, comparisonFor(charges, reference, percentages[reference]));
  }

  const reading = selectReading({ ...percentages, mode: state.referenceMode });
  renderGauge({
    percent: reading?.percent ?? null,
    referenceName: reading ? strings.referenceNames[reading.reference] : '',
    verdict: reading ? findVerdict(reading.percent) : null,
  });
}

/** Parses a field and flags it when the text is there but unreadable. */
function readField(input) {
  const value = parseAmount(input.value);
  markInvalid(input, input.value.trim() !== '' && value === null);
  return value;
}

function chargeFor(amount, dollarRate, euroRate) {
  return {
    dollarRate,
    euroRate,
    usd: convert(amount, dollarRate),
    eur: convert(amount, euroRate),
  };
}

function comparisonFor(charges, reference, percent) {
  const verdict = findVerdict(percent);
  if (verdict === null) return null;

  return {
    percent,
    verdict,
    differenceUsd: difference(charges.merchant.usd, charges[reference].usd),
    differenceEur: difference(charges.merchant.eur, charges[reference].eur),
  };
}

/* ---------------------------------------------------------------- Events */

function toggleRateMode(reference, isAuto) {
  state.autoRates[reference] = isAuto;
  setRateMode(reference, isAuto);
  if (isAuto) applySnapshotToInputs({ flash: true });
}

function clearEverything() {
  elements.amount.value = '';
  elements.merchantRate.value = '';
  toggleRateMode('official', true);
  toggleRateMode('parallel', true);
  state.referenceMode = REFERENCE_MODES.official;
  setReferenceMode(state.referenceMode);
  revealGroupsHoldingState();

  // The rate cache is public data from the feed, not the user's, so it stays.
  remove(STORAGE_KEYS.preferences);

  update();
  elements.amount.focus();
  showToast(strings.toasts.cleared);
}

function bindEvents() {
  for (const input of [elements.amount, elements.merchantRate]) {
    input.addEventListener('input', () => {
      update();
      savePreferences();
    });
  }

  for (const [reference, input] of Object.entries(rateInputs)) {
    input.addEventListener('input', () => {
      // Typing over an automatic rate is how you take manual control of it.
      if (state.autoRates[reference]) toggleRateMode(reference, false);
      update();
      savePreferences();
    });
  }

  for (const toggle of document.querySelectorAll('.mode-toggle[data-rate]')) {
    toggle.addEventListener('click', () => {
      const { rate } = toggle.dataset;
      const isAuto = !state.autoRates[rate];

      toggleRateMode(rate, isAuto);
      if (isAuto && !state.snapshot) refreshRates({ manual: true });

      update();
      savePreferences();
      showToast(isAuto ? strings.toasts.autoRateOn : strings.toasts.autoRateOff);
    });
  }

  elements.referenceModes.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-mode]');
    if (!button) return;

    state.referenceMode = button.dataset.mode;
    setReferenceMode(state.referenceMode);
    update();
    savePreferences();
  });

  elements.refreshButton.addEventListener('click', () => refreshRates({ manual: true }));
  elements.clearButton.addEventListener('click', clearEverything);

  elements.persistToggle.addEventListener('change', (event) => {
    if (event.target.checked) {
      savePreferences();
      showToast(strings.toasts.persistenceOn);
    } else {
      remove(STORAGE_KEYS.preferences);
      showToast(strings.toasts.persistenceOff);
    }
  });

  elements.autoRefreshToggle.addEventListener('change', (event) => {
    scheduleAutoRefresh();
    savePreferences();
    showToast(
      event.target.checked ? strings.toasts.autoRefreshOn : strings.toasts.autoRefreshOff,
    );
  });

  document.addEventListener('visibilitychange', () => {
    const isOverdue = state.snapshot && Date.now() - state.snapshot.fetchedAt > REFRESH_INTERVAL_MS;
    if (!document.hidden && elements.autoRefreshToggle.checked && isOverdue) refreshRates();
  });

  // Regaining connectivity is worth a fresh read, but only if the user has
  // left automatic refreshing on.
  window.addEventListener('online', () => {
    if (elements.autoRefreshToggle.checked) refreshRates();
  });

  // Keeps the "3 min ago" line honest without recalculating anything.
  setInterval(() => {
    if (state.snapshot && !state.isLoading) {
      renderStatus({ snapshot: state.snapshot, isLoading: false });
    }
  }, STATUS_TICK_MS);
}

/* ------------------------------------------------------------------ Boot */

function start() {
  buildGauge();
  restorePreferences();

  setReferenceMode(state.referenceMode);
  setRateMode('official', state.autoRates.official);
  setRateMode('parallel', state.autoRates.parallel);

  // Show cached rates immediately; the network request only improves on them.
  state.snapshot = loadCachedRates();
  applySnapshotToInputs();

  bindEvents();
  renderStatus({ snapshot: state.snapshot, isLoading: false });
  update();

  refreshRates();
  scheduleAutoRefresh();
}

start();
