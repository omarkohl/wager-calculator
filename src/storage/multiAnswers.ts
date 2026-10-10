import Decimal from 'decimal.js'
import type { Choice } from '../domain/elicitation/bandRule'
import { parsePercent } from '../domain/elicitation/format'
import {
  answerMulti,
  nextMultiQuestion,
  type MultiAnswer,
  type MultiRun,
} from '../domain/elicitation/multiRun'
import { normalise1 } from '../domain/elicitation/model'
import type { Pick as ComparePick } from '../domain/elicitation/comparisons'
import type { MultiRunData } from './multiRun'

/**
 * The answers of a run with several outcomes, as stored, and the bridge from the stored run
 * to the domain's `MultiRun`. Answers are checked by replaying the algorithm: each must be
 * the answer to the question it would have asked at that point.
 */

type Base = Pick<MultiRunData, 'outcomes' | 'seed' | 'view' | 'percents'>

/**
 * The domain run for the stored one, with no answers yet. In the numbers view the typed
 * percentages (scaled to add up to 1) are the sketch; null when one of them is not usable.
 */
export function toMultiRun(run: Base): MultiRun | null {
  const outcomes = run.outcomes.items
  if (run.view === 'tiers') return { outcomes, seed: run.seed, answers: [] }
  const typed = outcomes.map(o => parsePercent(run.percents[o.id] ?? ''))
  if (typed.length === 0 || typed.some(t => t === null)) return null
  const scaled = normalise1(typed.map(t => new Decimal(t!)))
  return {
    outcomes,
    seed: run.seed,
    answers: [],
    sketch: new Map(outcomes.map((o, i) => [o.id, scaled[i]])),
  }
}

// ----------------------------------------------------------------------------- codec

const CHOICES: readonly Choice[] = ['claim', 'wedge', 'cant-separate']
const PICKS: readonly ComparePick[] = ['first', 'second', 'equal']

/** Wedges sit on the 1-in-1000 grid, so a wedge is stored as an integer per mille. */
function perMille(wedge: Decimal.Value): number {
  const x = new Decimal(wedge).times(1000)
  if (!x.isInteger() || x.lt(1) || x.gt(999)) {
    throw new RangeError(`Wedge ${String(wedge)} is not on the wedge grid`)
  }
  return x.toNumber()
}

export function encodeMultiAnswers(answers: readonly MultiAnswer[]): unknown[] {
  return answers.map(a =>
    a.kind === 'compare'
      ? { k: 'c', a: a.first, b: a.second, p: a.pick }
      : { k: 'l', t: a.targets, w: perMille(a.wedge), c: a.choice }
  )
}

function decodeOne(raw: unknown): MultiAnswer | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (r.k === 'c') {
    if (typeof r.a !== 'string' || typeof r.b !== 'string') return null
    if (!PICKS.includes(r.p as ComparePick)) return null
    return { kind: 'compare', first: r.a, second: r.b, pick: r.p as ComparePick }
  }
  if (r.k === 'l') {
    if (!Array.isArray(r.t) || r.t.length === 0 || !r.t.every(t => typeof t === 'string'))
      return null
    if (!Number.isInteger(r.w) || (r.w as number) < 1 || (r.w as number) > 999) return null
    if (!CHOICES.includes(r.c as Choice)) return null
    return {
      kind: 'lottery',
      targets: r.t as string[],
      wedge: new Decimal(r.w as number).div(1000),
      choice: r.c as Choice,
    }
  }
  return null
}

/**
 * The answers, replayed on `base` (a run with no answers): null if one is malformed or is not
 * the answer to the question the algorithm would have asked at that point.
 */
export function decodeMultiAnswers(raw: unknown, base: MultiRun): MultiAnswer[] | null {
  if (!Array.isArray(raw)) return null
  let run = base
  const answers: MultiAnswer[] = []
  for (const item of raw) {
    const answer = decodeOne(item)
    const asked = nextMultiQuestion(run)
    if (!answer || !asked || asked.kind !== answer.kind) return null
    if (asked.kind === 'compare' && answer.kind === 'compare') {
      if (asked.first !== answer.first || asked.second !== answer.second) return null
    } else if (asked.kind === 'lottery' && answer.kind === 'lottery') {
      if (asked.targets.join() !== answer.targets.join() || !asked.wedge.eq(answer.wedge)) {
        return null
      }
    }
    run = answerMulti(run, answer)
    answers.push(answer)
  }
  return answers
}
