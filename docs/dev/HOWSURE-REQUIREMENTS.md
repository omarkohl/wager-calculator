# howsure.org — Scope Extension Requirements

Status: draft from requirements interview, 2026-09-07..09; revised
2026-09-28..29. Covers the site container, tool 2 (belief elicitation, the
focus: yes/no claims and claims with several outcomes) and tool 3 (Bayesian
updating, sketched only).

## The product

howsure.org is a **toolbox with a spine**. Each tool keeps its own name,
route and personality; what unifies them is that all three traffic in the
same object, a probability:

| Tool               | Role       |
| ------------------ | ---------- |
| Belief elicitation | produces   |
| Bayesian updating  | transforms |
| Wager calculator   | tests      |

The test of whether the domain earns its existence: **each tool can hand a
probability to another one**. At least one live handoff is a v1 requirement,
not a nice-to-have.

**v1 scope:** the shared shell, the wager calculator and all of tool 2
(yes/no, categorical and continuous claims), with the elicitation → wager
handoff. Tool 3 is a later milestone and gets its own
requirements pass first.

### Container

- One repo, one SPA, client-side routes. Shared shell, header/nav, help/FAQ
  pattern, design system, decimal.js.
- The existing wager app stays intact behind its route. Legacy `#v=2` (and
  v1) links keep working.
- Still a PWA, still no backend, still no accounts.

## Core user flow

### Tool 2 — belief elicitation (yes/no claims)

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

**Band rule.** Let H be the highest wedge the claim beat and S the lowest
wedge that beat the claim. The band spans H to S. Normally H < S. If H > S
the answers contradict each other, and the band still spans the two (claim
beat 60, 45 beat the claim → 45–60%): the user's answers don't
discriminate inside that range, whether from vagueness or noise. The
contradiction's size is |logit H − logit S|.

Per question, three answers:

- prefer the claim
- prefer the spinner
- **"I can't separate these"** — this **probes outward**, it does not end
  the run. Indifferent at 52 → next question a log-odds step further out
  (e.g. 65). Discriminate there and the band is narrow; still indifferent →
  push further (e.g. 80).

**Presentation:**

- The wedge shows its number. Concealment was rejected: an unlabeled area is
  inaccessible, the number must be exposed to assistive tech anyway, and
  hiding it would only make the tool worse for blind users. The visual's job
  is to make `w`% _felt_, not to withhold it.
- Opening wedge (quick mode; thorough mode's staircases start from their
  own low/high anchors) randomized in 35–65%, from a seeded PRNG (as in
  `domain/brier.ts`). The seed is **fresh per run** and stored with the run
  (sessionStorage, result URL) so the trace is reproducible. Not seeded from
  the claim: a re-run of the same claim must not repeat the same opening
  question, or the user just recalls their last answer.
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
- **Band width and point estimate are measured in log-odds too**: the
  stopping rule is a target width in logits, and the point estimate is the
  log-odds midpoint of the band (1–10% → ~3.2%, not 5.5%). A width in
  percentage points would be meaningless at the tails (1–16% is "15
  points").
- Results are still _reported_ in percent — there is a conversion boundary
  to get right.
- Log-odds is also the space tool 3 works in (each likelihood ratio becomes
  an additive shift there), which makes the spine mathematical rather than
  merely visual.

**Modes:**

- **Quick** ≈ 6 questions, a single boundary search, coarse band (~1 logit
  wide, i.e. roughly 38–62% around 50%).
- **Thorough** ≈ 14–18 questions. **Replaces** the single boundary search
  with:
  - Two staircases with opposite anchors, interleaved so the user can't
    track them — ascending (starting low) finds the lower edge, descending
    (starting high) the upper. These are not two estimates of one number;
    they are one estimate each of two different numbers. Anchor hysteresis
    between them ends up in the band.
  - Swapped-arm repeats of already-answered comparisons.
  - **Negation-framed probes** — a few questions about the claim being
    _false_, to catch subadditivity. Flagged clearly and neutrally in the
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
- A hard contradiction leads the screen with the "sharpen the claim" prompt
  (see Edge cases).
- **Adjust after.** Once the result is shown, the user may set their own
  value, e.g. with a clearer sense of what the numbers mean. Two values are
  kept side by side: **"your answers imply"** (the elicited band, fixed) and
  **"your adjusted belief"** (free to edit). A gap between them is shown
  neutrally ("you set this above what your answers implied"), never
  blocked. The adjusted value is what the handoff uses; the trace keeps
  both. The same rule applies to multi-outcome results.

**Sharing** — deliberately breaks the wager app's "URL is the state"
convention, on privacy grounds:

- **In-progress runs live in `sessionStorage`, not the URL.** Survives a
  refresh (losing 12 answers to a stray reload is brutal), and nothing sits
  in the address bar to leak.
- URLs are produced only by **explicit share**, in two flavours, both
  carrying a format version (like the wager's `#v=`):
  - **Invite** — claim and resolution criteria, answers and result
    stripped. Send to the friend you're arguing with so they elicit their
    own belief, about the same claim, unanchored.
  - **Result** — claim, criteria, seed, answers and adjusted value. Trace
    and band are recomputed from these, not stored; the format version
    pins the algorithm.
- The claim text is **not** in the URL before an explicit share. It is
  usually the most sensitive part, and address bars leak via history, sync
  and screenshots. Bookmarking an unfinished run is not supported.

**Handoff (v1, one direction only):** the result screen offers "bet on
this" → opens a fresh wager with the claim (and resolution criteria, into
the wager's details field) carried over, two outcomes
(Yes/No), and the **point estimate** (or the adjusted value, if set) filled
into the first participant's
row (Yes = p, No = 100 − p, rounded to the wager's 2 decimals). The interval is
surfaced as provenance near that cell ("45–62% from elicitation") so the
width isn't silently discarded.

### Tool 2 — claims with several outcomes

Same tool, for claims whose answer is one of several mutually exclusive
outcomes: categorical ("the weather tomorrow afternoon") or continuous
("noon temperature tomorrow"), the latter turned into buckets in the
background. The reference lottery stays the core method; what's new is a
fast first sketch and a way to combine per-bucket answers without
normalising the bands away.

**Useful at any length.** The first sketch is the starting result. Every
answer after that refines it, and each bucket shows where its number comes
from ("from your first guess" / "from 4 comparisons"). Two questions must
already yield some insight; more questions yield better ones. The user is
never made to continue.

**Categorical — discovering the outcomes:**

- Claim first, then outcomes one at a time, each dropped into a tier:
  _very unlikely / unlikely / plausible / likely / near-certain_. The tool
  keeps asking "Is there another outcome?"
- After two outcomes in a row land at _very unlikely_, it offers an
  "everything else" bucket. Declining is fine.
- The claim stays editable during this step. Listing outcomes often exposes
  a vague claim ("What will I do after my contract ends?" → "What will I be
  doing on 1 October?") before any number exists.
- Users who prefer numbers can switch to the bars view (see below) instead
  of tiers.

**Outcomes must be disjoint and exhaustive.** The tool says so plainly and
spot-checks it, without asking about every combination:

- 2–3 random pairs: "Can 'Rain' and 'Sunshine' both happen tomorrow
  afternoon?"
- One completeness check: "Could it turn out to be none of these?"
- On a "yes", help fix it (rename, split, merge, add an outcome), and ask
  the user to review the whole list, since the same problem may exist
  elsewhere.
- If the user won't fix it, say plainly that this is the wrong tool for
  overlapping or incomplete outcomes. Nothing stops a deliberately wrong
  answer, but the tool must not look like it supports the case: the result
  carries a standing notice that its numbers don't mean anything.
- This does not break "absorb, never force". A contradiction between
  answers is information about the belief. Overlapping outcomes are an
  error in the question: the probabilities can't add up to 100% at all.

**Continuous — draw, then bucket in the background:**

- Ask for the plausible minimum and maximum, and any thresholds that matter
  to the user (frost at 0 °C, missing a connection at 8 min).
- Two drawing modes:
  - **Bars:** y-axis 0–100%, each bar is its bucket's probability. The user
    may do anything; a live total shows a clear warning while it isn't
    100%, in both directions ("12 points too many" / "13 points not
    yet placed"), until they fix it or press **Normalize**.
  - **Curve:** drag a curve through N points. The y-axis has no units
    ("relative likelihood") and is always normalised; the percentage per
    bucket is shown live underneath. A 0–100 axis would be wrong here: the
    height is a density (% per °C), not a probability.
- Users who draw distributions likely understand probability already. For
  them the drawing is mostly a convenient input and the questions an
  optional refinement.
- **Buckets (hybrid):** the user's thresholds always, plus edges where the
  curve's shape changes (the valley between humps, the flanks of each
  hump; the density stays roughly flat inside a bucket), snapped to round
  numbers. Neighbouring buckets both below ~3% are merged. The outermost
  buckets are open-ended. Rejected: equal-probability edges (meaningless
  numbers like 8.3 °C, and they smooth valleys away) and equal width
  (wastes buckets on empty tails).
- Buckets are disjoint and exhaustive by construction, so no spot checks.

**Questions**, same presentation rules as yes/no claims ("stop here", no
live bands, randomised opening wedges, log-odds grid, tail counts):

- **"Which is more likely: A or B?"** Cheap and intuitive; gives order.
  Also offers "about equally likely".
- **Reference lottery** on one bucket or a group: "win if Rain, or on a
  `w`% spinner". Gives absolute levels. Group questions ("Rain or Snow")
  constrain several bands at once and catch subadditivity.
- **Next question:** the one with the widest band **in percentage
  points**. Brier cost is quadratic in the error in p, so what matters is
  the band's width on the probability scale: a 1-logit band spans ~25
  points around 50% but ~1 point around 2%. This weights large buckets
  without a separate importance factor. Extra weight on _very unlikely_ and _near-certain_ tiers
  (overconfidence lives there, one tail check each), on a near-even sketch
  (possibly a "no idea" default rather than a belief) and on pairs whose
  order is unclear.

**Result:**

- Per bucket: a band (headline) and a point estimate, with provenance.
  The band is on the bucket's _probability_; the point estimate is that
  band's log-odds midpoint. The drawn curve's integral over the bucket is
  only the first sketch, which questions then refine.
- **Coherent bands, not normalised ones.** The lower bounds must sum to at
  most 100% and the upper bounds to at least 100%; both can't be exactly
  100% unless every band has zero width. Each band is tightened to its
  reachable part (A 5–40%, B 20–30%, C 50–60% → A 10–30%, because B and C
  together take at least 70% and at most 90%). If the lower bounds exceed 100% or the upper
  bounds fall short, flag it like subadditivity and widen minimally; never
  rescale.
- Buckets never asked about are still bounded by what's left over.
- Insights grow with the answers, e.g. "your top two outcomes cover 80%",
  "you gave snow almost nothing: that's a 1-in-50 claim", "you picked Rain
  over Cloudy but sketched Cloudy higher".
- Merging rare named outcomes into "everything else" is offered at the
  end, never done automatically.
- **Adjust after** as for yes/no claims, with a **Normalize** button.

**Sharing and handoff:** an invite carries the claim **and** the outcome
list or bucket edges, so friends answer about the same outcomes, which the
wager needs. "Bet on this" opens a wager with the outcomes and the
adjusted values (which start at the point estimates) in the first
participant's row. Point estimates of
coherent bands generally don't sum to 100%, and the wager needs them to,
so "bet on this" is available only once the adjusted values sum to 100%;
until then it points to **Normalize**. The user rescales explicitly, never
the tool silently.

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
  when the chain runs long or the posterior leaves ~5–95%.
- Show the running probability after **every** step, not just at the end.
- Offer an odds / log-odds view: each piece of evidence becomes a
  fixed-width shove in one direction, which makes "strong evidence" legible
  in a way percentages hide.

## Edge cases

**Confident coin flip vs. total ignorance.** Distinguished by _when_ the
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
wobble in the answers _is_ a wobble in the belief; it becomes band width
(see Band rule).

- Contradicting pairs are shown in the result with a user-initiated "that
  was a misclick, drop it" affordance. Never a system demand.

**Subadditivity** (P(X) + P(not-X) > 1). The negation probes give a band
for P(not-X); it is converted to 1 − P(not-X) and the reported band is the
**union** with the direct band, so incoherence shows up as extra width. The
gap is also flagged in the details for the user to ponder. Never refused,
never blocking.

**Nonsensical answers → sharpen the claim.** Trigger **only** on a hard
contradiction: one larger than ~1 logit (see Band rule). Claim over 70%
_and_ 40% over the claim is 1.25 logits, so hard; claim over 60% and 45%
over the claim is 0.6 logits, absorbed as width. Measured in logits so the
line holds at the tails (1% vs 11% is 2.5 logits). Band width alone is **not** a
trigger: a wide but consistent band is honest ignorance (see above), and
calling it incoherent would misdiagnose exactly the user the outward probe
exists to recognise. The result screen still gives the number, but leads with "your answers don't
hang together; the usual cause is that the claim can mean more than one
thing", opens the resolution-criteria field, and offers a re-run. Prompt,
never a gate. There is **no** dedicated "this claim is unclear" button —
behavioural detection beats self-report, and people rarely notice their own
claim is vague.

**Partial runs** are real answers. "Stop here" yields the current band,
honestly labelled as coarse. After few answers the band may be one-sided
(e.g. "above 52%"); it is shown as such, not padded to 0 or 100. A
one-sided band has **no point estimate** (its log-odds midpoint is
infinite): the adjusted value starts empty, and "bet on this" asks the
user to set it first. Stopping before the first answer yields no result.

**Extremes** are handled by the log-odds search and the tail representation
switch (above).

## Explicit non-goals

- **Overlapping or incomplete outcomes.** The tool says it's the wrong
  tool rather than producing numbers that look meaningful.
- Rescaling bands to sum to 100%; bands are made coherent instead.
- Equal-probability bucket edges shown to the user.
- **LLM helper** (spotting overlapping outcomes, suggesting outcomes,
  sharpening claims) — **[DEFERRED]**, a possible future extension.
- **Wager → elicit return trip** — **[DEFERRED]**. The main two-person
  flow: A elicits and so defines the outcomes, B bets on those outcomes
  with their own numbers. From a wager row, "elicit my belief" opens tool 2
  with claim and outcomes locked and returns the result into that row,
  changing nothing else. Cheaper than it looks: the wager's state already
  lives in its URL, so the run carries the hash and returns to it; cancel
  returns the wager unchanged. The locked-outcome mode is needed for
  invites anyway.
- **Hidden predictions in shared wagers** — **[DEFERRED]**, pairs with the
  return trip. A wager link can hide the sender's predictions by default,
  in the UI and in the URL (obfuscated, not encrypted), until the recipient
  has entered their own values and explicitly reveals them. Prevents
  anchoring for cooperative users, which should be the norm; it is not
  meant to stop a determined one.
- **DAG / Bayes-net version of tool 3** — **[DEFERRED]**, as a possible
  _fourth_ tool, not an evolution of the third. Chain maths (multiply the
  odds by each LR) does not generalise to multiple parents, so it would be a
  rewrite, not a refactor.
- Fun/non-monetary stakes in the elicitation gate.
- Qualitative evidence-strength presets in tool 3.
- Forcing the user to re-answer anything, anywhere.
- Refusing to output a number (rejected mid-interview as inconsistent with
  absorb-don't-force).
- Tool 3 in v1.
- The claim in the URL before an explicit share.
- Band width alone as a "claim is vague" signal.
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
- Exact target band widths in logits for quick vs. thorough (placeholders:
  ~1 logit / ~0.3 logit).
- Where the log-odds grid bottoms out (1-in-1000? 1-in-10,000?).
- Exact "hard contradiction" threshold (placeholder: ~1 logit).

**Multi-outcome details**

- Should the tool notice a two-humped curve and suggest splitting it into
  a yes/no question ("does the cold front arrive?") plus "if so, how
  cold?"
- Maximum number of outcomes/buckets (question budget and UI strain beyond
  ~8). The wager caps at 8 outcomes, so more would break the handoff.
- Number of spot checks, and whether they scale with the outcome count.
- How tiers map to first-sketch numbers (fixed weights per tier, then
  normalised?).
- How "widen minimally" distributes the widening across bands when bounds
  are incoherent (all bands evenly in logits? only never-asked ones first?).

**Tool 3 details** (for its own requirements pass)

- How the prior is entered (typed? handed over from tool 2? elicited?).
- Practical cap on the number of evidence cards.
- Whether tool 3 gets its own share/URL format now or later, and whether
  it follows tool 2's privacy rule (claim out of the URL until an explicit
  share) or the wager's "URL is the state".

### Tag index

**[NEEDS PROTOTYPE]**

- Visual form of the reference lottery (spinner / urn / bar / grid of 100).
- The tail representation switch below 10% and above 90%.
- Outcome discovery with tiers.
- Drawing: bars with live total and curve with live bucket percentages.

**[DEFERRED]**

- LLM helper.
- Wager → elicit return trip.
- Hidden predictions in shared wagers.
- DAG / Bayes-net tool.
