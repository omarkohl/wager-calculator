import Decimal from 'decimal.js'
import { createDefaultWager, DEFAULT_STAKES } from '../defaults'
import { CURRENCY_OPTIONS } from '../stakes'
import type { Wager } from '../wager'
import { describeBand } from './format'
import { canBet } from './insights'
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
 * A fresh wager with the outcomes of a claim with several outcomes (or the ranges of a number
 * claim) and the first participant's prediction set to the user's own numbers. The numbers are
 * percentages with at most two decimals that add up to exactly 100: anything else throws (the
 * wager needs a sum of 100 and the tool never rescales silently; Normalize is the user's).
 */
export function buildMultiHandoff(params: {
  claim: string
  criteria: string
  currency: string | null
  /** `range`: the range the answers gave for it, kept in the note on the wager. */
  items: readonly { label: string; percent: string; range?: string }[]
}): Handoff {
  const { claim, criteria, currency, items } = params
  const values = items.map(i => new Decimal(i.percent))
  if (items.length < 2 || !canBet(values) || values.some(v => v.decimalPlaces() > 2)) {
    throw new RangeError('The numbers to bet on must be percentages that add up to exactly 100')
  }
  const wager = createDefaultWager()
  const first = wager.participants[0]
  wager.claim = claim
  wager.details = criteria
  wager.stakes = CURRENCY_OPTIONS.some(c => c.id === currency) ? currency! : DEFAULT_STAKES
  wager.outcomes = items.map(i => ({ id: crypto.randomUUID(), label: i.label, touched: true }))
  wager.predictions = values.map((value, i) => ({
    participantId: first.id,
    outcomeId: wager.outcomes[i].id,
    probability: value,
    touched: true,
  }))
  const ranges = items.filter(i => i.range).map(i => `${i.label} ${i.range}`)
  return {
    wager,
    provenance:
      ranges.length > 0
        ? `your own numbers from elicitation; the ranges your answers gave: ${ranges.join('; ')}`
        : 'your own numbers from elicitation',
  }
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
