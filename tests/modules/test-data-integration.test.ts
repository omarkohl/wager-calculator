import { describe, it, expect } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'
import { processScenario } from '../../src/modules/calculation'

// Load test data from JSON files
const testInputPath = join(__dirname, '../../data/test_input.json')
const testOutputPath = join(__dirname, '../../data/test_output.json')
const fullTestInputPath = join(__dirname, '../../data/full_test_input.json')
const fullTestOutputPath = join(__dirname, '../../data/full_test_output.json')

// Test data types
interface TestScenario {
  scenario_id: string
  description: string
  categories: string[]
  players: Record<string, {
    max_bet: number
    predictions: number[]
  }>
}

interface TestOutput {
  scenario_id: string
  amount_in_play: number
  outcomes: Record<string, {
    brier_scores: Record<string, number>
    avg_brier_others: Record<string, number>
    payouts: Record<string, number>
    settlements: Array<{ from: string; to: string; amount: number }>
  }>
}

describe('Test Data Integration', () => {
  let testInputData: TestScenario[]
  let testOutputData: TestOutput[]
  let fullTestInputData: TestScenario[]
  let fullTestOutputData: TestOutput[]

  beforeAll(() => {
    // Load basic test data
    testInputData = JSON.parse(readFileSync(testInputPath, 'utf-8'))
    testOutputData = JSON.parse(readFileSync(testOutputPath, 'utf-8'))
    
    // Load full test data
    fullTestInputData = JSON.parse(readFileSync(fullTestInputPath, 'utf-8'))
    fullTestOutputData = JSON.parse(readFileSync(fullTestOutputPath, 'utf-8'))
  })

  it('should load test data files successfully', () => {
    expect(testInputData).toBeDefined()
    expect(testOutputData).toBeDefined()
    expect(fullTestInputData).toBeDefined()
    expect(fullTestOutputData).toBeDefined()
    
    expect(Array.isArray(testInputData)).toBe(true)
    expect(Array.isArray(testOutputData)).toBe(true)
    expect(Array.isArray(fullTestInputData)).toBe(true)
    expect(Array.isArray(fullTestOutputData)).toBe(true)
  })

  it('should validate test data structure', () => {
    // Check that each input scenario has required fields
    for (const scenario of testInputData) {
      expect(scenario).toHaveProperty('scenario_id')
      expect(scenario).toHaveProperty('description')
      expect(scenario).toHaveProperty('categories')
      expect(scenario).toHaveProperty('players')
      expect(Array.isArray(scenario.categories)).toBe(true)
      expect(typeof scenario.players).toBe('object')
    }

    // Check that each output has corresponding input
    for (const output of testOutputData) {
      const matchingInput = testInputData.find(input => input.scenario_id === output.scenario_id)
      expect(matchingInput).toBeDefined()
    }
  })

  describe('Basic Test Data Verification', () => {
    it('should match calculation results exactly for all test scenarios', () => {
      for (let i = 0; i < testInputData.length; i++) {
        const inputScenario = testInputData[i]
        const expectedOutput = testOutputData[i]
        
        expect(inputScenario.scenario_id).toBe(expectedOutput.scenario_id)
        
        const result = processScenario(inputScenario)
        
        // Verify amount in play
        expect(result.amount_in_play).toBe(expectedOutput.amount_in_play)
        
        // Verify each outcome
        for (const [outcomeName, expectedOutcome] of Object.entries(expectedOutput.outcomes)) {
          const actualOutcome = result.outcomes[outcomeName]
          expect(actualOutcome).toBeDefined()
          
          // Check Brier scores
          for (const [playerName, expectedScore] of Object.entries(expectedOutcome.brier_scores)) {
            expect(actualOutcome.brier_scores[playerName]).toBeCloseTo(expectedScore, 4)
          }
          
          // Check average Brier others
          for (const [playerName, expectedAvg] of Object.entries(expectedOutcome.avg_brier_others)) {
            expect(actualOutcome.avg_brier_others[playerName]).toBeCloseTo(expectedAvg, 4)
          }
          
          // Check payouts
          for (const [playerName, expectedPayout] of Object.entries(expectedOutcome.payouts)) {
            expect(actualOutcome.payouts[playerName]).toBeCloseTo(expectedPayout, 2)
          }
          
          // Check settlements
          expect(actualOutcome.settlements).toHaveLength(expectedOutcome.settlements.length)
          for (let j = 0; j < expectedOutcome.settlements.length; j++) {
            const expectedSettlement = expectedOutcome.settlements[j]
            const actualSettlement = actualOutcome.settlements[j]
            expect(actualSettlement.from).toBe(expectedSettlement.from)
            expect(actualSettlement.to).toBe(expectedSettlement.to)
            expect(actualSettlement.amount).toBeCloseTo(expectedSettlement.amount, 2)
          }
        }
      }
    })
  })

  describe('Full Test Data Verification', () => {
    it('should match calculation results exactly for all full test scenarios', () => {
      for (let i = 0; i < fullTestInputData.length; i++) {
        const inputScenario = fullTestInputData[i]
        const expectedOutput = fullTestOutputData[i]
        
        expect(inputScenario.scenario_id).toBe(expectedOutput.scenario_id)
        
        const result = processScenario(inputScenario)
        
        // Verify amount in play
        expect(result.amount_in_play).toBe(expectedOutput.amount_in_play)
        
        // Verify each outcome
        for (const [outcomeName, expectedOutcome] of Object.entries(expectedOutput.outcomes)) {
          const actualOutcome = result.outcomes[outcomeName]
          expect(actualOutcome).toBeDefined()
          
          // Check Brier scores with high precision
          for (const [playerName, expectedScore] of Object.entries(expectedOutcome.brier_scores)) {
            expect(actualOutcome.brier_scores[playerName]).toBeCloseTo(expectedScore, 4)
          }
          
          // Check average Brier others with high precision
          for (const [playerName, expectedAvg] of Object.entries(expectedOutcome.avg_brier_others)) {
            expect(actualOutcome.avg_brier_others[playerName]).toBeCloseTo(expectedAvg, 3)
          }
          
          // Check payouts
          for (const [playerName, expectedPayout] of Object.entries(expectedOutcome.payouts)) {
            expect(actualOutcome.payouts[playerName]).toBeCloseTo(expectedPayout, 1)
          }
          
          // Verify zero-sum property (all payouts sum to zero)
          const totalPayout = Object.values(actualOutcome.payouts).reduce((sum, payout) => sum + payout, 0)
          expect(totalPayout).toBeCloseTo(0, 1)
        }
      }
    })
  })

  describe('Edge Cases from Test Data', () => {
    it('should handle unanimous predictions correctly', () => {
      const unanimousScenario = fullTestInputData.find(s => s.scenario_id.includes('unanimous'))
      if (unanimousScenario) {
        const result = processScenario(unanimousScenario)
        
        // When all participants have identical predictions, all payouts should be zero
        for (const outcome of Object.values(result.outcomes)) {
          for (const payout of Object.values(outcome.payouts)) {
            expect(Math.abs(payout)).toBeLessThan(0.01)
          }
        }
      }
    })

    it('should handle extreme probabilities correctly', () => {
      const extremeScenario = fullTestInputData.find(s => s.scenario_id.includes('extreme'))
      if (extremeScenario) {
        const result = processScenario(extremeScenario)
        
        // Results should still be mathematically sound
        expect(result.amount_in_play).toBeGreaterThan(0)
        for (const outcome of Object.values(result.outcomes)) {
          const totalPayout = Object.values(outcome.payouts).reduce((sum, payout) => sum + payout, 0)
          expect(totalPayout).toBeCloseTo(0, 2)
        }
      }
    })
  })
})
