# Prep-Truth

**Upload a restaurant's order history, get the prep-time settings it should have set.**
Per daypart, backed by the restaurant's own data, with before/after replay proof.
Deterministic, in-browser, reproducible — no accounts, no database, nothing leaves the page.

**Live:** [prep-truth.ricothen.com](https://prep-truth.ricothen.com) *(works fully offline — no API key needed for the demo)*

## Why

Delivery platforms promise delivery times from a **prep-time setting** that most
restaurants set once by hand and never check. Wrong in two directions, both expensive:

| | Promise too short (optimistic) | Promise too long (pessimistic) |
|---|---|---|
| What happens | order is "late" before anyone works; riders idle at the counter; delays cascade into the next orders | food sits ready and cools; quoted ETAs inflate |
| Who pays | riders, support, refunds | customers (cold food, 1★), conversion |

The root cause: one static number versus reality that varies by daypart, basket and menu.

## What you get — one page, four blocks

1. **Upload CSV** (or pick one of **10 sample restaurants**, each with a different data
   condition). Column names don't match? An AI mapper suggests the mapping; you confirm
   via dropdowns. Every dataset — uploaded or sample — can be **viewed, edited, and
   downloaded** in the in-page data panel; edits re-run the analysis instantly and last
   for the browser session only (a fresh visit always gets the original seeded data).
2. **Verdict strip** — % of orders late at the kitchen, median actual prep, total rider
   waiting, total food cooling.
3. **Recommended settings** — per daypart: the **p85 of actual prep, rounded up to 5 min**
   (floor 10 min; needs ≥ 5 orders). One rule, explainable to anyone.
4. **Before → after** — the same orders replayed with the new settings: late % and rider
   waiting, before versus after.
5. **Plain-English readout** — a short paragraph drafted from the computed numbers
   (AI when configured; an offline template quoting the same numbers otherwise).

## Sample restaurants — ten data conditions to test

All synthetic, generated in the browser from fixed seeds (`src/data/restaurants.ts`).
Each condition is locked by `src/data/__tests__/restaurants.test.ts`.

| Restaurant | Data condition | What a reviewer can test |
|---|---|---|
| Kreuzberg Kanteen | optimistic promises — 36.7% late (the original locked seed-42 dataset) | the full baseline flow, recommendations going up |
| Mitte Veggie Room | well-calibrated — 3.8% late | a healthy kitchen; recommendations stay within ±5 min |
| Tempelhof Pizza Studio | pessimistic promises — 0% late, food cools | recommendations going **down** (25→10, 35→15) |
| Neukölln Spätkauf Döner | night-only kitchen | empty dayparts, one small recommendation |
| Charlottenburg Kaffeewerk | 12 orders in 2 days | "too few orders" guards for 3 of 4 dayparts |
| Prenzlauer Bio-Brunch | German POS column names | the column-mapping flow (AI suggestion + manual confirm) |
| Friedrichshain Burger Depot | ~15% broken rows | honest skip accounting — all three skip reasons appear |
| Wedding Ramen Lab | wild prep variance — 88.8% late | extreme recommendations (up to 50 min) and replay shift caps |
| Schöneberg Altbau Küche | legacy export: UTC/local/millis timestamps, decimal promises, duplicate rows | messy-but-parseable formats, daypart skew from UTC rows |
| Moabit Mega Kitchen | 1,952 orders over 45 days | scale: generation, parsing and rendering stay snappy |

## Measured results (synthetic example dataset, seed 42 — locked by test)

`src/engine/__tests__/readme.test.ts` asserts every number below; the README fails CI if
the generator drifts.

| Metric | Value |
|---|---|
| Orders analyzed | 747 |
| Rows skipped (counted, never hidden) | 21 |
| Orders late | 36.7% |
| Median actual prep | 14.2 min |
| Rider waiting (total) | 3367 min |
| Food waiting (total) | 2935 min |
| Recommended settings | morning 20 · lunch 30 · afternoon 15 (keep) · evening 25 min |
| **Late after replay** | **7.2%** |
| **Rider waiting after** | **763 min (−77%)** |
| Food waiting after (naive model) | 7081 min — see honest limitation below |

Reproduce: `npm test` (the readme test prints the same table and pins these values).

## How it works

```
CSV ──> column mapping (manual dropdowns, AI-assisted)
    ──> validation (unparseable / implausible rows are skipped AND counted)
    ──> per-daypart stats (median, p85 of actual prep)
    ──> recommendation = ceil5(p85), floor 10 min, ≥ 5 orders
    ──> deterministic replay (same orders, new promise) ──> before/after
```

- Prep actual = `food_ready_at − accepted_at`; rider wait = `picked_up_at − rider_arrived_at`;
  food cooling = positive part of `rider_arrived_at − food_ready_at`.
- "Late" = actual prep exceeded the promised prep time (kitchen-level).
- Replay model: rider arrival is re-simulated around the new promise (shift capped at
  ±60 min). Kitchen speed never changes — only the honesty of the promise.

## The LLM part (and why it can't break anything)

Two uses, both strictly downstream of the deterministic engine:

- **Column mapping** — an LLM reads your header row and three sample rows, then *suggests*
  the mapping. It only fills fields the local exact-name matcher left empty; you confirm
  every choice in a dropdown.
- **Narrative summary** — the LLM writes the plain-English paragraph **from the computed
  numbers only**; it is not allowed to invent or recompute a number.

Without an API key (or on any failure) the function answers `{offline: true}` and the UI
falls back silently: manual mapping plus an offline template quoting the same numbers.
The demo never dies. Key never reaches the browser; no SDK — one `fetch` call in
`api/llm.ts`.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173 — full offline mode
npm test           # engine unit tests + readme-number lock
npm run e2e        # Playwright end-to-end (builds must exist: npm run build first)
npm run typecheck && npm run build
```

## Environment variables (all optional)

| Variable | Default | Purpose |
|---|---|---|
| `LLM_API_KEY` | — | enables AI mapping + AI summary; without it the app is fully functional offline |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | any OpenAI-compatible endpoint |
| `LLM_MODEL` | `gpt-4o-mini` | model for both modes |
| `MOCK_MODE` | `false` | `true` forces the offline path even with a key set |

## Deploy to Vercel

```bash
vercel link && vercel deploy --prod
# optional: vercel env add LLM_API_KEY production
```

## Honest limitations

- The before/after replay is **naive by design**: riders are re-dispatched around the new
  promise while kitchens keep cooking at their historical time. Real kitchens that time
  cooking to the promise avoid most of the extra cooling shown in the naive numbers.
- "Late" means the kitchen exceeded its *prep* promise — route traffic and rider supply
  are outside this tool's scope (and are separated by the event windows used).
- The example dataset is synthetic (seeded generator, 3% deliberately broken rows to
  exercise the skip accounting). No real restaurant data exists in this repo.

## Portfolio context

Prep-Truth is the restaurant-partner third of a trilogy built for delivery-platform
engineering roles: [`lastmile-lab`](https://github.com/ricothenfx/lastmile-lab) (rider &
dispatch operations), [`hungry`](https://github.com/ricothenfx/hungry) (consumer, AI-first),
`prep-truth` (restaurant partner, data & calibration). Not affiliated with any delivery
company; example data is synthetic. Map/brand-free by design.

© 2026 prep-truth contributors
