import Decimal from 'decimal.js'
import { computeBand, type BandResult, type Choice, type WedgeAnswer } from './bandRule'
import {
  applySumBand,
  makeCoherent,
  type BucketBand,
  type CoherentResult,
  type Incoherence,
  type TightenSide,
} from './coherence'
import { nextComparison, orderAnswers, type ComparisonAnswer } from './comparisons'
import {
  EQUAL_RUN_STOP,
  GROUP_WEIGHT,
  MAX_MULTI_QUESTIONS,
  MULTI_STOP_BELOW,
  NEAR_EVEN_SPREAD,
  NEAR_EVEN_WEIGHT,
  TAIL_CHECK_SCORE,
  TAIL_SKETCH_ABOVE,
  TAIL_SKETCH_BELOW,
  TAIL_WEIGHT,
} from './constants'
import { firstSketch, type ElicitOutcome } from './model'
import { MAX_QUICK_QUESTIONS, nextQuestion } from './quickSearch'
import { armFor, type ArmOrder } from './thorough'

/**
 * A run on a claim with several outcomes: the answers so far, the bands they give, and the
 * next question. Two kinds of question: "which is more likely, A or B" and the reference
 * lottery on one bucket or a group of buckets (the yes/no search, run per target). Pure; the
 * next question is a function of the outcomes, the seed and the answers.
 */

export type MultiAnswer =
  | ({ kind: 'compare' } & ComparisonAnswer)
  | { kind: 'lottery'; targets: string[]; wedge: Decimal.Value; choice: Choice }

export interface MultiRun {
  outcomes: readonly ElicitOutcome[]
  seed: string
  answers: readonly MultiAnswer[]
  /**
   * The starting chances when they do not come from the outcomes' tiers: the user's own
   * numbers (the numbers view, the bars or curve of a number claim), summing to 1.
   */
  sketch?: ReadonlyMap<string, Decimal>
}

export type MultiQuestion =
  | { kind: 'compare'; first: string; second: string }
  | { kind: 'lottery'; targets: string[]; wedge: Decimal; armOrder: ArmOrder }

const key = (targets: readonly string[]) => [...targets].sort().join('+')

/** The seed of one target's own search, so every target gets its own opening wedge. */
const targetSeed = (seed: string, targets: readonly string[]) => `${seed}:target:${key(targets)}`

function lotteryAnswers(run: MultiRun, targets: readonly string[]): WedgeAnswer[] {
  const wanted = key(targets)
  return run.answers
    .filter((a): a is Extract<MultiAnswer, { kind: 'lottery' }> => a.kind === 'lottery')
    .filter(a => key(a.targets) === wanted)
    .map(a => ({ wedge: a.wedge, choice: a.choice }))
}

/** The band the lottery answers on one target give, or null before an edge is known. */
export function targetBand(run: MultiRun, targets: readonly string[]): BandResult | null {
  return computeBand(lotteryAnswers(run, targets))
}

/** How many answers involve an outcome (a comparison, or a lottery on it or a group with it). */
export function answersInvolving(run: MultiRun, id: string): number {
  return run.answers.filter(a =>
    a.kind === 'compare' ? a.first === id || a.second === id : a.targets.includes(id)
  ).length
}

const ZERO = new Decimal(0)
const ONE = new Decimal(1)

/** The band a lottery answer set gives for the target, as numbers (one-sided ends open). */
function edges(result: BandResult | null): { lo: Decimal; hi: Decimal } | null {
  if (!result) return null
  return { lo: result.band.lo ?? ZERO, hi: result.band.hi ?? ONE }
}

interface RawBands {
  bands: BucketBand[]
  /** Group lotteries whose answers do not fit the buckets' own bounds (subadditivity). */
  groupIncoherences: Incoherence[]
  /** A side a group widened to its boundary, so the final tightening leaves it alone. */
  lockedSide: TightenSide
}

/**
 * The bucket bands before they are made coherent: each bucket's own lottery band, or the
 * whole range if it was never asked alone; then each group lottery applied as a band on the
 * sum of its members, and as the band 1 - H to 1 - L on the sum of everything else. Where a
 * group cannot fit the members' own bounds it is flagged and widened, never forced.
 */
function rawBands(run: MultiRun): RawBands {
  let bands: BucketBand[] = run.outcomes.map(o => {
    const own = edges(targetBand(run, [o.id]))
    return { id: o.id, lo: own?.lo ?? ZERO, hi: own?.hi ?? ONE, asked: own !== null }
  })
  const groupIncoherences: Incoherence[] = []
  let lockedSide: TightenSide = 'both'
  const note = (r: { incoherence: Incoherence | null; widenedSide: 'lo' | 'hi' | null }) => {
    if (r.incoherence) groupIncoherences.push(r.incoherence)
    if (r.widenedSide && lockedSide === 'both')
      lockedSide = r.widenedSide === 'lo' ? 'lo-only' : 'hi-only'
  }
  const groups = new Map<string, string[]>()
  for (const a of run.answers) {
    if (a.kind === 'lottery' && a.targets.length > 1) groups.set(key(a.targets), a.targets)
  }
  for (const members of groups.values()) {
    const g = edges(targetBand(run, members))
    if (!g) continue
    const inside = applySumBand(bands, members, g.lo, g.hi)
    note(inside)
    bands = inside.bands.map(b => (members.includes(b.id) ? { ...b, asked: true } : b))
    const others = bands.map(b => b.id).filter(id => !members.includes(id))
    if (others.length > 0) {
      const outside = applySumBand(bands, others, ONE.minus(g.hi), ONE.minus(g.lo))
      note(outside)
      bands = outside.bands
    }
  }
  return { bands, groupIncoherences, lockedSide }
}

export interface Analysis {
  sketch: Map<string, Decimal>
  /** The coherent bands, in outcome order. */
  coherent: CoherentResult
  /** Group answers that contradict the buckets' own bounds, flagged like subadditivity. */
  groupIncoherences: Incoherence[]
}

/** The sketch and the coherent bands the answers give so far. */
export function analyse(run: MultiRun): Analysis {
  const raw = rawBands(run)
  return {
    sketch: run.sketch ? new Map(run.sketch) : firstSketch(run.outcomes),
    coherent: makeCoherent(raw.bands, orderAnswers(comparisonsOf(run)), raw.lockedSide),
    groupIncoherences: raw.groupIncoherences,
  }
}

function comparisonsOf(run: MultiRun): ComparisonAnswer[] {
  return run.answers
    .filter((a): a is Extract<MultiAnswer, { kind: 'compare' }> => a.kind === 'compare')
    .map(a => ({ first: a.first, second: a.second, pick: a.pick }))
}

interface Candidate {
  score: number
  question: MultiQuestion
}

/**
 * The next question, or null when the run is done. Candidates, scored in the same unit (the
 * probability a question could still pin down, as a fraction):
 *
 * - a lottery on one bucket, worth the width of its band; a bucket never asked alone is worth
 *   twice its sketch (capped), so large buckets come first. A first lottery for a very
 *   unlikely or near-certain bucket counts double and is always worth `TAIL_CHECK_SCORE`
 *   (one tail check each); while the sketch is near-even ("no idea") first lotteries count
 *   `NEAR_EVEN_WEIGHT` times;
 * - a comparison of the pair whose order is least clear, worth how far their bands overlap
 *   (at most twice the smaller sketch while either bucket was never asked alone);
 * - once every bucket was asked alone, a lottery on the two widest buckets together.
 *
 * Comparisons stop after `EQUAL_RUN_STOP` "about equally likely" in a row. The run stops
 * when nothing is worth `MULTI_STOP_BELOW`, when every target's own search has
 * ended, or after `MAX_MULTI_QUESTIONS`.
 */
export function nextMultiQuestion(run: MultiRun): MultiQuestion | null {
  if (run.answers.length >= MAX_MULTI_QUESTIONS || run.outcomes.length < 2) return null
  const { sketch, coherent } = analyse(run)
  const ids = run.outcomes.map(o => o.id)
  const band = new Map(coherent.bands.map(b => [b.id, b]))
  const width = (id: string) => band.get(id)!.hi.minus(band.get(id)!.lo).toNumber()
  const sketchValues = [...sketch.values()].map(v => v.toNumber())
  const nearEven = Math.max(...sketchValues) - Math.min(...sketchValues) <= NEAR_EVEN_SPREAD

  const candidates: Candidate[] = []
  const lottery = (targets: string[]): Extract<MultiQuestion, { kind: 'lottery' }> | null => {
    // What the coherent bands already settle is not asked: a wedge below the bounds of the
    // target is won by the claim, one above them by the spinner. Those answers are implied
    // (not recorded) and steer the target's search.
    const lo = targets.reduce((t, id) => t.plus(band.get(id)!.lo), ZERO)
    const hi = Decimal.min(
      ONE,
      targets.reduce((t, id) => t.plus(band.get(id)!.hi), ZERO)
    )
    const answers: WedgeAnswer[] = lotteryAnswers(run, targets)
    const seedOfTarget = targetSeed(run.seed, targets)
    for (let guard = 0; guard < MAX_QUICK_QUESTIONS; guard++) {
      const next = nextQuestion(answers, seedOfTarget)
      if (!next) return null
      if (next.wedge.lt(lo)) answers.push({ wedge: next.wedge, choice: 'claim' })
      else if (next.wedge.gt(hi)) answers.push({ wedge: next.wedge, choice: 'wedge' })
      else {
        return {
          kind: 'lottery',
          targets,
          wedge: next.wedge,
          armOrder: armFor(run.seed, run.answers.length),
        }
      }
    }
    return null
  }

  // lotteries on single buckets
  let allAsked = true
  for (const o of run.outcomes) {
    const asked = lotteryAnswers(run, [o.id]).length > 0
    if (!asked) allAsked = false
    const question = lottery([o.id])
    if (!question) continue
    let score = width(o.id)
    if (!asked) {
      score = Math.min(score, 2 * sketch.get(o.id)!.toNumber())
      if (nearEven) score *= NEAR_EVEN_WEIGHT
      const chance = sketch.get(o.id)!.toNumber()
      const tail =
        o.tier === null
          ? chance <= TAIL_SKETCH_BELOW || chance >= TAIL_SKETCH_ABOVE
          : o.tier === 'very unlikely' || o.tier === 'near-certain'
      if (tail) {
        score = Math.max(score * TAIL_WEIGHT, TAIL_CHECK_SCORE)
      }
    }
    candidates.push({ score, question })
  }

  // comparisons, until a few "about equally likely" in a row show they add nothing
  const recent = comparisonsOf(run).slice(-EQUAL_RUN_STOP)
  const tired = recent.length === EQUAL_RUN_STOP && recent.every(c => c.pick === 'equal')
  const bandRanges = new Map(coherent.bands.map(b => [b.id, { lo: b.lo, hi: b.hi }]))
  const pair = tired
    ? null
    : nextComparison({
        ids,
        sketch,
        bands: bandRanges,
        answers: comparisonsOf(run),
        seed: run.seed,
      })
  if (pair) {
    const a = band.get(pair.first)!
    const b = band.get(pair.second)!
    const overlap = Decimal.min(a.hi, b.hi).minus(Decimal.max(a.lo, b.lo))
    // a bucket never asked about is worth no more than twice its sketch, as for a lottery
    const unasked = [pair.first, pair.second].some(id => lotteryAnswers(run, [id]).length === 0)
    const cap = unasked
      ? 2 * Math.min(sketch.get(pair.first)!.toNumber(), sketch.get(pair.second)!.toNumber())
      : 1
    candidates.push({
      score: Math.min(Math.max(0, overlap.toNumber()), cap),
      question: { kind: 'compare', ...pair },
    })
  }

  // a group lottery, once every bucket has been asked alone
  if (allAsked && ids.length >= 3) {
    const widest = [...ids].sort((x, y) => width(y) - width(x) || (x < y ? -1 : 1))
    const pairs = widest.flatMap((x, i) => widest.slice(i + 1).map(y => [x, y]))
    // the first pair in order of width that was not asked as a group yet
    const targets = pairs.find(t => lotteryAnswers(run, t).length === 0)
    const question = targets && lottery(targets)
    if (targets && question) {
      candidates.push({
        score: ((width(targets[0]) + width(targets[1])) / 2) * GROUP_WEIGHT,
        question,
      })
    }
  }

  const best = candidates.reduce<Candidate | null>(
    (top, c) => (top === null || c.score > top.score + 1e-12 ? c : top),
    null
  )
  return best && best.score >= MULTI_STOP_BELOW ? best.question : null
}

/** The run with one answer added. */
export function answerMulti(run: MultiRun, answer: MultiAnswer): MultiRun {
  return { ...run, answers: [...run.answers, answer] }
}
