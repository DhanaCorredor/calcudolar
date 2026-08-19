<h1 align="center">💸 Calcudolar</h1>

<p align="center">
  <em>How much is that in dollars?</em><br>
  A no-dependency web calculator that turns a Venezuelan bolívar amount into
  dollars and euros at the official and parallel rates, which it fetches on its
  own.
</p>

<p align="center">
  <a href="SPEC.md">Specification</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#getting-started">Getting started</a>
</p>

---

## The problem

Venezuelan prices are quoted in foreign currency but charged in bolívares, so the same question comes up several times a day: *how much is this actually worth?*

Calcudolar answers it in one step. Type the bolívar amount and read it in dollars and euros, at both the official BCV rate and the parallel rate. Nothing else to fill in — the rates fetch themselves.

## Features

- **One input.** Type the amount; both conversions appear in both currencies as you type.
- **Rates that fetch themselves.** Official and parallel rates load on open and refresh every ten minutes, on tab focus and on regaining connectivity.
- **Works offline.** The last successful snapshot is cached and clearly flagged once stale.
- **Progressive disclosure.** Two collapsed groups hold everything beyond the basic question: comparing against a shop's own rate, and editing rates by hand.
- **Remembers your session**, and lets you switch that off.

## The optional half: is this shop overcharging?

Shops apply their own rate, and a rate *below* the reference means you hand over more currency for the same goods. Open *"¿Te cobran a otra tasa?"*, type the rate you are being charged, and the **Infartómetro** maps the gap onto an alarm level — from *"todo legal, respira"* to *"código azul"*.

It stays collapsed because it is not why most people open the app.

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

No framework, no bundler and no runtime dependencies — jsdom, used only by the tests, is the single devDependency. Plain ES modules, split by responsibility so the domain logic can be tested in Node without a browser:

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
  calculator.test.js       pure logic
  format.test.js           parsing and formatting
  dom/                     the real app booted in jsdom
    conversion.test.js
    overcharge.test.js
    cold-start.test.js
    restored-state.test.js
```

The dependency flow runs one way: `main` orchestrates, `ui` only draws, `calculator` and `format` know nothing about the DOM, the network or the clock. That is what makes the unit tests possible with no test framework at all. The DOM suites sit on top, booting the real `main.js` against the real `index.html` so the wiring is covered too — 73 tests in all.

### Where the rates come from

[`ve.dolarapi.com`](https://ve.dolarapi.com), which republishes the [BCV](https://www.bcv.org.ve/)'s official figures alongside the parallel-market average.

The BCV's own site cannot be read from a browser: its TLS chain is incomplete and it sends no CORS headers, so a `fetch()` fails before reading a byte. Consuming it directly would require a backend, which this project deliberately does without. See `RATE-2` in the [specification](SPEC.md).

## Getting started

Requires Node 20+ and [pnpm](https://pnpm.io) 10+. The version is pinned in `packageManager`, so Corepack picks it up on its own:

```bash
corepack enable
pnpm install         # no dependencies to fetch; this just verifies the toolchain
```

ES modules are served over HTTP, so opening the file directly will not work. Any static server does:

```bash
pnpm dev             # pnpm dlx serve .
# or, with nothing installed at all
python -m http.server 8000
```

Then open the address it prints.

### Tests

```bash
pnpm test            # node --test, no dependencies
pnpm test:watch
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
