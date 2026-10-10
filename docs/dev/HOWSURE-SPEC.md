# How sure are you? (tool 2) — Implementation Specification

What was built of [HOWSURE-REQUIREMENTS.md](HOWSURE-REQUIREMENTS.md) for tool 2 (belief
elicitation), and the values the requirements left open. The requirements doc is the source of
truth for intent; this document says how the code behaves. Tool 3 is not built.

## The site

One single-page app with path routes (History API); the names live in `src/routeTable.ts` and are
placeholders. `/` is a small landing page linking the tools, `/wager` is the wager calculator and
`/elicit` is tool 2. A wager hash (`#v=`, legacy v1, `#faq=`) opened at `/` goes to `/wager` with
the hash kept. The base path comes from the build variable `BASE_PATH` (default `/`); GitHub
Pages deep links work because `404.html` is a copy of `index.html`.

## What the user does

1. **Gate.** The claim, a stake (an amount in a currency of the stakes catalog, remembered in
   `localStorage`), the kind of claim (yes/no, one of several outcomes, a number) and, for yes/no,
   quick or thorough. No resolution criteria are asked here.
2. **Questions.** Always "which would you rather have": win a prize if the claim holds, or win the
   same prize if a reference lottery wins. The lottery is a spinner with a shaded wedge between 10%
   and 90%, and in the tails (under 10%, over 90%) a grid of balls ("a ball drawn at random is a
   winning ball"). Its chance is shown small and muted and is in its accessible name. Answers: the
   claim, the lottery, or "I can't separate these". "Stop here" is always there; no band is shown
   while the run goes on, and no "question k of N".
3. **Result.** A band on the probability is the headline, the point estimate (the band's log-odds
   midpoint, none for a one-sided band) is secondary, followed by what does not fit together,
   insights, the user's own numbers ("adjust after"), "Bet on this", share links and the trace.
   For yes/no, resolution criteria are offered after the result (a text field that travels to the
   wager and the links); for the other kinds they come from an invite.
4. **Hand-off.** "Bet on this" opens the wager calculator with the claim, the criteria as details,
   the gate's currency and the first participant's numbers filled in (yes/no: the adjusted value or
   the point estimate; several outcomes and numbers: only at exactly 100%, otherwise it points to
   Normalize). The wager page shows where the numbers came from until they are edited.

## The algorithm (yes/no)

Everything is done in log-odds on a grid from 1-in-1000 to 999-in-1000. The next question is a pure
function of the seed and the answers (seeded PRNG), so a run can be replayed and a result link is
checked by replaying it.

- **Band rule.** H is the highest wedge the claim beat, S the lowest that beat the claim; the band
  is H to S. "Can't separate" widens the band; only such answers give no result.
- **Quick mode.** One boundary search, target band width 1 logit, a randomised opening wedge between
  35% and 65%, at most 12 questions (typically 4 to 6).
- **Thorough mode.** Two interleaved staircases with opposite anchors, target width 0.3 logit, 2
  swapped-arm repeats and 2 negation probes (the same comparison about the claim being false) in the
  second half; 14 to 18 questions typically.
- **Contradictions.** Answers that disagree are listed with a "that was a misclick, drop it" offer;
  more than 1 logit apart is a hard contradiction ("sharpen the claim").

## Claims with several outcomes

- **Discovery.** Outcomes one at a time, each into a tier (very unlikely 2%, unlikely 10%,
  plausible 30%, likely 60%, near-certain 90%, scaled to add up to 1 as the first sketch) or with a
  number of one's own. After two "very unlikely" in a row "Everything else" is offered; declining
  is remembered. At most 8 outcomes (the wager's cap). The claim stays editable.
- **Disjoint and exhaustive.** Up to 3 random pairs ("can both happen?") and one completeness
  check ("could it be none of these?"); "Everything else" is left out of both. A problem gets the
  wrong-tool message: change the outcomes (rename, merge, replace one with narrower outcomes, add
  "Everything else") or keep them, which puts a standing notice on the numbers.
- **Questions.** Comparisons ("which is more likely", with "about equally likely") and the lottery on
  one outcome or a group, chosen by the width of the band in percentage points with extra weight on
  the tails and a "no idea" sketch; comparisons stop after 3 "about equally likely" in a row; a run
  stops when nothing is worth 2 points, or after 40 questions.
- **Result.** Coherent bands, not normalised ones: lower bounds add up to at most 100%, upper bounds
  to at least 100%; each band is tightened to its reachable part; incoherence is flagged and widened
  minimally (unasked outcomes first, evenly in logits), never rescaled. Provenance per outcome (the
  first guess, or N answers); insights (top two outcomes, "1-in-N" for under 5%, an order that
  disagrees with the sketch); rare outcomes (each under 3%) can be merged into "Everything else" on
  request, as a view.

## Number claims

The plausible minimum and maximum, an optional unit and thresholds. The distribution is drawn as
bars (a percentage per range with a live total, "12 points too many" / "13 points not yet placed",
and Normalize) or as a curve (9 points of relative likelihood, a field per point and a drawing to
press or drag). Ranges: the thresholds always, plus round edges (bars) or edges where the curve's
shape changes (the valley between humps, the flanks of each hump), snapped to round numbers;
neighbouring ranges both under 3% are merged; at most 8; the outer ranges are open-ended. The
questions and the result are those of several outcomes, on the ranges.

## Storage and links

- The stake lives in `localStorage` (`howsure.stake`); the run in progress lives in `sessionStorage`
  (`howsure.run`, `howsure.multi`, `howsure.continuous`), stamped with `savedAt`. A run older than 7
  days is not resumed silently: a notice offers "Continue" or "Start a new claim". Every result ends
  with "Start a new claim".
- Links carry a format version (`ev=1`), are re-encoded for their canonical spelling and are
  validated by replaying the algorithm. An **invite** (claim, criteria and, for several outcomes
  or numbers, the outcomes or the range with its edges) opens the gate with those fixed; the friend
  rates the given outcomes or draws bars on the given ranges ("locked" runs, no spot checks). A
  **result link** opens read-only. For yes/no it carries the claim, the criteria, the mode (`m`),
  the seed, the answers, the dropped answers (`d`) and the adjusted value; for several outcomes
  and numbers the claim and criteria, the seed, the outcomes with their ids (`oi`) and tiers
  (`ti`) or numbers (`pc`), or the range with its edges, the answers as tokens, the user's own
  numbers, the merge and the kept notice (`k`). The claim is part of every link; the text says so.
- Nothing about a run is sent anywhere.

## Accessibility and testing

Every control is a labelled form control or button; focus moves to the next question, the result or
the field that needs attention after an action (not on a plain reload); axe runs on every screen the
E2E specs reach. E2E specs use accessible queries only (`e2e/elicit-*.spec.ts`).

## Where the code is

- `src/domain/elicitation/`: the pure logic. `constants.ts` holds the values the requirements settle
  (widths, grid, caps, tiers, thresholds of the insights); the search constants are beside their
  searches (`quickSearch.ts`, `thorough.ts`), the switch between spinner and balls is in
  `lottery.ts` and the number of curve points in `storage/continuousRun.ts`.
- `src/storage/`: `elicitation.ts` (yes/no runs, invites, result links), `multiRun.ts`,
  `continuousRun.ts`, `multiAnswers.ts` (answers codec and replay), `multiShare.ts` (result links of
  several outcomes and numbers), `runAge.ts`.
- `src/components/elicit/`: the screens.
