import Decimal from 'decimal.js'
import { BUCKET_MERGE_BELOW, MAX_OUTCOMES, MIN_OUTCOMES } from './constants'

/**
 * Continuous claims ("noon temperature tomorrow") are turned into buckets in the
 * background. From the plausible minimum and maximum, the user's thresholds and a curve
 * through N points (a relative likelihood, drawn piecewise-linearly), this finds the edges:
 * the thresholds always, plus where the curve's shape changes (the valley between humps,
 * the flanks of each hump at half its height), snapped to round numbers; neighbouring
 * buckets that are both below 3% are merged; the outer buckets are open-ended; at most
 * eight buckets. Each bucket's probability is the curve's integral over it. Pure.
 */

export interface CurvePoint {
  x: Decimal.Value
  /** Relative likelihood: unitless, any scale. */
  y: Decimal.Value
}

export interface BucketingInput {
  min: Decimal.Value
  max: Decimal.Value
  thresholds: readonly Decimal.Value[]
  curve: readonly CurvePoint[]
}

export interface CurveBucket {
  /** Null for the open-ended lowest bucket. */
  lo: Decimal | null
  /** Null for the open-ended highest bucket. */
  hi: Decimal | null
  /** "below 0", "0 to 5", "5 or more". */
  label: string
  probability: Decimal
}

export interface BucketingResult {
  /** The edges between buckets, ascending. */
  edges: Decimal[]
  buckets: CurveBucket[]
  /** Thresholds not strictly inside (min, max), which would only make an empty bucket. */
  ignoredThresholds: Decimal[]
}

const ZERO = new Decimal(0)
const ONE = new Decimal(1)
const TWO = new Decimal(2)

interface Pt {
  x: Decimal
  y: Decimal
}

/** A finite Decimal, or a RangeError naming what it was for (input can come from a URL). */
function finite(value: Decimal.Value, what: string): Decimal {
  const x = new Decimal(value)
  if (!x.isFinite()) throw new RangeError(`${what} must be a finite number`)
  return x
}

function validate(input: BucketingInput): {
  min: Decimal
  max: Decimal
  pts: Pt[]
  thresholds: Decimal[]
} {
  const min = finite(input.min, 'The minimum')
  const max = finite(input.max, 'The maximum')
  if (!min.lt(max)) throw new RangeError('The minimum must be below the maximum')
  const pts = input.curve
    .map(p => ({ x: finite(p.x, 'A curve point'), y: finite(p.y, 'A curve likelihood') }))
    .sort((a, b) => a.x.cmp(b.x))
  if (pts.length < 2) throw new RangeError('A curve needs at least two points')
  if (pts.some((p, i) => i > 0 && p.x.eq(pts[i - 1].x)))
    throw new RangeError('Curve points need distinct x values')
  if (pts.some(p => p.y.isNeg())) throw new RangeError('A likelihood cannot be negative')
  const thresholds = input.thresholds.map(t => finite(t, 'A threshold'))
  if (!area(pts, min, max).gt(0))
    throw new RangeError('The curve has no likelihood between the minimum and the maximum')
  return { min, max, pts, thresholds }
}

/** The curve's value at x: the polyline through the points, 0 outside them. */
function densityAt(pts: readonly Pt[], x: Decimal): Decimal {
  if (x.lt(pts[0].x) || x.gt(pts[pts.length - 1].x)) return ZERO
  for (let i = 1; i < pts.length; i++) {
    if (x.lte(pts[i].x)) {
      const [a, b] = [pts[i - 1], pts[i]]
      return a.y.plus(b.y.minus(a.y).times(x.minus(a.x)).div(b.x.minus(a.x)))
    }
  }
  return pts[pts.length - 1].y
}

/** The area under the curve between a and b (exact for a polyline). */
function area(pts: readonly Pt[], a: Decimal, b: Decimal): Decimal {
  let total = ZERO
  for (let i = 1; i < pts.length; i++) {
    const from = Decimal.max(a, pts[i - 1].x)
    const to = Decimal.min(b, pts[i].x)
    if (to.lte(from)) continue
    total = total.plus(densityAt(pts, from).plus(densityAt(pts, to)).div(2).times(to.minus(from)))
  }
  return total
}

// --------------------------------------------------------------------- shape edges

/** Where the shape changes: valleys between humps, and each hump's flanks at half its height. */
export function shapeEdges(pts: readonly { x: Decimal; y: Decimal }[]): Decimal[] {
  const n = pts.length
  const edges: Decimal[] = []
  const isPeak = (i: number) =>
    (i === 0 || pts[i].y.gt(pts[i - 1].y)) &&
    (i === n - 1 || pts[i].y.gte(pts[i + 1].y)) &&
    pts[i].y.gt(0)
  for (let i = 1; i < n - 1; i++) {
    if (pts[i].y.lt(pts[i - 1].y) && pts[i].y.lte(pts[i + 1].y)) {
      // a valley lies between humps: something higher on both sides (not the foot of one hump)
      const higherLeft = pts.slice(0, i).some(q => q.y.gt(pts[i].y))
      const higherRight = pts.slice(i + 1).some(q => q.y.gt(pts[i].y))
      if (higherLeft && higherRight) edges.push(pts[i].x)
    }
  }
  for (let p = 0; p < n; p++) {
    if (!isPeak(p)) continue
    const target = pts[p].y.div(2)
    // left flank: walk down until the curve drops to half height, but not past a valley
    for (let i = p; i > 0; i--) {
      if (pts[i - 1].y.gt(pts[i].y)) break
      if (pts[i - 1].y.lte(target)) {
        edges.push(cross(pts[i - 1], pts[i], target))
        break
      }
    }
    for (let i = p; i < n - 1; i++) {
      if (pts[i + 1].y.gt(pts[i].y)) break
      if (pts[i + 1].y.lte(target)) {
        edges.push(cross(pts[i], pts[i + 1], target))
        break
      }
    }
  }
  return edges
}

function cross(a: Pt, b: Pt, y: Decimal): Decimal {
  return a.x.plus(b.x.minus(a.x).times(y.minus(a.y)).div(b.y.minus(a.y)))
}

// ---------------------------------------------------------------------- snapping

/**
 * The roundest number near x: of 10^k, 5 x 10^k, 2 x 10^k and 10^(k-1), the biggest step
 * that has a multiple within `tolerance` of x.
 */
export function snapRound(x: Decimal, tolerance: Decimal, range: Decimal): Decimal {
  const top = range.log(10).ceil().toNumber() + 1
  const bottom = tolerance.isZero() ? top - 12 : tolerance.log(10).floor().toNumber() - 1
  for (let k = top; k >= bottom; k--) {
    for (const base of [10, 5, 2, 1]) {
      const step = new Decimal(base).times(new Decimal(10).pow(k - 1))
      const candidate = x.div(step).round().times(step)
      if (candidate.minus(x).abs().lte(tolerance)) return candidate
    }
  }
  return x
}

// ------------------------------------------------------------------------ buckets

/** Probabilities of the buckets cut by `edges` (ascending), integrating the curve over [min, max]. */
function probabilities(
  pts: readonly Pt[],
  min: Decimal,
  max: Decimal,
  edges: readonly Decimal[]
): Decimal[] {
  const total = area(pts, min, max)
  const cuts = [min, ...edges, max]
  const raw = cuts.slice(0, -1).map((c, i) => area(pts, c, cuts[i + 1]).div(total))
  // close the sum exactly: the last bucket takes the rounding remainder
  const last = ONE.minus(raw.slice(0, -1).reduce((s, p) => s.plus(p), ZERO))
  return [...raw.slice(0, -1), last]
}

/** Decimals to show edges with: enough to tell the edges of this range apart. */
export function placesFor(range: Decimal): number {
  const tolerance = range.div(40)
  return Math.min(20, Math.max(0, 1 - tolerance.log(10).floor().toNumber()))
}

export function formatEdge(x: Decimal, places = 6): string {
  return x.toDecimalPlaces(places).toFixed()
}

/** "below 0", "0 to 5", "5 or more" for buckets cut by `edges`. */
export function labelBuckets(edges: readonly Decimal[], unit = '', places = 6): string[] {
  const u = unit ? ` ${unit}` : ''
  const f = (x: Decimal) => `${formatEdge(x, places)}${u}`
  const labels: string[] = [`below ${f(edges[0])}`]
  for (let i = 1; i < edges.length; i++)
    labels.push(`${formatEdge(edges[i - 1], places)} to ${f(edges[i])}`)
  labels.push(`${f(edges[edges.length - 1])} or more`)
  return labels
}

/**
 * The buckets of a curve. See the file comment. Throws a RangeError for input that is not a
 * curve (min not below max, fewer than two points, repeated x, negative likelihood, no
 * area in range, more thresholds than fit).
 */
export function bucketCurve(input: BucketingInput, unit = ''): BucketingResult {
  const { min, max, pts, thresholds } = validate(input)
  const range = max.minus(min)
  const tolerance = range.div(40)
  const inside = (x: Decimal) => x.gt(min) && x.lt(max)

  const ignoredThresholds = thresholds.filter(t => !inside(t))
  const kept = [...new Set(thresholds.filter(inside).map(t => t.toString()))].map(
    t => new Decimal(t)
  )
  if (kept.length > MAX_OUTCOMES - 1) {
    throw new RangeError(`At most ${MAX_OUTCOMES - 1} thresholds fit in ${MAX_OUTCOMES} buckets`)
  }
  const isThreshold = (x: Decimal) => kept.some(t => t.eq(x))

  // shape edges, snapped; a snapped edge that lands on a threshold or outside the range goes
  const raw = shapeEdges(pts).filter(inside)
  const snapped = raw.map(x => snapRound(x, tolerance, range))
  // Snapping must not fold edges together (a narrow spike's flanks would both land on one
  // number and leave an empty bucket): where it would, the edges stay where they are
  const shape = raw
    .map((x, i) => (snapped.filter(s => s.eq(snapped[i])).length > 1 ? x : snapped[i]))
    .filter(inside)
  let edges = dedupe([...kept, ...shape])

  // at least two buckets: split a flat curve at its median
  if (edges.length + 1 < MIN_OUTCOMES) {
    const total = area(pts, min, max)
    let lo = min
    let hi = max
    for (let i = 0; i < 60; i++) {
      const mid = lo.plus(hi).div(2)
      if (area(pts, min, mid).lt(total.div(2))) lo = mid
      else hi = mid
    }
    const median = snapRound(lo.plus(hi).div(2), tolerance, range)
    edges = dedupe([...edges, inside(median) ? median : lo.plus(hi).div(2)])
  }

  // merge neighbours that are both small, then fit the cap, never dropping a threshold
  const mass = (e: readonly Decimal[]) => probabilities(pts, min, max, e)
  for (;;) {
    const p = mass(edges)
    const at = edges.findIndex(
      (e, i) => !isThreshold(e) && p[i].lt(BUCKET_MERGE_BELOW) && p[i + 1].lt(BUCKET_MERGE_BELOW)
    )
    if (at < 0) break
    edges = edges.filter((_, i) => i !== at)
  }
  while (edges.length + 1 > MAX_OUTCOMES) {
    const p = mass(edges)
    let best = -1
    let bestMass = TWO
    edges.forEach((e, i) => {
      const together = p[i].plus(p[i + 1])
      if (!isThreshold(e) && together.lt(bestMass)) {
        best = i
        bestMass = together
      }
    })
    if (best < 0) break // only thresholds are left (not reachable: at most seven fit)
    edges = edges.filter((_, i) => i !== best)
  }

  const probs = mass(edges)
  const labels = labelBuckets(edges, unit, placesFor(range))
  const cuts = [null, ...edges, null] as (Decimal | null)[]
  return {
    edges,
    buckets: probs.map((probability, i) => ({
      lo: cuts[i],
      hi: cuts[i + 1],
      label: labels[i],
      probability,
    })),
    ignoredThresholds,
  }
}

function dedupe(xs: readonly Decimal[]): Decimal[] {
  const sorted = [...xs].sort((a, b) => a.cmp(b))
  return sorted.filter((x, i) => i === 0 || !x.eq(sorted[i - 1]))
}

// -------------------------------------------------------------------------- bars

/**
 * Bars: each bar is its bucket's probability, as the user entered it (percent), taken as it
 * is. Normalising is a separate, explicit step (`normalizePercents`).
 */
export function barsToProbabilities(percents: readonly Decimal.Value[]): Decimal[] {
  return percents.map(p => {
    const v = new Decimal(p)
    if (!v.isFinite() || v.isNeg() || v.gt(100))
      throw new RangeError('A bar is a percentage from 0 to 100')
    return v.div(100)
  })
}

/**
 * The edges for the bars view, where there is no curve to read them from: the thresholds,
 * plus round-number edges spread over the range to make `bars` buckets (at most eight).
 */
export function barEdges(
  minIn: Decimal.Value,
  maxIn: Decimal.Value,
  thresholds: readonly Decimal.Value[],
  bars: number = MAX_OUTCOMES
): Decimal[] {
  const min = finite(minIn, 'The minimum')
  const max = finite(maxIn, 'The maximum')
  if (!min.lt(max)) throw new RangeError('The minimum must be below the maximum')
  const count = Math.max(MIN_OUTCOMES, Math.min(bars, MAX_OUTCOMES))
  const kept = dedupe(
    thresholds.map(t => finite(t, 'A threshold')).filter(t => t.gt(min) && t.lt(max))
  )
  if (kept.length > count - 1)
    throw new RangeError(`At most ${count - 1} thresholds fit in ${count} bars`)
  const range = max.minus(min)
  const tolerance = range.div(40)
  const edges = [...kept]
  for (let i = 1; i < count && edges.length < count - 1; i++) {
    // evenly spaced candidates, snapped, skipping any that crowd an edge already there
    const target = min.plus(range.times(i).div(count))
    const snapped = snapRound(target, tolerance, range)
    if (
      snapped.gt(min) &&
      snapped.lt(max) &&
      !edges.some(e => e.minus(snapped).abs().lt(range.div(count).div(2)))
    ) {
      edges.push(snapped)
    }
  }
  return dedupe(edges)
}
