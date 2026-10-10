import Decimal from 'decimal.js'
import { computeBand, isHardContradiction, type Choice, type WedgeAnswer } from './bandRule'
import { lotteryNoun } from './lottery'
import { adjustmentGap, type AdjustmentGap } from './format'
import { type Band, formatPercent, fromPercent, logit } from './logOdds'
import { nextQuestion } from './quickSearch'
import {
  nextThoroughQuestion,
  thoroughResult,
  type ArmOrder,
  type Frame,
  type Subadditivity,
  type ThoroughAnswer,
  type ThoroughKind,
} from './thorough'

/**
 * A step-by-step account of a yes/no run, like `domain/explanation.ts` is for a
 * wager: each question, the answer, what it implied, how the band stood afterwards;
 * the pairs of answers that contradict each other, the subadditivity gap, and the
 * result recomputed with answers the user dropped as misclicks.
 */

export type RunMode = 'quick' | 'thorough'

/**
 * What a trace is built from. A thorough run's answers must be the full recorded
 * `ThoroughAnswer`s (their tags rebuild the staircases); a quick run's are plain.
 */
export type TraceInput = {
  seed: string
  /** Indexes into `answers` the user dropped as misclicks. Anything that is not a valid
   * index (negative, fractional, past the end) is ignored; the URL parsing validates. */
  dropped?: readonly number[]
  /** The user's own value in percent ("47.5"), kept beside what the answers imply. */
  adjusted?: string | null
  /** `other`: someone else's run (a shared result), so the wording does not say "you". */
  voice?: 'own' | 'other'
} & (
  | { mode: 'quick'; answers: readonly WedgeAnswer[] }
  | { mode: 'thorough'; answers: readonly ThoroughAnswer[] }
)

/** The answer shape the trace works on, for both modes. */
type Recorded = WedgeAnswer & Partial<Pick<ThoroughAnswer, 'frame' | 'kind' | 'armOrder'>>

export interface TraceStep {
  /** Position in the recorded answers: what "drop it" refers to. */
  index: number
  wedge: Decimal
  frame: Frame
  kind: ThoroughKind | 'question'
  choice: Choice
  /** Which arm was shown first (thorough runs); a repeat shows the opposite of its original. */
  armOrder?: ArmOrder
  /** The user dropped this answer as a misclick; it counts for nothing. */
  dropped: boolean
  /**
   * A "could not separate" answer outside the range the same frame's other kept
   * answers bracket (below H or above S): a mild inconsistency the band rule ignores.
   */
  outsideRange: boolean
  /** What was asked, in words. */
  question: string
  /** What the answer was, in words. */
  answer: string
  /** What it implied about the belief. */
  implication: string
  /** The band after this step, from the answers kept so far; null before any edge. */
  bandAfter: Band | null
}

/** A "claim" answer at a higher wedge than a "wedge" answer: they cannot both hold. */
export interface ContradictingPair {
  /** Index of the answer that preferred the claim. */
  claimIndex: number
  /** Index of the answer that preferred the wedge. */
  wedgeIndex: number
  frame: Frame
  sizeLogit: Decimal
  isHard: boolean
}

/** A repeat that did not agree with the original comparison. */
export interface RepeatDisagreement {
  originalIndex: number
  repeatIndex: number
}

export interface TraceResult {
  band: Band
  pointEstimate: Decimal | null
  /** Size of the contradiction among the direct answers in logits, if any. */
  contradictionLogit: Decimal | null
  isHardContradiction: boolean
  subadditivity: Subadditivity | null
}

/** What the answers implied and what the user then set, kept side by side. */
export interface TraceAdjustment {
  implied: Band
  /** Midpoint of the implied band; null if it is one-sided. */
  impliedPointEstimate: Decimal | null
  /** The user's own value, as a probability. */
  adjusted: Decimal
  gap: AdjustmentGap
}

export interface RunTrace {
  steps: TraceStep[]
  contradictions: ContradictingPair[]
  repeatDisagreements: RepeatDisagreement[]
  /** The result of the kept answers; null if they do not give an edge. */
  result: TraceResult | null
  /** The algorithm would ask more questions after the kept answers (e.g. after a drop). */
  wouldAskMore: boolean
  /** The user's adjusted belief against the implied band; null if none was set or there is no band. */
  adjustment: TraceAdjustment | null
}

const pct = (p: Decimal.Value) => formatPercent(p)
const complement = (p: Decimal.Value) => new Decimal(1).minus(p)

function describe(
  a: Recorded,
  frame: Frame,
  other: boolean
): Pick<TraceStep, 'question' | 'answer' | 'implication'> {
  const w = pct(a.wedge)
  const noun = lotteryNoun(a.wedge)
  const c = pct(complement(a.wedge))
  const subject = frame === 'claim' ? 'the claim' : 'the claim being false'
  const question = `${subject} or a ${noun} that wins ${w} of the time`
  const believe = other ? 'The claim was judged' : 'You think the claim is'
  switch (a.choice) {
    case 'claim':
      return {
        question,
        answer: `Preferred ${subject}`,
        implication:
          frame === 'claim'
            ? `${believe} more likely than ${w}.`
            : `${other ? 'The claim was judged false' : 'You think the claim is false'} with more than ${w}, so true with less than ${c}.`,
      }
    case 'wedge':
      return {
        question,
        answer: `Preferred the ${w} ${noun}`,
        implication:
          frame === 'claim'
            ? `${believe} less likely than ${w}.`
            : `${other ? 'The claim was judged false' : 'You think the claim is false'} with less than ${w}, so true with more than ${c}.`,
      }
    default: {
      const what = frame === 'claim' ? 'the claim' : 'the claim being false'
      return {
        question,
        answer: 'Could not separate them',
        implication: other
          ? `${what[0].toUpperCase()}${what.slice(1)} and a ${w} ${noun} could not be told apart.`
          : `You could not tell ${what} and a ${w} ${noun} apart.`,
      }
    }
  }
}

function frameOf(a: Recorded): Frame {
  return a.frame ?? 'claim'
}

function resultOf(mode: RunMode, kept: readonly Recorded[]): TraceResult | null {
  if (mode === 'quick') {
    const r = computeBand(kept)
    if (!r) return null
    return {
      band: r.band,
      pointEstimate: r.pointEstimate,
      contradictionLogit: r.contradictionLogit,
      isHardContradiction: r.isHardContradiction,
      subadditivity: null,
    }
  }
  const r = thoroughResult(kept as readonly ThoroughAnswer[])
  if (!r) return null
  return {
    band: r.band,
    pointEstimate: r.pointEstimate,
    contradictionLogit: r.direct?.contradictionLogit ?? null,
    isHardContradiction: r.direct?.isHardContradiction ?? false,
    subadditivity: r.subadditivity,
  }
}

/**
 * Pairs of kept answers (within one frame) where the claim won above a wedge win.
 * For the claim frame the largest pair is exactly the band rule's contradiction
 * (H vs S), so its `isHard` always equals `result.isHardContradiction`; negation
 * pairs are reported too but never feed the result's flag.
 */
function findContradictions(kept: readonly { a: Recorded; index: number }[]): ContradictingPair[] {
  const pairs: ContradictingPair[] = []
  for (const c of kept) {
    if (c.a.choice !== 'claim') continue
    for (const w of kept) {
      if (w.a.choice !== 'wedge' || frameOf(w.a) !== frameOf(c.a)) continue
      if (new Decimal(c.a.wedge).gt(w.a.wedge)) {
        const size = logit(c.a.wedge).minus(logit(w.a.wedge))
        pairs.push({
          claimIndex: c.index,
          wedgeIndex: w.index,
          frame: frameOf(c.a),
          sizeLogit: size,
          isHard: isHardContradiction(size),
        })
      }
    }
  }
  return pairs.sort((x, y) => y.sizeLogit.cmp(x.sizeLogit) || x.claimIndex - y.claimIndex)
}

function findRepeatDisagreements(
  kept: readonly { a: Recorded; index: number }[]
): RepeatDisagreement[] {
  const out: RepeatDisagreement[] = []
  for (const r of kept) {
    if (r.a.kind !== 'repeat') continue
    const original = kept.find(
      o =>
        o.index < r.index &&
        o.a.kind !== 'repeat' &&
        frameOf(o.a) === frameOf(r.a) &&
        new Decimal(o.a.wedge).eq(r.a.wedge)
    )
    if (original && original.a.choice !== r.a.choice) {
      out.push({ originalIndex: original.index, repeatIndex: r.index })
    }
  }
  return out
}

/**
 * The trace of a run. `answers` are the recorded answers in the order they were
 * asked; `dropped` lists the indexes the user dropped as misclicks. The result and
 * the contradictions are recomputed from the kept answers only.
 */
export function buildTrace(input: TraceInput): RunTrace {
  const { mode, seed } = input
  const answers: readonly Recorded[] = input.answers
  const droppedSet = new Set(
    (input.dropped ?? []).filter(i => Number.isInteger(i) && i >= 0 && i < answers.length)
  )

  const kept = answers.map((a, index) => ({ a, index })).filter(k => !droppedSet.has(k.index))
  const outside = outsideRange(kept)

  const steps: TraceStep[] = []
  const keptSoFar: Recorded[] = []
  let bandAfter: Band | null = null
  answers.forEach((a, index) => {
    const dropped = droppedSet.has(index)
    if (!dropped) {
      keptSoFar.push(a)
      bandAfter = resultOf(mode, keptSoFar)?.band ?? null
    }
    const frame = frameOf(a)
    steps.push({
      index,
      wedge: new Decimal(a.wedge),
      frame,
      kind: a.kind ?? 'question',
      choice: a.choice,
      armOrder: a.armOrder,
      dropped,
      outsideRange: outside.has(index),
      ...describe(a, frame, input.voice === 'other'),
      bandAfter,
    })
  })

  const keptAnswers = kept.map(k => k.a)
  const further =
    input.mode === 'quick'
      ? nextQuestion(keptAnswers, seed)
      : nextThoroughQuestion(keptAnswers as readonly ThoroughAnswer[], seed)

  const result = resultOf(mode, keptAnswers)
  return {
    steps,
    contradictions: findContradictions(kept),
    repeatDisagreements: mode === 'thorough' ? findRepeatDisagreements(kept) : [],
    result,
    wouldAskMore: further !== null,
    adjustment: adjustmentOf(result, input.adjusted ?? null),
  }
}

function adjustmentOf(result: TraceResult | null, adjusted: string | null): TraceAdjustment | null {
  if (!result || adjusted === null) return null
  let value: Decimal
  try {
    value = fromPercent(adjusted)
  } catch {
    return null
  }
  return {
    implied: result.band,
    impliedPointEstimate: result.pointEstimate,
    adjusted: value,
    gap: adjustmentGap(value, result.band),
  }
}

/** Indexes of kept "could not separate" answers outside their frame's [H, S]. */
function outsideRange(kept: readonly { a: Recorded; index: number }[]): Set<number> {
  const out = new Set<number>()
  for (const frame of ['claim', 'negation'] as const) {
    const group = kept.filter(k => frameOf(k.a) === frame)
    const band = computeBand(group.map(k => k.a))
    if (!band || !band.band.lo || !band.band.hi || band.highest === null || band.lowest === null)
      continue
    // With H > S the answers contradict each other; "outside" is then meaningless
    if (band.highest.gt(band.lowest)) continue
    for (const k of group) {
      if (k.a.choice !== 'cant-separate') continue
      const w = new Decimal(k.a.wedge)
      if (w.lt(band.band.lo) || w.gt(band.band.hi)) out.add(k.index)
    }
  }
  return out
}
