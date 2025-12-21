import type Decimal from 'decimal.js'

export interface Participant {
  id: string
  name: string
  maxBet: Decimal
}

export interface Outcome {
  id: string
  label: string
}

export interface Prediction {
  participantId: string
  outcomeId: string
  probability: Decimal
  touched: boolean
}

export interface Wager {
  claim: string
  details: string
  stakes: string
  participants: Participant[]
  outcomes: Outcome[]
  predictions: Prediction[]
  resolvedOutcomeId: string | null
}

export interface BrierScore {
  participantId: string
  score: Decimal
}

export interface Payout {
  participantId: string
  amount: Decimal
}

export interface Settlement {
  fromParticipantId: string
  toParticipantId: string
  amount: Decimal
}

export interface CalculationResult {
  brierScores: BrierScore[]
  payouts: Payout[]
  settlements: Settlement[]
}
