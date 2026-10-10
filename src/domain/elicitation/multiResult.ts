import Decimal from 'decimal.js'
import { orderAnswers } from './comparisons'
import { buildInsights, type Insight } from './insights'
import { describeBand } from './format'
import { bandMidpoint } from './logOdds'
import { provenanceFor, type Provenance } from './model'
import { analyse, answersInvolving, type MultiRun } from './multiRun'

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

export function multiResult(run: MultiRun): MultiResultData {
  const analysis = analyse(run)
  const label = (id: string) => run.outcomes.find(o => o.id === id)?.label ?? id

  const rows: ResultRow[] = run.outcomes.map(o => {
    const band = analysis.coherent.bands.find(b => b.id === o.id)!
    const provenance = provenanceFor(answersInvolving(run, o.id))
    const estimate = estimateOf(band.lo, band.hi)
    return {
      id: o.id,
      label: o.label,
      lo: band.lo,
      hi: band.hi,
      estimate,
      widened: band.widened,
      provenance,
    }
  })

  const flags: string[] = []
  const { incoherence, droppedOrders } = analysis.coherent
  if (incoherence) flags.push(incoherenceText(incoherence.kind, incoherence.amount))
  for (const g of analysis.groupIncoherences) {
    const group = g.members.map(label).join(' or ')
    flags.push(
      `Your answer about “${group}” together (${describeBand({
        lo: g.lo.lte(0) ? null : g.lo,
        hi: g.hi.gte(1) ? null : g.hi,
      })}) does not fit your answers about the outcomes on their own, so the ranges were widened.`
    )
  }
  for (const d of droppedOrders) {
    flags.push(
      d.reason === 'cycle'
        ? `Your comparisons of ${label(d.moreLikely)} and ${label(d.lessLikely)} contradict each other, so this one was left out.`
        : `You picked ${label(d.moreLikely)} over ${label(d.lessLikely)}, which does not fit your other answers, so it was left out.`
    )
  }

  const comparisons = run.answers.flatMap(a =>
    a.kind === 'compare' ? [{ first: a.first, second: a.second, pick: a.pick }] : []
  )
  const insights = buildInsights({
    // an outcome with no single number counts with its first sketch, held inside its band
    buckets: rows.map(r => ({
      id: r.id,
      label: r.label,
      estimate: r.estimate ?? Decimal.min(Decimal.max(analysis.sketch.get(r.id)!, r.lo), r.hi),
    })),
    orders: orderAnswers(comparisons),
    sketch: analysis.sketch,
  })
  return { rows, flags: [...new Set(flags)], insights }
}
