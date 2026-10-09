/**
 * Tunable values of the belief elicitation (tool 2), in one place. Probabilities
 * are decimals in (0, 1); widths are in logits (log-odds units).
 */

/** Target band width at which the search stops. */
export const TARGET_WIDTH_LOGIT = { quick: 1, thorough: 0.3 } as const

/** Two answers further apart than this (in logits) are a hard contradiction. */
export const HARD_CONTRADICTION_LOGIT = 1

/** Where the wedge grid bottoms out and tops out: one in a thousand. */
export const GRID_FLOOR = 0.001
export const GRID_CEILING = 0.999

/** Thorough mode: number of negation probes, placed in the second half of the run. */
export const NEGATION_PROBES_THOROUGH = 2

/** Thorough mode: swapped-arm repeats of answered comparisons. */
export const REPEATS_THOROUGH = 2

/** The wager's cap on outcomes, also the cap on buckets. */
export const MAX_OUTCOMES = 8

/** Spot checks: random pairs (fewer if fewer exist), plus one completeness check. */
export const SPOT_CHECK_PAIRS = 3
export const SPOT_CHECK_COMPLETENESS = 1

/** Quick mode opens with a wedge drawn from this range. */
export const OPENING_WEDGE_RANGE = { min: 0.35, max: 0.65 } as const

/** First sketch of a probability per tier, before normalising. */
export const TIER_SKETCH = {
  'very unlikely': 0.02,
  unlikely: 0.1,
  plausible: 0.3,
  likely: 0.6,
  'near-certain': 0.9,
} as const

/** A claim needs at least this many outcomes: one outcome is no question. */
export const MIN_OUTCOMES = 2

/** After this many outcomes in a row at "very unlikely", "everything else" is offered. */
export const EVERYTHING_ELSE_AFTER = 2

/** Several outcomes: a run never asks more than this many questions. */
export const MAX_MULTI_QUESTIONS = 40

/** Several outcomes: stop when no question is worth more than this many points (as a fraction). */
export const MULTI_STOP_BELOW = 0.02

/** Extra weight on a first lottery for a bucket in the very unlikely or near-certain tier. */
export const TAIL_WEIGHT = 2

/** A tail bucket's first lottery is always worth at least this much: one tail check each. */
export const TAIL_CHECK_SCORE = 0.05

/** A sketch whose largest and smallest chances are this close looks like "no idea". */
export const NEAR_EVEN_SPREAD = 0.15

/** Extra weight on the first lotteries when the sketch is near-even. */
export const NEAR_EVEN_WEIGHT = 1.5

/** A group lottery is worth this share of the mean width of its members. */
export const GROUP_WEIGHT = 0.75

/** Several outcomes: this many "about equally likely" in a row end the comparisons. */
export const EQUAL_RUN_STOP = 3
