import Decimal from 'decimal.js'
import { EVERYTHING_ELSE_AFTER, MAX_OUTCOMES, MIN_OUTCOMES, TIER_SKETCH } from './constants'

/**
 * The model of a claim with several outcomes: the kinds of claim, the outcomes with the
 * tier each was dropped into, the first sketch those tiers give, and where each
 * outcome's number comes from. Pure; the questions and the result build on it.
 */

export const CLAIM_KINDS = ['yes-no', 'categorical', 'continuous'] as const
export type ClaimKind = (typeof CLAIM_KINDS)[number]

/** Categorical outcomes are dropped into a tier, from least to most likely. */
export const TIERS = ['very unlikely', 'unlikely', 'plausible', 'likely', 'near-certain'] as const
export type Tier = (typeof TIERS)[number]

export function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value)
}

export interface ElicitOutcome {
  /** Stable within a claim ("o1", "o2", ...). */
  id: string
  label: string
  /** Null until the user has put the outcome in a tier. */
  tier: Tier | null
}

/** The catch-all bucket the tool offers; it counts as an outcome like any other. */
export const EVERYTHING_ELSE_LABEL = 'Everything else'

// ----------------------------------------------------------------- the outcome list

export function isAtCap(outcomes: readonly ElicitOutcome[]): boolean {
  return outcomes.length >= MAX_OUTCOMES
}

/** Enough outcomes to ask anything about. */
export function hasEnoughOutcomes(outcomes: readonly ElicitOutcome[]): boolean {
  return outcomes.length >= MIN_OUTCOMES
}

/** A label in its stored form: trimmed, single-spaced, composed (NFC). */
export const tidy = (label: string) => label.trim().replace(/\s+/g, ' ').normalize('NFC')

const normalise = (label: string) => tidy(label).toLowerCase()

/** Whether a label is the "Everything else" bucket, whatever its case, spacing or Unicode form. */
export function isEverythingElse(label: string): boolean {
  return normalise(label) === normalise(EVERYTHING_ELSE_LABEL)
}

/**
 * A new outcome id from the list, and the list with that id counted as issued, so it is
 * never handed out again (also not after the outcome is removed). For outcomes that are
 * not added through `addOutcome`, such as a merged "Everything else".
 */
export function issueId(list: OutcomeList): { id: string; list: OutcomeList } {
  const issued = highestIssued(list) + 1
  return { id: `o${issued}`, list: { items: list.items, issued } }
}

export type LabelProblem = 'empty' | 'duplicate'

/** Why a label cannot be added, or null if it can. Case and spacing do not make a label new. */
export function labelProblem(
  outcomes: readonly ElicitOutcome[],
  label: string
): LabelProblem | null {
  const wanted = normalise(label)
  if (wanted === '') return 'empty'
  return outcomes.some(o => normalise(o.label) === wanted) ? 'duplicate' : null
}

/**
 * The outcomes of a claim, with a count of the ids ever handed out. Ids are never reused:
 * answers recorded for an old id must not attach to a new outcome after a removal.
 */
export interface OutcomeList {
  items: ElicitOutcome[]
  /** How many ids have been issued ("o1" ... "o<issued>"). */
  issued: number
}

export function emptyOutcomeList(): OutcomeList {
  return { items: [], issued: 0 }
}

/** The highest number issued, also counting ids already in the list (if it came from outside). */
function highestIssued(list: OutcomeList): number {
  return list.items.reduce((max, o) => {
    const n = /^o(\d+)$/.exec(o.id)
    return n ? Math.max(max, Number(n[1])) : max
  }, list.issued)
}

/**
 * The list with one more outcome, in the tier given, under a new id. Throws a RangeError
 * past the cap and an Error for an empty or repeated label: check `isAtCap` and
 * `labelProblem` first.
 */
export function addOutcome(list: OutcomeList, label: string, tier: Tier | null): OutcomeList {
  if (isAtCap(list.items)) throw new RangeError(`At most ${MAX_OUTCOMES} outcomes`)
  const problem = labelProblem(list.items, label)
  if (problem) throw new Error(`Outcome label is ${problem}`)
  const issued = highestIssued(list) + 1
  return { items: [...list.items, { id: `o${issued}`, label: tidy(label), tier }], issued }
}

/** The list without the outcome; its id stays used. */
export function removeOutcome(list: OutcomeList, id: string): OutcomeList {
  return { items: list.items.filter(o => o.id !== id), issued: highestIssued(list) }
}

/**
 * "Everything else" is offered once the last outcomes added are `EVERYTHING_ELSE_AFTER`
 * in a row at "very unlikely", if it is not in the list yet and there is room for it.
 * Declining is the user's to remember; the tool offers, it never adds.
 */
export function shouldOfferEverythingElse(outcomes: readonly ElicitOutcome[]): boolean {
  if (isAtCap(outcomes)) return false
  if (outcomes.some(o => isEverythingElse(o.label))) return false
  if (outcomes.length < EVERYTHING_ELSE_AFTER) return false
  return outcomes.slice(-EVERYTHING_ELSE_AFTER).every(o => o.tier === 'very unlikely')
}

// -------------------------------------------------------------------- first sketch

export function tierProbability(tier: Tier): Decimal {
  return new Decimal(TIER_SKETCH[tier])
}

/**
 * Scale values so they sum to approximately 1 (to the precision of the arithmetic; the
 * handoff rounds and closes the sum itself). Throws on a negative value, or if the sum
 * is not above zero.
 */
export function normalise1(values: readonly Decimal[]): Decimal[] {
  if (values.some(v => v.isNeg())) throw new RangeError('Cannot normalise a negative value')
  const total = values.reduce((sum, v) => sum.plus(v), new Decimal(0))
  if (!total.gt(0)) throw new RangeError('Nothing to normalise: the values sum to zero')
  return values.map(v => v.div(total))
}

/**
 * The first sketch: each outcome's tier gives a chance (very unlikely 2%, unlikely 10%,
 * plausible 30%, likely 60%, near-certain 90%), then the chances are scaled to sum to 1.
 * Keyed by outcome id. Throws if an outcome has no tier yet.
 */
export function firstSketch(outcomes: readonly ElicitOutcome[]): Map<string, Decimal> {
  if (new Set(outcomes.map(o => o.id)).size !== outcomes.length) {
    throw new Error('Outcome ids must be unique')
  }
  const raw = outcomes.map(o => {
    if (o.tier === null) throw new Error(`Outcome "${o.label}" has no tier yet`)
    return tierProbability(o.tier)
  })
  const scaled = normalise1(raw)
  return new Map(outcomes.map((o, i) => [o.id, scaled[i]]))
}

// -------------------------------------------------------------------- provenance

export type Provenance = { source: 'first-guess' } | { source: 'comparisons'; count: number }

/** Where a bucket's number comes from, given how many comparisons involved it. */
export function provenanceFor(comparisons: number): Provenance {
  if (!Number.isInteger(comparisons) || comparisons < 0) {
    throw new RangeError('A comparison count is a whole number, zero or more')
  }
  return comparisons === 0
    ? { source: 'first-guess' }
    : { source: 'comparisons', count: comparisons }
}

/** "from your first guess", "from 1 comparison", "from 4 comparisons". */
export function describeProvenance(p: Provenance): string {
  if (p.source === 'first-guess') return 'from your first guess'
  return `from ${p.count} ${p.count === 1 ? 'comparison' : 'comparisons'}`
}
