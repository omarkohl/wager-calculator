import Decimal from 'decimal.js'
import { formatPercent, snapToGrid } from './logOdds'

/**
 * How the reference lottery shows a winning chance. Between 10% and 90% it is an
 * area (a shaded wedge); in the tails people reason far better about counts than
 * areas, so it becomes "3 winning balls out of 100", down to 1 in 1000.
 * [NEEDS PROTOTYPE]: the switch and the exact forms.
 */
export type LotteryForm =
  | { kind: 'wedge'; probability: Decimal }
  | { kind: 'count'; winning: number; losing: number; total: 100 | 1000 }

/** Below this chance (or above its complement) the lottery is shown as a count. */
export const COUNT_BELOW = 0.1

export function lotteryForm(probability: Decimal.Value): LotteryForm {
  const raw = new Decimal(probability)
  if (!raw.gt(0) || !raw.lt(1)) {
    throw new RangeError('A winning chance must be strictly between 0 and 1')
  }
  // The lottery shows what the grid can say: counts and label come from the same snapped value
  const p = snapToGrid(raw)
  const tail = Decimal.min(p, new Decimal(1).minus(p))
  if (tail.gte(COUNT_BELOW)) return { kind: 'wedge', probability: p }
  // Wedges sit on a 0.1% grid: whole percents read as "out of 100", the rest as "out of 1000"
  const total = p.times(100).isInteger() ? 100 : 1000
  const winning = p.times(total).toNumber()
  return { kind: 'count', winning, losing: total - winning, total }
}

/** The shown chance: the probability snapped to the wedge grid. */
export function shownChance(probability: Decimal.Value): string {
  return formatPercent(snapToGrid(probability))
}

const balls = (n: number, kind: 'winning' | 'losing') =>
  `${n} ${kind} ${n === 1 ? 'ball' : 'balls'}`

/**
 * The counts as words. Past the middle the losing balls are named too, so a count of
 * 97 winners is not read as a count of 3. [NEEDS PROTOTYPE]
 */
export function describeCount(form: Extract<LotteryForm, { kind: 'count' }>): string {
  const counts =
    form.winning > form.total / 2
      ? `${balls(form.winning, 'winning')} and ${balls(form.losing, 'losing')}`
      : balls(form.winning, 'winning')
  return `${counts} out of ${form.total}`
}

/** What the lottery is called: a spinner (an area), or a ball draw (a count, in the tails). */
export function lotteryNoun(probability: Decimal.Value): 'spinner' | 'ball draw' {
  return lotteryForm(probability).kind === 'wedge' ? 'spinner' : 'ball draw'
}

/**
 * What has to happen for the lottery to win, as the question puts it: the wording of the
 * visual that is shown (a spinner and its shaded part, or one ball drawn at random).
 */
export function describeLotteryWin(probability: Decimal.Value): string {
  return lotteryForm(probability).kind === 'wedge'
    ? 'the spinner lands in the shaded part'
    : 'a ball drawn at random is a winning ball'
}

/** The lottery in words, for its accessible name: always carries the probability. */
export function describeLottery(probability: Decimal.Value): string {
  const form = lotteryForm(probability)
  const chance = shownChance(probability)
  if (form.kind === 'wedge') return `A spinner with a shaded wedge that wins ${chance} of the time`
  return `One ball is drawn at random from ${describeCount(form)}: it wins ${chance} of the time`
}
