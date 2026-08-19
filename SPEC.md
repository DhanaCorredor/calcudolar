# Specification · Calcudolar

**Version:** 1.1
**Status:** current
**Last revised:** 2026-08-19

This document is the source of truth for *what* Calcudolar does and what counts as correct. The code implements this specification, not the other way round: where the two disagree, either the code is fixed or this document is amended deliberately — never silently.

Requirements carry identifiers (`CALC-1`, `RATE-3`, …) so that tests, issues and commit messages can point at them.

---

## 1. Purpose

Venezuelan prices are quoted in foreign currency but charged in bolívares. Calcudolar answers the question that comes up several times a day: **how much is this in dollars and euros?**

Type the bolívar amount and read the conversion at the official BCV rate and at the parallel rate, in both currencies, without touching anything else. The rates fetch themselves.

A second, optional question follows from the first: when a shop applies its own rate, how far is it from the reference? That comparison is available on demand but stays out of the way, because it is not why most people open the app.

### 1.1 Who it is for

Someone with a phone and ten seconds. Three design constraints follow:

- **One input.** Typing the amount is the whole interaction. Rates fetch themselves; nothing else is required to get an answer.
- **Immediate answer.** No calculate button; results follow every keystroke.
- **Progressive disclosure.** Everything beyond "what is this in dollars" — the merchant's rate, the overcharge gauge, editing rates by hand — is collapsed until asked for.

The interface is written in Venezuelan Spanish because that is who uses it. Everything else — identifiers, comments, commits, documentation — is in English, so the codebase stays legible to a wider audience. All user-facing copy is isolated in `src/strings.js`.

### 1.2 Non-goals

Deliberately out of scope for this version:

- History of past queries or of individual merchants.
- Recommending where to pay, or comparing establishments.
- Acting as financial advice, or claiming any rate is legally "correct".
- A backend, user accounts, or sync across devices.
- Currencies beyond USD and EUR.

---

## 2. Glossary

| Term | Meaning |
|---|---|
| **Amount** | The bolívar sum the merchant wants to charge. |
| **Rate** | Bolívares per unit of foreign currency. Always entered as Bs/$. |
| **Merchant rate** | The rate the establishment applies. The one figure the user must type. |
| **Official rate** | Published by the Banco Central de Venezuela (BCV). |
| **Parallel rate** | Average of the unofficial market. |
| **Reference** | The rate the overcharge is measured against: official, parallel or worst case. |
| **Overcharge** | The percentage excess of foreign currency handed over versus the reference. |
| **Infartómetro** | The gauge translating that overcharge into an alarm level. |
| **Auto / manual mode** | Per-reference state: fed by the live source, or typed by the user. |

---

## 3. Calculation rules

The rule everything rests on, and the source of most confusion about it: **the bolívar amount is fixed**. A *lower* rate makes nothing cheaper — it means the customer surrenders *more* foreign currency. Overcharging therefore appears as a merchant rate **below** the reference.

**CALC-1 · Conversion.**

```text
foreign currency = amount ÷ rate
```

**CALC-2 · Overcharge percentage.**

```text
overcharge % = (reference rate ÷ merchant rate − 1) × 100
```

Positive means the customer overpays; negative means they come out ahead. The formula depends only on the two rates, so **the gauge produces a reading before any amount is typed** — the amount is needed for the money figures alone.

**CALC-3 · Absolute difference.**

```text
difference = merchant currency − reference currency
```

Reported in both dollars and euros.

**CALC-4 · Euro conversion.** Where a Bs/€ rate is published for the same source, it is used directly. Where none exists — the merchant's rate, and any rate typed by hand — it is derived from the BCV cross rate:

```text
EUR/USD cross = official EUR rate ÷ official USD rate
derived Bs/€   = Bs/$ rate × cross
euros          = amount ÷ Bs/€
```

**CALC-5 · Precision.** Calculations run in floating point with no intermediate rounding. Rounding happens only on display (`UI-6`).

**CALC-6 · Insufficient data.** A result depending on a missing, zero or unreadable value is omitted, never shown as zero. An amount without a merchant rate produces no rows; a merchant rate without any reference produces no gauge reading.

---

## 4. Rate acquisition

**RATE-1 · Source.** `https://ve.dolarapi.com/v1/dolares` and `/v1/euros`, reading the `promedio` field of the `oficial` and `paralelo` entries.

**RATE-2 · Why a mirror and not the BCV.** `bcv.org.ve` is not consumable from a browser: its TLS chain is incomplete and it sends no CORS headers, so a `fetch()` fails before reading a byte. Reading the BCV directly would require a backend of our own, which contradicts §1.2. **Revisit if an official CORS-enabled source appears.**

**RATE-3 · When rates are fetched.**

- on page load;
- every 10 minutes, while automatic refresh is on;
- on returning to the tab, if more than 10 minutes have passed since the last success;
- on regaining connectivity, subject to the same automatic-refresh switch;
- whenever the user presses Refresh.

**RATE-4 · Timeout.** Each request aborts after 9 seconds. A request in flight suppresses any new one.

**RATE-5 · Freshness states.**

| State | Condition | Signal |
|---|---|---|
| Live | last success ≤ 45 min ago | green |
| Stale | last success > 45 min ago | amber |
| No source | never fetched, nothing cached | red |

The status strip always shows the rate in force, its age in plain language, and the BCV valuation date.

**RATE-6 · Auto/manual state machine.** Each reference rate is independently auto or manual:

- Starts **auto**, receiving every new value with a brief visual flash.
- Typing in the field switches it to **manual** at once; it stops updating and its value persists between sessions.
- The toggle beside the label switches modes. Returning to auto repopulates the field from the live source.
- The merchant rate is outside this machine — always manual.

**RATE-7 · Cache.** The last successful snapshot is stored locally and loaded before the first request, so the app is usable offline with the last known rate, flagged per `RATE-5`.

**RATE-8 · Failed request.** A network error never discards the current snapshot: the previous value stays and keeps ageing towards stale. Only a user-initiated refresh reports the failure.

**RATE-9 · Partial payloads.** The official dollar rate is the one figure the app cannot work without; its absence is treated as a failed request. Any other missing figure degrades that column only.

---

## 5. Interface and verdict

**UI-1 · Alarm levels.**

| Overcharge | Colour | Verdict (as shown) |
|---|---|---|
| < −0.5 % | Cyan | ¡Te están dando chance! 🤑 |
| ≤ 0.5 % | Green | Todo legal, respira 😇 |
| ≤ 3 % | Green | Cobro justo 🙂 |
| ≤ 10 % | Yellow | Te están clavando un poquito 🤨 |
| ≤ 25 % | Orange | Ay papá, eso duele 😰 |
| ≤ 50 % | Red | ¡Llamen a la ambulancia! 🚑 |
| > 50 % | Red | Código azul, traigan el desfibrilador 💀 |

The humour is functional rather than decorative: a percentage gets read, a verdict gets understood. No wording may imply the merchant is committing a crime — a freely set rate is not illegal, and the app reports differences, not offences.

**UI-2 · Needle.** Sweeps a semicircle over a 0–60 % domain. Readings beyond it saturate the needle while the printed figure keeps its true value: the needle clips, the number never lies.

**UI-3 · Reference selection.** The user picks official, parallel or **worst case** (the harsher of the two, ties resolving to the official rate). If the chosen reference has no data, the other is used and the label names whichever was applied.

**UI-4 · Recalculation.** Every result updates on each keystroke and on every arrival of new rates. There is no explicit calculate action.

**UI-5 · Forgiving input.** Comma and dot are both accepted as decimal mark and as thousands separator (`1.234,56` and `1,234.56` are one number). Currency symbols and whitespace are discarded. Input that is not fully numeric afterwards is rejected — `100abc` is a typo, not a hundred — and marks the field without blocking the rest of the app.

**UI-6 · Output formatting.** `es-VE` locale. Money to two decimals; rates to between two and four, so the BCV's published precision is not truncated; percentages to one.

**UI-7 · Responsiveness.** Two columns collapsing to one on narrow screens, with no horizontal scrolling at any width. `prefers-reduced-motion` is honoured.

**UI-8 · Accessibility.** The gauge carries a text alternative that includes the current reading and its reference. The verdict and the status strip are live regions, so a screen reader hears results change without the user hunting for them.

**UI-9 · Progressive disclosure.** The page opens on the amount field and the conversion, and nothing else competes with them. Two groups sit collapsed beneath:

| Group | Contains |
|---|---|
| *¿Te cobran a otra tasa?* | merchant rate, gauge, verdict, comparison cards, reference selector |
| *Ajustar las tasas a mano* | the reference rate fields and their auto/manual toggles |

Both are ordinary disclosure elements, so they work without JavaScript, are keyboard operable and are searchable by the browser's find-in-page. A group reopens on load when it holds a value the user left behind — a merchant rate typed earlier reopens its group, so restored state is never hidden from the person who entered it.

Collapsed content is still rendered and kept current; disclosure governs visibility, never correctness.

---

## 6. Persistence

**STORE-1 · What is kept.** Amount, merchant rate, reference rates *only while manual*, gauge reference and both switches.

**STORE-2 · User control.** Persistence can be switched off; doing so erases what was already stored.

**STORE-3 · Clear data.** Empties the amount and merchant rate, returns both references to auto and repopulates them. It does **not** clear the rate cache: that is public data from the source, not the user's.

**STORE-4 · Storage unavailable.** Where the browser blocks local storage, the app works normally for the session and reports no error.

---

## 7. Acceptance criteria

Figures below are the real rates of 2026-08-19: official `775.3356`, parallel `881.054062`, official euro `897.82311808`.

**AC-1 · Typical overcharge.**
Given an amount of `10,000` Bs and a merchant rate of `700`, referenced to the official rate,
then `$14.29` is shown for the merchant and `$12.90` for the BCV,
the overcharge reads `10.8 %`, the difference `+$1.39`,
and the verdict is orange: *"Ay papá, eso duele"*.

**AC-2 · Euro equivalent.**
In the same scenario the cross rate is `1.1580`,
the merchant rate is equivalent to `810.59 Bs/€`,
and `€12.34` is shown against the BCV's `€11.14`, a difference of `+€1.20`.

**AC-3 · Fair charge.**
Given a merchant rate equal to the official rate,
then the overcharge reads `0.0 %`, the needle rests at the far left,
and the verdict is green: *"Todo legal, respira"*.

**AC-4 · Charge in the customer's favour.**
Given a merchant rate of `800` against an official rate of `775.3356`,
then the overcharge reads `−3.1 %`, the label reads *"Descuento vs. BCV"*,
and the verdict is *"¡Te están dando chance!"*.

**AC-5 · Needle saturation.**
Given a merchant rate of `500`, the reading is `55.1 %` with the *"Código azul"* verdict.
At `400` the figure rises to `93.8 %` while the needle stays at the stop.

**AC-6 · Worst case.**
Given overcharges of `10.8 %` (official) and `25.9 %` (parallel),
worst-case mode reads `25.9 %` and names the parallel rate.

**AC-7 · Reading without an amount.**
Given a merchant rate and a reference rate but no amount,
then the gauge and both percentages are shown, and the money figures read `—`.

**AC-7b · Conversion is the whole interaction.**
Given a freshly loaded page and an amount of `10,000` Bs,
then both conversions are shown without any further input,
and both disclosure groups remain closed.

**AC-7c · Restored state reopens its group.**
Given a merchant rate saved from an earlier session,
when the page loads, its disclosure group is open.

**AC-8 · Taking manual control.**
Given an official rate in auto mode, when the user types in the field,
then it switches to manual, stops updating on subsequent refreshes,
and keeps its value across a reload.

**AC-9 · Returning to automatic.**
Given a manual rate, when the user presses its mode toggle,
then it returns to auto, repopulates from the live source and stops being persisted.

**AC-10 · Offline.**
Given a previous successful fetch and no network,
the cached rates are shown on load, the state turns amber past 45 minutes,
and every calculation keeps working.

**AC-11 · Ambiguous input.**
`1.234,56` and `1,234.56` are both read as `1234.56`.

**AC-12 · Invalid input.**
Given non-numeric text in a field, that field is marked, results depending on it are omitted,
and the rest of the interface stays usable.

---

## 8. Known gaps

Writing this specification after the fact exposed behaviour that existed by accident of implementation rather than by decision. Three were corrected while restructuring the project — lenient parsing, a missing text alternative on the gauge, and reconnection ignoring the refresh switch. These remain:

**GAP-1 · No euros on a first offline run.** The cross rate depends on BCV data. Opening the app for the first time with no network and typing rates by hand makes the euro column vanish without explanation. *Proposal: an editable cross rate as a fallback, or a seeded value.*

**GAP-2 · One verdict for every bargain.** −1 % and −40 % read identically. The alarm scale is graduated; the relief scale is not.

**GAP-3 · No retry after a failure.** A failed request waits the full ten-minute cycle. Backoff would cover the brief outages that are the common case.

**GAP-4 · No defence against typos.** Entering `70` instead of `700` yields a thousand-percent overcharge and a catastrophic verdict, with nothing suggesting the input may be wrong.

**GAP-5 · No end-to-end tests.** Pure logic is covered by unit tests; rendering and the refresh cycle are verified by hand.

---

## 9. Roadmap

Out of scope for 1.0, ordered by value against effort:

1. Close `GAP-5`, then `GAP-1` — coverage and a graceful cold start.
2. Installable as a PWA with a service worker: the use case is a phone at a till, often without signal.
3. Share a result as text or an image.
4. Selectable rate providers, should a second CORS-enabled source appear.
5. Query history, which would enable comparing merchants over time — but it stores spending habits and deserves its own privacy decision.

---

## 10. Maintaining this document

Any behavioural change lands here **before** the code changes, and the commit references the affected requirement identifier. Should a formal SDD workflow be adopted, this becomes the root specification and each new feature gets `specs/NNN-name/` with its own plan and task breakdown.
