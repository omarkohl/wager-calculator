import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import {
  autoDistribute,
  setPrediction,
  fillMissingPredictions,
  normalizePredictions,
  participantTotal,
  isCompleteTotal,
  haveIdenticalPredictions,
} from './predictions'
import type { Outcome, Participant, Prediction } from '../types/wager'

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

const pred = (
  participantId: string,
  outcomeId: string,
  probability: number,
  touched: boolean
): Prediction => ({ participantId, outcomeId, probability: new Decimal(probability), touched })

const participant = (id: string): Participant => ({ id, name: id, maxBet: new Decimal(10) })
const outcome = (id: string): Outcome => ({ id, label: id })

describe('participantTotal / isCompleteTotal', () => {
  it('sums only the given participant', () => {
    const predictions = [
      pred('p1', 'o1', 60, true),
      pred('p1', 'o2', 30, true),
      pred('p2', 'o1', 99, true),
    ]
    expect(participantTotal(predictions, 'p1').toNumber()).toBe(90)
    expect(participantTotal(predictions, 'p3').toNumber()).toBe(0)
  })

  it('treats totals within a hair of 100 as complete', () => {
    expect(isCompleteTotal(new Decimal(100))).toBe(true)
    expect(isCompleteTotal(new Decimal('99.9995'))).toBe(true)
    expect(isCompleteTotal(new Decimal('99.99'))).toBe(false)
    expect(isCompleteTotal(new Decimal('100.01'))).toBe(false)
  })
})

describe('setPrediction', () => {
  it('marks the prediction touched and redistributes the rest', () => {
    const predictions = [pred('p1', 'o1', 50, false), pred('p1', 'o2', 50, false)]
    const result = setPrediction(predictions, 'p1', 'o1', new Decimal(70))
    expectProbability(result, [pred('p1', 'o1', 70, true), pred('p1', 'o2', 30, false)])
  })

  it('adds the prediction when it did not exist yet', () => {
    const result = setPrediction([], 'p1', 'o1', new Decimal(70))
    expectProbability(result, [pred('p1', 'o1', 70, true)])
  })

  it('does not mutate the input', () => {
    const predictions = [pred('p1', 'o1', 50, false)]
    setPrediction(predictions, 'p1', 'o1', new Decimal(70))
    expect(predictions[0].probability.toNumber()).toBe(50)
    expect(predictions[0].touched).toBe(false)
  })
})

describe('fillMissingPredictions', () => {
  const participants = [participant('p1'), participant('p2')]
  const outcomes = [outcome('o1'), outcome('o2')]

  it('creates an even split for a participant with no predictions', () => {
    const result = fillMissingPredictions([], participants, outcomes)
    expectProbability(result, [
      pred('p1', 'o1', 50, false),
      pred('p1', 'o2', 50, false),
      pred('p2', 'o1', 50, false),
      pred('p2', 'o2', 50, false),
    ])
  })

  it('gives a new outcome the probability that is still unassigned', () => {
    const existing = [pred('p1', 'o1', 70, true), pred('p1', 'o2', 30, false)]
    const result = fillMissingPredictions(
      existing,
      [participant('p1')],
      [...outcomes, outcome('o3')]
    )
    expectProbability(result, [
      pred('p1', 'o1', 70, true),
      pred('p1', 'o2', 15, false),
      pred('p1', 'o3', 15, false),
    ])
  })

  it('returns the very same array when nothing is missing', () => {
    const existing = [pred('p1', 'o1', 60, true), pred('p1', 'o2', 40, true)]
    expect(fillMissingPredictions(existing, [participant('p1')], outcomes)).toBe(existing)
  })
})

describe('normalizePredictions', () => {
  const outcomes = [outcome('o1'), outcome('o2')]

  it('scales the probabilities proportionally to 100', () => {
    const predictions = [pred('p1', 'o1', 60, true), pred('p1', 'o2', 30, true)]
    const result = normalizePredictions(predictions, 'p1', outcomes)
    expect(result[0].probability.toNumber()).toBeCloseTo(66.67, 2)
    expect(result[1].probability.toNumber()).toBeCloseTo(33.33, 2)
    expect(isCompleteTotal(participantTotal(result, 'p1'))).toBe(true)
  })

  it('leaves other participants and removed outcomes alone', () => {
    const predictions = [
      pred('p1', 'o1', 50, true),
      pred('p1', 'o2', 25, true),
      pred('p1', 'gone', 25, true),
      pred('p2', 'o1', 10, true),
    ]
    const result = normalizePredictions(predictions, 'p1', outcomes)
    expect(result[0].probability.toNumber()).toBeCloseTo(66.67, 2)
    expect(result[1].probability.toNumber()).toBeCloseTo(33.33, 2)
    expect(result[2].probability.toNumber()).toBe(25)
    expect(result[3].probability.toNumber()).toBe(10)
  })

  it('returns the input unchanged when the total is zero', () => {
    const predictions = [pred('p1', 'o1', 0, true), pred('p1', 'o2', 0, true)]
    expect(normalizePredictions(predictions, 'p1', outcomes)).toBe(predictions)
  })
})

describe('haveIdenticalPredictions', () => {
  const participants = [participant('p1'), participant('p2')]

  it('is true when everyone predicted the same', () => {
    const predictions = [
      pred('p1', 'o1', 60, true),
      pred('p1', 'o2', 40, true),
      pred('p2', 'o2', 40, true),
      pred('p2', 'o1', 60, true),
    ]
    expect(haveIdenticalPredictions(participants, predictions)).toBe(true)
  })

  it('is false when any probability differs', () => {
    const predictions = [
      pred('p1', 'o1', 60, true),
      pred('p1', 'o2', 40, true),
      pred('p2', 'o1', 61, true),
      pred('p2', 'o2', 39, true),
    ]
    expect(haveIdenticalPredictions(participants, predictions)).toBe(false)
  })

  it('is false with fewer than two participants', () => {
    expect(haveIdenticalPredictions([participant('p1')], [pred('p1', 'o1', 100, true)])).toBe(false)
  })
})
