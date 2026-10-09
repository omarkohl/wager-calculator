import Decimal from 'decimal.js'
import { MERGE_BELOW, MIN_OUTCOMES, TINY_BELOW, TOP_K } from './constants'
import { formatPercent } from './logOdds'
import { EVERYTHING_ELSE_LABEL, isEverythingElse } from './model'
import type { OrderAnswer } from './coherence'

/**
 * What the result of a claim with several outcomes can say beyond the numbers: how much the
 * top outcomes cover, which outcomes got "almost nothing", where an order answer disagrees
 * with the first sketch, whether rare outcomes could be merged into "everything else" (offered,
 * never done), and the arithmetic of adjusted values (the total, Normalize). Pure.
 */

/** An outcome as the result shows it. */
export interface ResultBucket {
  id: string
  label: string
  /** The point estimate, as a probability. */
  estimate: Decimal
}

// ---------------------------------------------------------------------- coverage

export interface Coverage {
  k: number
  ids: string[]
  coverage: Decimal
}

/** The `k` most likely outcomes and the chance they cover together; null if a tie spans the cut. */
export function topCoverage(buckets: readonly ResultBucket[], k: number = TOP_K): Coverage | null {
  if (!Number.isInteger(k) || k < 1 || buckets.length <= k) return null
  const ranked = buckets
    .map((b, i) => ({ b, i }))
    .sort((x, y) => y.b.estimate.cmp(x.b.estimate) || x.i - y.i)
  // A tie across the cut would make "the top k" arbitrary: say nothing then
  if (ranked[k - 1].b.estimate.eq(ranked[k].b.estimate)) return null
  const top = ranked.slice(0, k)
  return {
    k,
    ids: top.map(t => t.b.id),
    coverage: top.reduce((s, t) => s.plus(t.b.estimate), new Decimal(0)),
  }
}

const NUMBER_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven']

function joinLabels(labels: readonly string[]): string {
  if (labels.length <= 1) return labels.join('')
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}

// ------------------------------------------------------------------------ 1-in-N

/**
 * "1-in-N" for a tiny chance: N is 1/p to two significant digits (1 in 55, 1 in 100). A chance
 * below `TINY_BELOW` always gives N above 20. Null if the chance is not tiny or not a chance.
 */
export function oneInN(p: Decimal.Value): number | null {
  const x = new Decimal(p)
  if (!x.gt(0) || !x.lt(TINY_BELOW)) return null
  return new Decimal(1).div(x).toSignificantDigits(2).toNumber()
}

// ---------------------------------------------------------- order vs. the sketch

export interface OrderDisagreement {
  moreLikely: string
  lessLikely: string
}

/**
 * Order answers that the first sketch contradicts: "A is more likely than B" while the
 * sketch gave B more than A ("you picked Rain over Cloudy but sketched Cloudy higher").
 * Equal sketches do not disagree.
 */
export function orderDisagreements(
  orders: readonly OrderAnswer[],
  sketch: ReadonlyMap<string, Decimal>
): OrderDisagreement[] {
  const seen = new Set<string>()
  const found: OrderDisagreement[] = []
  for (const o of orders) {
    const more = sketch.get(o.moreLikely)
    const less = sketch.get(o.lessLikely)
    const pair = `${o.moreLikely}>${o.lessLikely}`
    if (!more || !less || !less.gt(more) || seen.has(pair)) continue
    seen.add(pair)
    found.push({ moreLikely: o.moreLikely, lessLikely: o.lessLikely })
  }
  return found
}

// ---------------------------------------------------------------------- insights

export interface Insight {
  kind: 'coverage' | 'tiny' | 'disagreement'
  text: string
  ids: string[]
}

/**
 * The insights the answers so far support, in the order to show them: coverage of the top
 * outcomes, outcomes given almost nothing, disagreements between the order and the sketch.
 */
export function buildInsights(input: {
  buckets: readonly ResultBucket[]
  orders: readonly OrderAnswer[]
  sketch: ReadonlyMap<string, Decimal>
}): Insight[] {
  const { buckets, orders, sketch } = input
  const label = (id: string) => buckets.find(b => b.id === id)?.label ?? id
  const insights: Insight[] = []

  const top = topCoverage(buckets)
  if (top) {
    const count = NUMBER_WORDS[top.k] || String(top.k)
    insights.push({
      kind: 'coverage',
      ids: top.ids,
      text: `Your top ${count} outcomes (${joinLabels(top.ids.map(label))}) cover ${formatPercent(top.coverage)}.`,
    })
  }
  for (const b of buckets) {
    const n = oneInN(b.estimate)
    if (n !== null) {
      insights.push({
        kind: 'tiny',
        ids: [b.id],
        text: `You gave ${b.label} almost nothing: that's a 1-in-${n} claim.`,
      })
    }
  }
  for (const d of orderDisagreements(orders, sketch)) {
    insights.push({
      kind: 'disagreement',
      ids: [d.moreLikely, d.lessLikely],
      text: `You picked ${label(d.moreLikely)} over ${label(d.lessLikely)} but sketched ${label(d.lessLikely)} higher.`,
    })
  }
  return insights
}

// ------------------------------------------------------------------------- merge

export interface MergeOffer {
  ids: string[]
  /** Together they are this likely. */
  combined: Decimal
}

/**
 * Offer to merge rare outcomes into "everything else": two or more outcomes each below
 * `MERGE_BELOW`, as long as at least `MIN_OUTCOMES` outcomes remain. Only an offer.
 */
export function mergeOffer(buckets: readonly ResultBucket[]): MergeOffer | null {
  const rare = buckets.filter(b => b.estimate.lt(MERGE_BELOW))
  if (rare.length < 2) return null
  // Merged, the rare ones become one bucket: the "everything else" already there, or a new one
  const existing = buckets.find(b => isEverythingElse(b.label))
  const joinsExisting = existing !== undefined && !rare.includes(existing)
  const remaining = buckets.length - rare.length + (joinsExisting ? 0 : 1)
  if (remaining < MIN_OUTCOMES) return null
  return {
    ids: rare.map(b => b.id),
    combined: rare.reduce((s, b) => s.plus(b.estimate), new Decimal(0)),
  }
}

/**
 * The buckets with `ids` merged into one "Everything else" (added to the one already there,
 * if any, which keeps its id), its estimate the sum of theirs. The merged bucket takes the
 * place of the first merged one. A new "Everything else" needs a fresh id from the caller
 * (see `issueId`): ids of merged-away outcomes are never reused, since answers recorded for
 * them must not attach to the new bucket. Throws on unknown ids, fewer than two, or an id
 * that is already in the list.
 */
export function applyMerge(
  buckets: readonly ResultBucket[],
  ids: readonly string[],
  freshId: string
): ResultBucket[] {
  const merging = buckets.filter(b => ids.includes(b.id))
  if (new Set(ids).size < 2 || merging.length !== new Set(ids).size) {
    throw new Error('Merging needs two or more known outcomes')
  }
  const existing = buckets.find(b => isEverythingElse(b.label))
  const members = existing && !merging.includes(existing) ? [...merging, existing] : merging
  if (!existing && (freshId === '' || buckets.some(b => b.id === freshId))) {
    throw new Error('Merging into a new "Everything else" needs an id that was never used')
  }
  const merged: ResultBucket = {
    id: existing?.id ?? freshId,
    label: EVERYTHING_ELSE_LABEL,
    estimate: members.reduce((s, b) => s.plus(b.estimate), new Decimal(0)),
  }
  const gone = new Set(members.map(b => b.id))
  const firstAt = buckets.findIndex(b => gone.has(b.id))
  const kept = buckets.filter(b => !gone.has(b.id))
  kept.splice(firstAt, 0, merged)
  return kept
}

// ----------------------------------------------------- adjusted values (percent)

export type TotalState =
  { kind: 'ok' } | { kind: 'over'; points: Decimal } | { kind: 'under'; points: Decimal }

/** Where percentages stand against 100: exactly 100, too many points, or not yet placed. */
export function totalState(values: readonly Decimal[]): TotalState {
  const total = values.reduce((s, v) => s.plus(v), new Decimal(0))
  if (total.eq(100)) return { kind: 'ok' }
  return total.gt(100)
    ? { kind: 'over', points: total.minus(100) }
    : { kind: 'under', points: new Decimal(100).minus(total) }
}

/** "12 points too many" / "13 points not yet placed", or null when the total is 100. */
export function describeTotal(state: TotalState): string | null {
  if (state.kind === 'ok') return null
  const rounded = state.points.toDecimalPlaces(2)
  // under a hundredth of a point it is still not 100: say so without a misleading "0"
  const amount = rounded.isZero() ? '<0.01' : rounded.toString()
  const noun = rounded.eq(1) ? 'point' : 'points'
  return state.kind === 'over' ? `${amount} ${noun} too many` : `${amount} ${noun} not yet placed`
}

/** "Bet on this" is available only once the adjusted values are percentages that sum to exactly 100%. */
export function canBet(values: readonly Decimal[]): boolean {
  return (
    values.length > 0 &&
    values.every(v => v.gte(0) && v.lte(100)) &&
    totalState(values).kind === 'ok'
  )
}

/**
 * Normalize: scale percentages to sum to exactly 100 with two decimals, the leftover
 * hundredths going to the largest remainders (ties to the earlier value). The user presses
 * it; the tool never rescales silently. Throws on a negative value or a total of zero.
 */
export function normalizePercents(values: readonly Decimal[]): Decimal[] {
  if (values.some(v => v.isNeg())) throw new RangeError('Cannot normalise a negative value')
  const total = values.reduce((s, v) => s.plus(v), new Decimal(0))
  if (!total.gt(0)) throw new RangeError('Nothing to normalise: the values sum to zero')
  const exact = values.map(v => v.times(100).div(total))
  const floors = exact.map(v => v.toDecimalPlaces(2, Decimal.ROUND_DOWN))
  let leftover = new Decimal(100)
    .minus(floors.reduce((s, v) => s.plus(v), new Decimal(0)))
    .times(100)
    .round()
    .toNumber()
  const order = exact
    .map((v, i) => ({ i, rest: v.minus(floors[i]) }))
    .sort((a, b) => b.rest.cmp(a.rest) || a.i - b.i)
  const result = [...floors]
  for (const { i } of order) {
    if (leftover <= 0) break
    result[i] = result[i].plus('0.01')
    leftover--
  }
  return result
}

/**
 * Normalize for percentages that must each stay usable (above zero): as `normalizePercents`,
 * but a value that rounds to 0.00 is lifted to 0.01, the hundredths taken from the largest
 * values (ties to the earlier one), so the sum stays exactly 100. Throws when there is no
 * room (more values than hundredths of a point can cover).
 */
export function normalizePercentsAtLeast(values: readonly Decimal[]): Decimal[] {
  const result = normalizePercents(values)
  const step = new Decimal('0.01')
  for (let i = 0; i < result.length; i++) {
    if (!result[i].isZero()) continue
    let donor = -1
    result.forEach((v, j) => {
      if (donor < 0 || v.gt(result[donor])) donor = j
    })
    if (result[donor].lt(step.times(2)))
      throw new RangeError('Too many values to keep each above zero')
    result[donor] = result[donor].minus(step)
    result[i] = step
  }
  return result
}
