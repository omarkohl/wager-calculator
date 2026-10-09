import Decimal from 'decimal.js'
import { type Band, formatPercent } from './logOdds'

/**
 * A band as the user reads it: "45–62%", "about 50%" for a band with no width,
 * "above 52%" or "below 20%" when only one side is bounded.
 */
export function describeBand(band: Band): string {
  const { lo, hi } = band
  if (lo && hi) {
    const low = formatPercent(lo)
    const high = formatPercent(hi)
    return low === high ? `about ${high}` : `${low.replace('%', '')}–${high}`
  }
  if (lo) return `above ${formatPercent(lo)}`
  if (hi) return `below ${formatPercent(hi)}`
  return 'no range yet'
}

/** Where the user's own value sits against what the answers imply. */
export type AdjustmentGap = 'inside' | 'above' | 'below'

/**
 * Compare the adjusted value with the elicited band. Inside the band (edges
 * included) is no gap; a one-sided band only has the side it bounds.
 */
export function adjustmentGap(adjusted: Decimal.Value, band: Band): AdjustmentGap {
  const value = new Decimal(adjusted)
  if (band.hi && value.gt(band.hi)) return 'above'
  if (band.lo && value.lt(band.lo)) return 'below'
  return 'inside'
}

/** The gap in neutral words: it describes, it does not judge. `other`: someone else's value. */
export function describeGap(gap: AdjustmentGap, other = false): string {
  const who = other ? 'This was set' : 'You set this'
  const what = other ? 'the answers implied' : 'your answers implied'
  switch (gap) {
    case 'above':
      return `${who} above what ${what}.`
    case 'below':
      return `${who} below what ${what}.`
    default:
      return `${who} within what ${what}.`
  }
}

/**
 * The adjusted value as the field shows and stores it: a percentage with at most two
 * decimals, strictly between 0 and 100, no trailing zeros ("47.5"). Null if the text
 * is not one.
 */
export function parseAdjusted(text: string): string | null {
  const trimmed = text.trim()
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(trimmed)) return null
  const value = new Decimal(trimmed)
  return value.gt(0) && value.lt(100) ? value.toString() : null
}

/** What an untouched adjusted field shows: the point estimate in percent, two decimals at most. */
export function defaultAdjusted(pointEstimate: Decimal.Value): string {
  return new Decimal(pointEstimate).times(100).toDecimalPlaces(2).toString()
}

/** A typed percentage, as `parseAdjusted` reads it, but a decimal comma and a trailing "%" are fine. */
export function parsePercent(text: string): string | null {
  return parseAdjusted(text.trim().replace(/%$/, '').replace(',', '.'))
}
