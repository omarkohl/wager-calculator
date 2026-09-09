# howsure.org — Scope Extension Requirements

Status: draft from requirements interview, 2026-09-07..09. Covers the site
container, tool 2 (belief elicitation, the focus) and tool 3 (Bayesian
updating, sketched only).

## The product

howsure.org is a **toolbox with a spine**. Each tool keeps its own name,
route and personality; what unifies them is that all three traffic in the
same object, a probability:

| Tool                | Role      |
| ------------------- | --------- |
| Belief elicitation  | produces  |
| Bayesian updating   | transforms|
| Wager calculator    | tests     |

The test of whether the domain earns its existence: **each tool can hand a
probability to another one**. At least one live handoff is a v1 requirement,
not a nice-to-have.

### Container

- One repo, one SPA, client-side routes. Shared shell, header/nav, help/FAQ
  pattern, design system, decimal.js.
- The existing wager app stays intact behind its route. Legacy `#v=2` (and
  v1) links keep working.
- Still a PWA, still no backend, still no accounts.

## Core user flow

### Tool 2 — belief elicitation

**Method: reference lottery** (probability wheel), not direct betting
questions. The user repeatedly picks between:

- **(A)** win the stake if the claim is true
- **(B)** win the same stake if a spinner lands in a shaded `w`% wedge

Both arms pay an identical prize, so risk aversion cancels and the only
thing being compared is relative likelihood. Direct betting questions were
rejected because they confound belief with risk appetite and report the
latter as the former.

**Setup (minimal gate):**

1. Claim text — required.
2. Stake amount — required, remembered across sessions (same pattern as
   `storage/stakesPreference.ts`). Framed as "name an amount big enough that
   you'd genuinely think before answering." **It has no effect on any
   output** — in a reference lottery the prize cancels — so the UI must not
   imply it feeds a calculation. Its only job is to make the user take the
   question seriously.
3. Mode — quick (default) or thorough, one click apart.
4. Resolution criteria — offered **after**, not before. The moment the tool
   reveals a claim is vague is the moment the user is motivated to write
   criteria; putting the field up front is friction nobody pays before they
   see why.

Fun stakes (cookies, hugs) are deliberately **not** offered here.

**The search is a boundary search, not a bisection to a point.** The tool
locates the two edges of the user's indifference band: the highest wedge
they still prefer the claim over, and the lowest wedge they'd rather have
than the claim. The interval is measured directly rather than being a
byproduct of where the run gave up.

Per question, three answers:

- prefer the claim
- prefer the spinner
- **"I can't separate these"** — this **probes outward**, it does not end
  the run. Indifferent at 52 → next question at 65. Discriminate there and
  the band is narrow; still indifferent → push to 80.

**Presentation:**

- The wedge shows its number. Concealment was rejected: an unlabeled area is
  inaccessible, the number must be exposed to assistive tech anyway, and
  hiding it would only make the tool worse for blind users. The visual's job
  is to make `w`% *felt*, not to withhold it.
- Opening wedge randomized in 35–65%, PRNG seeded from the claim text — same
  approach already used for payout rounding tiebreaks in `domain/brier.ts`,
  so runs stay deterministic and shareable.
- **No narrowing-band display during the run.** Showing the live bracket
  hands the user an explicit numeric range and invites them to reason about
  it instead of comparing the two prospects — a worse anchor than the
  opening wedge.
- Progress: a **"stop here"** button always visible, plus "approx. N
  questions left". N is computed from current bracket vs. target width, held
  non-increasing within a run, and bumps up visibly only when an outward
  probe fires (the one case where the run genuinely got longer, explicable
  in a sentence). No "question 3 of 7" counter — the length is
  data-dependent, and a counter invites rushing the end of a run.
- The exact visual form of the reference lottery — spinner, urn, bar, grid
  of 100 — is **[NEEDS PROTOTYPE]**.

**Log-odds and the tails:**

- The search proposes wedges at perceptually even steps in **log-odds**
  (50%, 25%, 10%, 3%, 1%), not by halving percentages. Same question budget,
  real resolution at the tails.
- Below ~10% and above ~90% the visual **switches representation** from a
  wedge to a discrete count ("3 winning balls out of 100", degrading to
  1-in-1000). People reason about small frequencies far better as counts
  than as areas. The switch is **[NEEDS PROTOTYPE]**.
- Results are still *reported* in percent — there is a conversion boundary
  to get right.
- Log-odds is also the space tool 3 works in (likelihood ratios are additive
  there), which makes the spine mathematical rather than merely visual.

**Modes:**

- **Quick** ≈ 6 questions, coarse band (~15 points wide).
- **Thorough** ≈ 14–18 questions, adding:
  - Two runs with opposite anchors — ascending finds the lower edge,
    descending the upper. These are not two estimates of one number; they
    are one estimate each of two different numbers.
  - Swapped-arm repeats of already-answered comparisons.
  - **Negation-framed probes** — a few questions about the claim being
    *false*, to catch subadditivity. Flagged clearly and neutrally in the
    question text, with **no meta-commentary** identifying it as a check;
    naming it in the moment cues users to compute the complement and hand
    back manufactured coherence.
  - A tighter stopping bracket.

**Result screen:**

- **The interval is the headline.** Point estimate (band midpoint) is
  secondary, in smaller type. A result screen that leads with a single
  number would make this a slower slider.
- Full answer trace, expandable, collapsed by default — matching the
  existing disclosure pattern (`CalculationDetails`, `explanation.ts`). The
  trace is more convincing than the number and is the thing worth sharing.
- Any subadditivity found is flagged here for the user to ponder.

**Sharing** — deliberately breaks the wager app's "URL is the state"
convention, on privacy grounds:

- **In-progress runs live in `sessionStorage`, not the URL.** Survives a
  refresh (losing 12 answers to a stray reload is brutal), and nothing sits
  in the address bar to leak.
- URLs are produced only by **explicit share**, in two flavours:
  - **Invite** — claim only, answers and result stripped. Send to the friend
    you're arguing with so they elicit their own belief unanchored.
  - **Result** — claim, answers, trace, band.
- The claim text may sit in the URL from the start so a bookmark is
  meaningful.

**Handoff (v1, one direction only):** the result screen offers "bet on
this" → opens a fresh wager with the claim carried over, two outcomes
(Yes/No), and the **midpoint** filled into the user's row. The interval is
surfaced as provenance near that cell ("45–62% from elicitation") so the
width isn't silently discarded. If two people's intervals overlap, that is
itself worth knowing before betting.

### Tool 3 — Bayesian updating (sketch)

**Linear chain, not a graph. No ReactFlow.** The described shape — prior
flows through boxes to a posterior — is a list, and ReactFlow would import
a >100KB canvas editor that is miserable on mobile, hostile to screen
readers (no meaningful reading order, and the project runs axe-core in CI),
and would put meaningless node positions into the URL.

- Vertical stack of evidence cards: prior at top, each card showing the
  probability in and out, posterior at bottom. Reorderable with buttons,
  natively responsive and accessible, encodes to a URL as an ordered list.
- Everything stays editable for play.
- **Evidence strength input:** primary form is two probabilities — "if the
  claim were true, how likely is this evidence? …and if false?" — with the
  likelihood ratio derived and shown. A raw-LR toggle for the fluent.
  Qualitative presets (weak/moderate/strong → fixed numbers) are rejected:
  canned numbers wearing the costume of a judgment.
- **Independence caution.** Multiplying LRs is valid only under conditional
  independence. Three outlets running one wire story is one piece of
  evidence; a user entering it as three rockets to 99% on a single source.
  This is the main way such tools get misused and it is more dangerous than
  anything in tool 2, because the arithmetic looks authoritative all the way
  down. Standing non-blocking caution near the evidence list, plus a nudge
  when the chain runs long or the posterior clears ~95%.
- Show the running probability after **every** step, not just at the end.
- Offer an odds / log-odds view: each piece of evidence becomes a
  fixed-width shove in one direction, which makes "strong evidence" legible
  in a way percentages hide.

## Edge cases

**Confident coin flip vs. total ignorance.** Distinguished by *when* the
user stops discriminating, with no self-report needed. A sharp 50/50
believer prefers a 60% spinner clearly and only fails to separate very near
50 → narrow band. Someone who knows nothing has no basis to prefer either
option even at 60% → fails early → wide band. This is why "can't separate"
must probe outward rather than terminate: a terminating rule would report a
coin-flipper who drew an opening wedge near 50 as maximally ignorant.

**Contradictions are absorbed, never forced.** If the user is pushed to
re-answer ("you said X, now Y — which is it?"), they learn what a consistent
respondent looks like and start performing consistency, training away the
signal being measured. Inconsistency is the finding, not user error. A
20-point wobble in the answers *is* a 20-point wobble in the belief.

- Contradicting pairs are shown in the result with a user-initiated "that
  was a misclick, drop it" affordance. Never a system demand.

**Subadditivity** (P(X) + P(not-X) > 1) widens the interval and is flagged
in the optional details for the user to ponder. Never refused, never
blocking.

**Nonsensical answers → sharpen the claim.** Trigger on a hard
non-monotonic contradiction (preferred the claim over a 70% wedge *and*
preferred a 40% wedge over the claim) or a band wider than ~50 points. The
result screen still gives the number, but leads with "your answers don't
hang together; the usual cause is that the claim can mean more than one
thing", opens the resolution-criteria field, and offers a re-run. Prompt,
never a gate. There is **no** dedicated "this claim is unclear" button —
behavioural detection beats self-report, and people rarely notice their own
claim is vague.

**Partial runs** are real answers. "Stop here" yields the current band,
honestly labelled as coarse.

**Extremes** are handled by the log-odds search and the tail representation
switch (above).

## Explicit non-goals

- **Multi-outcome propositions** in the elicitation tool — **[DEFERRED]**.
  The reference lottery doesn't compose: eliciting each outcome separately
  and normalising to sum to 100% is arbitrary and destroys the intervals. If
  it returns it needs a different method, not an extension of this one.
- **Wager → elicit return trip** — **[DEFERRED]**. Preserving a half-filled
  wager across a route change, tracking which cell to return to, and
  handling mid-elicitation abandonment is real plumbing for a path that is
  probably rare; people usually know they're unsure before opening a wager.
- **DAG / Bayes-net version of tool 3** — **[DEFERRED]**, as a possible
  *fourth* tool, not an evolution of the third. Chain maths (multiply the
  odds by each LR) does not generalise to multiple parents, so it would be a
  rewrite, not a refactor.
- Fun/non-monetary stakes in the elicitation gate.
- Qualitative evidence-strength presets in tool 3.
- Forcing the user to re-answer anything, anywhere.
- Refusing to output a number (rejected mid-interview as inconsistent with
  absorb-don't-force).
- Backend, accounts, server-side history.
- A single unified UI metaphor across the three tools.

## Open questions

**Site & migration**

- Tool names and route names — none chosen. "Wager Calculator" as a brand
  under howsure.org is unresolved.
- What lives at the root of howsure.org: a landing page, or the wager tool?
- **Origin change is not free.** Moving from the current GitHub Pages URL to
  howsure.org changes the origin, which orphans installed PWAs, existing
  service worker caches, and the `localStorage` stakes preference. Needs a
  deliberate plan (redirect, PWA identity, whether to attempt any migration).
- Hosting/deploy target for the new domain; whether all three tools share
  one service worker and offline scope.
- Analytics / monetisation: not discussed at all.

**Tool 2 details**

- Currency or unit for the stake gate — reuse the existing stakes catalog's
  currency list, or a plain free-text amount?
- How many negation probes in thorough mode, and where in the sequence.
- Whether the result trace should be screenshot-optimised the way the wager
  payout summary is.
- Exact target band widths for quick vs. thorough (placeholders: ~15 points
  / a few points).

**Tool 3 details**

- How the prior is entered (typed? handed over from tool 2? elicited?).
- Practical cap on the number of evidence cards.
- Whether tool 3 gets its own share/URL format now or later.

### Tag index

**[NEEDS PROTOTYPE]**

- Visual form of the reference lottery (spinner / urn / bar / grid of 100).
- The tail representation switch below 10% and above 90%.

**[DEFERRED]**

- Multi-outcome elicitation.
- Wager → elicit return trip.
- DAG / Bayes-net tool.
