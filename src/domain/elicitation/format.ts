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

/**
 * A typed bar height in percent, 0 to 100 inclusive with at most two decimals (a bar may be
 * empty or full: the bars view lets the user do anything), as `parsePercent` reads it
 * otherwise. Null if the text is not one; blank text is for the caller to treat as 0.
 */
export function parseBar(text: string): string | null {
  const cleaned = text.trim().replace(/%$/, '').replace(',', '.')
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(cleaned)) return null
  const value = new Decimal(cleaned)
  return value.lte(100) ? value.toString() : null
}

/** A typed number (a range end, a threshold): optional minus, a decimal point or comma. Null if not one, or if a comma makes it ambiguous (`isAmbiguousNumber`). */
export function parseNumber(text: string): string | null {
  if (isAmbiguousNumber(text)) return null
  const cleaned = text.trim().replace(',', '.')
  // "5." and ".5" are fine; the digits before and after the point are bounded
  if (!/^-?(\d{1,15}(\.\d{0,10})?|\.\d{1,10})$/.test(cleaned)) return null
  return plainNumber(cleaned)
}

/**
 * A number in plain digits (never exponent form, which `parseNumber` would not read back), at
 * most ten decimals, "0" for zero. For numbers that are stored: edges, thresholds.
 */
export function plainNumber(value: Decimal.Value): string {
  const x = new Decimal(value).toDecimalPlaces(10)
  return x.isZero() ? '0' : x.toFixed()
}

/**
 * A comma followed by exactly three digits could be a thousands separator ("1,000") or a
 * decimal comma: the tool will not guess, and asks for a dot. (Percentages cannot be
 * ambiguous: with at most two decimals, such text is no percentage either way.)
 */
export function isAmbiguousNumber(text: string): boolean {
  return /,\d{3}(?!\d)/.test(text)
}

/**
 * A typed curve height: a plain number from 0 to 100 with at most two decimals, on an arbitrary
 * scale (it is a relative likelihood, not a percentage, so "%" is refused). Null if not one.
 */
export function parseHeight(text: string): string | null {
  const cleaned = text.trim().replace(',', '.')
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(cleaned)) return null
  const value = new Decimal(cleaned)
  return value.lte(100) ? value.toString() : null
}
