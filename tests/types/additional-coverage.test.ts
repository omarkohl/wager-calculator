import { describe, it, expect } from '@jest/globals'
import {
  Currency,
  isBet,
  isMultiCategoricalBet,
  validateBetProbabilities,
  createParticipant,
  type Category,
  type Participant,
  type Bet
} from '../../src/types/index'

describe('Additional Type Coverage Tests', () => {
  describe('createParticipant edge cases', () => {
    it('should throw error for empty string name', () => {
      expect(() => createParticipant({ name: '', maxContribution: 100 })).toThrow(
        'Participant name is required and must be a non-empty string'
      )
    })

    it('should throw error for whitespace-only name', () => {
      expect(() => createParticipant({ name: '   ', maxContribution: 100 })).toThrow(
        'Participant name is required and must be a non-empty string'
      )
    })

    it('should throw error for non-string name', () => {
      expect(() => createParticipant({ name: 123 as any, maxContribution: 100 })).toThrow(
        'Participant name is required and must be a non-empty string'
      )
    })

    it('should throw error for zero contribution', () => {
      expect(() => createParticipant({ name: 'Alice', maxContribution: 0 })).toThrow(
        'Max contribution must be a positive number'
      )
    })

    it('should throw error for negative contribution', () => {
      expect(() => createParticipant({ name: 'Alice', maxContribution: -50 })).toThrow(
        'Max contribution must be a positive number'
      )
    })

    it('should throw error for non-number contribution', () => {
      expect(() => createParticipant({ name: 'Alice', maxContribution: 'not-a-number' as any })).toThrow(
        'Max contribution must be a positive number'
      )
    })

    it('should trim whitespace from names', () => {
      const participant = createParticipant({ name: '  Alice  ', maxContribution: 100 })
      expect(participant.name).toBe('Alice')
    })
  })

  describe('isBet validation', () => {
    const validBet: Bet = {
      id: 'bet1',
      title: 'Test Bet',
      currency: Currency.USD,
      participants: [
        { name: 'Alice', maxContribution: 100 },
        { name: 'Bob', maxContribution: 100 }
      ],
      categories: [
        { id: 'cat1', name: 'Category 1' },
        { id: 'cat2', name: 'Category 2' }
      ],
      probabilities: {
        'Alice': { 'cat1': 60, 'cat2': 40 },
        'Bob': { 'cat1': 40, 'cat2': 60 }
      }
    }

    it('should return true for valid bet', () => {
      expect(isBet(validBet)).toBe(true)
    })

    it('should return false for null or undefined', () => {
      expect(isBet(null)).toBe(false)
      expect(isBet(undefined)).toBe(false)
    })

    it('should return false for non-object', () => {
      expect(isBet(123)).toBe(false)
      expect(isBet('string')).toBe(false)
      expect(isBet([])).toBe(false)
    })
  })

  describe('validateBetProbabilities', () => {
    const validBet: Bet = {
      id: 'bet1',
      title: 'Test Bet',
      currency: Currency.USD,
      participants: [
        { name: 'Alice', maxContribution: 100 },
        { name: 'Bob', maxContribution: 100 }
      ],
      categories: [
        { id: 'cat1', name: 'Category 1' },
        { id: 'cat2', name: 'Category 2' }
      ],
      probabilities: {
        'Alice': { 'cat1': 60, 'cat2': 40 },
        'Bob': { 'cat1': 40, 'cat2': 60 }
      }
    }

    it('should validate correct probabilities', () => {
      const result = validateBetProbabilities(validBet)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing probabilities for participant', () => {
      const invalidBet: Bet = {
        ...validBet,
        probabilities: {
          'Alice': { 'cat1': 60, 'cat2': 40 }
          // Bob missing entirely
        }
      }

      const result = validateBetProbabilities(invalidBet)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing probabilities for participant: Bob')
    })

    it('should detect probabilities that do not sum to 100%', () => {
      const invalidBet: Bet = {
        ...validBet,
        probabilities: {
          'Alice': { 'cat1': 30, 'cat2': 40 }, // Sum = 70
          'Bob': { 'cat1': 40, 'cat2': 60 }
        }
      }

      const result = validateBetProbabilities(invalidBet)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Probabilities for Alice do not sum to 100%')
    })
  })

  describe('Currency enum completeness', () => {
    it('should have all required currencies', () => {
      expect(Currency.USD).toBe('USD ($)')
      expect(Currency.EUR).toBe('EUR (€)')
      expect(Currency.GBP).toBe('GBP (£)')
      expect(Currency.CAD).toBe('CAD (C$)')
      expect(Currency.ZZZ).toBe('DEFAULT')
    })

    it('should only have the specified currencies', () => {
      const currencyValues = Object.values(Currency)
      expect(currencyValues).toHaveLength(5)
      expect(currencyValues).toEqual(['USD ($)', 'EUR (€)', 'GBP (£)', 'CAD (C$)', 'DEFAULT'])
    })
  })
})
