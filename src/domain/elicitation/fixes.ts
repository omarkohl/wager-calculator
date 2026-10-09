import Decimal from 'decimal.js'
import { parsePercent } from './format'
import {
  issueId,
  labelProblem,
  type LabelProblem,
  TIERS,
  type ElicitOutcome,
  type OutcomeList,
  type Tier,
} from './model'

/**
 * Fixing a list the spot checks found a problem with: rename an outcome, or merge two into
 * one. Pure. (Replacing an outcome with narrower ones is `removeOutcome` and adding the
 * new ones; adding a missing outcome is `addOutcome`.)
 */

const tidyLabel = (label: string) => label.trim().replace(/\s+/g, ' ').normalize('NFC')

/** Why a name was refused: `kind` is the `LabelProblem` ('empty', 'duplicate'). */
export class LabelError extends Error {
  constructor(readonly kind: LabelProblem) {
    super(`Outcome label is ${kind}`)
  }
}

/**
 * Outcomes under new names, all at once, in place: a name may be one another renamed outcome
 * gives up. Throws a `LabelError` for an empty name or a name two outcomes would share.
 */
export function renameOutcomes(
  list: OutcomeList,
  renames: readonly { id: string; label: string }[]
): OutcomeList {
  const items = list.items.map(o => {
    const rename = renames.find(r => r.id === o.id)
    return rename ? { ...o, label: tidyLabel(rename.label) } : o
  })
  const seen: ElicitOutcome[] = []
  for (const o of items) {
    const problem = labelProblem(seen, o.label)
    if (problem) throw new LabelError(problem)
    seen.push(o)
  }
  return { ...list, items }
}

/** One outcome under a new name, in place. */
export function renameOutcome(list: OutcomeList, id: string, label: string): OutcomeList {
  return renameOutcomes(list, [{ id, label }])
}

const tierRank = (tier: Tier) => TIERS.indexOf(tier)

/**
 * The two outcomes as one, at the first one's place, in the likelier of their tiers (none if
 * either has none), under a new id: answers recorded for the old ids must not attach to it.
 */
export function mergeOutcomes(
  list: OutcomeList,
  firstId: string,
  secondId: string,
  label: string
): { list: OutcomeList; id: string } {
  const first = list.items.find(o => o.id === firstId)
  const second = list.items.find(o => o.id === secondId)
  if (!first || !second || first.id === second.id) throw new Error('Merge two different outcomes')
  const rest = list.items.filter(o => o !== first && o !== second)
  const problem = labelProblem(rest, label)
  if (problem) throw new LabelError(problem)
  const issued = issueId(list)
  const tier =
    first.tier && second.tier
      ? tierRank(first.tier) >= tierRank(second.tier)
        ? first.tier
        : second.tier
      : null
  const merged: ElicitOutcome = { id: issued.id, label: tidyLabel(label), tier }
  const items = list.items.filter(o => o !== second)
  items[items.indexOf(first)] = merged
  return { list: { items, issued: issued.list.issued }, id: merged.id }
}

/** The sum of two typed percentages as a usable one: at least 0.01, at most 99.99. */
export function mergedPercent(a: string | undefined, b: string | undefined): string {
  const value = (text: string | undefined) => new Decimal(parsePercent(text ?? '') ?? 0)
  const sum = value(a).plus(value(b)).toDecimalPlaces(2)
  if (sum.lt('0.01')) return '0.01'
  return (sum.gt('99.99') ? new Decimal('99.99') : sum).toString()
}
