import Decimal from 'decimal.js'
import { adjustmentGap, describeBand, describeGap, parseAdjusted } from './format'
import { formatPercent } from './logOdds'
import { lotteryNoun } from './lottery'
import { multiResult } from './multiResult'
import { analyse, targetBand, type MultiAnswer, type MultiRun } from './multiRun'

/**
 * A step-by-step account of a run on a claim with several outcomes, like `trace.ts` is for a
 * yes/no run: each question, the answer, what it implied, and for a lottery how the range of
 * what was asked about stood afterwards. Pure; wording is "you" (the run is the user's own).
 */

export interface MultiTraceStep {
  /** Position in the answers. */
  index: number
  question: string
  answer: string
  implication: string
  /** For a lottery: how the range of the outcome (or group) stood after this answer. */
  rangeAfter: string | null
}

function describeStep(run: MultiRun, answer: MultiAnswer, index: number): MultiTraceStep {
  const label = (id: string) => `“${run.outcomes.find(o => o.id === id)?.label ?? id}”`
  if (answer.kind === 'compare') {
    const a = label(answer.first)
    const b = label(answer.second)
    const base = { index, question: `Which is more likely: ${a} or ${b}?`, rangeAfter: null }
    if (answer.pick === 'first') {
      return { ...base, answer: a, implication: `You think ${a} is more likely than ${b}.` }
    }
    if (answer.pick === 'second') {
      return { ...base, answer: b, implication: `You think ${b} is more likely than ${a}.` }
    }
    return {
      ...base,
      answer: 'About equally likely',
      implication: `You put neither above the other, so no order between ${a} and ${b} was recorded.`,
    }
  }
  const names = answer.targets.map(label)
  // A group reads as on the question screen: "one of: “Cloud”, “Snow”"
  const what = names.length === 1 ? names[0] : `the result being one of ${names.join(', ')}`
  const w = formatPercent(answer.wedge)
  const noun = lotteryNoun(answer.wedge)
  const question = `${what} or a ${noun} that wins ${w} of the time?`
  const upTo = run.answers.slice(0, index + 1)
  const band = targetBand({ ...run, answers: upTo }, answer.targets)
  // the raw range these answers give on this target alone: the headline is made coherent with the rest
  const rangeAfter = band
    ? `The range your answers on ${what} alone give: ${describeBand(band.band)}.`
    : null
  if (answer.choice === 'claim') {
    return {
      index,
      question,
      answer: `Preferred ${what}`,
      implication: `You think ${what} is more likely than ${w}.`,
      rangeAfter,
    }
  }
  if (answer.choice === 'wedge') {
    return {
      index,
      question,
      answer: `Preferred the ${w} ${noun}`,
      implication: `You think ${what} is less likely than ${w}.`,
      rangeAfter,
    }
  }
  return {
    index,
    question,
    answer: 'Could not separate them',
    implication: `You could not tell ${what} and a ${w} ${noun} apart.`,
    rangeAfter,
  }
}

/** An outcome the user gave a number of their own, beside what the answers implied. */
export interface MultiAdjustment {
  label: string
  /** The range the answers imply ("20–40%"). */
  implied: string
  /** The user's value in percent. */
  adjusted: string
  /** Where it sits against the range, neutrally. */
  gap: string
}

export interface MultiTrace {
  start: { label: string; chance: string }[]
  steps: MultiTraceStep[]
  adjustments: MultiAdjustment[]
}

/**
 * The trace of a run. `adjusted` are the user's own numbers (percent as typed) by row id of the
 * result shown (`merged`: the outcomes merged into "Everything else" in that view); the trace
 * keeps what the answers implied beside them.
 */
export function multiTrace(
  run: MultiRun,
  adjusted: Readonly<Record<string, string>> = {},
  merged: readonly string[] = [],
  /** Someone else's run: the gap is not worded as "you set". */
  other = false
): MultiTrace {
  const { sketch } = analyse(run)
  const adjustments = multiResult(run, merged).rows.flatMap(r => {
    const text = adjusted[r.id]
    const value = text === undefined ? null : parseAdjusted(text)
    if (value === null) return []
    const band = { lo: r.lo.lte(0) ? null : r.lo, hi: r.hi.gte(1) ? null : r.hi }
    return [
      {
        label: r.label,
        implied: describeBand(band),
        adjusted: value,
        gap: describeGap(adjustmentGap(new Decimal(value).div(100), band), other),
      },
    ]
  })
  return {
    start: run.outcomes.map(o => ({ label: o.label, chance: formatPercent(sketch.get(o.id)!) })),
    steps: run.answers.map((a, i) => describeStep(run, a, i)),
    adjustments,
  }
}
