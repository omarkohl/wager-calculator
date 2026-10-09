import Decimal from 'decimal.js'
import { createSeededPRNG } from '../prng'
import { computeBand, type BandResult, type WedgeAnswer } from './bandRule'
import { NEGATION_PROBES_THOROUGH, REPEATS_THOROUGH, TARGET_WIDTH_LOGIT } from './constants'
import {
  type Band,
  bandMidpoint,
  expit,
  fromPercent,
  logit,
  snapToGrid,
  stepWedge,
} from './logOdds'

/**
 * Thorough mode. Instead of one boundary search it runs two staircases with
 * opposite anchors, interleaved by the seeded PRNG so the user cannot track them:
 * the ascending one (from a low anchor) finds the lower edge H, the descending one
 * (from a high anchor) the upper edge S. Each walks until the answer changes, then
 * bisects the bracket in log-odds down to half the thorough target width. On top of
 * that it asks swapped-arm repeats of earlier comparisons and, in the second half
 * of the run, negation probes: the same comparison about the claim being false.
 *
 * Like quick mode, the next question is a pure function of the seed and the answers
 * so far (in the order they were asked). Answers carry the tags of the question they
 * answer, so the staircases are rebuilt from them.
 */

/** Distance between the steps of a staircase before it brackets its edge. */
export const STAIR_STEP_LOGIT = 1

/** A bracket this narrow (in logits) pins an edge: half the thorough target width. */
export const EDGE_TOLERANCE_LOGIT = TARGET_WIDTH_LOGIT.thorough / 2

/** Margin of a negation probe beyond the complement of the direct band edge (at least one display unit). */
export const NEGATION_MARGIN_LOGIT = 0.05

/** Negation probes start once both staircase brackets are at most this wide (logits). */
export const NEGATION_BRACKET_LOGIT = 4 * EDGE_TOLERANCE_LOGIT

/** Anchors are drawn from these ranges (whole percent). */
export const LOW_ANCHOR_RANGE = { min: 5, max: 15 } as const
export const HIGH_ANCHOR_RANGE = { min: 85, max: 95 } as const

/** A thorough run never asks more than this many questions. */
export const MAX_THOROUGH_QUESTIONS = 24

/** A negation probe is asked once this many direct questions have been answered. */
const NEGATION_AFTER = [8, 11] as const
/** A repeat is asked once this many direct questions have been answered. */
const REPEAT_AFTER = [5, 9] as const

export type Frame = 'claim' | 'negation'
export type Stair = 'low' | 'high'
export type ArmOrder = 'claim-first' | 'wedge-first'
export type ThoroughKind = 'anchor' | 'step' | 'refine' | 'repeat' | 'negation'

export interface ThoroughQuestion {
  wedge: Decimal
  /** `negation`: the comparison is about the claim being false. */
  frame: Frame
  /** The staircase a question belongs to (not for repeats and negation probes). */
  stair?: Stair
  kind: ThoroughKind
  /** Which arm is shown first; a repeat shows the opposite of the original. */
  armOrder: ArmOrder
}

export interface ThoroughAnswer extends WedgeAnswer {
  frame: Frame
  stair?: Stair
  kind: ThoroughKind
  armOrder: ArmOrder
}

/** A deterministic draw in [0, 1) for one decision of a run. */
function draw(seed: string, label: string, index: number): number {
  return createSeededPRNG(`${seed}:${label}:${index}`)()
}

/** Which arm the question at `index` shows first, drawn from the seed. */
export function armFor(seed: string, index: number): ArmOrder {
  return draw(seed, 'arm', index) < 0.5 ? 'claim-first' : 'wedge-first'
}

function anchor(seed: string, which: Stair): Decimal {
  const { min, max } = which === 'low' ? LOW_ANCHOR_RANGE : HIGH_ANCHOR_RANGE
  return fromPercent(min + Math.floor(draw(seed, `anchor-${which}`, 0) * (max - min + 1)))
}

function gap(lo: Decimal, hi: Decimal): Decimal {
  return logit(hi).minus(logit(lo))
}

function midpoint(lo: Decimal, hi: Decimal): Decimal | null {
  const mid = snapToGrid(expit(logit(lo).plus(logit(hi)).div(2)))
  return mid.gt(lo) && mid.lt(hi) ? mid : null
}

interface StairStep {
  wedge: Decimal
  kind: 'anchor' | 'step' | 'refine'
  /** Width of the bracket still being bisected, in logits (refine only). */
  bracket?: Decimal
}

/**
 * The next wedge of one staircase, or null when it is finished. The lower edge H
 * lies between the highest wedge the claim beat and the next wedge above that did
 * not beat it; the upper edge S is the mirror image with the wedge winning.
 */
function stairNext(
  answers: readonly ThoroughAnswer[],
  stair: Stair,
  seed: string
): StairStep | null {
  const mine = answers.filter(a => a.frame === 'claim' && a.stair === stair)
  if (mine.length === 0) return { wedge: anchor(seed, stair), kind: 'anchor' }

  // `yes` = the answer that keeps a staircase walking (claim for low, wedge for high)
  const yesChoice = stair === 'low' ? 'claim' : 'wedge'
  const yes = mine.filter(a => a.choice === yesChoice).map(a => new Decimal(a.wedge))
  const no = mine.filter(a => a.choice !== yesChoice).map(a => new Decimal(a.wedge))
  const up = stair === 'low'
  const sorted = (xs: Decimal[]) => [...xs].sort((a, b) => a.cmp(b))

  // The innermost "yes" is the highest for low, the lowest for high; "no" is beyond it
  const innermostYes = yes.length === 0 ? null : up ? sorted(yes)[yes.length - 1] : sorted(yes)[0]
  const beyond = (w: Decimal) =>
    innermostYes === null ? true : up ? w.gt(innermostYes) : w.lt(innermostYes)
  const nearestNo = (() => {
    const candidates = sorted(no.filter(beyond))
    return candidates.length === 0 ? null : up ? candidates[0] : candidates[candidates.length - 1]
  })()

  const walk = (from: Decimal, direction: 1 | -1): StairStep | null => {
    const next = stepWedge(from, STAIR_STEP_LOGIT * direction)
    return next.eq(from) ? null : { wedge: next, kind: 'step' }
  }

  if (innermostYes === null) {
    // Even the anchor did not keep the staircase walking: look the other way
    const edge = sorted(no)[up ? 0 : no.length - 1]
    return walk(edge, up ? -1 : 1)
  }
  if (nearestNo === null) return walk(innermostYes, up ? 1 : -1)

  const [lo, hi] = up ? [innermostYes, nearestNo] : [nearestNo, innermostYes]
  if (gap(lo, hi).lte(EDGE_TOLERANCE_LOGIT)) return null
  const mid = midpoint(lo, hi)
  return mid ? { wedge: mid, kind: 'refine', bracket: gap(lo, hi) } : null
}

/** The answers about the claim itself, as opposed to its negation. */
function directAnswers(answers: readonly ThoroughAnswer[]): ThoroughAnswer[] {
  return answers.filter(a => a.frame === 'claim')
}

/** Band of P(claim) implied by the negation answers, converted with 1 - p. */
function negationBand(answers: readonly ThoroughAnswer[]): Band | null {
  const result = computeBand(answers.filter(a => a.frame === 'negation'))
  if (!result) return null
  const flip = (p: Decimal | null) => (p === null ? null : new Decimal(1).minus(p))
  return { lo: flip(result.band.hi), hi: flip(result.band.lo) }
}

function pickNegationWedge(
  answers: readonly ThoroughAnswer[],
  seed: string,
  done: number
): Decimal | null {
  const direct = computeBand(directAnswers(answers))
  if (!direct) return null
  const { lo, hi } = direct.band
  // A coherent user's P(not-X) lies in [1 - hi, 1 - lo]. One probe goes just below
  // that range (a coherent user prefers not-X there), one just above (the wedge
  // wins); the seed picks which comes first
  const below = hi ? stepWedge(new Decimal(1).minus(hi), -NEGATION_MARGIN_LOGIT) : null
  const above = lo ? stepWedge(new Decimal(1).minus(lo), NEGATION_MARGIN_LOGIT) : null
  // A one-sided direct band allows only one probe: a second would repeat it
  const order = (draw(seed, 'neg-order', 0) < 0.5 ? [below, above] : [above, below]).filter(
    (w): w is Decimal => w !== null
  )
  return order[done] ?? null
}

function pickRepeat(answers: readonly ThoroughAnswer[], seed: string): ThoroughAnswer | null {
  const direct = directAnswers(answers).filter(a => a.kind !== 'repeat')
  const repeated = new Set(
    answers.filter(a => a.kind === 'repeat').map(a => new Decimal(a.wedge).toString())
  )
  const fresh = direct.filter(a => !repeated.has(new Decimal(a.wedge).toString()))
  if (fresh.length === 0) return null
  // Prefer comparisons near the band, where an unstable answer matters most
  const band = computeBand(directAnswers(answers))
  const centre = band?.pointEstimate ?? band?.highest ?? band?.lowest ?? new Decimal(fresh[0].wedge)
  const byDistance = [...fresh].sort(
    (a, b) =>
      logit(a.wedge)
        .minus(logit(centre))
        .abs()
        .cmp(logit(b.wedge).minus(logit(centre)).abs()) || new Decimal(a.wedge).cmp(b.wedge)
  )
  return byDistance[
    Math.floor(draw(seed, 'repeat', answers.length) * Math.min(3, byDistance.length))
  ]
}

/** The next question, or null when the run is done. */
export function nextThoroughQuestion(
  answers: readonly ThoroughAnswer[],
  seed: string
): ThoroughQuestion | null {
  if (answers.length >= MAX_THOROUGH_QUESTIONS) return null
  const i = answers.length

  const low = stairNext(answers, 'low', seed)
  const high = stairNext(answers, 'high', seed)
  const stairsDone = low === null && high === null
  // Negation probes mirror the direct band, so they wait until both staircases have
  // narrowed their edge to a bracket close to the target
  const bracketed = [low, high].every(
    s => s === null || (s.kind === 'refine' && s.bracket!.lte(NEGATION_BRACKET_LOGIT))
  )
  const directCount = answers.filter(a => a.frame === 'claim' && a.kind !== 'repeat').length
  const repeatsDone = answers.filter(a => a.kind === 'repeat').length
  const negationsDone = answers.filter(a => a.frame === 'negation').length

  const candidates: ThoroughQuestion[] = []
  if (low)
    candidates.push({
      wedge: low.wedge,
      frame: 'claim',
      stair: 'low',
      kind: low.kind,
      armOrder: armFor(seed, i),
    })
  if (high)
    candidates.push({
      wedge: high.wedge,
      frame: 'claim',
      stair: 'high',
      kind: high.kind,
      armOrder: armFor(seed, i),
    })

  if (repeatsDone < REPEATS_THOROUGH && (stairsDone || directCount >= REPEAT_AFTER[repeatsDone])) {
    const original = pickRepeat(answers, seed)
    if (original) {
      candidates.push({
        wedge: new Decimal(original.wedge),
        frame: 'claim',
        kind: 'repeat',
        armOrder: original.armOrder === 'claim-first' ? 'wedge-first' : 'claim-first',
      })
    }
  }
  if (
    negationsDone < NEGATION_PROBES_THOROUGH &&
    bracketed &&
    (stairsDone || directCount >= NEGATION_AFTER[negationsDone])
  ) {
    const wedge = pickNegationWedge(answers, seed, negationsDone)
    if (wedge)
      candidates.push({ wedge, frame: 'negation', kind: 'negation', armOrder: armFor(seed, i) })
  }

  if (candidates.length === 0) return null
  return candidates[Math.floor(draw(seed, 'pick', i) * candidates.length)]
}

export interface Subadditivity {
  /** Size of the gap between the direct band and the negation-implied band, in logits. */
  gapLogit: Decimal
  /** `sub`: P(X) + P(not-X) > 1; `super`: < 1. */
  kind: 'sub' | 'super'
}

export interface ThoroughResult {
  /** Band from the direct answers alone, with its contradiction fields. */
  direct: BandResult | null
  /** Band of P(claim) implied by the negation answers (1 - band of not-X). */
  negation: Band | null
  /** The reported band: the direct and negation-implied bands combined (see `combineBands`). */
  band: Band
  /** Log-odds midpoint of the reported band; null if it is one-sided. */
  pointEstimate: Decimal | null
  subadditivity: Subadditivity | null
}

/**
 * Combine the direct band with the band the negation answers imply. Both bound the
 * same belief, so when they are compatible (they overlap, or one is open on the
 * side the other bounds) the answer is their intersection: coherent answers leave
 * the band as it is and a one-sided band keeps what it knows. When they conflict
 * (they do not overlap) the band spans every edge involved, so the incoherence
 * shows up as extra width.
 */
function combineBands(direct: Band, negation: Band): Band {
  const known = (xs: (Decimal | null)[]) => xs.filter((x): x is Decimal => x !== null)
  const los = known([direct.lo, negation.lo])
  const his = known([direct.hi, negation.hi])
  const lo = los.length ? Decimal.max(...los) : null
  const hi = his.length ? Decimal.min(...his) : null
  if (lo === null || hi === null || lo.lte(hi)) return { lo, hi }
  const edges = known([direct.lo, direct.hi, negation.lo, negation.hi])
  return { lo: Decimal.min(...edges), hi: Decimal.max(...edges) }
}

function subadditivityOf(direct: Band, negation: Band): Subadditivity | null {
  if (direct.lo && negation.hi && direct.lo.gt(negation.hi)) {
    return { gapLogit: logit(direct.lo).minus(logit(negation.hi)), kind: 'sub' }
  }
  if (negation.lo && direct.hi && negation.lo.gt(direct.hi)) {
    return { gapLogit: logit(negation.lo).minus(logit(direct.hi)), kind: 'super' }
  }
  return null
}

/**
 * The result of a thorough run: the direct band combined with the band the negation
 * probes imply (see `combineBands`); a gap between the two is returned for the
 * details (never refused, never blocking).
 */
export function thoroughResult(answers: readonly ThoroughAnswer[]): ThoroughResult | null {
  const direct = computeBand(directAnswers(answers))
  const negation = negationBand(answers)
  if (!direct && !negation) return null
  const band =
    direct && negation ? combineBands(direct.band, negation) : (direct?.band ?? negation!)
  return {
    direct,
    negation,
    band,
    pointEstimate: bandMidpoint(band),
    subadditivity: direct && negation ? subadditivityOf(direct.band, negation) : null,
  }
}

/** Questions a staircase is still expected to need, from where it stands. */
function stairCost(next: StairStep | null): number {
  if (next === null) return 0
  if (next.kind === 'anchor') return 6 // the anchor, a couple of steps, about three refinements
  if (next.kind === 'step') return 4 // this step, then about three refinements
  return Math.max(1, Math.ceil(Math.log2(next.bracket!.div(EDGE_TOLERANCE_LOGIT).toNumber())))
}

function rawThoroughLeft(answers: readonly ThoroughAnswer[], seed: string): number {
  const repeatsLeft = REPEATS_THOROUGH - answers.filter(a => a.kind === 'repeat').length
  const negationsLeft =
    NEGATION_PROBES_THOROUGH - answers.filter(a => a.frame === 'negation').length
  return (
    stairCost(stairNext(answers, 'low', seed)) +
    stairCost(stairNext(answers, 'high', seed)) +
    Math.max(0, repeatsLeft) +
    Math.max(0, negationsLeft)
  )
}

/**
 * "Approx. N questions left" for a thorough run: the expected remaining staircase
 * steps and refinements plus the repeats and negation probes still to come. Held
 * non-increasing except after a staircase step or anchor, where the walk may turn out
 * longer than hoped.
 */
export function approxThoroughQuestionsLeft(
  answers: readonly ThoroughAnswer[],
  seed: string
): number {
  let shown = rawThoroughLeft([], seed)
  // The question asked at each prefix is needed once for the rule and once as the previous one
  let previous = nextThoroughQuestion([], seed)
  for (let i = 1; i <= answers.length; i++) {
    const prefix = answers.slice(0, i)
    const raw = rawThoroughLeft(prefix, seed)
    const walking = previous?.kind === 'anchor' || previous?.kind === 'step'
    shown = walking ? raw : Math.min(shown, raw)
    previous = nextThoroughQuestion(prefix, seed)
  }
  return previous === null ? 0 : Math.max(1, shown)
}
