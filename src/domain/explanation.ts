import Decimal from 'decimal.js'
import type { BrierScore, Outcome, Participant, Prediction } from './wager'
import {
  amountInPlay,
  calculateAllBrierScores,
  calculateAvgOthersBrier,
  calculatePayouts,
  calculateRawPayouts,
} from './brier'

/**
 * Every intermediate number behind a resolved wager's payouts, so the UI can
 * show the calculation step by step.
 */

export interface BrierTerm {
  outcomeId: string
  /** The predicted probability as a fraction (0.7 for 70%) */
  probability: Decimal
  occurred: boolean
  /** (probability − occurred)² */
  squaredError: Decimal
}

export interface PayoutExplanation {
  participantId: string
  terms: BrierTerm[]
  brierScore: Decimal
  othersBrierScores: BrierScore[]
  avgOthersBrier: Decimal
  /** amount_in_play × (avg_others_brier − brier_score) / 2, unrounded */
  rawPayout: Decimal
  /** The payout actually shown: rounded to two decimals, summing to zero */
  payout: Decimal
  /** True when the payout had to be nudged beyond plain rounding to reach a zero sum */
  roundingAdjusted: boolean
}

export interface ResultExplanation {
  amountInPlay: Decimal
  participants: PayoutExplanation[]
}

export function explainResults(
  participants: Participant[],
  predictions: Prediction[],
  outcomes: Outcome[],
  resolvedOutcomeId: string,
  claim: string
): ResultExplanation {
  const brierScores = calculateAllBrierScores(
    participants,
    predictions,
    outcomes,
    resolvedOutcomeId
  )
  const rawPayouts = calculateRawPayouts(participants, brierScores)
  const payouts = calculatePayouts(participants, brierScores, claim)

  const find = <T extends { participantId: string }>(items: T[], participantId: string): T => {
    const item = items.find(i => i.participantId === participantId)
    if (!item) throw new Error(`Missing entry for participant ${participantId}`)
    return item
  }

  return {
    amountInPlay: amountInPlay(participants),
    participants: participants.map(participant => {
      const terms = outcomes.map(outcome => {
        const prediction = predictions.find(
          p => p.participantId === participant.id && p.outcomeId === outcome.id
        )
        const probability = (prediction?.probability ?? new Decimal(0)).dividedBy(100)
        const occurred = outcome.id === resolvedOutcomeId
        return {
          outcomeId: outcome.id,
          probability,
          occurred,
          squaredError: probability.minus(occurred ? 1 : 0).pow(2),
        }
      })

      const rawPayout = find(rawPayouts, participant.id).amount
      const payout = find(payouts, participant.id).amount

      return {
        participantId: participant.id,
        terms,
        brierScore: find(brierScores, participant.id).score,
        othersBrierScores: brierScores.filter(bs => bs.participantId !== participant.id),
        avgOthersBrier: calculateAvgOthersBrier(participant.id, brierScores),
        rawPayout,
        payout,
        roundingAdjusted: !payout.equals(rawPayout.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)),
      }
    }),
  }
}
