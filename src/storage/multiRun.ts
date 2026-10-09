import {
  isTier,
  tidy,
  labelProblem,
  hasEnoughOutcomes,
  type ElicitOutcome,
  type OutcomeList,
} from '../domain/elicitation/model'
import { MAX_OUTCOMES } from '../domain/elicitation/constants'
import { ELICIT_FORMAT_VERSION, MAX_TEXT_LENGTH } from './elicitation'

/**
 * The in-progress run of a claim with several outcomes, in sessionStorage (it survives a
 * reload; nothing about it sits in the address bar). Separate from the yes/no run: a tab
 * holds one or the other. The decoder returns null for anything malformed.
 */

/** `discover`: outcomes are being collected; `sketch`: the list is closed, first sketch shown. */
export type MultiPhase = 'discover' | 'sketch'

export interface MultiRunData {
  kind: 'categorical'
  claim: string
  criteria: string
  seed: string
  outcomes: OutcomeList
  /** The user said no to "Everything else"; it is not offered again. */
  declinedElse: boolean
  phase: MultiPhase
}

const KEY = 'howsure.multi'
/** Ids ever issued in one claim: far above the cap, far below anything hostile. */
const MAX_ISSUED = 1000
const SEED_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

function parseOutcomes(raw: unknown): OutcomeList | null {
  if (!raw || typeof raw !== 'object') return null
  const { items, issued } = raw as { items?: unknown; issued?: unknown }
  if (!Array.isArray(items) || items.length > MAX_OUTCOMES) return null
  if (!Number.isSafeInteger(issued) || (issued as number) < items.length) return null
  if ((issued as number) > MAX_ISSUED) return null
  const parsed: ElicitOutcome[] = []
  for (const item of items) {
    if (!item || typeof item !== 'object') return null
    const { id, label, tier } = item as Record<string, unknown>
    if (
      typeof id !== 'string' ||
      !/^o[1-9]\d{0,3}$/.test(id) ||
      Number(id.slice(1)) > (issued as number)
    ) {
      return null
    }
    if (typeof label !== 'string' || label.length > MAX_TEXT_LENGTH || label !== tidy(label)) {
      return null
    }
    if (!isTier(tier)) return null
    if (parsed.some(o => o.id === id) || labelProblem(parsed, label)) return null
    parsed.push({ id, label, tier })
  }
  return { items: parsed, issued: issued as number }
}

export function saveMultiRun(run: MultiRunData): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ev: ELICIT_FORMAT_VERSION, ...run }))
  } catch {
    // Private mode or quota: the run just does not survive a reload
  }
}

export function loadMultiRun(): MultiRunData | null {
  try {
    const text = sessionStorage.getItem(KEY)
    if (!text) return null
    const raw = JSON.parse(text) as Record<string, unknown> | null
    if (!raw || typeof raw !== 'object' || raw.ev !== ELICIT_FORMAT_VERSION) return null
    if (raw.kind !== 'categorical') return null
    if (typeof raw.claim !== 'string' || raw.claim.length > MAX_TEXT_LENGTH) return null
    if (typeof raw.criteria !== 'string' || raw.criteria.length > MAX_TEXT_LENGTH) return null
    if (typeof raw.seed !== 'string' || !SEED_PATTERN.test(raw.seed)) return null
    if (typeof raw.declinedElse !== 'boolean') return null
    if (raw.phase !== 'discover' && raw.phase !== 'sketch') return null
    const outcomes = parseOutcomes(raw.outcomes)
    if (!outcomes) return null
    if (raw.phase === 'sketch') {
      if (!hasEnoughOutcomes(outcomes.items) || outcomes.items.some(o => o.tier === null)) {
        return null
      }
    }
    return {
      kind: 'categorical',
      claim: raw.claim,
      criteria: raw.criteria,
      seed: raw.seed,
      outcomes,
      declinedElse: raw.declinedElse,
      phase: raw.phase,
    }
  } catch {
    return null
  }
}

export function clearMultiRun(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear
  }
}
