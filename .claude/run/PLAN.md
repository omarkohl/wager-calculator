# Run plan: howsure v1 (site shell, tool 2, handoff)

Goal: implement v1 of [HOWSURE-REQUIREMENTS](../../docs/dev/HOWSURE-REQUIREMENTS.md):
the shared shell, the wager calculator behind its route, and all of tool 2 (yes/no,
categorical, continuous) with the elicitation → wager handoff. Tool 3 is out. Every step
leaves `main` deployable: tool 2 stays unlinked from the nav until step 15.

Read first: the requirements doc, `CLAUDE.md` ("Autonomous runs" included),
`docs/dev/SPECIFICATION.md`, `src/domain/brier.ts` (seeded PRNG),
`src/storage/urlHash.ts`, `src/storage/stakesPreference.ts`.

## Settled before the run (the user, 2026-10-09)

- **Scope**: all of v1 in this run. The requirements doc is the source of truth; this
  section overrides its "Open questions".
- **Routing**: one SPA, path routes (History API). `/` is a small landing page linking
  the tools; `/wager` is the calculator; `/elicit` is tool 2. Route names are
  placeholders (no names chosen): keep them in one module. `/` with a wager hash (`#v=`,
  legacy v1, `#faq=`) goes to `/wager` with the hash kept (replace, no reload).
  GitHub Pages deep links work via `404.html` = `index.html`.
- **Base path**: from a build env var (`BASE_PATH`, default `/`). The site is served at
  a domain root today (CNAME `w.ratfr.de`). The origin move to howsure.org is out of
  scope.
- **[NEEDS PROTOTYPE] items**: one simple, accessible variant each, behind one
  component, so it can be swapped later. Each listed under "For review" in PROGRESS.md.
- **Values** (all in one constants module, easy to tune):
  - target band width: quick 1 logit, thorough 0.3 logit
  - hard contradiction: > 1 logit
  - wedge grid floor/ceiling: 1-in-1000 (0.1% / 99.9%)
  - stake gate: amount + currency from the existing `CURRENCY_OPTIONS`, remembered
    under its own localStorage key; fun stakes not offered
  - thorough mode: 2 negation probes, placed in the second half of the run
  - max outcomes/buckets: 8 (the wager's cap)
  - spot checks: 3 random pairs (fewer if fewer exist) + 1 completeness check
  - tier → first sketch: very unlikely 2%, unlikely 10%, plausible 30%, likely 60%,
    near-certain 90%, then normalised
  - "widen minimally": evenly in logits, never-asked bands first

## Settled by Claude (the user may override before launch)

- **Determinism**: the question sequence is a pure function of (format/algorithm
  version, mode, seed, answers, dropped answers). The result URL stores only those plus
  claim, criteria and adjusted value; decoding re-runs the algorithm. Until the first
  release of a format version, the algorithm may change freely.
- **Domain layout**: tool 2 logic in `src/domain/elicitation/` (pure, no DOM),
  decimal.js for probability arithmetic (`ln`/`exp` for log-odds). The PRNG moves out of
  `brier.ts` into a shared module, unchanged in output (wager tests prove it).
- **No router library**: a small History-API router for three routes. If one becomes
  necessary, justify it in PROGRESS.md.
- **PWA**: precache stays; `navigateFallback` serves `index.html` for the routes
  offline. Keep the manifest identity (`id`, `start_url` resolving to the same URL) so
  installed PWAs survive.
- **Coherent bands**: reachable part per band is
  `lo_i' = max(lo_i, 1 − Σ_{j≠i} hi_j)`, `hi_i' = min(hi_i, 1 − Σ_{j≠i} lo_j)` (the
  doc's example: A 5–40 → 10–30). Order answers ("A more likely than B") add
  `lo_A ≥ lo_B`, `hi_B ≤ hi_A`; propagate with the sum constraints to a fixpoint.
  "About equally likely" adds no constraint. An order cycle is absorbed: its
  constraints are dropped and listed as a contradiction.
- **Handoff**: the wager gets claim, details = criteria, the gate's currency as stakes,
  outcomes, and the first participant's values (2 decimals, decimal.js, summing to
  exactly 100). The provenance text ("45–62% from elicitation") is transient UI state
  in the wager; the wager URL format does not change.
- **Analytics**: GoatCounter counts the route path (`/wager`, `/elicit`, `/`), FAQ as
  `/faq/<id>`. Never claim text or answers.

## Steps

### Setup

- [x] 0. **Environment check** (no own commit; record in PROGRESS.md with step 1):
      node ≥ 22.19, dependencies installed, `make format-check lint typecheck test`
      green, whether `bun x playwright test --project=chromium` runs. A failure that
      blocks every step goes under `## Blocked`.

### Shell

- [x] 1. **Base path and SPA fallback**: `BASE_PATH` → Vite `base`, PWA scope and
      `start_url`, `404.html` in the build output, `navigateFallback`; meta injection
      and asset paths still work. DEVELOPMENT.md documents `BASE_PATH`.
- [x] 2. **Routes**: the router, `/wager` renders today's app, `/` a minimal landing
      page (site name, one line and a link per tool; elicit link hidden until step 15),
      the legacy redirect (`/#v=2…`, v1, `#faq=` → `/wager#…`), unknown paths → a
      not-found message with a link home. Analytics path per route. E2E specs move to
      `/wager`; new E2E: a v2 and a v1 legacy link open the wager unchanged.
- [x] 3. **Shared shell**: header with nav, shared footer, `<title>` per route, focus
      to the page heading and an announcement on route change. The help/FAQ modal
      accepts per-tool content. The wager looks as before. axe scan of every route.

### Tool 2 domain, yes/no

- [x] 4. **Log-odds core**: `logit`/`expit`, the wedge grid (log-odds steps, floor and
      ceiling from the constants), the percent ↔ logit conversion boundary and display
      rounding, a band type that may be one-sided, log-odds midpoint, width in logits.
- [x] 5. **Band rule**: from answers compute H, S, the band (also when H > S),
      contradiction size, hard-contradiction flag, one-sided bands without point
      estimate, "no answers → no result". Tests cover every example in the doc's Band
      rule and Edge cases sections.
- [x] 6. **Quick mode search**: shared PRNG module (wager output unchanged); seeded
      opening wedge in 35–65%; boundary search for both edges in log-odds; "can't
      separate" probes outward; stop at the target width; "approx. N left" (from bracket
      vs. target, non-increasing, bumps only on an outward probe). Tests: confident
      coin flip → narrow band, ignorance → wide band, tails, determinism.
- [x] 7. **Thorough mode**: two staircases (low and high anchors), interleaved by the
      PRNG; swapped-arm repeats; the negation probes (band for not-X → 1 − ·, union
      with the direct band, subadditivity gap); thorough target width. ~14–18 questions
      for a consistent respondent (test it).
- [x] 8. **Trace**: step-by-step account of a run, like `explanation.ts`: each
      question, answer and what it implied; contradicting pairs; subadditivity;
      recomputation with answers dropped as misclicks.

### Tool 2 storage

- [x] 9. **Persistence and share formats**: the in-progress run in sessionStorage
      (claim, criteria, mode, seed, answers, dropped, adjusted value); the stake
      preference in localStorage; invite and result URL formats with a format version
      (claim only on explicit share); decoding re-runs the algorithm. Round trips;
      malformed or unknown-version input → `null`.

### Tool 2 UI, yes/no

- [x] 10. **Setup gate** at `/elicit`: claim (required), stake amount and currency
      (required, remembered, "an amount big enough that you'd genuinely think", nothing
      suggesting it feeds a calculation), mode quick (default) / thorough. Resolution
      criteria not asked here.
- [x] 11. **Question screen**:
  - [x] 11a. The reference lottery visual [NEEDS PROTOTYPE]: one component, shows the
        number, accessible name with the probability; between 10% and 90% an area, in
        the tails a count ("3 winning balls out of 100", down to 1 in 1000).
  - [x] 11b. The flow: prefer the claim / prefer the spinner / "I can't separate
        these"; arm order per question (swapped repeats); neutral negation wording
        with no hint it is a check; "stop here" always visible; "approx. N questions
        left"; no live band; a reload resumes the run.
- [x] 12. **Result screen**: the interval as headline, point estimate smaller;
      one-sided and coarse labels; the trace collapsed by default; subadditivity flag;
      "that was a misclick, drop it" on contradicting pairs; on a hard contradiction
      the "sharpen the claim" prompt first, the criteria field opened, a re-run offered
      (fresh seed); resolution criteria offered after the result.
- [x] 13. **Adjust after**: "your answers imply" (fixed) beside "your adjusted belief"
      (editable, empty for one-sided bands); neutral gap text; both kept in the trace
      and the result URL.
- [x] 14. **Sharing UI**: copy invite and result links. Opening an invite starts the
      gate with claim and criteria filled in; opening a result shows the recomputed
      result and an "elicit your own" action that starts from the invite.
- [x] 15. **Handoff and launch**:
  - [x] 15a. Handoff and launch: "bet on this" opens `/wager` with a fresh wager (see Settled
        by Claude) and the provenance near the first participant's cell; one-sided band →
        asks for the adjusted value first. `/elicit` joins the nav and the landing page.
        E2E: the full flow from gate to wager.
  - [x] 15b. FAQ entries for tool 2 (method, why log-odds, why a band) with a way to open
        them on `/elicit`. Full `make precommit`.

### Tool 2 domain, several outcomes

- [x] 16. **Model**: claim kinds (yes/no, categorical, continuous), outcomes, tiers,
      tier → first sketch, per-bucket provenance ("from your first guess" / "from N
      comparisons"), the outcome cap.
- [x] 17. **Coherent bands**: tightening to the reachable part, order constraints,
      incoherent bounds flagged and widened minimally, never-asked buckets bounded by
      what is left. Tests include the doc's A/B/C example.
- [x] 18. **Questions**:
  - [x] 18a. "Which is more likely" (with "about equally likely") as order answers; the choice
        of the next pair (unclear order first, not implied by earlier answers); spot-check
        selection (3 random pairs, fewer if fewer exist, plus the completeness check). Deterministic from seed
        and answers.
  - [x] 18b. The lottery on one bucket or a group (reusing the yes/no search per target);
        next-question choice across all kinds (widest band in percentage points, extra weight
        on the extreme tiers, a near-even sketch and unclear pairs).
- [x] 19. **Insights and adjustments**: top-k coverage, "1-in-N" for tiny buckets,
      order vs. sketch disagreements; merge rare outcomes into "everything else"
      (offered only); Normalize for adjusted values.
- [x] 20. **Continuous bucketing**: from min, max, thresholds and a curve through N
      points → hybrid edges (thresholds, shape changes, snapped to round numbers,
      neighbours both < 3% merged, open-ended outer buckets, ≤ 8); bars → bucket
      probabilities directly.

### Tool 2 UI, several outcomes

- [x] 21. **Kind and outcome discovery**:
  - [x] 21a. The gate offers the kinds (yes/no, one of several outcomes, a number: the last
        disabled until step 23); categorical outcomes one at a time, each into a tier
        [NEEDS PROTOTYPE]; "Is there another outcome?"; "everything else" offered after two
        very-unlikely in a row; the claim stays editable; the first sketch as the starting
        result.
  - [x] 21b. Switch to the bars view (numbers instead of tiers) for categorical outcomes.
- [x] 22. **Disjoint and exhaustive**:
  - [x] 22a. Pair and completeness questions after the list is closed; on a problem the
        wrong-tool message with "Change the outcomes" (back to the list, with a reminder to
        review the whole list) or "Keep them as they are" (standing notice on the numbers).
  - [x] 22b. Help to fix a problem in place (rename, split, merge, add). When the completeness answer is "yes", the fix "add an outcome" offers
        "Everything else" again even if `declinedElse` is set. (The result-screen notice is
        step 25's: it shows the stored `kept` flag.)
- [x] 23. **Continuous input**:
  - [x] 23a. Min, max, thresholds; bars with the live total ("12 points too many" /
        "13 points not yet placed") and Normalize.
  - [x] 23b. The curve [NEEDS PROTOTYPE]: relative-likelihood axis, live percentage
        per bucket underneath, a keyboard alternative (a value per point).
- [x] 24. **Question flow**: comparison and lottery questions under the yes/no
      presentation rules; useful after two answers; provenance per bucket.
  - [x] 24a. Categorical claims: "Start the questions" from the sketch (the typed numbers are
        the sketch in the numbers view), comparison and lottery screens, stop, answers stored and
        replayed on load, an interim "where your answers stand" screen (step 25 replaces it).
  - [x] 24b. Number claims: the buckets of the bars or the curve become the outcomes and the
        typed percentages (curve: its probabilities) the sketch; the same flow.
- [x] 25. **Result**: band per bucket as headline, point estimate, provenance,
      incoherence flag, the standing notice when the list was kept despite a failed disjoint or
      exhaustive check (`kept`), insights, merge offer, adjust after with Normalize, the trace.
  - [x] 25a. The result screen: band, point estimate, provenance, flags for what does not fit
        (nothing rescaled), the `kept` notice, insights; replaces the placeholder standing.
  - [x] 25b. Merge offer (and applying it, as a view), adjust after with Normalize.
  - [x] 25c. A clear "Start a new claim" on the result screen for all kinds; runs carry a
        timestamp, and a run older than 7 days is not silently resumed: a prompt offers
        "Continue" or "Start a new claim".
  - [x] 25d. The lottery words follow the visual (balls: "a ball drawn at random"), and its
        chance is no longer a headline figure (anchoring).
  - [x] 25e. The trace: each question, the answer, what it implied.
- [ ] 26. **Share and handoff**:
  - [x] 26a. "Bet on this" for several outcomes and number claims: the outcomes or ranges and the
        user's own numbers open a wager, only at exactly 100% (otherwise it points to Normalize).
  - [ ] 26b. Invites carry the outcomes or bucket edges and open in a locked-outcome mode.
  - [ ] 26c. Result URLs, with the multi-answer codec (replayed on decoding).
        E2E for categorical and continuous with each.

### Close

- [ ] 27. **Docs**: README, SPECIFICATION (or a tool 2 spec beside it), CLAUDE.md
      architecture, the requirements doc's open questions marked answered with the
      values above. Full `make precommit` (all browsers).
- [ ] 28. **Finish**: summary and the "For review" list in PROGRESS.md (copied into
      that PR's body), then delete `.claude/run/` in its own commit.
