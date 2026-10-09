import Decimal from 'decimal.js'
import { createSeededPRNG } from '../prng'
import { SPOT_CHECK_COMPLETENESS, SPOT_CHECK_PAIRS } from './constants'
import type { OrderAnswer } from './coherence'
import { clampToGrid, logit } from './logOdds'

/**
 * The comparison questions of a claim with several outcomes: "Which is more likely: A or
 * B?" (with "about equally likely"), which of the pairs to ask next, and the spot checks
 * that the outcomes are disjoint and exhaustive. Pure; every choice is a function of the
 * outcomes, what has been answered and the seed.
 */

export type Pick = 'first' | 'second' | 'equal'

/** An answered comparison: the pair as it was shown (first, then second) and the pick. */
export interface ComparisonAnswer {
  first: string
  second: string
  pick: Pick
}

/** The order the answers give: "A is more likely than B". "About equally likely" gives none. */
export function orderAnswers(answers: readonly ComparisonAnswer[]): OrderAnswer[] {
  const orders: OrderAnswer[] = []
  for (const a of answers) {
    if (a.pick === 'first') orders.push({ moreLikely: a.first, lessLikely: a.second })
    else if (a.pick === 'second') orders.push({ moreLikely: a.second, lessLikely: a.first })
  }
  return orders
}

const pairKey = (a: string, b: string) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`)

/** All unordered pairs of ids, in list order. */
export function allPairs(ids: readonly string[]): [string, string][] {
  const pairs: [string, string][] = []
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]])
  return pairs
}

/**
 * Pairs whose order follows from the answers so far (directly or through a chain). It counts
 * every order answer given, including any that `makeCoherent` later drops (a cycle, or a
 * conflict with the bounds): a pair is not asked again just because its answer was dropped.
 */
function impliedOrder(ids: readonly string[], orders: readonly OrderAnswer[]): Set<string> {
  const above = new Map<string, Set<string>>(ids.map(id => [id, new Set<string>()]))
  for (const o of orders) above.get(o.moreLikely)?.add(o.lessLikely)
  // transitive closure (a handful of ids)
  for (const k of ids) {
    for (const i of ids) {
      if (!above.get(i)!.has(k)) continue
      for (const j of above.get(k)!) above.get(i)!.add(j)
    }
  }
  const known = new Set<string>()
  for (const [i, lower] of above) for (const j of lower) if (i !== j) known.add(pairKey(i, j))
  return known
}

export interface NextComparisonInput {
  ids: readonly string[]
  /** The first sketch (or later estimate) per outcome, as probabilities. */
  sketch: ReadonlyMap<string, Decimal>
  /** Current bands per outcome; a pair whose bands do not overlap is already clear. */
  bands?: ReadonlyMap<string, { lo: Decimal; hi: Decimal }>
  answers: readonly ComparisonAnswer[]
  seed: string
}

/** How unclear the order of a pair is: the nearer their estimates in log-odds, the higher. */
function unclearness(a: string, b: string, input: NextComparisonInput): number {
  const estimate = (id: string) => {
    const p = input.sketch.get(id)
    if (!p) throw new Error(`No estimate for outcome "${id}": the sketch must cover every id`)
    return logit(clampToGrid(p))
  }
  return -estimate(a).minus(estimate(b)).abs().toNumber()
}

function clearFromBands(a: string, b: string, input: NextComparisonInput): boolean {
  const x = input.bands?.get(a)
  const y = input.bands?.get(b)
  return !!x && !!y && (x.lo.gt(y.hi) || y.lo.gt(x.hi))
}

/**
 * The next pair to compare, or null when every order is known or clear. Pairs not yet
 * compared, not implied by earlier answers and not already clear from the bands are
 * candidates; the pair whose order is least clear (nearest estimates) goes first, ties
 * broken by the seed. Which of the two is shown first is drawn from the seed too.
 */
export function nextComparison(
  input: NextComparisonInput
): { first: string; second: string } | null {
  const asked = new Set(input.answers.map(a => pairKey(a.first, a.second)))
  const implied = impliedOrder(input.ids, orderAnswers(input.answers))
  const candidates = allPairs(input.ids).filter(
    ([a, b]) =>
      !asked.has(pairKey(a, b)) && !implied.has(pairKey(a, b)) && !clearFromBands(a, b, input)
  )
  if (candidates.length === 0) return null

  const draw = createSeededPRNG(`${input.seed}:compare:${input.answers.length}`)
  const scored = candidates.map(pair => ({
    pair,
    score: unclearness(pair[0], pair[1], input),
    tie: draw(),
  }))
  scored.sort((x, y) => y.score - x.score || x.tie - y.tie)
  const [a, b] = scored[0].pair
  return draw() < 0.5 ? { first: a, second: b } : { first: b, second: a }
}

// ------------------------------------------------------------------ spot checks

export type SpotCheck = { type: 'pair'; first: string; second: string } | { type: 'completeness' }

/**
 * The spot checks that the outcomes are disjoint and exhaustive, without asking about every
 * combination: `SPOT_CHECK_PAIRS` random pairs ("Can A and B both happen?"; fewer if fewer
 * pairs exist), then one completeness check ("Could it turn out to be none of these?").
 * Seeded, so a run can be replayed.
 */
export function selectSpotChecks(ids: readonly string[], seed: string): SpotCheck[] {
  const draw = createSeededPRNG(`${seed}:spot`)
  const pairs = allPairs(ids)
  // seeded Fisher-Yates
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(draw() * (i + 1))
    ;[pairs[i], pairs[j]] = [pairs[j], pairs[i]]
  }
  const checks: SpotCheck[] = pairs
    .slice(0, SPOT_CHECK_PAIRS)
    .map(([a, b]) =>
      draw() < 0.5 ? { type: 'pair', first: a, second: b } : { type: 'pair', first: b, second: a }
    )
  for (let i = 0; i < SPOT_CHECK_COMPLETENESS; i++) checks.push({ type: 'completeness' })
  return checks
}

export type SpotCheckAnswer =
  | { type: 'pair'; first: string; second: string; bothCanHappen: boolean }
  | { type: 'completeness'; couldBeNone: boolean }

export type SpotCheckProblem =
  { type: 'overlap'; first: string; second: string } | { type: 'incomplete' }

/** What the answers say is wrong with the outcomes: pairs that can both happen, a missing "none of these". */
export function spotCheckProblems(answers: readonly SpotCheckAnswer[]): SpotCheckProblem[] {
  const problems: SpotCheckProblem[] = []
  for (const a of answers) {
    if (a.type === 'pair' && a.bothCanHappen)
      problems.push({ type: 'overlap', first: a.first, second: a.second })
    if (a.type === 'completeness' && a.couldBeNone) problems.push({ type: 'incomplete' })
  }
  return problems
}
