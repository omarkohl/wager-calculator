import { describe, it, expect } from '@jest/globals'
import {
  calculateBrierScore,
  calculateAverageBrierOthers,
  calculatePayouts,
  calculateSettlements,
  processScenario
} from '../../src/modules/calculation'
import { Participant } from '../../src/types/index'

describe('Brier Scoring Calculation Engine', () => {
  describe('calculateBrierScore', () => {
    it('should calculate Brier score for binary outcome (R=2)', () => {
      const predictions = [0.7, 0.3] // 70% rain, 30% no rain
      const outcomeIndex = 0 // rain occurred
      
      // Expected: BS = (0.7 - 1)² + (0.3 - 0)² = 0.09 + 0.09 = 0.18
      const score = calculateBrierScore(predictions, outcomeIndex)
      expect(score).toBeCloseTo(0.18, 4)
    })

    it('should calculate Brier score for multi-categorical outcome (R=3)', () => {
      const predictions = [0.5, 0.3, 0.2] // 50%, 30%, 20%
      const outcomeIndex = 1 // second category occurred
      
      // Expected: BS = (0.5 - 0)² + (0.3 - 1)² + (0.2 - 0)² = 0.25 + 0.49 + 0.04 = 0.78
      const score = calculateBrierScore(predictions, outcomeIndex)
      expect(score).toBeCloseTo(0.78, 4)
    })

    it('should handle perfect prediction (score = 0)', () => {
      const predictions = [1.0, 0.0]
      const outcomeIndex = 0
      
      // Expected: BS = (1.0 - 1)² + (0.0 - 0)² = 0
      const score = calculateBrierScore(predictions, outcomeIndex)
      expect(score).toBeCloseTo(0, 4)
    })

    it('should handle worst prediction (score = 2 for binary)', () => {
      const predictions = [1.0, 0.0]
      const outcomeIndex = 1 // wrong outcome
      
      // Expected: BS = (1.0 - 0)² + (0.0 - 1)² = 1 + 1 = 2
      const score = calculateBrierScore(predictions, outcomeIndex)
      expect(score).toBeCloseTo(2, 4)
    })

    it('should throw error for invalid outcome index', () => {
      const predictions = [0.7, 0.3]
      expect(() => calculateBrierScore(predictions, 2)).toThrow('Invalid outcome index')
      expect(() => calculateBrierScore(predictions, -1)).toThrow('Invalid outcome index')
    })

    it('should throw error for probabilities that do not sum to 1', () => {
      const predictions = [0.6, 0.5] // sum = 1.1
      expect(() => calculateBrierScore(predictions, 0)).toThrow('Probabilities must sum to 1')
    })
  })

  describe('calculateAverageBrierOthers', () => {
    it('should calculate average Brier score of others', () => {
      const brierScores = {
        'Alice': 0.18,
        'Bob': 0.72,
        'Carol': 0.32
      }
      
      const avgAlice = calculateAverageBrierOthers(brierScores, 'Alice', ['Alice', 'Bob', 'Carol'])
      expect(avgAlice).toBeCloseTo((0.72 + 0.32) / 2, 4) // (Bob + Carol) / 2 = 0.52
      
      const avgBob = calculateAverageBrierOthers(brierScores, 'Bob', ['Alice', 'Bob', 'Carol'])
      expect(avgBob).toBeCloseTo((0.18 + 0.32) / 2, 4) // (Alice + Carol) / 2 = 0.25
    })

    it('should handle 2-player scenario', () => {
      const brierScores = {
        'Alice': 0.18,
        'Bob': 0.72
      }
      
      const avgAlice = calculateAverageBrierOthers(brierScores, 'Alice', ['Alice', 'Bob'])
      expect(avgAlice).toBeCloseTo(0.72, 4) // Only Bob's score
    })

    it('should throw error for unknown player', () => {
      const brierScores = { 'Alice': 0.18 }
      expect(() => calculateAverageBrierOthers(brierScores, 'Unknown', ['Alice'])).toThrow('Player not found')
    })
  })

  describe('calculatePayouts', () => {
    it('should calculate payouts ensuring zero sum', () => {
      const brierScores = {
        'Alice': 0.18,
        'Bob': 0.72,
        'Carol': 0.32
      }
      const avgBrierOthers = {
        'Alice': 0.52,
        'Bob': 0.25,
        'Carol': 0.45
      }
      const amountInPlay = 40
      
      const payouts = calculatePayouts(brierScores, avgBrierOthers, amountInPlay)
      
      // Alice: 40 * (0.52 - 0.18) / 2 = 40 * 0.34 / 2 = 6.8
      // Bob: 40 * (0.25 - 0.72) / 2 = 40 * (-0.47) / 2 = -9.4
      // Carol: 40 * (0.45 - 0.32) / 2 = 40 * 0.13 / 2 = 2.6
      
      expect(payouts['Alice']).toBeCloseTo(6.8, 1)
      expect(payouts['Bob']).toBeCloseTo(-9.4, 1)
      expect(payouts['Carol']).toBeCloseTo(2.6, 1)
      
      // Ensure zero sum
      const sum = Object.values(payouts).reduce((a: number, b: number) => a + b, 0)
      expect(sum).toBeCloseTo(0, 10)
    })

    it('should handle identical Brier scores (all payouts = 0)', () => {
      const brierScores = {
        'Alice': 0.5,
        'Bob': 0.5
      }
      const avgBrierOthers = {
        'Alice': 0.5,
        'Bob': 0.5
      }
      const amountInPlay = 100
      
      const payouts = calculatePayouts(brierScores, avgBrierOthers, amountInPlay)
      
      expect(payouts['Alice']).toBeCloseTo(0, 4)
      expect(payouts['Bob']).toBeCloseTo(0, 4)
    })
  })

  describe('calculateSettlements', () => {
    it('should generate settlement transactions', () => {
      const payouts = {
        'Alice': 10.8,
        'Bob': -10.8,
        'Carol': 0
      }
      
      const settlements = calculateSettlements(payouts)
      
      expect(settlements).toEqual([
        { from: 'Bob', to: 'Alice', amount: 10.8 }
      ])
    })

    it('should handle complex multi-participant settlements', () => {
      const payouts = {
        'Alice': 5,
        'Bob': -8,
        'Carol': 3,
        'Dave': 0
      }
      
      const settlements = calculateSettlements(payouts)
      
      // Check that settlements balance out
      const fromTotals: Record<string, number> = {}
      const toTotals: Record<string, number> = {}
      
      settlements.forEach(({ from, to, amount }) => {
        fromTotals[from] = (fromTotals[from] || 0) + amount
        toTotals[to] = (toTotals[to] || 0) + amount
      })
      
      expect(fromTotals['Bob']).toBeCloseTo(8, 1)
      expect(toTotals['Alice']).toBeCloseTo(5, 1)
      expect(toTotals['Carol']).toBeCloseTo(3, 1)
    })

    it('should ignore very small amounts (< 0.01)', () => {
      const payouts = {
        'Alice': 0.005,
        'Bob': -0.005
      }
      
      const settlements = calculateSettlements(payouts)
      expect(settlements).toHaveLength(0)
    })
  })

  describe('processScenario (Integration)', () => {
    it('should process binary scenario matching test data', () => {
      const scenario = {
        categories: ['Rain', 'No Rain'],
        players: {
          'A': {
            max_bet: 50,
            predictions: [0.7, 0.3]
          },
          'B': {
            max_bet: 40,
            predictions: [0.4, 0.6]
          }
        }
      }
      
      const result = processScenario(scenario)
      
      // Check amount in play
      expect(result.amount_in_play).toBe(40) // min of 50, 40
      
      // Check Rain outcome (index 0)
      const rainOutcome = result.outcomes['Rain']
      expect(rainOutcome.brier_scores['A']).toBeCloseTo(0.18, 2)
      expect(rainOutcome.brier_scores['B']).toBeCloseTo(0.72, 2)
      expect(rainOutcome.payouts['A']).toBeCloseTo(10.8, 1)
      expect(rainOutcome.payouts['B']).toBeCloseTo(-10.8, 1)
      
      // Check No Rain outcome (index 1)
      const noRainOutcome = result.outcomes['No Rain']
      expect(noRainOutcome.brier_scores['A']).toBeCloseTo(0.98, 2)
      expect(noRainOutcome.brier_scores['B']).toBeCloseTo(0.32, 2)
      expect(noRainOutcome.payouts['A']).toBeCloseTo(-13.2, 1)
      expect(noRainOutcome.payouts['B']).toBeCloseTo(13.2, 1)
    })

    it('should handle multi-participant scenarios', () => {
      const scenario = {
        categories: ['A', 'B'],
        players: {
          'Alice': {
            max_bet: 100,
            predictions: [0.6, 0.4]
          },
          'Bob': {
            max_bet: 80,
            predictions: [0.3, 0.7]
          },
          'Carol': {
            max_bet: 120,
            predictions: [0.5, 0.5]
          }
        }
      }
      
      const result = processScenario(scenario)
      
      // Amount in play should be minimum
      expect(result.amount_in_play).toBe(80)
      
      // All outcomes should have zero-sum payouts
      Object.values(result.outcomes).forEach((outcome: any) => {
        const payouts = outcome.payouts as Record<string, number>
        const payoutSum = Object.values(payouts).reduce((a: number, b: number) => a + b, 0)
        expect(payoutSum).toBeCloseTo(0, 10)
      })
    })
  })
})
