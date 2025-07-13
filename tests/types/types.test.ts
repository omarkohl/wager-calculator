import { describe, it, expect } from '@jest/globals'

describe('Core Types - Type Validation', () => {
  describe('BetType enum', () => {
    it('should have Binary and MultiCategorical variants', async () => {
      // Import the BetType enum and test its values
      const { BetType } = await import('@types/index')
      
      expect(BetType.Binary).toBeDefined()
      expect(BetType.MultiCategorical).toBeDefined()
      expect(Object.keys(BetType)).toHaveLength(2)
    })
  })

  describe('Currency type', () => {
    it('should support common currencies', async () => {
      const { Currency } = await import('@types/index')
      
      expect(Currency.USD).toBeDefined()
      expect(Currency.EUR).toBeDefined()
      expect(Currency.GBP).toBeDefined()
      expect(Currency.CAD).toBeDefined()
    })
  })

  describe('Participant interface', () => {
    it('should define participant structure correctly', async () => {
      const { createParticipant } = await import('@types/index')
      
      const participant = createParticipant({
        name: 'Person A',
        maxContribution: 100
      })
      
      expect(participant).toHaveProperty('name')
      expect(participant).toHaveProperty('maxContribution')
      expect(participant.name).toBe('Person A')
      expect(participant.maxContribution).toBe(100)
    })
  })
})

describe('Type Guards (TDD)', () => {
  describe('isParticipant', () => {
    it('should return true for valid participant objects', async () => {
      const { isParticipant } = await import('@types/index')
      
      const validParticipant = {
        name: 'Alice',
        maxContribution: 50
      }
      
      expect(isParticipant(validParticipant)).toBe(true)
    })

    it('should return false for invalid participant objects', async () => {
      const { isParticipant } = await import('@types/index')
      
      expect(isParticipant({})).toBe(false)
      expect(isParticipant({ name: 'Alice' })).toBe(false) // Missing maxContribution
      expect(isParticipant({ maxContribution: 50 })).toBe(false) // Missing name
      expect(isParticipant(null)).toBe(false)
      expect(isParticipant(undefined)).toBe(false)
    })
  })

  describe('isBinaryBet', () => {
    it('should identify binary bet objects correctly', async () => {
      const { isBinaryBet, BetType, Currency } = await import('@types/index')
      
      const validBinaryBet = {
        id: 'bet1',
        type: BetType.Binary,
        title: 'Test Bet',
        details: 'Test details',
        deadline: new Date(),
        currency: Currency.USD,
        participants: [
          { name: 'Alice', maxContribution: 100 },
          { name: 'Bob', maxContribution: 100 }
        ],
        claim: 'It will rain tomorrow',
        probabilities: {
          'Alice': 60,
          'Bob': 40
        }
      }
      
      expect(isBinaryBet(validBinaryBet)).toBe(true)
    })

    it('should reject non-binary bet objects', async () => {
      const { isBinaryBet } = await import('@types/index')
      
      expect(isBinaryBet({})).toBe(false)
      expect(isBinaryBet(null)).toBe(false)
      expect(isBinaryBet({ type: 'MultiCategorical' })).toBe(false)
    })
  })
})

describe('Probability Validation (TDD)', () => {
  describe('probability sum validation', () => {
    it('should accept probabilities that sum to 100%', async () => {
      const { validateProbabilitySum } = await import('@types/index')
      
      expect(validateProbabilitySum([60, 40])).toBe(true)
      expect(validateProbabilitySum([33.33, 33.33, 33.34])).toBe(true)
    })

    it('should reject probabilities that do not sum to 100%', async () => {
      const { validateProbabilitySum } = await import('@types/index')
      
      expect(validateProbabilitySum([60, 30])).toBe(false) // Sum = 90
      expect(validateProbabilitySum([50, 60])).toBe(false) // Sum = 110
    })

    it('should handle floating point precision issues', async () => {
      const { validateProbabilitySum } = await import('@types/index')
      
      // Allow small floating point errors (e.g., 99.99999 should be accepted as 100)
      expect(validateProbabilitySum([33.333333, 33.333333, 33.333334])).toBe(true)
    })
  })

  describe('probability range validation', () => {
    it('should accept probabilities between 0 and 100', async () => {
      const { validateProbabilityRange } = await import('@types/index')
      
      expect(validateProbabilityRange(0)).toBe(true)
      expect(validateProbabilityRange(50)).toBe(true)
      expect(validateProbabilityRange(100)).toBe(true)
    })

    it('should reject negative probabilities', async () => {
      const { validateProbabilityRange } = await import('@types/index')
      
      expect(validateProbabilityRange(-1)).toBe(false)
      expect(validateProbabilityRange(-0.1)).toBe(false)
    })

    it('should reject probabilities greater than 100', async () => {
      const { validateProbabilityRange } = await import('@types/index')
      
      expect(validateProbabilityRange(100.1)).toBe(false)
      expect(validateProbabilityRange(150)).toBe(false)
    })
  })
})

describe('Currency Validation (TDD)', () => {
  describe('contribution validation', () => {
    it('should accept positive contribution amounts', async () => {
      const { validateContribution } = await import('@types/index')
      
      expect(validateContribution(1)).toBe(true)
      expect(validateContribution(100.50)).toBe(true)
      expect(validateContribution(0.01)).toBe(true)
    })

    it('should reject negative contribution amounts', async () => {
      const { validateContribution } = await import('@types/index')
      
      expect(validateContribution(-1)).toBe(false)
      expect(validateContribution(-0.01)).toBe(false)
    })

    it('should reject zero contribution amounts', async () => {
      const { validateContribution } = await import('@types/index')
      
      expect(validateContribution(0)).toBe(false)
    })
  })
})
