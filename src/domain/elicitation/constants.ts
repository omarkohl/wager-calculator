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
