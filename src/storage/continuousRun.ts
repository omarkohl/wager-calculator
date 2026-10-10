import Decimal from 'decimal.js'
import { barBuckets } from '../domain/elicitation/bucketing'
import { MAX_OUTCOMES } from '../domain/elicitation/constants'
import { parseNumber } from '../domain/elicitation/format'
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

/** `range`: minimum, maximum and thresholds are being set; `bars`: a bar per bucket. */
export type ContinuousPhase = 'range' | 'bars'

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
}

const KEY = 'howsure.continuous'
const SEED_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
export const MAX_UNIT_LENGTH = 20
/** Longest number as typed. */
export const MAX_NUMBER_TEXT = 30

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

/** The buckets of a valid run: edges and labels. Throws when the range is not valid. */
export function bucketsOf(run: ContinuousRunData) {
  return barBuckets(run.min, run.max, run.thresholds, run.unit)
}

export function saveContinuousRun(run: ContinuousRunData): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ev: ELICIT_FORMAT_VERSION, ...run }))
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
    if (raw.phase !== 'range' && raw.phase !== 'bars') return null
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
    }
    // The bars belong to the edges they were drawn for: in the bars view those are the current
    // ones; back in the range form they are the last drawn ones; with no bars there are none
    if (run.phase === 'bars') {
      if (rangeProblem(run) !== null) return null
      const current = bucketsOf(run).edges.map(String)
      if (current.length !== edges.length || current.some((e, i) => e !== edges[i])) return null
    }
    const allowed = new Set(barIds(edges.length + 1))
    const entries = Object.entries(percents as Record<string, unknown>)
    if (run.phase === 'range' && entries.length > 0 && edges.length === 0) return null
    if (!entries.every(([id, v]) => allowed.has(id) && isText(v, 12))) return null
    run.percents = Object.fromEntries(entries) as Record<string, string>
    return run
  } catch {
    // barEdges throws for a range it cannot cut (too many thresholds)
    return null
  }
}

export function clearContinuousRun(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear
  }
}
