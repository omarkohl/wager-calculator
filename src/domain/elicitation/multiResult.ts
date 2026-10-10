import Decimal from 'decimal.js'
import { orderAnswers } from './comparisons'
import { buildInsights, type Insight } from './insights'
import { describeBand } from './format'
import { bandMidpoint } from './logOdds'
import { EVERYTHING_ELSE_LABEL, isEverythingElse, provenanceFor, type Provenance } from './model'
import { analyse, answersInvolving, answersInvolvingAny, type MultiRun } from './multiRun'

/**
 * What the result of a claim with several outcomes shows: per outcome a band (the headline),
 * a point estimate and where the number comes from; what is incoherent about the answers;
 * the insights. Pure.
 */

export interface ResultRow {
  id: string
  label: string
  /** The coherent band on the outcome's probability. */
  lo: Decimal
  hi: Decimal
  /**
   * The band's log-odds midpoint. Null for a one-sided band (an end at 0% or 100%): there is no
   * midpoint to give, and none is made up.
   */
  estimate: Decimal | null
  /**
   * The number the result goes on with where it needs one: the point estimate, or for a band
   * with an open end the first sketch held inside the band. It is never shown as an estimate.
   */
  central: Decimal
  /** The band was widened to make the bounds coherent. */
  widened: boolean
  provenance: Provenance
}

export interface MultiResultData {
  rows: ResultRow[]
  /** What does not fit together, in words ("flagged like subadditivity"); empty if all fits. */
  flags: string[]
  insights: Insight[]
}

/** The point estimate of a band: its log-odds midpoint; null if the band is one-sided. */
export function estimateOf(lo: Decimal, hi: Decimal): Decimal | null {
  if (lo.lte(0) || hi.gte(1)) return null
  return bandMidpoint({ lo, hi })
}

/** "n points", with one decimal at most and the true amount (not capped). */
function points(amount: Decimal): string {
  const x = amount.times(100).toDecimalPlaces(1)
  return `${x.toString()} ${x.eq(1) ? 'point' : 'points'}`
}

function incoherenceText(kind: 'lowers-exceed' | 'uppers-short', amount: Decimal): string {
  return kind === 'lowers-exceed'
    ? `The lowest chances you allowed add up to ${points(amount)} more than 100%, so the ranges were widened to fit.`
    : `The highest chances you allowed fall ${points(amount)} short of 100%, so the ranges were widened to fit.`
}

/** The id the merged "Everything else" gets when there was none before. */
export const MERGED_ID = 'merged'

/**
 * The rows with `ids` merged into one "Everything else" (joining the one already there, which
 * keeps its id), at the place of the first merged one. A view of the result, not a change of the
 * answers; the offer is `mergeOffer` in `insights.ts`. The merged outcome is as likely as its
 * parts together, and no more than what the rest leave: its band is the sum of the bands, kept
 * within what the other outcomes leave over (lo >= 1 - their highs, hi <= 1 - their lows), its
 * single number the band's midpoint again. `involving` counts the answers behind the merged
 * outcome (an answer about two merged outcomes counts once).
 */
export function mergeRows(
  rows: readonly ResultRow[],
  ids: readonly string[],
  involving?: (ids: string[]) => number
): ResultRow[] {
  const existing = rows.find(r => isEverythingElse(r.label))
  const members = rows.filter(r => ids.includes(r.id) || r === existing)
  if (members.length < 2 || ids.length < 2) return [...rows]
  const others = rows.filter(r => !members.includes(r))
  const sum = (list: readonly ResultRow[], pick: (r: ResultRow) => Decimal) =>
    list.reduce((s, r) => s.plus(pick(r)), new Decimal(0))
  const one = new Decimal(1)
  const hi = Decimal.min(
    sum(members, r => r.hi),
    one.minus(sum(others, r => r.lo)),
    one
  )
  const lo = Decimal.min(
    Decimal.max(
      sum(members, r => r.lo),
      one.minus(sum(others, r => r.hi))
    ),
    hi
  )
  const count = involving
    ? involving(members.map(r => r.id))
    : members.reduce(
        (n, r) => n + (r.provenance.source === 'comparisons' ? r.provenance.count : 0),
        0
      )
  const merged: ResultRow = {
    id: existing?.id ?? MERGED_ID,
    label: EVERYTHING_ELSE_LABEL,
    lo,
    hi,
    estimate: estimateOf(lo, hi),
    central: Decimal.min(
      Decimal.max(
        sum(members, r => r.central),
        lo
      ),
      hi
    ),
    widened: members.some(r => r.widened),
    provenance: provenanceFor(count),
  }
  const gone = new Set(members.map(r => r.id))
  const at = rows.findIndex(r => gone.has(r.id))
  const kept = rows.filter(r => !gone.has(r.id))
  kept.splice(at, 0, merged)
  return kept
}

/**
 * The result. With `merged` (at least two outcome ids) those outcomes are shown as one
 * "Everything else" everywhere: the rows, the insights and the flags name no merged-away outcome.
 */
export function multiResult(run: MultiRun, merged: readonly string[] = []): MultiResultData {
  const analysis = analyse(run)
  const merging = merged.length >= 2
  const everythingElse = run.outcomes.find(o => isEverythingElse(o.label))
  const group = new Set(merging ? [...merged, ...(everythingElse ? [everythingElse.id] : [])] : [])
  const groupId = everythingElse?.id ?? MERGED_ID
  const nameOf = (id: string) => run.outcomes.find(o => o.id === id)?.label ?? id
  const label = (id: string) => (group.has(id) ? EVERYTHING_ELSE_LABEL : nameOf(id))

  const unmerged: ResultRow[] = run.outcomes.map(o => {
    const band = analysis.coherent.bands.find(b => b.id === o.id)!
    const provenance = provenanceFor(answersInvolving(run, o.id))
    const estimate = estimateOf(band.lo, band.hi)
    const central =
      estimate ?? Decimal.min(Decimal.max(analysis.sketch.get(o.id)!, band.lo), band.hi)
    return {
      id: o.id,
      label: o.label,
      lo: band.lo,
      hi: band.hi,
      estimate,
      central,
      widened: band.widened,
      provenance,
    }
  })

  const rows = merging
    ? mergeRows(unmerged, merged, ids => answersInvolvingAny(run, ids))
    : unmerged

  const flags: string[] = []
  const { incoherence, droppedOrders } = analysis.coherent
  if (incoherence) flags.push(incoherenceText(incoherence.kind, incoherence.amount))
  for (const g of analysis.groupIncoherences) {
    const group = [...new Set(g.members.map(label))].join(' or ')
    flags.push(
      `Your answer about “${group}” together (${describeBand({
        lo: g.lo.lte(0) ? null : g.lo,
        hi: g.hi.gte(1) ? null : g.hi,
      })}) does not fit your answers about the outcomes on their own, so the ranges were widened.`
    )
  }
  for (const d of droppedOrders) {
    if (group.has(d.moreLikely) && group.has(d.lessLikely)) continue
    flags.push(
      d.reason === 'cycle'
        ? `Your comparisons of ${label(d.moreLikely)} and ${label(d.lessLikely)} contradict each other, so this one was left out.`
        : `You picked ${label(d.moreLikely)} over ${label(d.lessLikely)}, which does not fit your other answers, so it was left out.`
    )
  }

  const comparisons = run.answers.flatMap(a =>
    a.kind === 'compare' ? [{ first: a.first, second: a.second, pick: a.pick }] : []
  )
  // In the merged view the orders and the sketch are about the merged outcome, too
  const into = (id: string) => (group.has(id) ? groupId : id)
  const sketch = new Map<string, Decimal>()
  for (const [id, value] of analysis.sketch) {
    sketch.set(into(id), (sketch.get(into(id)) ?? new Decimal(0)).plus(value))
  }
  const orders = orderAnswers(comparisons)
    .map(o => ({ moreLikely: into(o.moreLikely), lessLikely: into(o.lessLikely) }))
    .filter(o => o.moreLikely !== o.lessLikely)
  const insights = buildInsights({
    buckets: rows.map(r => ({ id: r.id, label: r.label, estimate: r.central })),
    orders,
    sketch,
  })
  return { rows, flags: [...new Set(flags)], insights }
}
