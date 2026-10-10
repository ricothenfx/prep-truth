import type { ReactNode } from "react"

interface Qa {
  q: string
  a: ReactNode
}

const NON_TECHNICAL: Qa[] = [
  {
    q: "What does Prep-Truth do, in one sentence?",
    a: (
      <>
        Upload a restaurant's order history (CSV) and get the prep-time setting it should
        have used — per daypart, calculated from that restaurant's own data, with a
        before/after replay as proof.
      </>
    ),
  },
  {
    q: "What is a “prep-time setting”, and why does one wrong number cost money?",
    a: (
      <>
        Delivery platforms quote customers an ETA based on a prep-time number the
        restaurant sets in its dashboard — usually once, by hand, and never checked. Too
        short: the order is “late” before anyone even cooks, riders wait at the counter,
        delays cascade. Too long: food sits finished and goes cold, ratings drop, quoted
        ETAs inflate. Prep-Truth replaces the guess with a number computed from real
        orders.
      </>
    ),
  },
  {
    q: "What does “p85” mean?",
    a: (
      <>
        Line up every order from fastest to slowest prep. p85 is the point where 85% of
        orders finished faster. If the kitchen promises that time, roughly 85% of orders
        will be ready on time — the honest 1-in-6 tail is what makes promises realistic
        instead of wishful. Example: if p85 of actual prep at lunch is 27 minutes, the
        recommendation becomes 30 (rounded up to the next 5 minutes).
      </>
    ),
  },
  {
    q: "What are “dayparts”?",
    a: (
      <>
        Fixed windows of the day: morning 05–11, lunch 11–15, afternoon 15–19, evening
        19–05. A kitchen is a different beast at each of them — a lunch rush needs a much
        longer promise than a quiet afternoon. Prep-Truth gives one recommendation per
        window instead of a single number for the whole day.
      </>
    ),
  },
  {
    q: "What does “late” mean here? The rider arrived late, not the kitchen!",
    a: (
      <>
        “Late” is kitchen-level only: the food took longer to be ready than the prep
        promise. Traffic, rider supply and route time are deliberately out of scope — the
        event windows used (accepted → food ready → rider arrived → picked up) separate
        kitchen time from road time. This tool audits the one number the restaurant
        itself controls.
      </>
    ),
  },
  {
    q: "Why are recommendations rounded to 5 minutes, and can they go down as well as up?",
    a: (
      <>
        Settings live in 5-minute steps in real dashboards, so the p85 is rounded up to
        the next multiple of 5, with a 10-minute floor (nothing sensible promises less).
        And yes — recommendations go both ways. Try the Tempelhof Pizza Studio sample:
        its kitchen over-promises (25 → 10, 35 → 15), while Kreuzberg Kanteen
        under-promises and gets numbers raised.
      </>
    ),
  },
  {
    q: "Why do some recommendations have a * (asterisk)?",
    a: (
      <>
        A p85 from fewer than 20 orders is a fragile estimate — one slow order can move
        it. Those dayparts are marked with * so you treat them as a starting point, not a
        verdict. Dayparts with fewer than 5 orders get no recommendation at all.
      </>
    ),
  },
  {
    q: "It says “21 rows skipped” — did the app throw my data away?",
    a: (
      <>
        No — it told you. Rows that can't be parsed or are implausible (missing
        timestamps, negative prep, decimal promises in a legacy export…) are skipped{" "}
        <em>and counted</em>, with reasons shown next to the numbers. Silent data loss is
        how tools lie; the skip report is on the page so the analyzed share is always
        visible.
      </>
    ),
  },
  {
    q: "Do I need an account? Where does my CSV go?",
    a: (
      <>
        No account, no login, no database. The entire analysis runs in your browser;
        nothing is uploaded or stored. Edits you make in the data panel live only for the
        current browser session — a fresh visit always starts clean. The only server
        component is an optional helper that suggests column names, and it receives just
        a header row plus three sample rows — never your full file.
      </>
    ),
  },
  {
    q: "Are the ten sample restaurants real?",
    a: (
      <>
        No — they are synthetic Berlin kitchens (a döner spätkauf, a ramen lab, a pizza
        studio…) generated in your browser from fixed random seeds. Each one locks a
        different data condition reviewers can test: well-calibrated, wildly variable,
        night-only, tiny, huge, or messy legacy exports. No real restaurant data exists
        in this project.
      </>
    ),
  },
  {
    q: "What does the “before → after” section actually prove?",
    a: (
      <>
        It replays the exact same orders under the recommended settings and shows what
        would have changed: % late and total rider waiting, before versus after. For the
        baseline sample, late orders drop from 36.7% to 7.2% and rider waiting falls 46%
        — not a simulation of a better kitchen, just the honesty of a better promise.
      </>
    ),
  },
  {
    q: "Why did “food cooling” go up after I applied the new settings?",
    a: (
      <>
        The replay is naive by design: riders are re-dispatched around the new promise
        while the kitchen keeps cooking at its historical pace. If promises get longer,
        food finishes early more often and waits — so the cooling number rises. Real
        kitchens that time cooking to the promise avoid most of that swing. The
        limitation is stated openly in the app and README instead of being hidden.
      </>
    ),
  },
]

const TECHNICAL: Qa[] = [
  {
    q: "What stack is this built with — and why this stack?",
    a: (
      <>
        <strong>Vite + React 18 + TypeScript + Tailwind</strong> for the UI (fast dev
        loop, static output, types end-to-end; Tailwind only through design tokens so
        light/dark theming stays consistent). <strong>papaparse</strong> is the single
        runtime dependency — CSV quoting/encoding edge cases are exactly the kind of
        thing not to hand-roll. <strong>Vitest</strong> for engine unit tests,{" "}
        <strong>Playwright</strong> for end-to-end audits,{" "}
        <strong>Vercel</strong> for hosting: a static deploy plus exactly one serverless
        function for the LLM calls. No router library, no state library, no chart
        library, no database — every one of those would add complexity this tool doesn't
        need.
      </>
    ),
  },
  {
    q: "Why is the engine 100% client-side?",
    a: (
      <>
        Three reasons. Privacy: restaurant order data never leaves the page. Honesty:
        the same input always yields the same output — no server-side drift, and the
        numbers are reproducible from a seed. Resilience: the demo works fully offline
        and can't die behind a paid API. The one serverless function exists only for
        optional LLM conveniences and answers <code>{"{offline: true}"}</code> without a
        key.
      </>
    ),
  },
  {
    q: "Why no database, auth, or accounts?",
    a: (
      <>
        A calibration calculator has no state worth persisting: you upload, you read,
        you leave. Removing accounts removes the entire class of privacy promises a
        backend would need (“we store your sales data…”), removes operational surface,
        and keeps the tool free to run. Saving history would be a feature that adds
        complexity without removing any.
      </>
    ),
  },
  {
    q: "Why hand-written SVG charts instead of a chart library?",
    a: (
      <>
        The charts are simple: per-daypart distributions and a small before/after
        comparison. A chart library would add tens of kilobytes and a styling layer to
        fight for four small diagrams. Hand-rolled SVG keeps the bundle tiny, inherits
        the design tokens (so dark mode just works), and makes every pixel deliberate.
      </>
    ),
  },
  {
    q: "Why p85 instead of the mean — or the median?",
    a: (
      <>
        The mean is wrecked by outliers (one 90-minute ticket drags it up for everyone);
        promising the median makes ~half of all orders late by definition. p85 targets
        the tail deliberately: it's the industry-standard service-level shape (an SLA
        quantile), robust to extremes, and has a plain-English meaning — “85% of orders
        finish within this”. Rounding up to 5 minutes keeps the promised number
        operational rather than falsely precise.
      </>
    ),
  },
  {
    q: "What exactly is the recommendation rule?",
    a: (
      <>
        Per daypart: <code>recommendation = max(10, ceil5(p85 of actual prep))</code>,
        computed only when the daypart has ≥ 5 usable orders; dayparts with n &lt; 20 are
        flagged with *. That's the whole rule — deliberately. A multi-weight cost model
        (optimizing rider hours against food quality against refund rates) would be
        impossible to explain to a restaurant owner and impossible to audit. One rule,
        explainable to anyone, beats a black box with a better average case.
      </>
    ),
  },
  {
    q: "How does the replay model work?",
    a: (
      <>
        Same orders, new promise. For each order, the rider's arrival is re-simulated by
        shifting the historical arrival by (new setting − old setting), capped at ±60
        minutes; kitchen speed never changes. Pickup is re-computed as{" "}
        <code>max(food_ready, simulated arrival) + historical handover</code>, so a rider
        whose food is already ready leaves immediately instead of absorbing the whole
        shift, and real handover time is preserved. “Late” after replay means prep
        exceeded the new promise. The model and its caps are unit-tested and audited
        end-to-end against an independent implementation.
      </>
    ),
  },
  {
    q: "Where does the LLM fit — and how is it prevented from breaking anything?",
    a: (
      <>
        Two strictly downstream uses. Column mapping: the LLM reads a header row plus
        three sample rows and suggests a mapping — it may only fill fields the local
        exact-name matcher left empty, never overwrite, and the user confirms everything
        in dropdowns. Narrative summary: the LLM writes the plain-English paragraph{" "}
        <em>from the computed numbers only</em>; the client then verifies every sentence
        fragment against the payload (direction of “late”/rider-wait claims, exact quoted
        figures) and falls back to a template quoting the same numbers on any failure.
        Both paths are schema-validated; the API key lives only in the serverless
        function (one <code>fetch</code>, no SDK) and never reaches the browser. The
        demo never dies because of an LLM.
      </>
    ),
  },
  {
    q: "How are the numbers kept honest and reproducible?",
    a: (
      <>
        Four layers. (1) Sample data comes from a seeded generator — seed 42 produces the
        exact same dataset every time. (2) Every number printed in the README is locked
        by <code>readme.test.ts</code>: if the generator drifts, CI fails. (3) Each of
        the ten sample restaurants locks its data condition in{" "}
        <code>restaurants.test.ts</code>. (4) A Playwright audit replays all ten samples
        in the built app and compares every number on screen against an independent
        implementation, plus invariants (recommendation ≥ p85, multiple of 5, floor 10).
        Skipped rows are always counted and shown, never hidden.
      </>
    ),
  },
  {
    q: "Why exactly five CSV columns?",
    a: (
      <>
        <code>accepted_at, food_ready_at, rider_arrived_at, picked_up_at,
        promised_prep_min</code> — that is the minimum set needed to compute kitchen
        truth: actual prep, rider wait, food idle, and whether the promise was kept. Any
        column schema can be mapped onto it (that's what the mapping flow is for), but
        the engine only ever needs these five. Everything else — baskets, menus, weather
        — is out of scope by charter.
      </>
    ),
  },
  {
    q: "What are the honest limitations?",
    a: (
      <>
        The replay is naive (kitchens keep historical pace, so food cooling swings with
        the promise — see the non-technical section). “Late” is kitchen-level only;
        route traffic and rider supply are outside the tool. Recommendations are per
        daypart only — basket size and menu complexity are real PrepTime drivers this
        version ignores. And all demo data is synthetic: useful for auditing the tool,
        not a claim about any real market.
      </>
    ),
  },
  {
    q: "How is the code tested?",
    a: (
      <>
        Vitest unit tests for the statistics engine (median, p85, rounding, replay
        invariants), the seeded data generator, and the summary claim-checker. Playwright
        e2e covers the user flow (upload → map → results) and an audit spec that
        verifies all ten samples numerically against an independent implementation — the
        same checker that guards AI summaries also fails the audit if the UI shows an
        ungrounded claim. CI runs typecheck, unit tests, build and e2e on every push.
      </>
    ),
  },
]

function QaItem({ qa }: { qa: Qa }) {
  return (
    <details className="group rounded-2xl border border-line bg-surface" data-testid="qa-item">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 font-semibold">
        <span>{qa.q}</span>
        <span
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-muted transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="px-4 pb-4 text-sm leading-relaxed text-muted">{qa.a}</div>
    </details>
  )
}

function QaSection({ id, title, blurb, items }: { id: string; title: string; blurb: string; items: Qa[] }) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="text-lg font-bold tracking-tight">
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">{blurb}</p>
      <div className="mt-4 space-y-2.5">
        {items.map((qa) => (
          <QaItem key={qa.q} qa={qa} />
        ))}
      </div>
    </section>
  )
}

export default function QaPage({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">Q&amp;A</h1>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink"
        >
          back to the app
        </button>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        The questions reviewers actually ask about Prep-Truth — answered from two seats:
        a restaurant owner's and an engineer's. Every number quoted here is computed by
        the app and locked by tests.
      </p>

      <QaSection
        id="qa-nontechnical"
        title="For non-technical reviewers"
        blurb="If you run a kitchen, operate one, or just want to understand what this tool tells you — start here."
        items={NON_TECHNICAL}
      />
      <QaSection
        id="qa-technical"
        title="For technical reviewers"
        blurb="Stack choices, statistics, the replay model, LLM guardrails and the testing strategy — with the reasoning behind each decision."
        items={TECHNICAL}
      />

      <p className="mt-10 border-t border-line pt-4 text-xs leading-relaxed text-muted">
        Something still unclear? The <a className="underline decoration-line underline-offset-4 hover:text-ink" href="https://github.com/ricothenfx/prep-truth">repository README</a>{" "}
        documents the full methodology, and the project charter records every locked
        decision.
      </p>
    </div>
  )
}
