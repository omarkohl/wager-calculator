/**
 * Core types and interfaces for the Wager Calculator application
 * Following the specification requirements for binary and multi-categorical betting
 */

// Bet Type Enumeration
export enum BetType {
  Binary = 'Binary',
  MultiCategorical = 'MultiCategorical',
}

// Currency Enumeration
export enum Currency {
  USD = 'USD ($)',
  EUR = 'EUR (€)',
  GBP = 'GBP (£)',
  CAD = 'CAD (C$)',
  ZZZ = 'DEFAULT', // Placeholder for no currency
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
 * Base interface for all bet types
 */
export interface BaseBet {
  id: string
  type: BetType
  title: string
  details?: string
  deadline?: Date
  currency: Currency
  participants: [Participant, Participant] // Exactly 2 participants
}

/**
 * Binary bet interface - YES/NO outcomes where each participant provides their probability assessment for the YES outcome
 * The title field from BaseBet serves as the claim/statement being bet on
 */
export interface BinaryBet extends BaseBet {
  type: BetType.Binary
  probabilities: Record<string, number> // participant name -> their probability for YES outcome
}

/**
 * Category definition for multi-categorical bets
 */
export interface Category {
  id: string
  name: string // In the case of a range, this could be a label like "1-10" or "A-F"
}

/**
 * Multi-categorical bet interface - up to 8 categories
 */
export interface MultiCategoricalBet extends BaseBet {
  type: BetType.MultiCategorical
  categories: Category[] // 1-8 categories
  probabilities: Record<string, Record<string, number>> // participant -> category -> probability
}

/**
 * Union type for all bet types
 */
export type Bet = BinaryBet | MultiCategoricalBet

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
  methodology: 'logarithmic_scoring'
  calculations: {
    scores: Record<string, number>
    fairOdds: Record<string, number>
    optimalBets: Record<string, number>
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
 * Type guard for BinaryBet
 */
export function isBinaryBet(obj: unknown): obj is BinaryBet {
  if (
    obj === null ||
    obj === undefined ||
    typeof obj !== 'object' ||
    (obj as Record<string, unknown>)['type'] !== BetType.Binary ||
    typeof (obj as Record<string, unknown>)['id'] !== 'string' ||
    typeof (obj as Record<string, unknown>)['title'] !== 'string' ||
    !Object.values(Currency).includes(
      (obj as Record<string, unknown>)['currency'] as Currency,
    ) ||
    !Array.isArray((obj as Record<string, unknown>)['participants']) ||
    ((obj as Record<string, unknown>)['participants'] as unknown[]).length !==
      2 ||
    !((obj as Record<string, unknown>)['participants'] as unknown[]).every(
      isParticipant,
    ) ||
    !(obj as Record<string, unknown>)['probabilities'] ||
    typeof (obj as Record<string, unknown>)['probabilities'] !== 'object' ||
    Array.isArray((obj as Record<string, unknown>)['probabilities'])
  ) {
    return false
  }
  return true
}

/**
 * Type guard for MultiCategoricalBet
 */
export function isMultiCategoricalBet(obj: unknown): obj is MultiCategoricalBet {
  if (
    obj === null ||
    obj === undefined ||
    typeof obj !== 'object' ||
    (obj as Record<string, unknown>)['type'] !== BetType.MultiCategorical ||
    typeof (obj as Record<string, unknown>)['id'] !== 'string' ||
    typeof (obj as Record<string, unknown>)['title'] !== 'string' ||
    !Object.values(Currency).includes(
      (obj as Record<string, unknown>)['currency'] as Currency,
    ) ||
    !Array.isArray((obj as Record<string, unknown>)['participants']) ||
    ((obj as Record<string, unknown>)['participants'] as unknown[]).length !==
      2 ||
    !((obj as Record<string, unknown>)['participants'] as unknown[]).every(
      isParticipant,
    ) ||
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
 * Validates binary bet probabilities
 */
export function validateBinaryBetProbabilities(
  probabilities: Record<string, number>,
  participants: Participant[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check that we have exactly the right participants
  const participantNames = participants.map(p => p.name)
  const probabilityNames = Object.keys(probabilities)

  // Check for missing participants
  for (const participantName of participantNames) {
    if (!(participantName in probabilities)) {
      errors.push(`Missing probability for participant: ${participantName}`)
    }
  }

  // Check for extra participants
  for (const probabilityName of probabilityNames) {
    if (!participantNames.includes(probabilityName)) {
      errors.push(`Unknown participant in probabilities: ${probabilityName}`)
    }
  }

  // Validate probability ranges
  for (const [participantName, probability] of Object.entries(probabilities)) {
    if (!validateProbabilityRange(probability)) {
      errors.push(
        `Invalid probability ${probability} for ${participantName}. Must be between 0 and 100.`
      )
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates that probabilities for all participants sum to 100% for each category
 */
export function validateMultiCategoricalProbabilities(
  probabilities: Record<string, Record<string, number>>,
  categories: Category[],
  participants: Participant[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check that each category has probabilities for all participants
  for (const category of categories) {
    const categoryProbs: number[] = []

    for (const participant of participants) {
      const prob = probabilities[participant.name]?.[category.id]

      if (prob === undefined || prob === null) {
        errors.push(`Missing probability for ${participant.name} in category ${category.name}`)
        continue
      }

      if (!validateProbabilityRange(prob)) {
        errors.push(
          `Invalid probability ${prob} for ${participant.name} in category ${category.name}`
        )
        continue
      }

      categoryProbs.push(prob)
    }

    if (categoryProbs.length === participants.length) {
      if (!validateProbabilitySum(categoryProbs)) {
        errors.push(`Probabilities for category ${category.name} do not sum to 100%`)
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
