export interface Participant {
  id: string
  name: string
  maxBet: number
}

export interface Outcome {
  id: string
  label: string
}

export interface Prediction {
  participantId: string
  outcomeId: string
  probability: number
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
  score: number
}

export interface Payout {
  participantId: string
  amount: number
}

export interface Settlement {
  fromParticipantId: string
  toParticipantId: string
  amount: number
}

export interface CalculationResult {
  brierScores: BrierScore[]
  payouts: Payout[]
  settlements: Settlement[]
}
