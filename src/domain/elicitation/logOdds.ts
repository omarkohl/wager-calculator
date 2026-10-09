import Decimal from 'decimal.js'
import { GRID_CEILING, GRID_FLOOR } from './constants'

/**
 * Log-odds arithmetic of the elicitation. Probabilities are decimals in (0, 1);
 * the percent conversion boundary is `fromPercent` / `toPercent` / `formatPercent`.
 */

const ONE = new Decimal(1)

/** ln(p / (1 - p)). Throws RangeError unless 0 < p < 1. */
export function logit(p: Decimal.Value): Decimal {
  const x = new Decimal(p)
  if (!x.gt(0) || !x.lt(1)) {
    throw new RangeError(`A probability must be strictly between 0 and 1, got ${x.toString()}`)
  }
  return x.div(ONE.minus(x)).ln()
}

/** The inverse of `logit`: 1 / (1 + e^-x). */
export function expit(x: Decimal.Value): Decimal {
  return ONE.div(ONE.plus(new Decimal(x).neg().exp()))
}

/** The lowest and highest logit a wedge can have. */
export const GRID_MIN_LOGIT = logit(GRID_FLOOR)
export const GRID_MAX_LOGIT = logit(GRID_CEILING)

/** Pull a probability into the wedge grid (1-in-1000 to 999-in-1000). */
export function clampToGrid(p: Decimal.Value): Decimal {
  return Decimal.min(Decimal.max(new Decimal(p), GRID_FLOOR), GRID_CEILING)
}

/** Percent places a value is shown (and wedges are snapped) with, from its nearer tail. */
function placesFor(tail: Decimal): 0 | 1 | 2 {
  return tail.gte(0.1) ? 0 : tail.gte(GRID_FLOOR) ? 1 : 2
}

/** The nearer tail rounded to the places it is shown with, as a percentage. */
function roundedTailPercent(p: Decimal): { tail: Decimal; upper: boolean; places: 0 | 1 | 2 } {
  const upper = p.gt(0.5)
  const tail = upper ? ONE.minus(p) : p
  const places = placesFor(tail)
  return { tail: toPercent(tail).toDecimalPlaces(places, Decimal.ROUND_HALF_UP), upper, places }
}

/**
 * Snap a probability onto the wedge grid: whole percent from 10% to 90%, 0.1% in
 * the tails, within 1-in-1000 and 999-in-1000. A wedge is shown with `formatPercent`,
 * so the snapped value is exactly the number the user reads. p and 1 - p snap alike.
 */
export function snapToGrid(p: Decimal.Value): Decimal {
  const { tail, upper } = roundedTailPercent(clampToGrid(p))
  const snapped = tail.div(100)
  return clampToGrid(upper ? ONE.minus(snapped) : snapped)
}

/** One display unit at p: 1% in the middle, 0.1% in the tails. */
function displayUnit(p: Decimal): Decimal {
  return new Decimal(placesFor(Decimal.min(p, ONE.minus(p))) === 0 ? 0.01 : 0.001)
}

/**
 * The wedge `delta` logits above `p` (below, if negative), on the grid (see
 * `snapToGrid`). Steps are even in log-odds, so a step of -1.1 from 50% gives
 * 25%, 10%, 3.6%, 1.2%. Snapping never stalls a step: a nonzero `delta` moves by at
 * least one display unit unless the grid's end stops it.
 */
export function stepWedge(p: Decimal.Value, delta: Decimal.Value): Decimal {
  const from = snapToGrid(p)
  const d = new Decimal(delta)
  const snapped = snapToGrid(expit(logit(from).plus(d)))
  if (d.isZero() || (d.gt(0) ? snapped.gt(from) : snapped.lt(from))) return snapped
  return snapToGrid(d.gt(0) ? from.plus(displayUnit(from)) : from.minus(displayUnit(from)))
}

/** Percent (0-100) to probability. Throws RangeError outside the open interval. */
export function fromPercent(percent: Decimal.Value): Decimal {
  const x = new Decimal(percent)
  if (!x.gt(0) || !x.lt(100)) {
    throw new RangeError(`A percentage must be strictly between 0 and 100, got ${x.toString()}`)
  }
  return x.div(100)
}

/** Probability to percent (0-100), unrounded. */
export function toPercent(p: Decimal.Value): Decimal {
  return new Decimal(p).times(100)
}

/**
 * A probability as the user reads it: whole percent from 10% to 90%, one decimal
 * in the tails down to 0.1% (and up to 99.9%), two beyond, "<0.01%" / ">99.99%"
 * past that. The nearer tail is rounded and the other side is its complement, so
 * p and 1 - p always read as complements. Never "0%" or "100%".
 */
export function formatPercent(p: Decimal.Value): string {
  const x = new Decimal(p)
  const { tail, upper, places } = roundedTailPercent(x)
  if (tail.isZero()) return upper ? '>99.99%' : '<0.01%'
  const shown = upper ? new Decimal(100).minus(tail) : tail
  return `${shown
    .toFixed(places)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')}%`
}

/**
 * An interval of probabilities. A missing end means the answers never bounded
 * that side ("above 52%": `lo` set, `hi` null). Build one with `bandBetween`,
 * `bandAbove` or `bandBelow`; a band with both ends missing means "no answers"
 * and is never a result (no answers, no band).
 */
export interface Band {
  lo: Decimal | null
  hi: Decimal | null
}

function checkProbability(p: Decimal.Value): Decimal {
  const x = new Decimal(p)
  if (!x.gt(0) || !x.lt(1)) {
    throw new RangeError(`A probability must be strictly between 0 and 1, got ${x.toString()}`)
  }
  return x
}

/** The band spanning two probabilities, whichever order they come in. */
export function bandBetween(a: Decimal.Value, b: Decimal.Value): Band {
  const x = checkProbability(a)
  const y = checkProbability(b)
  return x.lte(y) ? { lo: x, hi: y } : { lo: y, hi: x }
}

/** One-sided band: the belief is above `lo` ("above 52%"), nothing known above. */
export function bandAbove(lo: Decimal.Value): Band {
  return { lo: checkProbability(lo), hi: null }
}

/** One-sided band: the belief is below `hi`, nothing known below. */
export function bandBelow(hi: Decimal.Value): Band {
  return { lo: null, hi: checkProbability(hi) }
}

export function isOneSided(band: Band): boolean {
  return band.lo === null || band.hi === null
}

/** Width in logits; null for a one-sided band (it is unbounded). */
export function bandWidthLogit(band: Band): Decimal | null {
  if (band.lo === null || band.hi === null) return null
  return logit(band.hi).minus(logit(band.lo))
}

/**
 * The log-odds midpoint of the band (1-10% gives about 3.2%, not 5.5%).
 * Null for a one-sided band: its midpoint is infinite.
 */
export function bandMidpoint(band: Band): Decimal | null {
  if (band.lo === null || band.hi === null) return null
  return expit(logit(band.lo).plus(logit(band.hi)).div(2))
}
