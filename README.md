<h1 align="center">💸 Calcudolar</h1>

<p align="center">
  <em>How much is that bolívar charge really costing you?</em><br>
  A no-dependency web calculator that converts a Venezuelan bolívar charge into
  dollars and euros, and measures how far the merchant's rate strays from the
  official one.
</p>

<p align="center">
  <a href="SPEC.md">Specification</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#getting-started">Getting started</a>
</p>

---

## The problem

Venezuelan prices are quoted in foreign currency but charged in bolívares, and every shop applies its own conversion rate. When that rate sits below the market reference, you hand over more foreign currency for the same goods — and nothing at the till tells you so.

Calcudolar tells you before you pay. Type the amount and the rate you are being charged at; it answers what that comes to in dollars and euros against the official BCV rate and the parallel market, and how much the gap is costing you.

## Features

- **One amount, two currencies, three rates.** Every conversion side by side: the merchant's, the BCV's and the parallel market's.
- **Rates that fetch themselves.** Official and parallel rates load on open and refresh every ten minutes, on tab focus and on regaining connectivity. Either can be taken over manually with one click.
- **The *Infartómetro*.** A gauge that maps the overcharge onto an alarm level, from *"todo legal, respira"* to *"código azul"*.
- **Works offline.** The last successful snapshot is cached and clearly flagged once stale.
- **Remembers your session**, and lets you switch that off.

## The rule it all rests on

The bolívar amount is fixed, so a *lower* rate makes nothing cheaper — it means you surrender *more* foreign currency. Overcharging shows up as a merchant rate **below** the reference:

```text
foreign currency = amount ÷ rate
overcharge %     = (reference rate ÷ merchant rate − 1) × 100
```

Charged at 700 Bs/$ while the BCV sits at 775.34, you are paying about 10.8 % over the odds.

| Overcharge | Verdict |
|---|---|
| ≤ 3 % | 🟢 Todo legal, respira |
| 3–10 % | 🟡 Te están clavando un poquito |
| 10–25 % | 🟠 Ay papá, eso duele |
| 25–50 % | 🔴 ¡Llamen a la ambulancia! |
| > 50 % | 💀 Código azul, traigan el desfibrilador |

## Language

The interface is in Venezuelan Spanish, because that is who uses it. Everything else — identifiers, comments, commits, documentation — is in English. All user-facing copy lives in [`src/strings.js`](src/strings.js), so wording can be reviewed without reading any logic, and a second locale would be an additive change.

## Architecture

No framework, no bundler, no dependencies. Plain ES modules, split by responsibility so the domain logic can be tested in Node without a browser:

```text
index.html          markup and element hooks
styles.css          design tokens and components
src/
  config.js         endpoints, thresholds, timings
  strings.js        every user-facing string (Spanish)
  format.js         number parsing and formatting
  calculator.js     pure domain logic — conversion, overcharge, verdicts
  storage.js        forgiving localStorage wrapper
  rates.js          API client and snapshot cache
  ui.js             all DOM rendering, including the SVG gauge
  main.js           state, event wiring, refresh cycle
tests/
  calculator.test.js
  format.test.js
```

The dependency flow runs one way: `main` orchestrates, `ui` only draws, `calculator` and `format` know nothing about the DOM, the network or the clock. That is what makes 38 unit tests possible with no test framework and no DOM shim.

### Where the rates come from

[`ve.dolarapi.com`](https://ve.dolarapi.com), which republishes the [BCV](https://www.bcv.org.ve/)'s official figures alongside the parallel-market average.

The BCV's own site cannot be read from a browser: its TLS chain is incomplete and it sends no CORS headers, so a `fetch()` fails before reading a byte. Consuming it directly would require a backend, which this project deliberately does without. See `RATE-2` in the [specification](SPEC.md).

## Getting started

ES modules are served over HTTP, so opening the file directly will not work. Any static server does:

```bash
npm run dev          # npx serve
# or
python -m http.server 8000
```

Then open the address it prints.

### Tests

```bash
npm test             # node --test, no dependencies
npm run test:watch
```

### Deploying

It is a static site — publish the folder as it stands. For GitHub Pages: **Settings → Pages → Deploy from a branch → `main` / `root`**.

## Development

The [specification](SPEC.md) is the source of truth: behaviour changes are written there first, and commits reference the requirement they affect (`CALC-2`, `RATE-6`, …).

Work happens on short-lived branches off `main` — `feat/*`, `fix/*`, `docs/*` — one pull request each, with commits kept atomic.

## Licence

MIT. See [LICENSE](LICENSE).

---

<p align="center"><sub>A reference tool, not financial advice. Always check before you pay.</sub></p>
