/**
 * Core types and interfaces for the Wager Calculator application
 * Following the specification requirements for binary and multi-categorical betting
 */

// Currency Enumeration
export enum Currency {
  USD = 'USD ($)',
  EUR = 'EUR (€)',
  GBP = 'GBP (£)',
  CAD = 'CAD (C$)',
  ZZZ = 'DEFAULT', // Placeholder for no currency
}

// Bet Type Enumeration
export enum BetType {
  Binary = 'binary',
  MultiCategorical = 'multi-categorical',
}

// Core Interfaces

/**
 * Represents a participant in a bet
 */
export interface Participant {
  name: string
  maxContribution: number
}

/**
 * Category definition for bets
 */
export interface Category {
  id: string
  name: string // In the case of a range, this could be a label like "1-10" or "A-F"
}

/**
 * Unified bet interface - supports both binary (2 categories) and multi-categorical (2-8 categories) bets
 * Binary bets are just a special case with exactly 2 categories
 */
export interface Bet {
  id: string
  title: string
  details?: string
  deadline?: Date
  currency: Currency
  participants: Participant[] // 2-8 participants
  categories: Category[]
  probabilities: Record<string, Record<string, number>> // participant -> category -> probability (2-8 participants)
}

/**
 * Result of a bet calculation
 */
export interface BetResult {
  betId: string
  isValid: boolean
  errors: string[]
  warnings: string[]
  payouts?: Record<string, number> // outcome -> payout amount
  expectedValues?: Record<string, number> // participant -> expected value
}

/**
 * Detailed calculation result with mathematical breakdown
 */
export interface CalculationResult extends BetResult {
  methodology: 'brier_scoring'
  calculations: {
    brierScores: Record<string, number> // participant -> brier score
    avgBrierOthers: Record<string, number> // participant -> average brier score of others
    payouts: Record<string, Record<string, number>> // outcome -> participant -> payout
    settlements: Record<string, Array<{ from: string; to: string; amount: number }>> // outcome -> settlements
  }
  mathematicalDetails?: {
    formula: string
    steps: string[]
    assumptions: string[]
  }
}

// Utility Functions and Type Guards

/**
 * Creates a participant with validation
 */
export function createParticipant(data: { name: string; maxContribution: number }): Participant {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw new Error('Participant name is required and must be a non-empty string')
  }

  if (typeof data.maxContribution !== 'number' || data.maxContribution <= 0) {
    throw new Error('Max contribution must be a positive number')
  }

  return {
    name: data.name.trim(),
    maxContribution: data.maxContribution,
  }
}

/**
 * Type guard for Participant
 */
export function isParticipant(obj: unknown): obj is Participant {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    typeof (obj as Record<string, unknown>)['name'] === 'string' &&
    ((obj as Record<string, unknown>)['name'] as string).trim().length > 0 &&
    typeof (obj as Record<string, unknown>)['maxContribution'] === 'number' &&
    ((obj as Record<string, unknown>)['maxContribution'] as number) > 0
  )
}

/**
 * Type guard for Bet
 */
export function isBet(obj: unknown): obj is Bet {
  if (
    obj === null ||
    obj === undefined ||
    typeof obj !== 'object' ||
    typeof (obj as Record<string, unknown>)['id'] !== 'string' ||
    typeof (obj as Record<string, unknown>)['title'] !== 'string' ||
    !Object.values(Currency).includes((obj as Record<string, unknown>)['currency'] as Currency) ||
    !Array.isArray((obj as Record<string, unknown>)['participants']) ||
    ((obj as Record<string, unknown>)['participants'] as unknown[]).length < 2 ||
    ((obj as Record<string, unknown>)['participants'] as unknown[]).length > 8 ||
    !((obj as Record<string, unknown>)['participants'] as unknown[]).every(isParticipant) ||
    !Array.isArray((obj as Record<string, unknown>)['categories']) ||
    ((obj as Record<string, unknown>)['categories'] as unknown[]).length < 1 ||
    ((obj as Record<string, unknown>)['categories'] as unknown[]).length > 8 ||
    !('probabilities' in obj) ||
    !(obj as Record<string, unknown>)['probabilities'] ||
    typeof (obj as Record<string, unknown>)['probabilities'] !== 'object'
  ) {
    return false
  }
  return true
}

/**
 * Helper function to check if a bet is binary (has exactly 2 categories)
 */
export function isBinaryBet(bet: Bet): boolean {
  return bet.categories.length === 2
}

/**
 * Helper function to check if a bet is multi-categorical (has more than 2 categories)
 */
export function isMultiCategoricalBet(bet: Bet): boolean {
  return bet.categories.length > 2
}

// Validation Functions

/**
 * Validates that probabilities sum to 100% (with floating point tolerance)
 */
export function validateProbabilitySum(probabilities: number[], tolerance: number = 0.01): boolean {
  const sum = probabilities.reduce((acc, prob) => acc + prob, 0)
  return Math.abs(sum - 100) <= tolerance
}

/**
 * Validates that a probability is within the valid range [0, 100]
 */
export function validateProbabilityRange(probability: number): boolean {
  return probability >= 0 && probability <= 100
}

/**
 * Validates that a contribution amount is positive
 */
export function validateContribution(amount: number): boolean {
  return typeof amount === 'number' && amount > 0
}

/**
 * Validates bet probabilities for all participants and categories
 */
export function validateBetProbabilities(bet: Bet): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check that each participant has probabilities for all categories
  for (const participant of bet.participants) {
    const participantProbs = bet.probabilities[participant.name]

    if (!participantProbs) {
      errors.push(`Missing probabilities for participant: ${participant.name}`)
      continue
    }

    const categoryProbs: number[] = []

    for (const category of bet.categories) {
      const prob = participantProbs[category.id]

      if (prob === undefined || prob === null) {
        errors.push(`Missing probability for ${participant.name} in category ${category.name}`)
        continue
      }

      if (!validateProbabilityRange(prob)) {
        errors.push(
          `Invalid probability ${prob} for ${participant.name} in category ${category.name}. Must be between 0 and 100.`
        )
        continue
      }

      categoryProbs.push(prob)
    }

    // Check that probabilities sum to 100% for this participant
    if (categoryProbs.length === bet.categories.length) {
      if (!validateProbabilitySum(categoryProbs)) {
        errors.push(`Probabilities for ${participant.name} do not sum to 100%`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Error Types

export interface ValidationError {
  field: string
  message: string
  value?: unknown
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

// Export types for sharing and export features
export interface ExportData {
  bet: Bet
  result: CalculationResult
  timestamp: Date
  format: 'text' | 'json' | 'image'
}

export interface ShareData {
  title: string
  text: string
  url?: string
}
