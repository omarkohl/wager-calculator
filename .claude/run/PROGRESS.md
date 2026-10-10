# Progress

## Next step

25c.

## Stack

<!-- step: branch, PR number -->

- 1: `howsure/01-base-path`, PR #89 (base `main`)
- 2: howsure/02-routes, PR #90 (base howsure/01-base-path)
- 3: howsure/03-shell, PR #91 (base howsure/02-routes)
- 4: howsure/04-log-odds, PR #92 (base howsure/03-shell)
- 5: howsure/05-band-rule, PR #93 (base howsure/04-log-odds)
- 6: howsure/06-quick-search, PR #94 (base howsure/05-band-rule)
- 7: howsure/07-thorough, PR #95 (base howsure/06-quick-search)
- 8: howsure/08-trace, PR #96 (base howsure/07-thorough)
- 9: howsure/09-persistence, PR #97 (base howsure/08-trace)
- 10: howsure/10-setup-gate, PR #98 (base howsure/09-persistence)
- 11a: howsure/11a-lottery, PR #99 (base howsure/10-setup-gate)
- 11b: howsure/11b-questions, PR #100 (base howsure/11a-lottery)
- 12: howsure/12-result, PR #101 (base howsure/11b-questions)
- 13: howsure/13-adjust, PR #102 (base howsure/12-result)
- 14: howsure/14-sharing, PR #103 (base howsure/13-adjust)
- 15a: howsure/15a-handoff, PR #104 (base howsure/14-sharing)
- 15b: howsure/15b-faq, PR #105 (base howsure/15a-handoff)
- 16: howsure/16-model, PR #106 (base howsure/15b-faq)
- 17: howsure/17-coherent-bands, PR #107 (base howsure/16-model)
- 18a: howsure/18a-comparisons, PR #108 (base howsure/17-coherent-bands)
- 18b: howsure/18b-multi-run, PR #109 (base howsure/18a-comparisons)
- 19: howsure/19-insights, PR #110 (base howsure/18b-multi-run)
- 20: howsure/20-bucketing, PR #111 (base howsure/19-insights)
- 21a: howsure/21a-outcomes, PR #112 (base howsure/20-bucketing)
- 21b: howsure/21b-numbers, PR #113 (base howsure/21a-outcomes)
- 22a: howsure/22a-spot-checks, PR #114 (base howsure/21b-numbers)
- 22b: howsure/22b-fixes, PR #115 (base howsure/22a-spot-checks)
- 23a: howsure/23a-bars, PR #116 (base howsure/22b-fixes)
- 23b: howsure/23b-curve, PR #117 (base howsure/23a-bars)
- 24a: howsure/24a-multi-questions, PR #118 (base howsure/23b-curve)
- 24b: howsure/24b-continuous-questions, PR #119 (base howsure/24a-multi-questions)
- 25a: howsure/25a-multi-result, PR #120 (base howsure/24b-continuous-questions)

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
- **Step 7 (thorough mode)**: `thorough.ts`. Answers carry the tags of their question
  (`frame` claim/negation, `stair` low/high, `kind`, `armOrder`), so the staircases are
  rebuilt from them; `nextThoroughQuestion(answers, seed)` is pure. Low anchor 5-15%,
  high anchor 85-95% (seeded); each staircase steps 1 logit while its answer keeps it
  walking (claim for the ascending one, wedge for the descending one), looks the other
  way if the anchor itself fails, then bisects its bracket to 0.15 logit (half the 0.3
  target). Which staircase / repeat / negation probe comes next is a seeded draw
  (`seed:pick:index`), so the order cannot be tracked. Two swapped-arm repeats (of
  comparisons near the band, after 5 and 9 direct answers, or at the end if the stairs
  finish early); two negation probes after 8 and 11 direct answers once both stairs have
  a bracket of at most 0.6 logit, one just below and one just above the complement of the
  direct band (0.05 logit margin, at least one display unit), in a seeded order; a
  one-sided direct band allows only one probe. `thoroughResult` combines the direct band
  with the negation band (1 - p): intersection when they are compatible (so coherent
  answers leave the band exactly as the direct answers give it, and one-sided bands keep
  what they know), the hull of all edges when they conflict (so incoherence shows up as
  extra width). The gap is returned as `subadditivity` (`sub`: P(X)+P(not-X) > 1,
  `super`: < 1). Cap 24. (Its "approx. N questions left" came in step 11b.)
  Measured over 20 seeds: 50% believers 16-19 questions, 30-70% 15-18, 20-80% 14-16,
  tails 2-3% avg 20.8 (max 23), 90-95% 18.5.
- **Step 8 (trace)**: `trace.ts` `buildTrace({mode, seed, answers, dropped})` returns every
  recorded step (question, answer and implication in words, the band after it from the
  kept answers, a `dropped` flag), the contradicting pairs (a claim win above a wedge win
  within one frame, sized in logits, largest first, `isHard`), repeats that disagree with
  their original, and the result of the kept answers only (band, point estimate,
  contradiction, subadditivity). `wouldAskMore` says whether the algorithm would ask
  further questions after the kept answers: a drop may leave a run unfinished, and what
  the result screen does then (offer to continue, or accept the coarser band) is step 12's
  call. The trace shows the answers as recorded, not a replay, so it never disagrees with
  what the user was shown. Cross-frame conflicts (claim vs negation) are the subadditivity
  gap, not contradicting pairs. `buildTrace` takes per-mode input (quick: plain answers;
  thorough: the full recorded `ThoroughAnswer`s, whose tags rebuild the staircases for
  `wouldAskMore`). A "could not separate" outside the [H, S] its frame's other answers
  bracket gets `outsideRange` (a mild flag; the wording never claims it is inside).
  The largest claim-frame pair is the band rule's contradiction, so `isHard` agrees
  with the result's flag (tested). Invalid `dropped` indexes are ignored; step 9
  validates the URL.
- **Step 9 (persistence and share formats)**: `src/storage/elicitation.ts`. Format version
  1 (`ev=1`): invite `#ev=1&t=i&c=<claim>[&cr=<criteria>]`; result `#ev=1&t=r&c&cr&m=q|t
&s=<seed>&a=<answers>[&d=<dropped>][&adj=<percent>]`. Answers are compact: a wedge as
  integer per mille, then `:` and `c|w|u` (claim / wedge / can't separate),
  comma-separated, at most 24 (the longer run's cap). Nothing else is stored: decoding
  re-runs the algorithm, each recorded answer must answer the question it would have asked
  at that point (else the whole input is `null`), and a thorough run's tags (frame,
  staircase, kind, arm order) are rebuilt from those questions. A result link pins the
  algorithm version through `ev`. A result URL has exactly one spelling: decoding
  re-encodes and rejects anything that differs (leading zeros, unsorted or duplicate
  `dropped`, `47.50`, parameter order, extra parameters). Claim and criteria are capped at
  2000 characters. An invite ignores extra parameters. The in-progress run is JSON in sessionStorage (`howsure.run`) with the same fields and the
  same validation; the claim is only in the URL for explicit shares. Stake gate:
  localStorage `howsure.stake` as `{amount, currency}` (amount > 0 with up to 2
  decimals, currency in `CURRENCY_OPTIONS`). `generateSeed()` gives a fresh 16-char seed
  (crypto, never derived from the claim). Adjusted value is a percent string with up to 2
  decimals, strictly between 0 and 100.
- **Step 10 (setup gate)**: `components/elicit/SetupGate.tsx` (native, labelled form: claim
  textarea, stake amount + currency select from `CURRENCY_OPTIONS`, quick/thorough radios,
  Start) and `ElicitPage.tsx`, which `Site` renders at `/elicit` (title "How sure are
  you?", a placeholder name like the route). Errors show only after a first Start attempt
  (`role=alert`, `aria-invalid`). The stake text says "big enough that you would
  genuinely think before answering" and nothing about calculation (a test guards the
  words). A valid Start saves the stake, creates the run (fresh `generateSeed()`, no
  criteria) in sessionStorage and shows a one-line placeholder; step 11 replaces it. A
  reload resumes the stored run. Still unlinked from the nav and the landing page
  (E2E-checked). Chromium E2E via the local workaround config: 21 tests, axe on the gate
  in its error state. A failed Start focuses the first invalid field; a claim over 2000
  characters is refused with a message (the storage cap), not truncated.
- **Step 11a (reference lottery)**: `domain/elicitation/lottery.ts` (`lotteryForm`,
  `describeLottery`) decides the form; `components/elicit/ReferenceLottery.tsx` draws it.
  From 10% to 90% (boundaries included) a spinner: grey disc, blue pie wedge from 12
  o'clock clockwise. Below 10% or above 90% a field of balls with the winners filled:
  100 balls (10 x 10) for whole percents, 1000 (50 x 20) for the rest, down to "1 winning
  ball out of 1000". The drawing is `aria-hidden`; the wrapper is `role=img` with a name
  that always carries the probability ("A spinner with a shaded wedge that wins 45% of the
  time", "3 winning balls out of 100, 3% of the time"); the number (and the count in the
  tails) is also visible text. The started-run placeholder on `/elicit` shows it with the
  opening wedge so the E2E (accessible name, visible number, axe) has something to open;
  11b replaces that page. Tails are covered by unit tests only, since the opening wedge is
  35-65%.
- **Step 11b (question flow)**: `components/elicit/runFlow.ts` (pure: `nextFlowQuestion`,
  `answerQuestion`, `stopRun`, `questionsLeft`), `QuestionScreen.tsx`, and `ElicitPage`
  now runs gate -> questions -> a one-line "Your answers are in" placeholder (step 12
  replaces it). Each question: two arm buttons, "Win 20 USD if this is true: "claim"" and
  "Win 20 USD if the spinner lands in the shaded part" (with the lottery inside), in the
  question's arm order (quick: drawn from the seed per question index via `armFor`; thorough:
  the question's own, swapped on repeats), plus "I can't separate these" and "Stop here";
  the prize is the remembered stake ("the prize" if none). A negation probe reads "...if this
  is false: ..." with nothing else changed, and the page never says what a question is for
  (tested). No band, range or question counter. Quick runs show "Approx. N questions left"
  (thorough runs too: `approxThoroughQuestionsLeft` adds up the staircases' expected remaining steps and refinements and the repeats and negation probes still to come; the requirements ask for it in both modes; a short sentence explains a rise). Focus goes to the question heading
  after the user acted, not on a plain reload. The answer is saved after every click, so a
  reload resumes; "Stop here" is stored as `stopped` in the tab's run only (`RunData.stopped`,
  never in a URL; result URLs re-encode identically with or without it). The lottery E2E
  test moved into `e2e/elicit-questions.spec.ts`. Chromium E2E via the local workaround
  config: 29 tests. Stopping before the first answer says "You stopped before answering, so there
  is no result" with a "Start again" button (requirements: no answer, no result); the end
  message takes focus after the user acted; true/false are bold in the arm text.
- **Step 12 (result screen)**: `ResultScreen.tsx` (+ `domain/elicitation/format.ts`
  `describeBand`), shown by `ElicitPage` once the questions end (the 11b "answers are in"
  placeholder is gone; "Start again" for no answers stays). Headline: the interval in big
  type ("45–62%", "about 50%", "above 52%", "below 20%"); "Best single guess: N%" smaller
  below, or "No single best guess" for one-sided bands. A line says "This is coarse" when
  the band is one-sided, the user stopped early or dropped answers leave the search
  unfinished (`wouldAskMore`). Subadditivity: a "Something to ponder" note, neutral, saying
  the two sets of answers add up to more/less than 100% and that the range is wider
  because of it. Contradicting pairs are listed with, per answer, "That was a misclick,
  drop it" (aria-label names the answer); dropped answers show struck in the trace with
  "Bring it back"; dropping or restoring recomputes (`RunData.dropped`, stored) and puts
  focus on the result heading. A hard contradiction puts the "Your answers don't hang
  together ... can mean more than one thing" note first, with the resolution criteria field
  inside it and "Run it again" (fresh seed, same claim, criteria and mode, answers cleared);
  the number is still shown. Otherwise the criteria field sits below the result
  ("offered after"), saved as typed. The trace is a native `<details>`, collapsed by
  default. Read-only without handlers, ready for shared results in step 14. Not done: an
  "answer more questions" offer when a drop leaves `wouldAskMore` true (the algorithm's
  sequence is defined over all recorded answers, dropped included, so resuming would be a
  new design); the result just says it is coarse. Added after review: repeats answered
  differently are listed like contradicting pairs (drop offer for both answers; each drop
  button's name names the other answer); the interval sits inside the result `<h2>` so
  focusing it reads the number; on a hard contradiction focus lands on the lead note's
  heading; "an" before 8, 11 and 18; ids from `useId`.
  `computeBand` still returns null when every answer was "can't separate" (step 5
  decision); the result screen instead shows "You could not tell the claim from spinners
  between X% and Y%" (the span of those wedges) with no best guess, as honest ignorance,
  and "No range yet" only when nothing usable is left (all dropped). Chromium E2E (local workaround config):
  33 tests, axe on both a normal and a contradicting result.
- **Step 13 (adjust after)**: `AdjustBelief.tsx` between the headline and the notes:
  "Your answers imply" (the band, fixed) beside "Your adjusted belief (%)" (a text field,
  `inputMode=decimal`). The field starts at the point estimate (two decimals, e.g. 45.4;
  the headline's "best guess" is rounded for reading) and is empty for a one-sided band,
  with a line saying there is no starting value. An untouched default is not stored:
  `RunData.adjusted` stays null until the user types a valid value (canonical form, up to
  two decimals, strictly between 0 and 100; clearing the field sets it back to null).
  Errors are shown when the field is left, not while typing ("4." on the way to "4.5").
  The gap is described neutrally and only once a value is set: "You set this above / below /
  within what your answers implied." (`adjustmentGap`, `describeGap` in `format.ts`; the
  band's edges count as within; a one-sided band only has the side it bounds). `buildTrace`
  takes `adjusted` and returns `adjustment` (implied band, its point estimate, the value,
  the gap) from the kept answers, so a drop moves the comparison; the trace ends with "Your
  answers implied 48-63%. You then set your belief to 62.5%. You set this above ...". The
  result URL already carries `adj` (step 9). Saved as typed, without moving focus. The
  section appears when it can be edited or a value was set (read-only for shared results,
  headed "Your belief"). A re-run forgets the adjusted value. The one-sided hint is linked to
  the field (`aria-describedby`, joined with the error); the gap sentence is hidden while the
  text is not a valid value.
  Chromium E2E (local workaround config): 36 tests; new tests are all under 1 s locally.
- **Step 14 (sharing UI)**: `ShareLinks.tsx` (a "Share" section under the criteria) has
  "Copy invite link" and "Copy result link"; each builds the link on press (`shareLinks.ts`:
  origin + the elicit path from the base + the hash from step 9), writes it to the clipboard,
  says "Invite link copied" in a live region and shows the link in a read-only field so it can
  be copied by hand ("Could not copy automatically" when the browser refuses or has no
  clipboard). A note says the invite lets a friend put their own number on the claim without
  seeing yours, the result link also carries the answers, and both contain the claim.
  `ElicitPage` reads the address bar once at mount: an invite shows the gate with the claim
  filled in (still editable) and a note with the criteria; starting carries the criteria
  into the run and resets the address bar to the plain page. A result link shows the
  recomputed result read-only (no edit, drop or share), with "The claim: ..." (new on every
  result screen), a "This is a shared result" note and "Elicit your own belief on this
  claim", which swaps the address bar to an invite hash (the other person's answers leave it)
  and opens the gate from the claim and criteria. An invite or a shared result never touches
  the run stored in the tab. A shared result that the algorithm would have continued is
  shown as stopped (coarse). Unreadable hashes are ignored. Chromium E2E (local workaround
  config): 41 tests, two browser contexts for sender and friend, axe on the shared view and
  the share section; the E2E reads the shown link, not the clipboard, so it works in every
  browser. Added after review: the hash is re-read on `hashchange`/`popstate` (a link pasted
  into the same tab works and never touches the stored run); a shared result shows the
  sender's criteria read-only and speaks about "the answers" (no "you"; `voice: 'other'` in
  `buildTrace`, `other` in `AdjustBelief`, `describeGap(gap, true)`); "Elicit your own" puts
  focus in the claim field; the gate warns that an invite replaces a run in progress; the
  share link is built at render (a changed result says "Copy it again") and the status is
  cleared while copying so a repeat is announced; a result of only "can't separate" answers
  can be shared too.
- **Step 15a (handoff and launch)**: step 15 split in PLAN.md: 15a is this commit, 15b is
  the FAQ entries for tool 2 and the full `make precommit`. `/elicit` is now in the nav
  ("How sure are you?", the placeholder name) and on the landing page. "Bet on this" (own
  results only) builds a fresh wager with `domain/elicitation/handoff.ts`: claim, criteria as
  details, the gate's currency as stakes (default if none), Yes/No, first participant Yes = p
  and No = 100 - p at two decimals summing to exactly 100 (touched), the other participant
  left to the wager calculator. p is the adjusted value if set, else the point estimate. It
  goes to `/wager` in the wager's own URL hash (`navigation.ts` `navigate`), with the
  provenance ("45-62% from elicitation", from `describeBand`) in the history entry's state.
  `App` reads it once, shows it under the first participant's name, and takes it out of the
  history entry at once; it disappears as soon as the first participant's numbers change,
  and is gone after a reload (the wager URL format is unchanged). One-sided band without an
  adjusted value: "Bet on this" does not go anywhere, shows "Set your own belief above"
  (an alert) and focuses the adjusted field. The elicitation run in the tab is left alone.
  Chromium E2E (local workaround config): 42 tests, including `e2e/elicit-to-wager.spec.ts`
  (landing -> gate -> questions -> result -> adjusted -> wager, the point-estimate path, the
  one-sided path, reload).
- **Step 15b (FAQ)**: `components/elicit/faq.tsx` has four entries (`how-it-works`,
  `why-log-odds`, `why-a-band`, `why-a-stake`; ids are part of `/elicit#faq=<id>` links, so
  never renamed), shown by the existing `HelpModal` through its `entries` prop. `ElicitPage`
  has a "How does this work?" button on the gate, the no-result message and the result, and a
  `#faq=<id>` link opens the modal at that question (also when pasted into the tab); closing
  takes the parameter out of the address bar. Unknown ids are ignored. The button is not
  offered while the questions are being answered (explaining the method mid-run would colour
  the answers); a `#faq` link still works there. The text does not mention the check
  questions of thorough runs. Analytics counts `/faq/<id>` through the existing script.
  Full precommit, in pieces: `make format lint typecheck` clean; `bun run test:coverage`
  613 tests in 43 files; chromium E2E (local workaround config): 44 tests, all passing. `make precommit`
  itself cannot run here: it installs and runs all three browsers (`playwright install` is
  blocked, and Firefox and WebKit are not available); CI runs those.
- **Step 16 (model)**: `domain/elicitation/model.ts`. Claim kinds (`yes-no`, `categorical`,
  `continuous`) and the five tiers, least to most likely. `ElicitOutcome` {id "o1", "o2", ...,
  label, tier or null} (named so it is not confused with the wager's `Outcome`). The list:
  `OutcomeList` {items, issued} with `addOutcome` / `removeOutcome` (ids come from the count
  ever issued, so an id is never reused after a removal; cap of 8 via `MAX_OUTCOMES`,
  `isAtCap`; empty or repeated labels refused, case, spacing and Unicode composition
  ignored, labels stored composed (NFC), via `labelProblem`), `hasEnoughOutcomes` (at
  least `MIN_OUTCOMES` = 2), `shouldOfferEverythingElse` (the last two outcomes added are
  both very unlikely, it is not in the list, there is room; "Everything else" counts toward
  the cap; declining is for the UI to remember). First sketch: `firstSketch` maps tiers to
  2/10/30/60/90% and scales them to sum to 1 (`normalise1`: approximately 1, refuses negatives and a zero total; ids must be unique), an
  outcome without a tier is an error. Provenance: `provenanceFor(comparisons)` and
  `describeProvenance`: "from your first guess", "from 1 comparison", "from 4 comparisons".
  Continuous buckets (edges) come in step 20; this model has no UI yet, so no E2E.
- **Step 17 (coherent bands)**: `domain/elicitation/coherence.ts`, `makeCoherent(bands, orders)`
  with bands `{id, lo, hi, asked}` (a bucket never asked about comes in as [0, 1]; at least one
  bucket) and order answers `{moreLikely, lessLikely}` ("about equally likely" is simply not
  passed). In order: (1) order answers on a cycle (incl. A > A) are dropped and listed
  (`reason: 'cycle'`); (2) if the lower bounds sum to more than 1 or the upper bounds to less
  than 1 it is flagged (`incoherence {kind, amount}`) and widened minimally: the same logit
  shift for every band of a group, bands with `asked: false` first (pushed to 0 / 1 if they
  cannot fix it alone, then the asked ones share the rest); (3) tightening to the fixpoint
  with the settled rule (`lo_i' = max(lo_i, 1 - others' hi)`, `hi_i' = min(hi_i, 1 - others'
lo)`, and `lo_A >= lo_B`, `hi_B <= hi_A` per kept order), stopping when nothing moves by
  more than 1e-15 (throws if it has not settled after 500 passes, not expected for <= 8
  buckets). If the orders make some band impossible, or push the bounds past 100% again, order
  answers are dropped and listed (`reason: 'conflict'`): the fewest are found exactly for up to
  3 (subsets in input order); beyond that they are dropped one at a time in input order until
  the rest hold (not guaranteed fewest). Each band says whether it was `widened` / `tightened`.
  Tests: the requirements' example (A 5-40, B 20-30, C 50-60 -> A 10-30), chains, cycles,
  widening, 40 random inputs (ordered bands, lows <= 1 <= highs, kept orders hold, and
  without orders a widened band contains what was said).
- **Step 18a (comparison questions)**: step 18 split in PLAN.md; this is 18a, 18b (the lottery on
  a bucket or group and the next-question choice across kinds) is next. `domain/elicitation/
comparisons.ts`: `ComparisonAnswer {first, second, pick: first|second|equal}` records the
  pair as shown; `orderAnswers` turns picks into the "more likely than" answers
  `makeCoherent` takes ("about equally likely" gives none). `nextComparison({ids, sketch,
bands?, answers, seed})` chooses the pair whose order is least clear (nearest estimates in
  log-odds), among pairs not asked yet (either direction), not implied by earlier answers
  (transitive closure; "equal" implies nothing) and not already clear from the bands (no
  overlap); ties and which one is shown first come from the seed (`seed:compare:<n answers>`);
  null when nothing is left. `selectSpotChecks(ids, seed)`: 3 distinct random pairs (fewer if
  fewer exist; "Can A and B both happen?") then one completeness check ("Could it turn out
  to be none of these?"), seeded Fisher-Yates. `spotCheckProblems` names the pairs that can
  both happen and a missing "none of these". Wording and scheduling of the spot checks are the
  UI's (steps 21-22). No UI yet, so no E2E. For 18b: choosing the next question needs a
  stopping rule of its own: with eight outcomes an all-"equal" run would ask all 28 pairs (the
  "useful at any length" rule says the user may stop, but the selection should also stop when
  further pairs cannot change the result). A sketch missing an outcome is an error.
- **Step 18b (lotteries and the next question)**: `domain/elicitation/multiRun.ts`. A `MultiRun`
  is outcomes (with tiers), a seed and answers: `compare` (an 18a comparison) or `lottery`
  {targets, wedge, choice}. The lottery on a target reuses the yes/no search: each target (a
  bucket, or a group) has its own run, seed `<seed>:target:<sorted ids>`, `nextQuestion` for the
  wedge, `computeBand` for its band (`targetBand`). Bucket bands before coherence: the bucket's own
  band (or [0, 1] if never asked alone, `asked: false`), narrowed by the group bands (members
  bounded by the group's top and by what the others' bottoms leave; the non-members take what is
  left) through three passes; then `makeCoherent` with the orders from the comparisons
  (`analyse`). `nextMultiQuestion(run)` scores candidates in the same unit (a fraction of
  probability): a single-bucket lottery is worth its coherent band width (a bucket never asked
  alone: at most twice its sketch, so big buckets come first; x1.5 while the sketch is near-even
  within 15 points; a first lottery on a very unlikely or near-certain bucket x2 and never
  below 5 points: one tail check each); the least clear pair's comparison is worth how far
  their bands overlap; once every bucket was asked alone, a group lottery on the two widest
  buckets not asked together is worth 0.75 x their mean width. Stopping rule: nothing worth 2
  points, or 40 questions, or three "about equally likely" in a row end the comparisons (an
  indifferent respondent with 8 outcomes no longer gets 28 pairs), and a target's own search
  ends by itself (12 questions). Constants are in `constants.ts`. `answersInvolving` counts the
  answers touching a bucket for "from N comparisons". Tested with a respondent who knows the
  truth (4 outcomes: every bucket asked, tail included, ends coherent and holds the truth),
  indifference, the cap and the group narrowing. No UI yet, so no E2E.
  Added after review: group lotteries are applied with `applySumBand` (new in `coherence.ts`):
  members whose lows cannot add up to the group's top (a > 30%, b > 30%, a + b < 40%) are
  flagged (`analyse().groupIncoherences`) and widened minimally, never forced to a point; the
  side widened is not tightened back (`makeCoherent`'s new `lockedSide`); the buckets outside
  the group take what it leaves. A target's search skips wedges the coherent bands already
  settle (implied answers, not recorded), so a tail bucket is not asked about 60%. A comparison
  involving a bucket never asked alone is worth at most twice the smaller sketch (a decisive
  8-outcome run asks every bucket alone before the cap). Gaps for later: the multi run has no
  mode, so a thorough multi-outcome run would use the quick search per target (fine for v1,
  see For review); step 9's codec stores only `WedgeAnswer[]`, so step 26 needs a codec for
  multi answers (kind, targets, pick) and its replay check (the implied answers depend on the
  whole run, which `nextMultiQuestion` recomputes deterministically).
- **Step 19 (insights and adjustments)**: `domain/elicitation/insights.ts` on `ResultBucket`
  {id, label, estimate}. `topCoverage` (top 2, `TOP_K`; nothing when there are no more than k
  outcomes or a tie spans the cut). `oneInN`: below 5% (`TINY_BELOW`), two significant
  digits ("1-in-50", "1-in-55"). `orderDisagreements`: an order answer the first sketch
  contradicts ("you picked Rain over Cloudy but sketched Cloudy higher"; equal sketches do not
  disagree). `buildInsights` writes them in that order: "Your top two outcomes (Rain and
  Cloudy) cover 80%.", "You gave Snow almost nothing: that's a 1-in-50 claim.", ... Merging:
  `mergeOffer` for two or more outcomes each below 3% (`MERGE_BELOW`), only if at least two
  outcomes would remain; `applyMerge(buckets, ids, freshId)` makes (or adds to) one "Everything else" in the first
  merged one's place (a new one takes a fresh id issued with `issueId` from the outcome list, never
  an old outcome's id; "Everything else" is found with `isEverythingElse`, case, spacing and
  Unicode form ignored, as in the model); the tool offers and never merges by itself. Adjusted values (percent):
  `totalState` / `describeTotal` ("12 points too many", "13 points not yet placed", "1 point
  not yet placed"), `canBet` (exactly 100, every value a percentage), `normalizePercents` (two decimals, exactly
  100, leftover hundredths by largest remainder, earlier first on ties; refuses negatives and a
  zero total). The UI that shows them is steps 23-26. No UI here, so no E2E.
- **Step 20 (continuous bucketing)**: `domain/elicitation/bucketing.ts`. `bucketCurve({min, max,
thresholds, curve}, unit?)`: the curve is a polyline through N points (relative likelihood,
  any scale, any order, density 0 outside its points), integrated exactly over [min, max]
  and normalised. Edges: the user's thresholds always (unrounded; those not strictly inside
  (min, max) go to `ignoredThresholds`; at most 7), plus the curve's shape changes: valleys
  (a vertex lower than its left neighbour and not higher than its right) and each hump's
  flanks at half its height, walking down from the peak and not past a valley. Shape edges are
  snapped (`snapRound`) to the roundest number within range/40: of 10^k, 5, 2 and 1 times
  powers of ten, the biggest step with a multiple in reach; an edge that lands on a threshold
  or outside is dropped. A curve with no shape change (flat) is split at its median so there
  are at least two buckets. Neighbouring buckets both below 3% (`MERGE_BELOW`) are merged by
  removing the edge between them, never a threshold's; above 8 buckets (`MAX_OUTCOMES`) the
  non-threshold edge with the smallest combined mass goes first. Outer buckets are open-ended
  ("below 2.5", "2.5 to 7.5", "7.5 or more", with an optional unit); probabilities sum to
  exactly 1 (the last takes the rounding remainder). Bars: `barsToProbabilities` takes the
  percentages as entered (no normalising: that is `normalizePercents`), `barEdges` gives round
  edges for the bars view (thresholds plus an even, snapped spread). Property test over 40
  random curves. Added after review: all numbers must be finite (a URL could carry Infinity or
  NaN; those used to hang the snapping); thresholds are counted after dropping out-of-range and
  repeated ones; `barEdges` never makes more than 8 bars; labels use as many decimals as the
  range needs and never exponent notation; a valley counts only between two higher points
  (not the foot of a hump); edges that snapping would fold together stay unsnapped (a narrow
  spike keeps both flanks); bucketing has its own `BUCKET_MERGE_BELOW`. No UI yet, so no E2E.

- **Step 21a (outcome discovery)**: the gate has a kind selector (yes/no, one of several
  outcomes, a number: shown disabled with "Coming soon" until step 23). Categorical runs
  live in `src/storage/multiRun.ts` (sessionStorage `howsure.multi`); starting one kind
  clears the other. `OutcomeDiscovery` collects outcomes and shows the first sketch (tiers
  scaled to 100%). Questions arrive in step 24, so a categorical run currently ends at the
  sketch (accepted: the stack lands as a whole). The invite gate hides the kind
  selector (an invite is yes/no until step 26). Chromium E2E (local workaround config): 16
  tests of the touched specs pass, axe on discovery and sketch.

- **Step 21b (numbers view)**: before the first outcome, "Use numbers instead of tiers" swaps the
  tier radios for a percent field per outcome; the sketch step then becomes "Your numbers":
  editable percentages taken as typed, a live total ("12 points too many" / "13 points not yet
  placed") and Normalize (`normalizePercents`). The run stores `view` and `percents`; in the
  numbers view outcomes have no tier. The input is reusable for the bars of step 23a.
  Chromium E2E (local workaround config): outcomes spec 2 tests, axe on both views.

  Review follow-ups: Normalize here lifts a share that would round to 0.00 to 0.01 (the
  hundredths come from the largest values); "12,5" and "30%" are accepted as typed.

- **Step 22a (spot checks)**: split from 22 (22b: help to fix in place, standing notice on the
  result screen). Closing the list now goes to the checks (`selectSpotChecks`: up to 3 pairs and
  one completeness, answers stored in the run and validated against the seed on load), then the
  sketch. A problem shows the wrong-tool message with "Change the outcomes" (back to the list with
  a reminder to read all of it; the checks start over when it is closed again) or "Keep them as
  they are" (`kept`: a notice on the numbers). Any edit of the list resets the checks. Chromium
  E2E: outcomes spec 3 tests, axe on a check and on the verdict. "Everything else" takes part in
  neither pairs nor the completeness check (both could only be "no"); with only it and one other
  outcome nothing is asked and the sketch follows. Every check screen has "Change the outcomes"
  and "Start again". 22b: a "yes" to completeness must offer "Everything else" again.

- **Step 22b (help to fix)**: each problem on the verdict screen has its fixes (`ListFixes`,
  pure parts in `fixes.ts`): rename both outcomes; merge them (new id, the likelier tier, or the
  sum of the percents capped at 99.99); replace one with narrower outcomes (it is removed, the
  user adds the new ones); for a gap "Add “Everything else”" (also after it was declined; asks
  for a percent in the numbers view) or "Add another outcome". Every fix returns to the list with
  the checks reset and the "read the whole list again" reminder. Chromium E2E: outcomes spec 4
  tests, axe on the merge form.

- **Step 23a (number claims: range and bars)**: the gate's "A number" is enabled. A number run
  (`src/storage/continuousRun.ts`, sessionStorage `howsure.continuous`; one run of one kind per
  tab) first asks for the plausible minimum and maximum, an optional unit and thresholds, then
  shows a bar per bucket (`barBuckets`: thresholds plus round edges, at most 8). The percent list
  with the live total, Normalize and focus handling is now `PercentList`, shared with the
  categorical numbers view (refactored; the same tests pass). In the bars view a blank bar is 0, 0
  and 100 are allowed (the bars view lets the user do anything), unlike categorical outcomes.
  Chromium E2E (local workaround config): new `elicit-continuous.spec.ts`, axe on both screens.

- **Step 23b (the curve)**: the bars view has "Draw a curve instead" / "Use bars instead". The curve
  goes through 9 evenly spaced points, each a relative likelihood (0 to 100, unitless, blank = 0)
  typed in a labelled field or set by pressing or dragging on the SVG (nearest point, pointer only,
  so the fields are the keyboard and screen-reader way). Under the drawing the chance per range
  follows live from `bucketCurve` (thresholds always, plus the shape's edges, open-ended outer
  ranges, at most 8; dashed lines on the drawing mark the edges). `bucketCurve` labels now show
  edges exactly, as `barBuckets` does. The run stores `view` and `curve`; the bars are kept when
  switching. Chromium E2E: continuous spec 2 tests, axe with the curve.

- **Step 24a (question flow, categorical)**: step 24 is split (24b: the same flow for number claims,
  where the bars/curve buckets become the outcomes and the typed numbers the sketch). From the
  sketch, "Start the questions" moves to phase `ask`: comparison ("which is more likely?" with "about
  equally likely") and lottery screens (win if the result is "X" / one of ..., or on the spinner;
  "I can't separate these"; "Stop here"; no band; "at most N questions left"). The domain `MultiRun`
  takes an optional `sketch`, so the numbers view works: its typed percentages, scaled to 1, are the
  sketch (`toMultiRun`). Answers are stored as `{k:'c'|'l', ...}` and checked on load by replaying
  `nextMultiQuestion` (`multiAnswers.ts`). When no question is worth asking, or the user stops, a
  placeholder "Where your answers stand" lists the coherent band and provenance per outcome; step 25
  replaces it. Chromium E2E: `elicit-multi-questions.spec.ts` (2 tests, axe on a question and the end).

- **Step 24b (question flow, number claims)**: "Start the questions" in the bars and the curve view
  freezes the buckets and the starting chances into the run (phase `ask`): for bars, the edges and
  typed percentages (blank is 0, at least one above 0); for the curve, `bucketCurve`'s edges and its
  chances per range (two decimals). The ranges, named with the unit ("0 to 8 °C"), are the outcomes
  without tiers, and the numbers are the sketch (`continuousToMultiRun`); tail checks use the sketch
  (at or below 5% / at or above 85%). The question screens are the same `MultiQuestions`, now taking
  the domain run, so both kinds share it. The ask-phase run is validated on load by replay like the
  categorical one; older runs without answers load. The range and the drawing cannot be changed once
  the questions have started (start again). Chromium E2E: continuous spec 3 tests, axe on a question.

- **Step 25a (result, several outcomes and number claims)**: step 25 is split (25b: merge offer and
  applying it, adjust after with Normalize, the trace). `multiResult` (domain) gives per outcome the
  coherent band (headline), the point estimate (the band's log-odds midpoint; none for a
  one-sided band, which says "No single number yet" instead of inventing one; the insights count such an
  outcome at its first sketch inside the band), the provenance and whether the band was widened;
  `flags` in words for incoherent bounds, group answers that do not fit their parts, and order
  answers that were left out (nothing is rescaled); the insights. `MultiResult` replaces the
  placeholder standing, with the `kept` notice (`KeptNotice`, now its own component) for categorical
  runs. Chromium E2E: the two question specs, adapted ("Your result", "Result per outcome").

- **Step 25b (own numbers, merge)**: step 25 is now 25a to 25d (25c: start a new claim and stale runs;
  25d: the trace). On the result, "Your own numbers" (`PercentList`) start at the best single number
  (the sketch inside the band for an outcome with an open end), say neutrally how each sits against
  its range, and Normalize scales them (cursor on the total). The merge offer (`mergeOffer`) is shown
  for categorical claims only; "Merge them into Everything else" applies a view (`mergeRows`: bands and
  numbers add, answers untouched), "Undo the merge" reverses it; either resets the own numbers. Own
  numbers and the merge are stored in the run (`adjusted`, `merged`; absent in older runs).

## Decisions

- Step 25b (review): a merged "Everything else" has the summed band kept within what the other outcomes
  leave over (lo >= 1 - their highs, hi <= 1 - their lows) and its single number is that band's
  midpoint again (none if it is one-sided), not the sum of the parts' numbers; the answers behind it are
  counted once. The view names no merged-away outcome in the insights or flags. `applyMerge` in
  `insights.ts` was dropped: `mergeRows` is the only merge rule.
- Step 24a: no thorough mode and no "approx. N left" for several outcomes (no estimate function
  exists, and a countdown from the 40-question cap would be the forbidden "question k of N"): the
  screen shows no line about questions left until there is a real estimate.
  Outcomes cannot be edited once the questions have started (start again instead).

- Step 23b: after a range change the curve heights stay with their point numbers, so they carry over
  to the new x positions (the curve keeps its shape over the new range); the bars carry over only
  when the buckets come out the same. Heights are plain numbers on an arbitrary 0 to 100 scale, never
  percentages ("%" is refused), and the drawing is not rescaled to the tallest point.

- Step 23a: "A number" is enabled at the gate now (least risky: the bars view is a complete input;
  the curve and the questions come later in the stack, which lands as a whole). A number run ends
  at the bars, like a categorical run ends at its sketch, until step 24.

- Step 21b: the view can be switched only while the list is empty (an outcome has either a
  tier or a number; converting between them mid-list needs a rule nobody asked for). Percents
  are strictly between 0 and 100 (same parser as the adjusted value). No "Everything else" offer
  in the numbers view (it is triggered by tiers).

- Step 21a: the categorical kind stays enabled (the first sketch is the starting result per the
  requirements) with honest sketch copy; see "For review" for the merge consequence.

- Step 17: after widening one side to the boundary, the sums do not tighten the other side
  back (widened lower bounds do not cap the upper bounds, widened upper bounds do not lift the
  lower ones). Tightening against a bound that was just widened to exactly 100% shrinks every
  band to a point (A 50-90, B 30-40, C 30-35 would become single numbers), which is false
  certainty; with this rule the example gives A, B, C each keeping its upper bound and a lower
  bound moved down by the same logit shift. Which of several conflicting order answers is
  dropped is decided by input order (the first one that makes the rest hold), which is a guess;
  the UI can list them and let the user choose.

- Step 14: the criteria of an invite are carried into the friend's run even if they rewrite
  the claim on the gate (the claim stays editable). Locking the claim, or dropping the
  criteria when it changes, would be a one-line change in `ElicitPage.start`.

- Step 12: an all-"can't separate" run is reported as the span of wedges the user could not
  separate (no band, no best guess); `computeBand` keeps returning null for it. The
  alternative, a result type that carries this span, would be a change in `bandRule.ts` and
  `trace.ts`; for now it lives in `ResultScreen`.

- Step 5: a run with only "can't separate" answers gives `computeBand` = null (no band,
  no result). The doc says only that stopping before the first answer gives no result and
  that few answers may give a one-sided band; it does not cover this case. Alternative
  (reversible, for steps 8/12 to pick up): a result carrying the range of wedges the user
  could not separate, without a band. A "can't separate" answer outside [H, S] is a
  contradiction the band rule ignores; the trace (step 8) can point it out.

## For review

- Step 25a [NEEDS PROTOTYPE]: the result layout (band large, "Best single number: about N%" and the
  provenance under it, one amber box for everything that does not fit). The `kept` notice shows for
  categorical runs only; number claims have no disjointness check.

- Step 24a [NEEDS PROTOTYPE]: the comparison and group-lottery screens (arms read "Win 20 EUR if the
  result is one of: ..."; the lottery reuses `QuestionScreen` through its `statement` slot), and the
  placeholder standing. Runs stored before 24a load with no answers (missing fields default). In
  the numbers view and for 24b (no tiers) a sketch at or below 5% or at or above 85% counts as a
  tail, so a 1% outcome is still asked. The shared-URL codec for multi-outcome runs
  (step 26) must carry `answers` in the same `{k, ...}` form and replay them like `loadMultiRun`.

- Step 23b [NEEDS PROTOTYPE]: the curve is a fixed 9 points with drag-to-set and a number per point;
  alternatives are a freehand stroke, more or fewer points, or draggable handles with arrow keys.
  The curve does not feed a probability yet (step 24 onwards use the buckets).

- Steps 24 to 26 must replace the "More questions to refine this are coming" copy (categorical
  sketch, numbers view, bars view) and carry the buckets (`barBuckets`, categorical outcomes) into
  the questions and the result; the stack must not ship partway, because until step 24 both
  multi-outcome kinds end at their first sketch or bars.

- Step 23a [NEEDS PROTOTYPE]: the range form (minimum, maximum, unit, thresholds one at a time) and
  the bars view (one percent field per range with a plain bar beside it). Buckets of the bars view
  come from `barEdges`: the bar boundaries are not editable beyond the thresholds. The curve view
  (23b) is the other way to draw.

- Step 22b: with two problems on the verdict screen both fix forms can be open (each takes
  focus when opened); only one is expected in practice. Close-the-other is a small change if wanted.

- Step 22a: the checks run on every close of the list, also after small edits (no memory of
  "already checked this pair"); decide whether a changed list should re-ask only checks that
  involve what changed. Step 25's result screen must show the `kept` notice too.

<!-- [NEEDS PROTOTYPE] variants and decisions the user should look at -->

- Step 21a: until step 24 lands, a categorical run ends at the sketch, so merge the stack
  through step 24 together; if merged piecemeal, disable the kind like "A number".
- Step 21b: `analyse`/`firstSketch` throw on outcomes without a tier, and numbers-view runs have
  none, so step 24 must feed the typed percents in as the sketch for those runs.
- Step 21b: stored runs from the 21a commit lack `view` and are dropped on load; 21a was never
  released, so there is no migration.
- Step 21a decisions: "Everything else" is added with tier "unlikely" (it is a bucket of
  unknown content; the user can remove or re-add it). Multi-outcome runs show no
  quick/thorough choice. Declining "Everything else" is remembered for the run.
- Step 21a [NEEDS PROTOTYPE]: the tier-per-outcome UI (label field plus five radios under it, a
  list below with Remove) is the simple variant; a drag-into-columns or slider variant could
  replace it behind `OutcomeDiscovery`. The "Is there another outcome?" prompt is the heading
  over the add form plus a "That is all the outcomes" button once there are two.

- Step 18b: the multi-outcome run has no quick/thorough mode (the per-target search is the quick
  one); decide whether thorough multi-outcome runs are wanted for v1 (the plan does not ask for
  them).

- Step 17: (a) incoherent bounds are shown as extra width by not tightening the widened side
  back against itself (see Decisions); (b) which conflicting order answer is dropped is decided
  by input order, not by the user.

- Step 15a (for the PR text): clicking "Bet on this" puts the claim, criteria, stake and the
  first participant's numbers in the address bar, because the wager calculator's URL is its
  state. That is the one place the claim reaches the address bar from the elicitation without
  an explicit share; the provenance ("45-62% from elicitation") is not in the URL. Also:
  "Bet on this" refuses while the adjusted field shows text that is not a percentage, so it
  never bets on an older valid value.

- Step 15a: the handoff button ("Bet on this", under the result) and the provenance line under
  the first participant's name are a first simple version. Open: the provenance wording, whether
  it should also show the adjusted value or the point estimate, whether the handed-over
  wager should carry the stake amount (it does not: the amount has no effect on any output),
  and whether "Bet on this" should also be offered on a shared result.

- Step 14: the share section (two buttons, a note, the link shown below) and the shared-result
  banner are a first simple version. Open: whether the claim should stay editable when
  opening an invite (it is, so a friend can change what it means; locking it would keep
  the two answers about the same sentence), whether a native share sheet should be offered
  on phones like the wager's Share button, and whether a shared result should show the
  sender's claim more prominently.

- Step 13: the adjust section (two blocks side by side, a plain text field for the
  percentage, a one-line gap sentence) is a first simple version. Open: a slider or
  stepper instead of typing, whether the field should start at the estimate or empty for
  everyone (it starts at the estimate, and an untouched default is not counted as "set"),
  and whether the gap sentence should show a number.

- Step 12: all-"can't separate" runs show the indifference span instead of a band (see
  Decisions); whether that should be a real result type is open.

- Step 12: the result screen layout and wording are a first simple version (interval
  headline, smaller best guess, a plain "coarse" line, one amber note for a hard
  contradiction, a native `<details>` trace, "That was a misclick, drop it" buttons under
  each contradicting pair). Open: how loud the contradiction note should be, whether a
  coarse result after a drop should offer more questions, and how much of the trace's
  per-step band ("After this, the range was ...") is useful rather than noise.

- Step 11b: the question screen's layout and wording are a first simple version: two
  card-buttons (arms) plus a smaller "I can't separate these" below, "Stop here" and the
  estimate at the bottom. Open: whether the arms should be labelled A/B, whether the
  prize should show the stake at all (it is shown as the entered amount and currency), and
  how "I can't separate these" is worded. The thorough "approx. N left" is a
  simple expected-remaining-steps sum: it is within about 6 of the truth in tests, and
  may rise while a staircase is still walking.

- [NEEDS PROTOTYPE] Reference lottery visual (step 11a): pie wedge for 10-90%, ball field
  (100 or 1000) in the tails, number always shown. `ReferenceLottery.tsx` is the one
  component to swap; the 10%/90% switch is `COUNT_BELOW` in `lottery.ts`. Open design
  questions: dot size and contrast of the 1000-ball field (now 8 px pitch, grey-500
  outlines); the upper tail also states the losing count ("97 winning balls and 3 losing
  balls out of 100") so a large count is not read as a small one. Off-grid chances are
  snapped first, so counts and label always agree.

- Step 7: thorough runs take 14-19 questions for typical respondents, ~21 for tail beliefs
  (the doc says 14-18). Negation probes are the only thorough question that depends on the
  direct band, so they wait until both staircases have a bracket.

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
