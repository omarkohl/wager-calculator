import Decimal from 'decimal.js'
import { expit, logit } from './logOdds'

/**
 * Coherent bands for a claim with several outcomes. Each outcome has a band on its
 * probability. The lower bounds must sum to at most 100% and the upper bounds to at least
 * 100% (both can only be exactly 100% if every band has no width). Bands are made coherent,
 * never rescaled:
 *
 * 1. Order answers ("A is more likely than B") that form a cycle contradict themselves:
 *    their constraints are dropped and listed.
 * 2. If the lower bounds exceed 100% or the upper bounds fall short, that is flagged and the
 *    bands are widened minimally: evenly in logits, bands never asked about first. Incoherence
 *    shows up as extra width, so a widened band keeps its original range: after widening the
 *    lower bounds the upper bounds are not tightened against them (that would shrink every
 *    band to a point), and the other way round.
 * 3. Every band is tightened to its reachable part, until nothing moves:
 *    lo_i' = max(lo_i, 1 - sum of the others' hi), hi_i' = min(hi_i, 1 - sum of the others' lo),
 *    and for "A more likely than B": lo_A >= lo_B and hi_B <= hi_A. An order answer that the
 *    bounds cannot satisfy is dropped and listed too.
 *
 * "About equally likely" adds no constraint, so it is simply not passed in. A bucket never
 * asked about comes in as the whole range [0, 1] and ends up bounded by what is left.
 */

export interface BucketBand {
  id: string
  lo: Decimal
  hi: Decimal
  /** False for a band that only comes from the first sketch; those are widened first. */
  asked: boolean
}

/** "`moreLikely` is more likely than `lessLikely`". */
export interface OrderAnswer {
  moreLikely: string
  lessLikely: string
}

export type DroppedReason = 'cycle' | 'conflict'

/** An order answer that could not be kept: it takes part in a cycle, or the bounds rule it out. */
export interface DroppedOrder extends OrderAnswer {
  reason: DroppedReason
}

export interface Incoherence {
  /** The lower bounds summed to more than 100%, or the upper bounds to less. */
  kind: 'lowers-exceed' | 'uppers-short'
  /** By how much: the sum of the lower bounds minus 1, or 1 minus the sum of the upper bounds. */
  amount: Decimal
}

export interface CoherentBand {
  id: string
  lo: Decimal
  hi: Decimal
  /** The band was widened to make the bounds coherent. */
  widened: boolean
  /** The band was narrowed to its reachable part. */
  tightened: boolean
}

export interface CoherentResult {
  bands: CoherentBand[]
  incoherence: Incoherence | null
  droppedOrders: DroppedOrder[]
}

const ZERO = new Decimal(0)
const ONE = new Decimal(1)
/** Moves smaller than this end the tightening (it is an exact fixpoint up to rounding). */
const SETTLED = new Decimal('1e-15')
/** A band that comes out inverted by more than this was impossible, not rounding. */
const IMPOSSIBLE = new Decimal('1e-12')
const MAX_SHIFT_LOGIT = 60
const MAX_PASSES = 500
/**
 * Subsets of order answers to drop are tried up to this size, which finds the fewest. Beyond
 * it answers are dropped one at a time in input order until the rest can hold.
 */
const MAX_DROPPED_TRIED = 3

interface Range {
  lo: Decimal
  hi: Decimal
}

const sum = (xs: readonly Decimal[]) => xs.reduce((s, x) => s.plus(x), ZERO)

function validate(bands: readonly BucketBand[], orders: readonly OrderAnswer[]): void {
  if (bands.length === 0) throw new Error('There are no buckets to make coherent')
  const ids = new Set(bands.map(b => b.id))
  if (ids.size !== bands.length) throw new Error('Bucket ids must be unique')
  for (const b of bands) {
    if (b.lo.isNeg() || b.hi.gt(1) || b.lo.gt(b.hi)) {
      throw new RangeError(`The band of "${b.id}" must satisfy 0 <= lo <= hi <= 1`)
    }
  }
  for (const o of orders) {
    if (!ids.has(o.moreLikely) || !ids.has(o.lessLikely)) {
      throw new Error(`Unknown bucket in the order "${o.moreLikely}" > "${o.lessLikely}"`)
    }
  }
}

/** Indexes of the order answers that lie on a cycle (including A > A). */
function cycleEdges(orders: readonly OrderAnswer[]): Set<number> {
  const reaches = (from: string, to: string): boolean => {
    const seen = new Set<string>()
    const stack = [from]
    while (stack.length) {
      const at = stack.pop()!
      if (at === to) return true
      if (seen.has(at)) continue
      seen.add(at)
      for (const o of orders) if (o.moreLikely === at) stack.push(o.lessLikely)
    }
    return false
  }
  const onCycle = new Set<number>()
  orders.forEach((o, i) => {
    if (o.moreLikely === o.lessLikely || reaches(o.lessLikely, o.moreLikely)) onCycle.add(i)
  })
  return onCycle
}

// ----------------------------------------------------------------------- widening

const clamp = (x: Decimal) => Decimal.min(Decimal.max(x, '1e-15'), ONE.minus('1e-15'))

function shift(value: Decimal, delta: Decimal): Decimal {
  return expit(logit(clamp(value)).plus(delta))
}

/**
 * Widen minimally. A band's bound moves evenly in logits (the same shift for every band in
 * the group), bands never asked about first; a group that cannot fix it alone is pushed to
 * the limit (0 or 1) and the next group takes over.
 */
function widen(ranges: Range[], asked: readonly boolean[], kind: Incoherence['kind']): Range[] {
  const lowers = kind === 'lowers-exceed'
  const coherent = (rs: readonly Range[]) =>
    lowers ? sum(rs.map(r => r.lo)).lte(ONE) : sum(rs.map(r => r.hi)).gte(ONE)
  const limitOf = (r: Range): Range => (lowers ? { lo: ZERO, hi: r.hi } : { lo: r.lo, hi: ONE })
  const shifted = (r: Range, delta: Decimal): Range =>
    lowers
      ? { lo: r.lo.isZero() ? ZERO : Decimal.min(shift(r.lo, delta.neg()), r.lo), hi: r.hi }
      : { lo: r.lo, hi: r.hi.eq(1) ? ONE : Decimal.max(shift(r.hi, delta), r.hi) }

  let current = ranges.map(r => ({ ...r }))
  for (const group of [false, true]) {
    const members = current.map((_, i) => i).filter(i => asked[i] === group)
    if (members.length === 0) continue
    const apply = (f: (r: Range) => Range) =>
      current.map((r, i) => (members.includes(i) ? f(r) : r))

    const atLimit = apply(limitOf)
    if (!coherent(atLimit)) {
      current = atLimit
      continue
    }
    // Enough within this group: the smallest even shift that does it
    let low = ZERO
    let high = new Decimal(MAX_SHIFT_LOGIT)
    if (!coherent(apply(r => shifted(r, high)))) return atLimit
    for (let i = 0; i < 60; i++) {
      const mid = low.plus(high).div(2)
      if (coherent(apply(r => shifted(r, mid)))) high = mid
      else low = mid
    }
    return apply(r => shifted(r, high))
  }
  return current
}

// --------------------------------------------------------------------- tightening

/** Which bounds the sums may tighten: both, or (after widening one side) only the other. */
type Side = 'both' | 'lo-only' | 'hi-only'

/**
 * Tighten to the fixpoint; null if some band comes out impossible (the orders cannot hold),
 * or if the bounds on the widened side no longer add up once the orders are applied.
 */
function tighten(
  ranges: readonly Range[],
  edges: readonly [number, number][],
  side: Side
): Range[] | null {
  let cur = ranges.map(r => ({ ...r }))
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const totalLo = sum(cur.map(r => r.lo))
    const totalHi = sum(cur.map(r => r.hi))
    const next = cur.map(r => ({ ...r }))
    next.forEach((r, i) => {
      if (side !== 'hi-only') r.lo = Decimal.max(r.lo, ONE.minus(totalHi.minus(cur[i].hi)))
      if (side !== 'lo-only') r.hi = Decimal.min(r.hi, ONE.minus(totalLo.minus(cur[i].lo)))
    })
    for (const [more, less] of edges) {
      next[more].lo = Decimal.max(next[more].lo, next[less].lo)
      next[less].hi = Decimal.min(next[less].hi, next[more].hi)
    }
    let moved = false
    for (let i = 0; i < next.length; i++) {
      if (next[i].lo.gt(next[i].hi)) {
        if (next[i].lo.minus(next[i].hi).gt(IMPOSSIBLE)) return null
        next[i].hi = next[i].lo
      }
      if (
        next[i].lo.minus(cur[i].lo).abs().gt(SETTLED) ||
        next[i].hi.minus(cur[i].hi).abs().gt(SETTLED)
      ) {
        moved = true
      }
    }
    cur = next
    if (!moved) {
      // Whatever the sums were allowed to tighten, the bounds must still add up
      if (sum(cur.map(r => r.hi)).lt(ONE.minus(IMPOSSIBLE))) return null
      if (sum(cur.map(r => r.lo)).gt(ONE.plus(IMPOSSIBLE))) return null
      return cur
    }
  }
  // Each pass only narrows bands that are bounded below by the bounds, so this is not expected
  // to be reached for at most eight buckets; failing loudly beats returning a half-settled result.
  throw new Error('Tightening did not settle')
}

/** Every way to choose `size` of `count` indexes, in order. */
function* subsets(count: number, size: number, from = 0): Generator<number[]> {
  if (size === 0) {
    yield []
    return
  }
  for (let i = from; i <= count - size; i++) {
    for (const rest of subsets(count, size - 1, i + 1)) yield [i, ...rest]
  }
}

// ------------------------------------------------------------------------- main

export function makeCoherent(
  bands: readonly BucketBand[],
  orders: readonly OrderAnswer[] = []
): CoherentResult {
  validate(bands, orders)
  const index = new Map(bands.map((b, i) => [b.id, i]))
  const droppedOrders: DroppedOrder[] = []

  // 1. cycles
  const onCycle = cycleEdges(orders)
  const live: number[] = []
  orders.forEach((o, i) => {
    if (onCycle.has(i)) droppedOrders.push({ ...o, reason: 'cycle' })
    else live.push(i)
  })

  // 2. incoherent bounds
  const input: Range[] = bands.map(b => ({ lo: b.lo, hi: b.hi }))
  const totalLo = sum(input.map(r => r.lo))
  const totalHi = sum(input.map(r => r.hi))
  let incoherence: Incoherence | null = null
  let widened = input
  if (totalLo.gt(ONE)) {
    incoherence = { kind: 'lowers-exceed', amount: totalLo.minus(ONE) }
    widened = widen(
      input,
      bands.map(b => b.asked),
      incoherence.kind
    )
  } else if (totalHi.lt(ONE)) {
    incoherence = { kind: 'uppers-short', amount: ONE.minus(totalHi) }
    widened = widen(
      input,
      bands.map(b => b.asked),
      incoherence.kind
    )
  }

  // 3. tighten, dropping the fewest order answers the bounds cannot hold
  const edgesOf = (kept: readonly number[]) =>
    kept.map(
      i => [index.get(orders[i].moreLikely)!, index.get(orders[i].lessLikely)!] as [number, number]
    )
  // After widening one side the sums must not shrink the widened bands back to points
  const side: Side =
    incoherence?.kind === 'lowers-exceed' ? 'lo-only' : incoherence ? 'hi-only' : 'both'
  let result = tighten(widened, edgesOf(live), side)
  if (result === null) {
    search: for (let size = 1; size <= Math.min(MAX_DROPPED_TRIED, live.length); size++) {
      for (const drop of subsets(live.length, size)) {
        const kept = live.filter((_, k) => !drop.includes(k))
        const attempt = tighten(widened, edgesOf(kept), side)
        if (attempt) {
          result = attempt
          for (const k of drop) droppedOrders.push({ ...orders[live[k]], reason: 'conflict' })
          break search
        }
      }
    }
    if (result === null) {
      // More than a few must go: drop them one at a time, in input order, until the rest hold
      const kept = [...live]
      while (result === null && kept.length > 0) {
        const i = kept.shift()!
        droppedOrders.push({ ...orders[i], reason: 'conflict' })
        result = tighten(widened, edgesOf(kept), side)
      }
      result ??= tighten(widened, [], side)!
    }
  }

  return {
    bands: bands.map((b, i) => ({
      id: b.id,
      lo: result![i].lo,
      hi: result![i].hi,
      widened: !widened[i].lo.eq(input[i].lo) || !widened[i].hi.eq(input[i].hi),
      tightened:
        result![i].lo.gt(widened[i].lo.plus(SETTLED)) ||
        result![i].hi.lt(widened[i].hi.minus(SETTLED)),
    })),
    incoherence,
    droppedOrders,
  }
}
