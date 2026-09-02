import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { explainResults } from './explanation'
import type { Participant, Outcome, Prediction } from './wager'

// The worked example from the FAQ: a party with three guests buckets
const outcomes: Outcome[] = [
  { id: 'few', label: 'Less than 5' },
  { id: 'some', label: 'Between 5 and 10' },
  { id: 'many', label: 'More than 10' },
]

const participants: Participant[] = [
  { id: 'artem', name: 'Artem', maxBet: new Decimal(50) },
  { id: 'baani', name: 'Baani', maxBet: new Decimal(40) },
  { id: 'chau', name: 'Chau', maxBet: new Decimal(30) },
]

function spread(participantId: string, probabilities: number[]): Prediction[] {
  return outcomes.map((outcome, i) => ({
    participantId,
    outcomeId: outcome.id,
    probability: new Decimal(probabilities[i]),
    touched: true,
  }))
}

const predictions = [
  ...spread('artem', [70, 20, 10]),
  ...spread('baani', [10, 80, 10]),
  ...spread('chau', [20, 60, 20]),
]

describe('explainResults', () => {
  const explanation = explainResults(participants, predictions, outcomes, 'some', 'party')

  it('reports the amount in play', () => {
    expect(explanation.amountInPlay.toNumber()).toBe(30)
  })

  it('lists every squared error that makes up a Brier score', () => {
    const artem = explanation.participants.find(p => p.participantId === 'artem')!

    expect(artem.terms).toEqual([
      {
        outcomeId: 'few',
        probability: new Decimal(0.7),
        occurred: false,
        squaredError: new Decimal(0.49),
      },
      {
        outcomeId: 'some',
        probability: new Decimal(0.2),
        occurred: true,
        squaredError: new Decimal(0.64),
      },
      {
        outcomeId: 'many',
        probability: new Decimal(0.1),
        occurred: false,
        squaredError: new Decimal(0.01),
      },
    ])
    expect(artem.brierScore.toNumber()).toBeCloseTo(1.14, 10)
  })

  it('reports the average Brier score of the others', () => {
    const artem = explanation.participants.find(p => p.participantId === 'artem')!
    // (0.06 + 0.24) / 2
    expect(artem.othersBrierScores.map(s => s.score.toNumber())).toEqual([0.06, 0.24])
    expect(artem.avgOthersBrier.toNumber()).toBeCloseTo(0.15, 10)
  })

  it('reports the payout before and after rounding', () => {
    const artem = explanation.participants.find(p => p.participantId === 'artem')!
    // 30 × (0.15 − 1.14) / 2 = −14.85
    expect(artem.rawPayout.toNumber()).toBeCloseTo(-14.85, 10)
    expect(artem.payout.toNumber()).toBe(-14.85)
  })

  it('flags a payout that was nudged to make the total zero', () => {
    // Raw payouts −0.32915, −0.2654 and 0.59455 round to −0.33, −0.27 and 0.59,
    // which sum to −0.01, so one of them has to be nudged
    const three: Participant[] = [
      { id: 'a', name: 'A', maxBet: new Decimal(1) },
      { id: 'b', name: 'B', maxBet: new Decimal(1) },
      { id: 'c', name: 'C', maxBet: new Decimal(1) },
    ]
    const preds = [
      ...spread('a', [0, 5, 95]),
      ...spread('b', [0, 10, 90]),
      ...spread('c', [33, 33, 34]),
    ]
    const result = explainResults(three, preds, outcomes, 'few', 'seed')
    const sum = result.participants.reduce((acc, p) => acc.plus(p.payout), new Decimal(0))

    expect(sum.isZero()).toBe(true)
    const adjusted = result.participants.filter(p => p.roundingAdjusted)
    expect(adjusted).toHaveLength(1)
    expect(adjusted[0].participantId).toBe('c')
    expect(adjusted[0].payout.toNumber()).toBe(0.6)
  })
})
