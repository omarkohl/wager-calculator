import Decimal from 'decimal.js'
import type { Outcome, Participant, Payout, Prediction } from './wager'
import { calculateAllBrierScores, calculatePayouts, calculateRawPayouts } from './brier'

/**
 * What the wager would pay out before it is resolved: the payouts of every
 * possible resolution and what each participant should expect on average.
 */

export interface OutcomePayouts {
  outcomeId: string
  payouts: Payout[]
}

/**
 * The net payouts that each possible resolution would produce, in outcome
 * order. Rounded exactly like the real payouts so the numbers match what the
 * participants will see once the wager resolves.
 */
export function payoutsForEveryOutcome(
  participants: Participant[],
  predictions: Prediction[],
  outcomes: Outcome[],
  claim: string
): OutcomePayouts[] {
  return outcomes.map(outcome => ({
    outcomeId: outcome.id,
    payouts: calculatePayouts(
      participants,
      calculateAllBrierScores(participants, predictions, outcomes, outcome.id),
      claim
    ),
  }))
}

function probabilityOf(predictions: Prediction[], participantId: string, outcomeId: string) {
  const prediction = predictions.find(
    p => p.participantId === participantId && p.outcomeId === outcomeId
  )
  return (prediction?.probability ?? new Decimal(0)).dividedBy(100)
}

/**
 * Each participant's expected payout by their own beliefs: every resolution's
 * payout weighted by the probability that participant assigned to it. Computed
 * from the given table so that it can be checked by hand against it.
 */
export function expectedPayouts(
  participants: Participant[],
  predictions: Prediction[],
  table: OutcomePayouts[]
): Payout[] {
  return participants.map(participant => ({
    participantId: participant.id,
    amount: table.reduce((sum, { outcomeId, payouts }) => {
      const payout = payouts.find(p => p.participantId === participant.id)?.amount ?? new Decimal(0)
      return sum.plus(probabilityOf(predictions, participant.id, outcomeId).times(payout))
    }, new Decimal(0)),
  }))
}

/**
 * The expected payout of one participant, by their current (true) beliefs,
 * if they reported the given predictions instead. Uses unrounded payouts so
 * that small shifts are not hidden or distorted by rounding to cents.
 */
export function expectedPayoutIfReporting(
  participants: Participant[],
  predictions: Prediction[],
  outcomes: Outcome[],
  participantId: string,
  reported: Prediction[]
): Decimal {
  const modified = [
    ...predictions.filter(p => p.participantId !== participantId),
    ...reported.filter(p => p.participantId === participantId),
  ]

  return outcomes.reduce((sum, outcome) => {
    const scores = calculateAllBrierScores(participants, modified, outcomes, outcome.id)
    const payout = calculateRawPayouts(participants, scores).find(
      p => p.participantId === participantId
    )
    if (!payout) {
      throw new Error(`Unknown participant ${participantId}`)
    }
    return sum.plus(probabilityOf(predictions, participantId, outcome.id).times(payout.amount))
  }, new Decimal(0))
}
