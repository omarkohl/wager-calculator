import { describe, it, expect } from '@jest/globals'
import { processScenario } from '../../src/modules/calculation'

describe('Reference Data Verification', () => {
  it('should match test_output.json exactly for binary weather scenario', () => {
    const inputScenario = {
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

    const result = processScenario(inputScenario)

    // Verify amount in play
    expect(result.amount_in_play).toBe(40)

    // Verify Rain outcome
    const rainOutcome = result.outcomes['Rain']
    expect(rainOutcome).toBeDefined()
    
    // Brier scores for Rain outcome (outcome index 0)
    expect(rainOutcome.brier_scores['A']).toBeCloseTo(0.18, 2)
    expect(rainOutcome.brier_scores['B']).toBeCloseTo(0.72, 2)
    
    // Average Brier others for Rain outcome
    expect(rainOutcome.avg_brier_others['A']).toBeCloseTo(0.72, 2)
    expect(rainOutcome.avg_brier_others['B']).toBeCloseTo(0.18, 2)
    
    // Payouts for Rain outcome
    expect(rainOutcome.payouts['A']).toBeCloseTo(10.8, 1)
    expect(rainOutcome.payouts['B']).toBeCloseTo(-10.8, 1)
    
    // Settlements for Rain outcome
    expect(rainOutcome.settlements).toHaveLength(1)
    expect(rainOutcome.settlements[0]).toEqual({
      from: 'B',
      to: 'A', 
      amount: 10.8
    })

    // Verify No Rain outcome
    const noRainOutcome = result.outcomes['No Rain']
    expect(noRainOutcome).toBeDefined()
    
    // Brier scores for No Rain outcome (outcome index 1)  
    expect(noRainOutcome.brier_scores['A']).toBeCloseTo(0.98, 2)
    expect(noRainOutcome.brier_scores['B']).toBeCloseTo(0.32, 2)
    
    // Average Brier others for No Rain outcome
    expect(noRainOutcome.avg_brier_others['A']).toBeCloseTo(0.32, 2)
    expect(noRainOutcome.avg_brier_others['B']).toBeCloseTo(0.98, 2)
    
    // Payouts for No Rain outcome
    expect(noRainOutcome.payouts['A']).toBeCloseTo(-13.2, 1)
    expect(noRainOutcome.payouts['B']).toBeCloseTo(13.2, 1)
    
    // Settlements for No Rain outcome
    expect(noRainOutcome.settlements).toHaveLength(1)
    expect(noRainOutcome.settlements[0]).toEqual({
      from: 'A',
      to: 'B',
      amount: 13.2
    })
  })

  it('should verify Brier score calculations step by step', () => {
    // Manual verification of Brier score calculation for Rain scenario
    
    // Player A predictions: [0.7, 0.3] for [Rain, No Rain]
    // If Rain occurs (outcome index 0):
    // BS_A = (0.7 - 1)² + (0.3 - 0)² = 0.09 + 0.09 = 0.18 ✓
    
    // Player B predictions: [0.4, 0.6] for [Rain, No Rain] 
    // If Rain occurs (outcome index 0):
    // BS_B = (0.4 - 1)² + (0.6 - 0)² = 0.36 + 0.36 = 0.72 ✓
    
    // Average others:
    // For A: avg_others = B's score = 0.72 ✓
    // For B: avg_others = A's score = 0.18 ✓
    
    // Payouts (amount_in_play = 40):
    // For A: 40 * (0.72 - 0.18) / 2 = 40 * 0.54 / 2 = 10.8 ✓
    // For B: 40 * (0.18 - 0.72) / 2 = 40 * (-0.54) / 2 = -10.8 ✓
    
    const inputScenario = {
      categories: ['Rain', 'No Rain'],
      players: {
        'A': { max_bet: 50, predictions: [0.7, 0.3] },
        'B': { max_bet: 40, predictions: [0.4, 0.6] }
      }
    }

    const result = processScenario(inputScenario)
    const rainOutcome = result.outcomes['Rain']

    expect(rainOutcome.brier_scores['A']).toBeCloseTo(0.18, 10)
    expect(rainOutcome.brier_scores['B']).toBeCloseTo(0.72, 10)
    expect(rainOutcome.payouts['A']).toBeCloseTo(10.8, 10)
    expect(rainOutcome.payouts['B']).toBeCloseTo(-10.8, 10)
    
    // Verify zero sum
    const totalPayout = rainOutcome.payouts['A'] + rainOutcome.payouts['B']
    expect(totalPayout).toBeCloseTo(0, 10)
  })
})
