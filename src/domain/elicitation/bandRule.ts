import Decimal from 'decimal.js'
import { HARD_CONTRADICTION_LOGIT } from './constants'
import { bandAbove, bandBelow, bandBetween, bandMidpoint, logit, type Band } from './logOdds'

/** What the user picked when asked to compare the claim with a `wedge` spinner. */
export type Choice = 'claim' | 'wedge' | 'cant-separate'

export interface WedgeAnswer {
  /** The spinner's winning chance, as a probability. */
  wedge: Decimal.Value
  choice: Choice
}

/** A contradiction larger than this many logits (strictly) is hard: sharpen the claim. */
export function isHardContradiction(size: Decimal.Value): boolean {
  return new Decimal(size).gt(HARD_CONTRADICTION_LOGIT)
}

export interface BandResult {
  band: Band
  /** Highest wedge the claim beat; null if the claim never won. */
  highest: Decimal | null
  /** Lowest wedge that beat the claim; null if no wedge ever won. */
  lowest: Decimal | null
  /** Log-odds point estimate; null for a one-sided band (its midpoint is infinite). */
  pointEstimate: Decimal | null
  /** |logit H - logit S| when H > S (the answers contradict each other), else null. */
  contradictionLogit: Decimal | null
  /** The contradiction is larger than `HARD_CONTRADICTION_LOGIT`. */
  isHardContradiction: boolean
}

/**
 * The band rule. H is the highest wedge the claim beat, S the lowest wedge that
 * beat the claim. The band spans H to S: normally H < S; if H > S the answers
 * contradict each other and the band still spans the two (claim beat 60, 45 beat
 * the claim: 45-60%). With only one of them the band is one-sided ("above H" or
 * "below S"). "Can't separate" answers say nothing about the edges. No edge at all
 * means no result (null).
 *
 * A "can't separate" answer outside [H, S] contradicts the edges; this rule ignores
 * it (the trace, step 8, can point it out).
 */
export function computeBand(answers: readonly WedgeAnswer[]): BandResult | null {
  let highest: Decimal | null = null
  let lowest: Decimal | null = null
  for (const { wedge, choice } of answers) {
    const w = new Decimal(wedge)
    if (choice === 'claim' && (highest === null || w.gt(highest))) highest = w
    if (choice === 'wedge' && (lowest === null || w.lt(lowest))) lowest = w
  }

  let band: Band
  if (highest !== null && lowest !== null) band = bandBetween(highest, lowest)
  else if (highest !== null) band = bandAbove(highest)
  else if (lowest !== null) band = bandBelow(lowest)
  else return null

  const contradictionLogit =
    highest !== null && lowest !== null && highest.gt(lowest)
      ? logit(highest).minus(logit(lowest))
      : null

  return {
    band,
    highest,
    lowest,
    pointEstimate: bandMidpoint(band),
    contradictionLogit,
    isHardContradiction:
      contradictionLogit !== null && contradictionLogit.gt(HARD_CONTRADICTION_LOGIT),
  }
}
