import { describe, it, expect } from '@jest/globals'
import {
  BetType,
  Currency,
  isMultiCategoricalBet,
  validateMultiCategoricalProbabilities,
  createParticipant,
  type Category,
  type Participant,
  type MultiCategoricalBet
} from '@types/index'

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

  describe('isMultiCategoricalBet', () => {
    const validCategories: Category[] = [
      { id: 'cat1', name: 'Category 1' },
      { id: 'cat2', name: 'Category 2' }
    ]

    const validParticipants: Participant[] = [
      { name: 'Alice', maxContribution: 100 },
      { name: 'Bob', maxContribution: 100 }
    ]

    const validMultiCategoricalBet: MultiCategoricalBet = {
      id: 'bet1',
      type: BetType.MultiCategorical,
      title: 'Test Multi-Categorical Bet',
      currency: Currency.USD,
      participants: [validParticipants[0], validParticipants[1]],
      categories: validCategories,
      probabilities: {
        'Alice': { 'cat1': 60, 'cat2': 40 },
        'Bob': { 'cat1': 30, 'cat2': 70 }
      }
    }

    it('should return true for valid multi-categorical bet', () => {
      expect(isMultiCategoricalBet(validMultiCategoricalBet)).toBe(true)
    })

    it('should return false for null or undefined', () => {
      expect(isMultiCategoricalBet(null)).toBe(false)
      expect(isMultiCategoricalBet(undefined)).toBe(false)
    })

    it('should return false for non-object', () => {
      expect(isMultiCategoricalBet(123)).toBe(false)
      expect(isMultiCategoricalBet('string')).toBe(false)
      expect(isMultiCategoricalBet([])).toBe(false)
    })

    it('should return false for wrong bet type', () => {
      const wrongType = { ...validMultiCategoricalBet, type: BetType.Binary }
      expect(isMultiCategoricalBet(wrongType)).toBe(false)
    })

    it('should return false for missing id', () => {
      const missingId = { ...validMultiCategoricalBet }
      delete (missingId as any).id
      expect(isMultiCategoricalBet(missingId)).toBe(false)
    })

    it('should return false for missing title', () => {
      const missingTitle = { ...validMultiCategoricalBet }
      delete (missingTitle as any).title
      expect(isMultiCategoricalBet(missingTitle)).toBe(false)
    })

    it('should return false for invalid currency', () => {
      const invalidCurrency = { ...validMultiCategoricalBet, currency: 'INVALID' as any }
      expect(isMultiCategoricalBet(invalidCurrency)).toBe(false)
    })

    it('should return false for non-array participants', () => {
      const invalidParticipants = { ...validMultiCategoricalBet, participants: 'not-array' as any }
      expect(isMultiCategoricalBet(invalidParticipants)).toBe(false)
    })

    it('should return false for wrong number of participants', () => {
      const oneParticipant = { ...validMultiCategoricalBet, participants: [validParticipants[0]] }
      expect(isMultiCategoricalBet(oneParticipant)).toBe(false)

      const threeParticipants = { 
        ...validMultiCategoricalBet, 
        participants: [...validParticipants, validParticipants[0]] 
      }
      expect(isMultiCategoricalBet(threeParticipants)).toBe(false)
    })

    it('should return false for invalid participants', () => {
      const invalidParticipants = { 
        ...validMultiCategoricalBet, 
        participants: [{ name: '', maxContribution: -1 }, validParticipants[1]] 
      }
      expect(isMultiCategoricalBet(invalidParticipants)).toBe(false)
    })

    it('should return false for non-array categories', () => {
      const invalidCategories = { ...validMultiCategoricalBet, categories: 'not-array' as any }
      expect(isMultiCategoricalBet(invalidCategories)).toBe(false)
    })

    it('should return false for too few categories', () => {
      const noCategories = { ...validMultiCategoricalBet, categories: [] }
      expect(isMultiCategoricalBet(noCategories)).toBe(false)
    })

    it('should return false for too many categories', () => {
      const tooManyCategories = { 
        ...validMultiCategoricalBet, 
        categories: Array(9).fill(0).map((_, i) => ({ id: `cat${i}`, name: `Category ${i}` }))
      }
      expect(isMultiCategoricalBet(tooManyCategories)).toBe(false)
    })

    it('should return false for missing probabilities', () => {
      const missingProbs = { ...validMultiCategoricalBet }
      delete (missingProbs as any).probabilities
      expect(isMultiCategoricalBet(missingProbs)).toBe(false)
    })

    it('should return false for non-object probabilities', () => {
      const invalidProbs = { ...validMultiCategoricalBet, probabilities: 'not-object' as any }
      expect(isMultiCategoricalBet(invalidProbs)).toBe(false)
    })
  })

  describe('validateMultiCategoricalProbabilities', () => {
    const categories: Category[] = [
      { id: 'cat1', name: 'Category 1' },
      { id: 'cat2', name: 'Category 2' }
    ]

    const participants: Participant[] = [
      { name: 'Alice', maxContribution: 100 },
      { name: 'Bob', maxContribution: 100 }
    ]

    it('should validate correct probabilities', () => {
      const probabilities = {
        'Alice': { 'cat1': 60, 'cat2': 40 },
        'Bob': { 'cat1': 40, 'cat2': 60 }
      }

      const result = validateMultiCategoricalProbabilities(probabilities, categories, participants)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing probabilities', () => {
      const probabilities = {
        'Alice': { 'cat1': 60 }, // Missing cat2
        'Bob': { 'cat1': 40, 'cat2': 60 }
      }

      const result = validateMultiCategoricalProbabilities(probabilities, categories, participants)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing probability for Alice in category Category 2')
    })

    it('should detect invalid probability ranges', () => {
      const probabilities = {
        'Alice': { 'cat1': -10, 'cat2': 110 }, // Invalid range
        'Bob': { 'cat1': 40, 'cat2': 60 }
      }

      const result = validateMultiCategoricalProbabilities(probabilities, categories, participants)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid probability -10 for Alice in category Category 1')
      expect(result.errors).toContain('Invalid probability 110 for Alice in category Category 2')
    })

    it('should detect probabilities that do not sum to 100%', () => {
      const probabilities = {
        'Alice': { 'cat1': 30, 'cat2': 40 }, // Sum = 70
        'Bob': { 'cat1': 60, 'cat2': 50 } // Sum = 110
      }

      const result = validateMultiCategoricalProbabilities(probabilities, categories, participants)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Probabilities for category Category 1 do not sum to 100%')
      expect(result.errors).toContain('Probabilities for category Category 2 do not sum to 100%')
    })

    it('should handle null/undefined probabilities', () => {
      const probabilities = {
        'Alice': { 'cat1': null, 'cat2': undefined },
        'Bob': { 'cat1': 40, 'cat2': 60 }
      } as any

      const result = validateMultiCategoricalProbabilities(probabilities, categories, participants)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing probability for Alice in category Category 1')
      expect(result.errors).toContain('Missing probability for Alice in category Category 2')
    })

    it('should handle missing participant in probabilities', () => {
      const probabilities = {
        'Alice': { 'cat1': 60, 'cat2': 40 }
        // Bob missing entirely
      }

      const result = validateMultiCategoricalProbabilities(probabilities, categories, participants)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing probability for Bob in category Category 1')
      expect(result.errors).toContain('Missing probability for Bob in category Category 2')
    })
  })

  describe('Currency enum completeness', () => {
    it('should have all required currencies', () => {
      expect(Currency.USD).toBe('USD')
      expect(Currency.EUR).toBe('EUR')
      expect(Currency.GBP).toBe('GBP')
      expect(Currency.CAD).toBe('CAD')
    })

    it('should only have the specified currencies', () => {
      const currencyValues = Object.values(Currency)
      expect(currencyValues).toHaveLength(4)
      expect(currencyValues).toEqual(['USD', 'EUR', 'GBP', 'CAD'])
    })
  })

  describe('BetType enum completeness', () => {
    it('should have binary and multi-categorical types', () => {
      expect(BetType.Binary).toBe('Binary')
      expect(BetType.MultiCategorical).toBe('MultiCategorical')
    })

    it('should only have the specified bet types', () => {
      const betTypeValues = Object.values(BetType)
      expect(betTypeValues).toHaveLength(2)
      expect(betTypeValues).toEqual(['Binary', 'MultiCategorical'])
    })
  })
})
