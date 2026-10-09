# Progress

## Next step

7.

## Stack

<!-- step: branch, PR number -->

- 1: `howsure/01-base-path`, PR #89 (base `main`)
- 2: howsure/02-routes, PR #90 (base howsure/01-base-path)
- 3: howsure/03-shell, PR #91 (base howsure/02-routes)
- 4: howsure/04-log-odds, PR #92 (base howsure/03-shell)
- 5: howsure/05-band-rule, PR #93 (base howsure/04-log-odds)

## Log

- **Step 0 (environment)**: node 22.22, dependencies installed, `make format-check lint
typecheck test` green (272 tests). `bun x playwright install` is blocked in the cloud
  (cdn.playwright.dev denied) and Playwright 1.62 expects chromium-1234 while
  /opt/pw-browsers has 1194 in another layout. Workaround that works: a throwaway config
  (not committed) spreading `playwright.config.ts` with
  `launchOptions.executablePath=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` for the
  chromium project; all 11 existing E2E tests pass with it. Firefox and webkit are not
  available; CI covers them.
- **Step 1 (base path)**: `scripts/basePath.ts` normalises `BASE_PATH` (tested), used by
  `vite.config.ts` and `scripts/inject-meta.js` (imports the `.ts` directly, so the build
  needs node >= 22.19). `base` was `./` before and is now absolute; manifest `start_url`
  and `scope` equal the base (at the root: `/`, same URL as the former `./`; no `id` added,
  so identity is unchanged). `VITE_SITE_URL` stays the origin; the meta tags get origin +
  base path. `dist/404.html` is a copy of the injected `index.html`.
- **Step 2 (routes)**: `src/routes.ts` (route table, `routeFromPath`, `legacyRedirect`) and
  `src/Site.tsx` (History-API router, landing, not-found, a "Coming soon" stub at
  `/elicit`) wrap `App`, which stays the wager page. Any non-empty hash at the landing
  path that is `#v=`, decodes as v1, or carries `faq=` is redirected to `/wager` with
  the hash kept. Analytics: the injected script counts `/`, `/wager`, `/elicit`,
  `/not-found`, or `/faq/<id>`; it now also listens to `popstate` and a `routechange`
  event the router fires. The old FAQ regex missed `#faq=` (needed `?` or `&` before);
  fixed in passing. Existing E2E specs now start at `/wager`. Chromium E2E ran via the
  local `executablePath` workaround config from step 0 (not committed). The route table
  and event name live in `src/routeTable.ts`, shared with `inject-meta.js`; analytics
  skips a path equal to the last one counted.
- **Step 3 (shared shell)**: `Site` renders the header (`Main` nav: Home, Wager Calculator;
  `aria-current` on the current page), one `<main>`, the shared `Footer` and a polite live
  region. `App` no longer has its own header/main/footer wrapper (its card is a `<section>`
  so the E2E selectors on `div.rounded-lg` still find only participant cards). After a
  navigation (not the first render) the page's `main h1` gets focus and its text is
  announced. Tab titles: the calculator keeps its claim title; other routes are set by
  `Site`. `HelpModal` takes an `entries` prop (defaults to the calculator's FAQ) and a
  string `openFaqId`. axe scans cover `/`, `/elicit`, `/no-such-page` as well as `/wager`.
  Chromium E2E ran via the local workaround config (18 tests). The wager page now has
  two `role="status"` regions (the shell's announcer and the calculator's toast), so
  tests must filter by text. Clicking the nav link of the current page does nothing
  (a push would drop the hash holding the wager).
- **Step 4 (log-odds core)**: `src/domain/elicitation/constants.ts` holds every settled
  value (targets, contradiction threshold, grid, probes, caps, spot checks, tier sketch,
  opening range); `logOdds.ts` has `logit`/`expit` (decimal.js, RangeError outside the open
  interval), the grid clamp and `stepWedge`, the percent boundary (`fromPercent`,
  `toPercent`, `formatPercent`) and the one-sided-capable `Band` (`bandBetween`,
  `bandWidthLogit`, `bandMidpoint`; null width/midpoint when one-sided). Display rounding:
  whole percent when the nearer tail is >= 10%, one decimal down to 0.1%, two beyond.
  `snapToGrid`/`stepWedge` put wedges on that same grid, so the label is the exact value;
  p and 1 - p display as complements.
- **Step 5 (band rule)**: `bandRule.ts` `computeBand(answers)` takes wedge answers
  (`claim` / `wedge` / `cant-separate`; the last says nothing about the edges) and returns
  H, S, the band (ordered, also when H > S), the point estimate (null when one-sided), the
  contradiction in logits (only when H > S) and the hard flag (strictly > 1 logit).
  Null without any claim/wedge answer. Dropped (misclick) answers are the caller's to
  filter out; step 8 does that.
- **Step 6 (quick search)**: `createSeededPRNG` moved unchanged to `src/domain/prng.ts`
  (a test pins its first output; wager tests untouched). `quickSearch.ts`:
  `nextQuestion(answers, seed)` (null when done) and `approxQuestionsLeft`. Opening: a
  whole percent in 35-65%. Outward probes: at least 0.6 logit, growing to half the
  distance already travelled from the opening wedge; with both edges missing they
  alternate, the seed (second PRNG draw) picking the first side. Once H and S are known
  the widest open gap is bisected in log-odds; the run stops when the unresolved gaps
  (H up to the first unseparable wedge, the last up to S; the whole H-S width if none)
  add up to 1 logit. Cap 12 questions; a wedge is never asked twice; at the grid end the
  band stays one-sided. The adaptive search cannot itself create H > S (contradictions
  come from thorough mode, step 7). "N left": bisections still needed for the known
  gaps; a missing edge costs 1 + the outward probes already made on its side (capped by
  the probes left to the grid end) + 1. Rises only after an outward probe.
  Measured over 40 seeds per simulated respondent: indifference 48-52% avg 3.5
  questions, 45-55% 4.0, 40-60% 4.0, 30-70% 6.0, 60-65% 3.6; the long ones are 20-80%
  8.5, 2-3% 8.1 (max 11), 90-95% 8.5, 1-30% 9.6. N is off by 0.5-0.9 on average for
  typical respondents (max 3), by about 1.8 for tails and ignorance (max 8: the run
  cannot know a tail belief is coming).

## Decisions

- Step 5: a run with only "can't separate" answers gives `computeBand` = null (no band,
  no result). The doc says only that stopping before the first answer gives no result and
  that few answers may give a one-sided band; it does not cover this case. Alternative
  (reversible, for steps 8/12 to pick up): a result carrying the range of wedges the user
  could not separate, without a band. A "can't separate" answer outside [H, S] is a
  contradiction the band rule ignores; the trace (step 8) can point it out.

## For review

<!-- [NEEDS PROTOTYPE] variants and decisions the user should look at -->

- Step 6: quick mode takes 3.5-6 questions for a typical respondent (the doc says ~6)
  and 8-10 for tails and wide ignorance, up to the cap of 12. The knobs
  (`OUTWARD_STEP_LOGIT`, `OUTWARD_GROWTH`, the 1-logit target) are in `quickSearch.ts` and
  `constants.ts`. The doubling-ish outward step overshoots into the tails for wide
  respondents; "approx. N left" is least accurate there.

- Step 5: only "can't separate" answers give no result (see Decisions); the alternative is a
  result with the indifference range but no band.

- Pre-existing, untouched: the wager's cap of 8 outcomes is a literal `8` in the
  components; `MAX_OUTCOMES` in the elicitation constants duplicates it.

- Step 1/2: `start_url` is the base, so installed PWAs now open on the landing page, not
  the calculator.

- Step 1: no automated test that `dist/404.html` equals `dist/index.html` or that the
  manifest scope/start_url equal the base (needs a build; too heavy for a step); checked
  by hand. Pre-existing and left alone: the precache revision of `index.html` does not
  cover the injected edits, and the GoatCounter path handling (step 2 reworks it).

## Questions

## Blocked
