import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { autoDistribute } from './autoDistribute'
import type { Prediction } from '../types/wager'

// Helper to create predictions with numbers that will be converted to Decimal
const expectProbability = (actual: Prediction[], expected: Prediction[]) => {
  expect(actual.length).toBe(expected.length)
  actual.forEach((pred, i) => {
    expect(pred.participantId).toBe(expected[i].participantId)
    expect(pred.outcomeId).toBe(expected[i].outcomeId)
    expect(pred.probability.equals(expected[i].probability)).toBe(true)
    expect(pred.touched).toBe(expected[i].touched)
  })
}

describe('autoDistribute', () => {
  const participant1 = 'participant-1'
  const participant2 = 'participant-2'
  const outcome1 = 'outcome-1'
  const outcome2 = 'outcome-2'
  const outcome3 = 'outcome-3'

  it('distributes remaining probability evenly to untouched predictions', () => {
    const predictions: Prediction[] = [
      {
        participantId: participant1,
        outcomeId: outcome1,
        probability: new Decimal(60),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: outcome2,
        probability: new Decimal(0),
        touched: false,
      },
      {
        participantId: participant1,
        outcomeId: outcome3,
        probability: new Decimal(0),
        touched: false,
      },
    ]

    const result = autoDistribute(predictions, participant1)

    expectProbability(result, [
      {
        participantId: participant1,
        outcomeId: outcome1,
        probability: new Decimal(60),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: outcome2,
        probability: new Decimal(20),
        touched: false,
      },
      {
        participantId: participant1,
        outcomeId: outcome3,
        probability: new Decimal(20),
        touched: false,
      },
    ])
  })

  it('does not distribute when total >= 100', () => {
    const predictions: Prediction[] = [
      {
        participantId: participant1,
        outcomeId: outcome1,
        probability: new Decimal(50),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: outcome2,
        probability: new Decimal(50),
        touched: false,
      },
    ]

    const result = autoDistribute(predictions, participant1)

    expectProbability(result, predictions)
  })

  it('does not distribute when all predictions are touched', () => {
    const predictions: Prediction[] = [
      {
        participantId: participant1,
        outcomeId: outcome1,
        probability: new Decimal(60),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: outcome2,
        probability: new Decimal(30),
        touched: true,
      },
    ]

    const result = autoDistribute(predictions, participant1)

    expectProbability(result, predictions)
  })

  it('only affects the specified participant', () => {
    const predictions: Prediction[] = [
      {
        participantId: participant1,
        outcomeId: outcome1,
        probability: new Decimal(60),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: outcome2,
        probability: new Decimal(0),
        touched: false,
      },
      {
        participantId: participant2,
        outcomeId: outcome1,
        probability: new Decimal(30),
        touched: true,
      },
      {
        participantId: participant2,
        outcomeId: outcome2,
        probability: new Decimal(0),
        touched: false,
      },
    ]

    const result = autoDistribute(predictions, participant1)

    expectProbability(result, [
      {
        participantId: participant1,
        outcomeId: outcome1,
        probability: new Decimal(60),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: outcome2,
        probability: new Decimal(40),
        touched: false,
      },
      {
        participantId: participant2,
        outcomeId: outcome1,
        probability: new Decimal(30),
        touched: true,
      },
      {
        participantId: participant2,
        outcomeId: outcome2,
        probability: new Decimal(0),
        touched: false,
      },
    ])
  })

  it('adds to existing untouched probabilities', () => {
    const predictions: Prediction[] = [
      {
        participantId: participant1,
        outcomeId: outcome1,
        probability: new Decimal(40),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: outcome2,
        probability: new Decimal(10),
        touched: false,
      },
      {
        participantId: participant1,
        outcomeId: outcome3,
        probability: new Decimal(10),
        touched: false,
      },
    ]

    const result = autoDistribute(predictions, participant1)

    expectProbability(result, [
      {
        participantId: participant1,
        outcomeId: outcome1,
        probability: new Decimal(40),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: outcome2,
        probability: new Decimal(30),
        touched: false,
      },
      {
        participantId: participant1,
        outcomeId: outcome3,
        probability: new Decimal(30),
        touched: false,
      },
    ])
  })

  it('handles single untouched prediction getting all remaining', () => {
    const predictions: Prediction[] = [
      {
        participantId: participant1,
        outcomeId: outcome1,
        probability: new Decimal(30),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: outcome2,
        probability: new Decimal(25),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: outcome3,
        probability: new Decimal(0),
        touched: false,
      },
    ]

    const result = autoDistribute(predictions, participant1)

    expectProbability(result, [
      {
        participantId: participant1,
        outcomeId: outcome1,
        probability: new Decimal(30),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: outcome2,
        probability: new Decimal(25),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: outcome3,
        probability: new Decimal(45),
        touched: false,
      },
    ])
  })

  it('returns same array when total is exactly 100', () => {
    const predictions: Prediction[] = [
      {
        participantId: participant1,
        outcomeId: outcome1,
        probability: new Decimal(50),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: outcome2,
        probability: new Decimal(50),
        touched: true,
      },
    ]

    const result = autoDistribute(predictions, participant1)

    expect(result).toBe(predictions)
  })

  it('returns same array when no untouched predictions exist', () => {
    const predictions: Prediction[] = [
      {
        participantId: participant1,
        outcomeId: outcome1,
        probability: new Decimal(40),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: outcome2,
        probability: new Decimal(30),
        touched: true,
      },
    ]

    const result = autoDistribute(predictions, participant1)

    expect(result).toBe(predictions)
  })

  it('distributes exactly to 100 with 8 outcomes (51% + 47% + 6 auto-distributed)', () => {
    // This tests the scenario: 8 outcomes, 2 touched (51% and 47%), 6 untouched
    // Remaining: 2%, divided by 6 = 0.333... repeating
    // Without proper handling, this could cause sum != 100
    const predictions: Prediction[] = [
      {
        participantId: participant1,
        outcomeId: 'outcome-1',
        probability: new Decimal(51),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: 'outcome-2',
        probability: new Decimal(47),
        touched: true,
      },
      {
        participantId: participant1,
        outcomeId: 'outcome-3',
        probability: new Decimal(0),
        touched: false,
      },
      {
        participantId: participant1,
        outcomeId: 'outcome-4',
        probability: new Decimal(0),
        touched: false,
      },
      {
        participantId: participant1,
        outcomeId: 'outcome-5',
        probability: new Decimal(0),
        touched: false,
      },
      {
        participantId: participant1,
        outcomeId: 'outcome-6',
        probability: new Decimal(0),
        touched: false,
      },
      {
        participantId: participant1,
        outcomeId: 'outcome-7',
        probability: new Decimal(0),
        touched: false,
      },
      {
        participantId: participant1,
        outcomeId: 'outcome-8',
        probability: new Decimal(0),
        touched: false,
      },
    ]

    const result = autoDistribute(predictions, participant1)

    const total = result
      .filter(p => p.participantId === participant1)
      .reduce((sum, p) => sum.plus(p.probability), new Decimal(0))

    expect(total.minus(100).abs().lessThan(0.001)).toBe(true)
  })
})
