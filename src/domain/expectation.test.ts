import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { payoutsForEveryOutcome, expectedPayouts, expectedPayoutIfReporting } from './expectation'
import type { Participant, Outcome, Prediction } from './wager'

const outcomes: Outcome[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
]

const participants: Participant[] = [
  { id: 'a', name: 'Alice', maxBet: new Decimal(10) },
  { id: 'b', name: 'Bob', maxBet: new Decimal(10) },
]

function binary(participantId: string, yes: number): Prediction[] {
  return [
    { participantId, outcomeId: 'yes', probability: new Decimal(yes), touched: true },
    { participantId, outcomeId: 'no', probability: new Decimal(100 - yes), touched: true },
  ]
}

const predictions = [...binary('a', 70), ...binary('b', 40)]

function amount(payouts: { participantId: string; amount: Decimal }[], id: string): number {
  return payouts.find(p => p.participantId === id)!.amount.toNumber()
}

describe('payoutsForEveryOutcome', () => {
  it('lists the net payouts of every possible resolution', () => {
    const table = payoutsForEveryOutcome(participants, predictions, outcomes, 'claim')

    expect(table.map(t => t.outcomeId)).toEqual(['yes', 'no'])
    // Yes: Alice BS = 0.09 + 0.09 = 0.18, Bob BS = 0.36 + 0.36 = 0.72
    // Alice gets 10 × (0.72 − 0.18) / 2 = 2.70
    expect(amount(table[0].payouts, 'a')).toBe(2.7)
    expect(amount(table[0].payouts, 'b')).toBe(-2.7)
    // No: Alice BS = 0.49 + 0.49 = 0.98, Bob BS = 0.16 + 0.16 = 0.32
    expect(amount(table[1].payouts, 'a')).toBe(-3.3)
    expect(amount(table[1].payouts, 'b')).toBe(3.3)
  })
})

describe('expectedPayouts', () => {
  it('weights each resolution by the participant’s own probability', () => {
    const table = payoutsForEveryOutcome(participants, predictions, outcomes, 'claim')
    const expected = expectedPayouts(participants, predictions, table)

    // Alice: 0.7 × 2.70 + 0.3 × (−3.30) = 0.90
    expect(amount(expected, 'a')).toBeCloseTo(0.9, 10)
    // Bob: 0.4 × (−2.70) + 0.6 × 3.30 = 0.90
    expect(amount(expected, 'b')).toBeCloseTo(0.9, 10)
  })

  it('is zero for everyone when all predictions are identical', () => {
    const same = [...binary('a', 60), ...binary('b', 60)]
    const table = payoutsForEveryOutcome(participants, same, outcomes, 'claim')
    const expected = expectedPayouts(participants, same, table)

    expect(amount(expected, 'a')).toBe(0)
    expect(amount(expected, 'b')).toBe(0)
  })

  it('can differ between participants when there are more than two', () => {
    const three = [...participants, { id: 'c', name: 'Carol', maxBet: new Decimal(10) }]
    const preds = [...binary('a', 50), ...binary('b', 50), ...binary('c', 90)]
    const table = payoutsForEveryOutcome(three, preds, outcomes, 'claim')
    const expected = expectedPayouts(three, preds, table)

    expect(amount(expected, 'a')).toBeCloseTo(0.8, 10)
    expect(amount(expected, 'b')).toBeCloseTo(0.8, 10)
    expect(amount(expected, 'c')).toBeCloseTo(1.6, 10)
  })
})

describe('expectedPayoutIfReporting', () => {
  it('equals the honest expected payout when reporting the true belief', () => {
    const ev = expectedPayoutIfReporting(participants, predictions, outcomes, 'a', binary('a', 70))
    expect(ev.toNumber()).toBeCloseTo(0.9, 10)
  })

  it('is lower for any report that differs from the true belief', () => {
    const honest = expectedPayoutIfReporting(
      participants,
      predictions,
      outcomes,
      'a',
      binary('a', 70)
    )

    for (const reported of [0, 40, 60, 69, 71, 85, 100]) {
      const shaded = expectedPayoutIfReporting(
        participants,
        predictions,
        outcomes,
        'a',
        binary('a', reported)
      )
      expect(shaded.lessThan(honest)).toBe(true)
    }
  })

  it('drops by amount_in_play / 2 × squared distance from the true belief', () => {
    const honest = expectedPayoutIfReporting(
      participants,
      predictions,
      outcomes,
      'a',
      binary('a', 70)
    )
    const shaded = expectedPayoutIfReporting(
      participants,
      predictions,
      outcomes,
      'a',
      binary('a', 50)
    )
    // 10 / 2 × (0.2² + 0.2²) = 0.4
    expect(honest.minus(shaded).toNumber()).toBeCloseTo(0.4, 10)
  })

  it('is not distorted by rounding to cents', () => {
    // A 1% shift costs 10 / 2 × 2 × 0.01² = 0.001, well under a cent
    const honest = expectedPayoutIfReporting(
      participants,
      predictions,
      outcomes,
      'a',
      binary('a', 70)
    )
    const shaded = expectedPayoutIfReporting(
      participants,
      predictions,
      outcomes,
      'a',
      binary('a', 71)
    )
    expect(honest.minus(shaded).toNumber()).toBeCloseTo(0.001, 10)
  })
})
