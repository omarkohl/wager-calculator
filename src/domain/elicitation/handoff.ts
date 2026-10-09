import Decimal from 'decimal.js'
import { createDefaultWager, DEFAULT_STAKES } from '../defaults'
import { CURRENCY_OPTIONS } from '../stakes'
import type { Wager } from '../wager'
import { describeBand } from './format'
import { fromPercent, type Band } from './logOdds'

/**
 * The handoff from the elicitation to the wager calculator: a fresh wager about the
 * same claim, the first participant's prediction filled in with what the user believes.
 */

export interface Handoff {
  wager: Wager
  /** Where the number came from, shown near the first participant's cell. */
  provenance: string
}

/**
 * The belief to bet on: the user's own adjusted value if set, else the point estimate.
 * Null when neither exists (a one-sided band the user has not adjusted).
 */
export function handoffProbability(
  pointEstimate: Decimal | null,
  adjusted: string | null
): Decimal | null {
  if (adjusted !== null) return fromPercent(adjusted)
  return pointEstimate
}

/**
 * A fresh wager: the claim, the resolution criteria as its details, the stakes currency
 * of the gate (the default if none or unknown), Yes/No outcomes, and the first
 * participant's Yes = p and No = 100 - p. Percentages have two decimals and sum to
 * exactly 100; the other participants are left for the wager calculator to fill in.
 */
export function buildHandoff(params: {
  claim: string
  criteria: string
  currency: string | null
  probability: Decimal
  band: Band
}): Handoff {
  const { claim, criteria, currency, probability, band } = params
  const wager = createDefaultWager()
  const yes = probability.times(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  const no = new Decimal(100).minus(yes)
  const first = wager.participants[0]

  wager.claim = claim
  wager.details = criteria
  wager.stakes = CURRENCY_OPTIONS.some(c => c.id === currency) ? currency! : DEFAULT_STAKES
  wager.predictions = [yes, no].map((value, i) => ({
    participantId: first.id,
    outcomeId: wager.outcomes[i].id,
    probability: value,
    touched: true,
  }))

  return { wager, provenance: `${describeBand(band)} from elicitation` }
}
