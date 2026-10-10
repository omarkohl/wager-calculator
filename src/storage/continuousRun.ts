import Decimal from 'decimal.js'
import {
  barBuckets,
  bucketCurve,
  bucketLabels,
  type BucketingResult,
} from '../domain/elicitation/bucketing'
import { MAX_NUMBER_TEXT, MAX_OUTCOMES } from '../domain/elicitation/constants'

export { MAX_NUMBER_TEXT }
import { parseHeight, parseNumber, plainNumber } from '../domain/elicitation/format'
import type { MultiAnswer } from '../domain/elicitation/multiRun'
import { continuousToMultiRun, decodeMultiAnswers, encodeMultiAnswers } from './multiAnswers'
import { ELICIT_FORMAT_VERSION, MAX_TEXT_LENGTH } from './elicitation'

/**
 * The in-progress run of a number claim ("noon temperature tomorrow"), in sessionStorage
 * (it survives a reload; nothing about it sits in the address bar). A tab holds one run, of
 * one kind. The decoder returns null for anything malformed.
 */

/** How the distribution is drawn: a bar per bucket, or a curve through points. */
export type ContinuousView = 'bars' | 'curve'

/** The curve is drawn through this many points, evenly spaced from the minimum to the maximum. */
export const CURVE_POINTS = 9

/**
 * `range`: minimum, maximum and thresholds are being set; `bars`: a bar per bucket (or a
 * curve); `ask`: the questions, on the buckets and numbers frozen from the drawing.
 */
export type ContinuousPhase = 'range' | 'bars' | 'ask'

export interface ContinuousRunData {
  kind: 'continuous'
  claim: string
  criteria: string
  seed: string
  /** Shown after each number ("°C"); may be empty. */
  unit: string
  /** The range ends as typed; they become numbers when the bars are drawn. */
  min: string
  max: string
  /** Thresholds that matter to the user, as numbers ("0", "8.5"), without repeats. */
  thresholds: string[]
  phase: ContinuousPhase
  /** The edges the bars belong to (ascending, plain numbers); empty before the first drawing. */
  edges: string[]
  /** The bar heights as typed, by bucket ("b0" is the lowest). */
  percents: Record<string, string>
  view: ContinuousView
  /** The relative likelihood at each curve point as typed (0 to 100, unitless); blank is 0. */
  curve: string[]
  /** The answers to the questions so far (phase `ask`). */
  answers: MultiAnswer[]
  /** The user pressed "stop here". */
  stopped: boolean
  /** The user's own numbers in the result (percent as typed), by bucket id. */
  adjusted: Record<string, string>
  /**
   * The range and the edges come from an invite and cannot be changed: the user only draws the
   * bars (the curve, which finds its own edges, is not offered).
   */
  locked: boolean
}

export const CONTINUOUS_STORAGE_KEY = 'howsure.continuous'
const KEY = CONTINUOUS_STORAGE_KEY
const SEED_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
export const MAX_UNIT_LENGTH = 20

/** The ids of the bars, lowest bucket first. */
export const barIds = (count: number) => Array.from({ length: count }, (_, i) => `b${i}`)

/** Whether the range is one the bars can be drawn for; the reason if it is not. */
export function rangeProblem(run: Pick<ContinuousRunData, 'min' | 'max' | 'thresholds'>) {
  const min = parseNumber(run.min)
  const max = parseNumber(run.max)
  if (min === null) return 'min' as const
  if (max === null) return 'max' as const
  if (!new Decimal(min).lt(max)) return 'order' as const
  if (run.thresholds.some(t => parseNumber(t) === null)) return 'threshold' as const
  return null
}

/** The labels of the bars: from the invite's edges when they are locked, else from the range. */
export function barLabelsOf(run: ContinuousRunData): string[] {
  if (!run.locked) return bucketsOf(run).labels
  const inside = run.thresholds.filter(
    t => new Decimal(t).gt(run.min) && new Decimal(t).lt(run.max)
  )
  return bucketLabels(
    run.edges.map(e => new Decimal(e)),
    run.min,
    run.max,
    inside,
    run.unit
  )
}

/** The buckets of a valid run: edges and labels. Throws when the range is not valid. */
export function bucketsOf(run: ContinuousRunData) {
  return barBuckets(run.min, run.max, run.thresholds, run.unit)
}

export function saveContinuousRun(run: ContinuousRunData): void {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        ev: ELICIT_FORMAT_VERSION,
        ...run,
        answers: encodeMultiAnswers(run.answers),
        savedAt: Date.now(),
      })
    )
  } catch {
    // Private mode or quota: the run just does not survive a reload
  }
}

const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max

export function loadContinuousRun(): ContinuousRunData | null {
  try {
    const text = sessionStorage.getItem(KEY)
    if (!text) return null
    const raw = JSON.parse(text) as Record<string, unknown> | null
    if (!raw || typeof raw !== 'object' || raw.ev !== ELICIT_FORMAT_VERSION) return null
    if (raw.kind !== 'continuous') return null
    if (!isText(raw.claim, MAX_TEXT_LENGTH) || !isText(raw.criteria, MAX_TEXT_LENGTH)) return null
    if (typeof raw.seed !== 'string' || !SEED_PATTERN.test(raw.seed)) return null
    if (!isText(raw.unit, MAX_UNIT_LENGTH)) return null
    if (!isText(raw.min, MAX_NUMBER_TEXT) || !isText(raw.max, MAX_NUMBER_TEXT)) return null
    if (raw.phase !== 'range' && raw.phase !== 'bars' && raw.phase !== 'ask') return null
    const { thresholds } = raw
    if (!Array.isArray(thresholds) || thresholds.length > MAX_OUTCOMES - 1) return null
    // stored thresholds are numbers in their plain form, without repeats
    if (
      !thresholds.every(t => typeof t === 'string' && parseNumber(t) === t) ||
      new Set(thresholds).size !== thresholds.length
    ) {
      return null
    }
    const { percents, edges, curve } = raw
    const locked = raw.locked ?? false
    if (typeof locked !== 'boolean') return null
    if (locked && (raw.phase === 'range' || raw.view === 'curve')) return null
    if (raw.view !== 'bars' && raw.view !== 'curve') return null
    if (!Array.isArray(curve) || (curve.length !== 0 && curve.length !== CURVE_POINTS)) return null
    if (!curve.every(v => isText(v, 12))) return null
    // the view only matters in the bars phase: it is remembered while the range is changed
    if (!Array.isArray(edges) || edges.length > MAX_OUTCOMES - 1) return null
    if (
      !edges.every(
        (e, i) => parseNumber(String(e)) === e && (i === 0 || new Decimal(e).gt(edges[i - 1]))
      )
    ) {
      return null
    }
    if (!percents || typeof percents !== 'object' || Array.isArray(percents)) return null
    const run: ContinuousRunData = {
      kind: 'continuous',
      claim: raw.claim,
      criteria: raw.criteria,
      seed: raw.seed,
      unit: raw.unit,
      min: raw.min,
      max: raw.max,
      thresholds: thresholds as string[],
      phase: raw.phase,
      edges: edges as string[],
      percents: {},
      view: raw.view,
      curve: curve as string[],
      answers: [],
      stopped: false,
      adjusted: {},
      locked,
    }
    // The bars belong to the edges they were drawn for: in the bars view those are the current
    // ones; back in the range form they are the last drawn ones; with no bars there are none
    if (run.phase === 'bars' && locked) {
      // the edges are the invite's: they only have to fit the range
      const lo = parseNumber(run.min)
      const hi = parseNumber(run.max)
      if (rangeProblem(run) !== null || lo === null || hi === null || edges.length === 0)
        return null
      if (!edges.every(e => new Decimal(e).gt(lo) && new Decimal(e).lt(hi))) return null
    } else if (run.phase === 'bars') {
      if (rangeProblem(run) !== null) return null
      const current = bucketsOf(run).edges.map(plainNumber)
      if (current.length !== edges.length || current.some((e, i) => e !== edges[i])) return null
    }
    const allowed = new Set(barIds(edges.length + 1))
    const entries = Object.entries(percents as Record<string, unknown>)
    if (run.phase === 'range' && entries.length > 0 && edges.length === 0) return null
    if (!entries.every(([id, v]) => allowed.has(id) && isText(v, 12))) return null
    run.percents = Object.fromEntries(entries) as Record<string, string>
    // Fields added with the questions: a run stored before them has none
    const stopped = raw.stopped ?? false
    const stored = raw.answers ?? []
    if (typeof stopped !== 'boolean' || !Array.isArray(stored)) return null
    const adjusted = raw.adjusted ?? {}
    if (!adjusted || typeof adjusted !== 'object' || Array.isArray(adjusted)) return null
    const adjustedEntries = Object.entries(adjusted as Record<string, unknown>)
    const bucketIds = new Set(barIds(edges.length + 1))
    if (
      !adjustedEntries.every(
        ([id, v]) => bucketIds.has(id) && typeof v === 'string' && v.length <= 12
      )
    ) {
      return null
    }
    if (run.phase !== 'ask') {
      return stopped || stored.length > 0 || adjustedEntries.length > 0 ? null : run
    }
    // The questions: a range that works, edges inside it, a bar for every bucket, and answers
    // that are those the algorithm asks (replayed)
    const lo = parseNumber(run.min)
    const hi = parseNumber(run.max)
    if (rangeProblem(run) !== null || lo === null || hi === null || edges.length === 0) return null
    if (!edges.every(e => new Decimal(e).gt(lo) && new Decimal(e).lt(hi))) return null
    if (entries.length !== edges.length + 1) return null
    const base = continuousToMultiRun(run)
    const answers = base && decodeMultiAnswers(stored, base)
    if (!answers) return null
    return {
      ...run,
      answers,
      stopped,
      adjusted: Object.fromEntries(adjustedEntries) as Record<string, string>,
    }
  } catch {
    // barEdges throws for a range it cannot cut (too many thresholds)
    return null
  }
}

/**
 * The curve's ranges and chances: `result` is null with the reason in `problem` while the
 * heights are unusable or flat. Shared by the drawing and by the start of the questions.
 */
export function curveBucketsOf(
  run: Pick<ContinuousRunData, 'min' | 'max' | 'thresholds' | 'unit' | 'curve'>
): {
  result: BucketingResult | null
  problem: string | null
  heights: (string | null)[]
  xs: Decimal[]
} {
  const min = new Decimal(run.min)
  const max = new Decimal(run.max)
  const xs = Array.from({ length: CURVE_POINTS }, (_, i) =>
    min.plus(
      max
        .minus(min)
        .times(i)
        .div(CURVE_POINTS - 1)
    )
  )
  const heights = Array.from({ length: CURVE_POINTS }, (_, i) => {
    const h = run.curve[i] ?? ''
    // blank is 0; null is text that is no height
    return h.trim() === '' ? '0' : parseHeight(h)
  })
  if (heights.some(h => h === null)) {
    return { result: null, problem: 'Some heights are not usable yet.', heights, xs }
  }
  if (heights.every(h => h === '0')) {
    return { result: null, problem: 'Raise at least one point to draw a curve.', heights, xs }
  }
  try {
    const result = bucketCurve(
      {
        min,
        max,
        thresholds: run.thresholds,
        curve: xs.map((x, i) => ({ x, y: heights[i]! })),
      },
      run.unit
    )
    return { result, problem: null, heights, xs }
  } catch {
    return {
      result: null,
      problem: 'This curve cannot be cut into ranges: change a point.',
      heights,
      xs,
    }
  }
}

/**
 * The buckets and chances the questions start from, frozen from the drawing: the bars as typed
 * (blank is 0), or the curve's chance per range (two decimals). Null while the drawing cannot be
 * used: the single place that decides whether the questions can start.
 */
export function freezeDrawing(
  run: ContinuousRunData
): Pick<ContinuousRunData, 'edges' | 'percents'> | null {
  let candidate: Pick<ContinuousRunData, 'edges' | 'percents'>
  if (run.view === 'curve') {
    const { result } = curveBucketsOf(run)
    if (!result) return null
    candidate = {
      edges: result.edges.map(plainNumber),
      percents: Object.fromEntries(
        result.buckets.map((b, i) => [
          `b${i}`,
          b.probability.times(100).toDecimalPlaces(2).toString(),
        ])
      ),
    }
  } else {
    const ids = barIds(run.edges.length + 1)
    candidate = {
      edges: run.edges,
      percents: Object.fromEntries(
        ids.map(id => [id, (run.percents[id] ?? '').trim() === '' ? '0' : run.percents[id]])
      ),
    }
  }
  return continuousToMultiRun({ ...run, ...candidate }) === null ? null : candidate
}

export function clearContinuousRun(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear
  }
}
