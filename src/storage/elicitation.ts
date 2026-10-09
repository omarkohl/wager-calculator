import Decimal from 'decimal.js'
import type { WedgeAnswer } from '../domain/elicitation/bandRule'
import { fromPercent } from '../domain/elicitation/logOdds'
import { MAX_QUICK_QUESTIONS, nextQuestion } from '../domain/elicitation/quickSearch'
import {
  MAX_THOROUGH_QUESTIONS,
  nextThoroughQuestion,
  type ThoroughAnswer,
} from '../domain/elicitation/thorough'
import { CURRENCY_OPTIONS } from '../domain/stakes'

/**
 * Persistence and share formats of the belief elicitation (tool 2).
 *
 * - The stake preference lives in localStorage under its own key.
 * - The in-progress run lives in sessionStorage (it survives a reload, and nothing
 *   about it sits in the address bar).
 * - URLs exist only for an explicit share, in two kinds, both carrying a format
 *   version: an invite (claim and criteria) and a result (claim, criteria, mode,
 *   seed, answers, dropped answers, adjusted value). The band and the trace are not
 *   stored: decoding re-runs the algorithm over the answers, and a result whose
 *   answers the algorithm would not have asked is rejected. The format version pins
 *   the algorithm; until a version is released it may change freely.
 *
 * Every decoder returns null for malformed, unknown-version or inconsistent input.
 */

export const ELICIT_FORMAT_VERSION = 1

/** A run's own data, shared by the stored run and the result URL. */
interface RunBase {
  claim: string
  criteria: string
  seed: string
  /** Indexes into `answers` dropped as misclicks. */
  dropped: number[]
  /** The user's own value in percent ("45.5"), kept beside what the answers imply. */
  adjusted: string | null
  /** The user pressed "stop here". Kept in the tab's stored run only, never in a URL. */
  stopped?: boolean
}
export type RunData = RunBase &
  ({ mode: 'quick'; answers: WedgeAnswer[] } | { mode: 'thorough'; answers: ThoroughAnswer[] })

const MAX_ANSWERS = Math.max(MAX_QUICK_QUESTIONS, MAX_THOROUGH_QUESTIONS)
/** Longest claim or criteria text a stored run or a shared URL may carry. */
export const MAX_TEXT_LENGTH = 2000
const SEED_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

/** A fresh seed for a run: never derived from the claim. */
export function generateSeed(): string {
  const bytes = new Uint8Array(8)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes)
  else bytes.forEach((_, i) => (bytes[i] = Math.floor(Math.random() * 256)))
  return Array.from(bytes, b => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

// ---------------------------------------------------------------- answers codec

const CHOICE_CODES = { claim: 'c', wedge: 'w', 'cant-separate': 'u' } as const
const CHOICES: Record<string, WedgeAnswer['choice']> = {
  c: 'claim',
  w: 'wedge',
  u: 'cant-separate',
}

/** Wedges sit on the 1-in-1000 grid, so a wedge is stored as an integer per mille. */
function perMille(wedge: Decimal.Value): number | null {
  const x = new Decimal(wedge).times(1000)
  return x.isInteger() && x.gte(1) && x.lte(999) ? x.toNumber() : null
}

/**
 * `500:c` per answer: the wedge (per mille) and the choice. Nothing else is stored:
 * the algorithm knows which question it asked at each point, so a thorough run's
 * tags (frame, staircase, kind, arm order) are rebuilt on decoding.
 */
export function encodeAnswers(run: Pick<RunData, 'answers'>): string {
  return run.answers
    .map(a => {
      const w = perMille(a.wedge)
      if (w === null) throw new RangeError(`Wedge ${String(a.wedge)} is not on the wedge grid`)
      return `${w}:${CHOICE_CODES[a.choice]}`
    })
    .join(',')
}

function decodePlainAnswers(text: string): WedgeAnswer[] | null {
  if (text === '') return []
  const tokens = text.split(',')
  if (tokens.length > MAX_ANSWERS) return null
  const out: WedgeAnswer[] = []
  for (const token of tokens) {
    const m = /^([1-9]\d{0,2}):([cwu])$/.exec(token)
    if (!m) return null
    const w = Number(m[1])
    if (w > 999) return null
    out.push({ wedge: new Decimal(w).div(1000), choice: CHOICES[m[2]] })
  }
  return out
}

/**
 * Re-run the algorithm: every answer must answer the question it would have asked at
 * that point. For a thorough run the answers get that question's tags. Null if any
 * answer does not match.
 */
function replay(
  mode: 'quick' | 'thorough',
  seed: string,
  plain: readonly WedgeAnswer[]
): WedgeAnswer[] | ThoroughAnswer[] | null {
  if (mode === 'quick') {
    const ok = plain.every((a, i) => nextQuestion(plain.slice(0, i), seed)?.wedge.eq(a.wedge))
    return ok ? [...plain] : null
  }
  const out: ThoroughAnswer[] = []
  for (const a of plain) {
    const q = nextThoroughQuestion(out, seed)
    if (!q || !q.wedge.eq(a.wedge)) return null
    out.push({
      wedge: a.wedge,
      choice: a.choice,
      frame: q.frame,
      stair: q.stair,
      kind: q.kind,
      armOrder: q.armOrder,
    })
  }
  return out
}

// -------------------------------------------------------------------- run fields

interface RawRun {
  claim: unknown
  criteria: unknown
  mode: unknown
  seed: unknown
  answers: unknown
  dropped: unknown
  adjusted: unknown
  stopped?: unknown
}

function parseDropped(text: unknown, count: number): number[] | null {
  if (text === '' || text === undefined) return []
  if (typeof text !== 'string' || !/^(0|[1-9]\d{0,2})(,(0|[1-9]\d{0,2}))*$/.test(text)) return null
  const indexes = text.split(',').map(Number)
  // strictly ascending: one canonical spelling of the set, no duplicates
  const valid = indexes.every((i, k) => i < count && (k === 0 || i > indexes[k - 1]))
  return valid ? indexes : null
}

function parseAdjusted(text: unknown): string | null | undefined {
  if (text === undefined || text === '') return null
  if (typeof text !== 'string' || !/^(0|[1-9]\d?)(\.\d?[1-9])?$/.test(text)) return undefined
  try {
    fromPercent(text)
    return text
  } catch {
    return undefined
  }
}

/** Validate the raw fields of a stored run or a result URL; null if anything is off. */
function parseRun(raw: RawRun): RunData | null {
  const { claim, criteria, mode, seed } = raw
  if (typeof claim !== 'string' || claim.trim() === '' || claim.length > MAX_TEXT_LENGTH) {
    return null
  }
  if (typeof criteria !== 'string' || criteria.length > MAX_TEXT_LENGTH) return null
  if (mode !== 'quick' && mode !== 'thorough') return null
  if (typeof seed !== 'string' || !SEED_PATTERN.test(seed)) return null
  if (typeof raw.answers !== 'string') return null
  const plain = decodePlainAnswers(raw.answers)
  if (!plain) return null
  const answers = replay(mode, seed, plain)
  if (!answers) return null
  const dropped = parseDropped(raw.dropped, answers.length)
  if (!dropped) return null
  const adjusted = parseAdjusted(raw.adjusted)
  if (adjusted === undefined) return null

  const run = { claim, criteria, seed, dropped, adjusted, mode, answers } as RunData
  return raw.stopped === '1' ? { ...run, stopped: true } : run
}

// ------------------------------------------------------------------- the URLs

export type SharedElicitation =
  { type: 'invite'; claim: string; criteria: string } | { type: 'result'; run: RunData }

/** An invite: claim and criteria, no answers, no result. */
export function encodeInviteHash(invite: { claim: string; criteria: string }): string {
  const params = new URLSearchParams({ ev: String(ELICIT_FORMAT_VERSION), t: 'i', c: invite.claim })
  if (invite.criteria) params.set('cr', invite.criteria)
  return `#${params.toString()}`
}

/** A result: everything needed to recompute the band and the trace. */
export function encodeResultHash(run: RunData): string {
  const params = new URLSearchParams({ ev: String(ELICIT_FORMAT_VERSION), t: 'r', c: run.claim })
  if (run.criteria) params.set('cr', run.criteria)
  params.set('m', run.mode === 'quick' ? 'q' : 't')
  params.set('s', run.seed)
  params.set('a', encodeAnswers(run))
  if (run.dropped.length) params.set('d', run.dropped.join(','))
  if (run.adjusted !== null) params.set('adj', run.adjusted)
  return `#${params.toString()}`
}

export function decodeElicitationHash(hash: string): SharedElicitation | null {
  if (!hash || hash.length <= 1) return null
  const params = new URLSearchParams(hash.slice(1))
  if (params.get('ev') !== String(ELICIT_FORMAT_VERSION)) return null
  const claim = params.get('c') ?? ''
  const criteria = params.get('cr') ?? ''
  if (params.get('t') === 'i') {
    const ok =
      claim.trim() !== '' && claim.length <= MAX_TEXT_LENGTH && criteria.length <= MAX_TEXT_LENGTH
    return ok ? { type: 'invite', claim, criteria } : null
  }
  if (params.get('t') !== 'r') return null
  const mode = { q: 'quick', t: 'thorough' }[params.get('m') ?? '']
  const run = parseRun({
    claim,
    criteria,
    mode,
    seed: params.get('s'),
    answers: params.get('a') ?? '',
    dropped: params.get('d') ?? '',
    adjusted: params.get('adj') ?? '',
  })
  // One URL per result: anything that is not the canonical spelling is rejected
  return run && encodeResultHash(run) === hash ? { type: 'result', run } : null
}

// ------------------------------------------------------------ the run in the tab

const RUN_STORAGE_KEY = 'howsure.run'

export function saveRun(run: RunData): void {
  // Encoded outside the try: a bad wedge is a programming error and must surface
  const stored = JSON.stringify({
    ev: ELICIT_FORMAT_VERSION,
    claim: run.claim,
    criteria: run.criteria,
    mode: run.mode,
    seed: run.seed,
    answers: encodeAnswers(run),
    dropped: run.dropped.join(','),
    adjusted: run.adjusted ?? '',
    stopped: run.stopped ? '1' : '',
  })
  try {
    sessionStorage.setItem(RUN_STORAGE_KEY, stored)
  } catch {
    // Private mode or quota: the run just does not survive a reload
  }
}

export function loadRun(): RunData | null {
  try {
    const text = sessionStorage.getItem(RUN_STORAGE_KEY)
    if (!text) return null
    const raw = JSON.parse(text) as Record<string, unknown> | null
    if (!raw || typeof raw !== 'object' || raw.ev !== ELICIT_FORMAT_VERSION) return null
    return parseRun(raw as unknown as RawRun)
  } catch {
    return null
  }
}

export function clearRun(): void {
  try {
    sessionStorage.removeItem(RUN_STORAGE_KEY)
  } catch {
    // Nothing to clear
  }
}

// ------------------------------------------------------------- the stake gate

const STAKE_STORAGE_KEY = 'howsure.stake'

export interface ElicitStake {
  amount: string
  currency: string
}

export function isValidElicitStake(stake: ElicitStake): boolean {
  return (
    /^\d{1,9}(\.\d{1,2})?$/.test(stake.amount) &&
    new Decimal(stake.amount).gt(0) &&
    CURRENCY_OPTIONS.some(c => c.id === stake.currency)
  )
}

export function getSavedElicitStake(): ElicitStake | null {
  try {
    const text = localStorage.getItem(STAKE_STORAGE_KEY)
    if (!text) return null
    const raw = JSON.parse(text) as Partial<ElicitStake> | null
    if (!raw || typeof raw.amount !== 'string' || typeof raw.currency !== 'string') return null
    const stake = { amount: raw.amount, currency: raw.currency }
    return isValidElicitStake(stake) ? stake : null
  } catch {
    return null
  }
}

export function saveElicitStake(stake: ElicitStake): void {
  if (!isValidElicitStake(stake)) return
  try {
    localStorage.setItem(STAKE_STORAGE_KEY, JSON.stringify(stake))
  } catch {
    // Silently fail in private mode
  }
}
