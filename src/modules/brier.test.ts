import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import {
  calculateBrierScore,
  calculateAllBrierScores,
  calculatePayouts,
  calculateSettlements,
  calculateResults,
} from './brier'
import type { Participant, Outcome, Prediction, Payout } from '../types/wager'

describe('Brier Scoring Module', () => {
  describe('calculateBrierScore', () => {
    it('should calculate perfect prediction (score = 0)', () => {
      const outcomes: Outcome[] = [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' },
      ]

      const predictions: Prediction[] = [
        {
          participantId: 'p1',
          outcomeId: 'yes',
          probability: new Decimal(100),
          touched: true,
        },
        {
          participantId: 'p1',
          outcomeId: 'no',
          probability: new Decimal(0),
          touched: true,
        },
      ]

      const score = calculateBrierScore(predictions, 'yes', outcomes)
      expect(score.toNumber()).toBe(0)
    })

    it('should calculate worst prediction (score = 2)', () => {
      const outcomes: Outcome[] = [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' },
      ]

      const predictions: Prediction[] = [
        {
          participantId: 'p1',
          outcomeId: 'yes',
          probability: new Decimal(0),
          touched: true,
        },
        {
          participantId: 'p1',
          outcomeId: 'no',
          probability: new Decimal(100),
          touched: true,
        },
      ]

      const score = calculateBrierScore(predictions, 'yes', outcomes)
      expect(score.toNumber()).toBe(2)
    })

    it('should calculate intermediate prediction', () => {
      const outcomes: Outcome[] = [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' },
      ]

      const predictions: Prediction[] = [
        {
          participantId: 'p1',
          outcomeId: 'yes',
          probability: new Decimal(70),
          touched: true,
        },
        {
          participantId: 'p1',
          outcomeId: 'no',
          probability: new Decimal(30),
          touched: true,
        },
      ]

      const score = calculateBrierScore(predictions, 'yes', outcomes)
      // (0.7-1)^2 + (0.3-0)^2 = 0.09 + 0.09 = 0.18
      expect(score.toNumber()).toBeCloseTo(0.18, 10)
    })

    it('should handle multi-categorical outcomes', () => {
      const outcomes: Outcome[] = [
        { id: 'cold', label: 'Cold' },
        { id: 'normal', label: 'Normal' },
        { id: 'warm', label: 'Warm' },
      ]

      const predictions: Prediction[] = [
        {
          participantId: 'p1',
          outcomeId: 'cold',
          probability: new Decimal(20),
          touched: true,
        },
        {
          participantId: 'p1',
          outcomeId: 'normal',
          probability: new Decimal(50),
          touched: true,
        },
        {
          participantId: 'p1',
          outcomeId: 'warm',
          probability: new Decimal(30),
          touched: true,
        },
      ]

      const score = calculateBrierScore(predictions, 'normal', outcomes)
      // (0.2-0)^2 + (0.5-1)^2 + (0.3-0)^2 = 0.04 + 0.25 + 0.09 = 0.38
      expect(score.toNumber()).toBeCloseTo(0.38, 10)
    })
  })

  describe('calculateAllBrierScores', () => {
    it('should calculate scores for all participants', () => {
      const participants: Participant[] = [
        { id: 'p1', name: 'Alice', maxBet: new Decimal(50) },
        { id: 'p2', name: 'Bob', maxBet: new Decimal(40) },
      ]

      const outcomes: Outcome[] = [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' },
      ]

      const predictions: Prediction[] = [
        {
          participantId: 'p1',
          outcomeId: 'yes',
          probability: new Decimal(70),
          touched: true,
        },
        {
          participantId: 'p1',
          outcomeId: 'no',
          probability: new Decimal(30),
          touched: true,
        },
        {
          participantId: 'p2',
          outcomeId: 'yes',
          probability: new Decimal(40),
          touched: true,
        },
        {
          participantId: 'p2',
          outcomeId: 'no',
          probability: new Decimal(60),
          touched: true,
        },
      ]

      const scores = calculateAllBrierScores(participants, predictions, outcomes, 'yes')

      expect(scores).toHaveLength(2)
      expect(scores[0].participantId).toBe('p1')
      expect(scores[0].score.toNumber()).toBeCloseTo(0.18, 10)
      expect(scores[1].participantId).toBe('p2')
      expect(scores[1].score.toNumber()).toBeCloseTo(0.72, 10)
    })
  })

  describe('calculatePayouts', () => {
    it('should calculate correct payouts for binary case', () => {
      const participants: Participant[] = [
        { id: 'A', name: 'Alice', maxBet: new Decimal(50) },
        { id: 'B', name: 'Bob', maxBet: new Decimal(40) },
      ]

      const brierScores = [
        { participantId: 'A', score: new Decimal(0.18) },
        { participantId: 'B', score: new Decimal(0.72) },
      ]

      const payouts = calculatePayouts(participants, brierScores, 'test claim')

      expect(payouts).toHaveLength(2)

      // Amount in play = min(50, 40) = 40
      // A's avg_others = 0.72
      // A's payout = (0.72 - 0.18) / 2 * 40 = 0.54 / 2 * 40 = 10.8
      const payoutA = payouts.find(p => p.participantId === 'A')
      expect(payoutA).toBeDefined()
      expect(payoutA!.amount.toNumber()).toBeCloseTo(10.8, 2)

      // B's avg_others = 0.18
      // B's payout = (0.18 - 0.72) / 2 * 40 = -0.54 / 2 * 40 = -10.8
      const payoutB = payouts.find(p => p.participantId === 'B')
      expect(payoutB).toBeDefined()
      expect(payoutB!.amount.toNumber()).toBeCloseTo(-10.8, 2)

      // Payouts should sum to zero
      const sum = payouts.reduce((acc, p) => acc.plus(p.amount), new Decimal(0))
      expect(sum.toNumber()).toBeCloseTo(0, 10)
    })

    it('should handle identical predictions (all payouts = 0)', () => {
      const participants: Participant[] = [
        { id: 'A', name: 'Alice', maxBet: new Decimal(50) },
        { id: 'B', name: 'Bob', maxBet: new Decimal(50) },
      ]

      const brierScores = [
        { participantId: 'A', score: new Decimal(0.5) },
        { participantId: 'B', score: new Decimal(0.5) },
      ]

      const payouts = calculatePayouts(participants, brierScores, 'test claim')

      expect(payouts).toHaveLength(2)
      expect(payouts[0].amount.toNumber()).toBe(0)
      expect(payouts[1].amount.toNumber()).toBe(0)
    })
  })

  describe('calculateSettlements', () => {
    it('should create single settlement for 2-player case', () => {
      const payouts: Payout[] = [
        { participantId: 'A', amount: new Decimal(10.8) },
        { participantId: 'B', amount: new Decimal(-10.8) },
      ]

      const settlements = calculateSettlements(payouts)

      expect(settlements).toHaveLength(1)
      expect(settlements[0].fromParticipantId).toBe('B')
      expect(settlements[0].toParticipantId).toBe('A')
      expect(settlements[0].amount.toNumber()).toBeCloseTo(10.8, 2)
    })

    it('should minimize transactions for multi-player case', () => {
      const payouts: Payout[] = [
        { participantId: 'A', amount: new Decimal(10) },
        { participantId: 'B', amount: new Decimal(-5) },
        { participantId: 'C', amount: new Decimal(-5) },
      ]

      const settlements = calculateSettlements(payouts)

      // Should have 2 settlements (B->A and C->A)
      expect(settlements.length).toBeLessThanOrEqual(2)

      // Total settlements should equal total credits
      const totalSettlements = settlements.reduce((acc, s) => acc.plus(s.amount), new Decimal(0))
      expect(totalSettlements.toNumber()).toBeCloseTo(10, 2)
    })

    it('should handle zero payouts (no settlements)', () => {
      const payouts: Payout[] = [
        { participantId: 'A', amount: new Decimal(0) },
        { participantId: 'B', amount: new Decimal(0) },
      ]

      const settlements = calculateSettlements(payouts)

      expect(settlements).toHaveLength(0)
    })
  })

  describe('Integration test with test_output.json data', () => {
    it('should match expected results for binary weather prediction', () => {
      // Data from test_output.json
      const participants: Participant[] = [
        { id: 'A', name: 'A', maxBet: new Decimal(50) },
        { id: 'B', name: 'B', maxBet: new Decimal(40) },
      ]

      const outcomes: Outcome[] = [
        { id: 'Rain', label: 'Rain' },
        { id: 'No Rain', label: 'No Rain' },
      ]

      const predictions: Prediction[] = [
        {
          participantId: 'A',
          outcomeId: 'Rain',
          probability: new Decimal(70),
          touched: true,
        },
        {
          participantId: 'A',
          outcomeId: 'No Rain',
          probability: new Decimal(30),
          touched: true,
        },
        {
          participantId: 'B',
          outcomeId: 'Rain',
          probability: new Decimal(40),
          touched: true,
        },
        {
          participantId: 'B',
          outcomeId: 'No Rain',
          probability: new Decimal(60),
          touched: true,
        },
      ]

      // Test Rain outcome
      const rainResult = calculateResults(participants, predictions, outcomes, 'Rain', 'test claim')

      // Check Brier scores
      expect(rainResult.brierScores[0].score.toNumber()).toBeCloseTo(0.18, 10)
      expect(rainResult.brierScores[1].score.toNumber()).toBeCloseTo(0.72, 10)

      // Check payouts
      expect(rainResult.payouts[0].amount.toNumber()).toBeCloseTo(10.8, 2)
      expect(rainResult.payouts[1].amount.toNumber()).toBeCloseTo(-10.8, 2)

      // Check settlements
      expect(rainResult.settlements).toHaveLength(1)
      expect(rainResult.settlements[0].fromParticipantId).toBe('B')
      expect(rainResult.settlements[0].toParticipantId).toBe('A')
      expect(rainResult.settlements[0].amount.toNumber()).toBeCloseTo(10.8, 2)

      // Test No Rain outcome
      const noRainResult = calculateResults(
        participants,
        predictions,
        outcomes,
        'No Rain',
        'test claim'
      )

      // Check Brier scores
      expect(noRainResult.brierScores[0].score.toNumber()).toBeCloseTo(0.98, 10)
      expect(noRainResult.brierScores[1].score.toNumber()).toBeCloseTo(0.32, 10)

      // Check payouts
      expect(noRainResult.payouts[0].amount.toNumber()).toBeCloseTo(-13.2, 2)
      expect(noRainResult.payouts[1].amount.toNumber()).toBeCloseTo(13.2, 2)

      // Check settlements
      expect(noRainResult.settlements).toHaveLength(1)
      expect(noRainResult.settlements[0].fromParticipantId).toBe('A')
      expect(noRainResult.settlements[0].toParticipantId).toBe('B')
      expect(noRainResult.settlements[0].amount.toNumber()).toBeCloseTo(13.2, 2)
    })
  })
})
