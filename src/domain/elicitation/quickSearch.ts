import Decimal from 'decimal.js'
import { createSeededPRNG } from '../prng'
import { computeBand, type WedgeAnswer } from './bandRule'
import { OPENING_WEDGE_RANGE, TARGET_WIDTH_LOGIT } from './constants'
import { expit, fromPercent, logit, snapToGrid, stepWedge } from './logOdds'

/**
 * Quick mode: a boundary search for the two edges of the indifference band, in
 * log-odds. The next question is a pure function of the seed and the answers so far
 * (given in the order they were asked), so a run can be replayed.
 *
 * The claim beating a wedge means the belief is above it; a wedge beating the claim
 * means it is below; "can't separate" means the wedge is inside the band. Let H be
 * the highest wedge the claim beat and S the lowest that beat it. An edge with no
 * answer yet is searched by probing outward in fixed log-odds steps; once H and S
 * are both known the gaps between them (and the wedges that could not be separated)
 * are bisected in log-odds until what is still unresolved adds up to the target width.
 */

/** The smallest outward probe: 52% -> 65% is about this. */
export const OUTWARD_STEP_LOGIT = 0.6

/** Each further outward probe moves this share of the distance already travelled (at least the step above). */
export const OUTWARD_GROWTH = 0.5

/** Outward probes a missing edge is expected to need, for the "questions left" estimate. */
export const EXPECTED_OUTWARD_PROBES = 1

/** A run never asks more than this many questions. */
export const MAX_QUICK_QUESTIONS = 12

export interface Question {
  wedge: Decimal
  /** `outward` probes make the run longer; the others narrow what is known. */
  kind: 'opening' | 'outward' | 'refine'
}

interface Gap {
  lo: Decimal
  hi: Decimal
}

function gapLogit(gap: Gap): Decimal {
  return logit(gap.hi).minus(logit(gap.lo))
}

/** The wedge in the middle of a gap in log-odds, or null if no wedge fits between. */
function midpoint(gap: Gap): Decimal | null {
  const mid = snapToGrid(expit(logit(gap.lo).plus(logit(gap.hi)).div(2)))
  return mid.gt(gap.lo) && mid.lt(gap.hi) ? mid : null
}

interface Known {
  highest: Decimal | null
  lowest: Decimal | null
  /** Wedges that could not be separated, strictly between H and S. */
  inside: Decimal[]
  /** Lowest and highest wedge touched on each side, to probe outward from. */
  asked: Decimal[]
}

function summarise(answers: readonly WedgeAnswer[]): Known {
  const result = computeBand(answers)
  const highest = result?.highest ?? null
  const lowest = result?.lowest ?? null
  const inside = answers
    .filter(a => a.choice === 'cant-separate')
    .map(a => new Decimal(a.wedge))
    .filter(w => (highest === null || w.gt(highest)) && (lowest === null || w.lt(lowest)))
    .sort((a, b) => a.cmp(b))
  return { highest, lowest, inside, asked: answers.map(a => new Decimal(a.wedge)) }
}

/**
 * The gaps still holding an unresolved edge; empty when the run may stop. With no
 * unseparable wedge between H and S the whole width must reach the target; with
 * some, the two gaps outside them (H up to the first, the last up to S) must
 * together reach it, so the band is no wider than target plus what the user could
 * not separate.
 */
function openGaps(k: Known): Gap[] {
  if (k.highest === null || k.lowest === null) return []
  if (k.highest.gte(k.lowest)) return [] // contradiction: absorbed as width
  if (k.inside.length === 0) {
    const whole = { lo: k.highest, hi: k.lowest }
    return gapLogit(whole).gt(TARGET_WIDTH_LOGIT.quick) ? [whole] : []
  }
  const gaps = [
    { lo: k.highest, hi: k.inside[0] },
    { lo: k.inside[k.inside.length - 1], hi: k.lowest },
  ]
  const unresolved = gaps.reduce((sum, g) => sum.plus(gapLogit(g)), new Decimal(0))
  return unresolved.gt(TARGET_WIDTH_LOGIT.quick) ? gaps : []
}

/** Seeded opening wedge, a whole percent in 35-65%. */
export function openingWedge(seed: string): Decimal {
  const { min, max } = OPENING_WEDGE_RANGE
  const lowest = Math.round(min * 100)
  const count = Math.round(max * 100) - lowest + 1
  const percent = lowest + Math.floor(createSeededPRNG(seed)() * count)
  return fromPercent(percent)
}

/** The next question, or null when the run is done (both edges pinned, or no room left). */
export function nextQuestion(answers: readonly WedgeAnswer[], seed: string): Question | null {
  if (answers.length === 0) return { wedge: openingWedge(seed), kind: 'opening' }
  if (answers.length >= MAX_QUICK_QUESTIONS) return null

  const k = summarise(answers)
  const alreadyAsked = (w: Decimal) => k.asked.some(a => a.eq(w))

  if (k.highest !== null && k.lowest !== null) {
    // Both edges known: bisect the widest open gap (the lower one on a tie)
    const gaps = openGaps(k).sort((a, b) => gapLogit(b).cmp(gapLogit(a)) || a.lo.cmp(b.lo))
    for (const gap of gaps) {
      const mid = midpoint(gap)
      if (mid && !alreadyAsked(mid)) return { wedge: mid, kind: 'refine' }
    }
    return null
  }

  // One or both edges unknown: probe outward on the missing side. With both missing,
  // alternate, starting on a side the seed picks so neither edge is favoured
  const needLower = k.highest === null
  const needUpper = k.lowest === null
  const startDown = secondDraw(seed) < 0.5
  const goDown = needLower && (!needUpper || (answers.length % 2 === 1) === startDown)
  const wedge = outwardProbe(k, answers, goDown)
  if (alreadyAsked(wedge)) {
    // The grid ends here. Try the other missing side, otherwise stop with a one-sided band.
    if (needLower && needUpper) {
      const w = outwardProbe(k, answers, !goDown)
      if (!alreadyAsked(w)) return { wedge: w, kind: 'outward' }
    }
    return null
  }
  return { wedge, kind: 'outward' }
}

/** The extreme wedge asked so far in a direction. */
function extreme(k: Known, down: boolean): Decimal {
  const sorted = [...k.asked].sort((a, b) => a.cmp(b))
  return down ? sorted[0] : sorted[sorted.length - 1]
}

/** The wedge `step` logits beyond the extreme one asked so far, on the grid. */
function outwardProbe(k: Known, answers: readonly WedgeAnswer[], down: boolean): Decimal {
  const from = extreme(k, down)
  const travelled = logit(from).minus(logit(answers[0].wedge)).abs()
  const step = Decimal.max(OUTWARD_STEP_LOGIT, travelled.times(OUTWARD_GROWTH))
  return stepWedge(from, down ? step.neg() : step)
}

function secondDraw(seed: string): number {
  const rng = createSeededPRNG(seed)
  rng()
  return rng()
}

/** Bisections still expected to bring `width` logits down to the target. */
function bisectionsNeeded(width: Decimal): number {
  const target = TARGET_WIDTH_LOGIT.quick
  return width.gt(target) ? Math.ceil(Math.log2(width.div(target).toNumber())) : 0
}

/** Outward probes the doubling schedule still allows on one side before the grid ends. */
function probesToGridEnd(k: Known, answers: readonly WedgeAnswer[], down: boolean): number {
  let asked = [...k.asked]
  let n = 0
  while (n < MAX_QUICK_QUESTIONS) {
    const next = outwardProbe({ ...k, asked }, answers, down)
    if (asked.some(a => a.eq(next))) break
    asked = [...asked, next]
    n++
  }
  return n
}

/**
 * Questions expected to remain. A missing edge costs the outward probes it is
 * expected to take (at most `EXPECTED_OUTWARD_PROBES`, fewer if the grid ends first)
 * plus one to narrow it; known edges cost the bisections to reach the target.
 */
function rawEstimate(answers: readonly WedgeAnswer[]): number {
  if (answers.length === 0) return 1 + 2 * (EXPECTED_OUTWARD_PROBES + 1)
  const k = summarise(answers)
  if (k.highest === null || k.lowest === null) {
    // A side that already took k outward probes is likely to take about k more
    const missing = (down: boolean) => {
      const opening = new Decimal(answers[0].wedge)
      const made = k.asked.filter(w => (down ? w.lt(opening) : w.gt(opening))).length
      return Math.min(EXPECTED_OUTWARD_PROBES + made, probesToGridEnd(k, answers, down)) + 1
    }
    return (k.highest === null ? missing(true) : 0) + (k.lowest === null ? missing(false) : 0)
  }
  const gaps = openGaps(k)
  if (gaps.length === 0) return 0
  return bisectionsNeeded(gaps.reduce((sum, g) => sum.plus(gapLogit(g)), new Decimal(0)))
}

/**
 * "Approx. N questions left". From the current bracket against the target, held
 * non-increasing across the run; it rises only after an outward probe, the one case
 * where the run really got longer.
 */
export function approxQuestionsLeft(answers: readonly WedgeAnswer[], seed: string): number {
  let shown = rawEstimate([])
  for (let i = 1; i <= answers.length; i++) {
    const raw = rawEstimate(answers.slice(0, i))
    const wasOutward = nextQuestion(answers.slice(0, i - 1), seed)?.kind === 'outward'
    shown = wasOutward ? raw : Math.min(shown, raw)
  }
  return nextQuestion(answers, seed) === null ? 0 : Math.max(1, shown)
}
