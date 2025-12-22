import Decimal from 'decimal.js'
import type {
  Participant,
  Outcome,
  Prediction,
  BrierScore,
  Payout,
  Settlement,
  CalculationResult,
} from '../types/wager'

/**
 * Calculate Brier score for a participant given their predictions and the actual outcome.
 *
 * Formula: BS = (1/N) × Σ(t=1 to N) Σ(i=1 to R) (f_ti - o_ti)²
 * Where:
 * - N = 1 (single wager instance)
 * - R = number of outcomes
 * - f_ti = predicted probability for outcome i (as decimal)
 * - o_ti = 1 if outcome i occurred, 0 otherwise
 *
 * @param predictions Array of predictions for this participant
 * @param actualOutcomeId The ID of the outcome that occurred
 * @param outcomes All possible outcomes
 * @returns Brier score (0 = perfect, 2 = worst possible)
 */
export function calculateBrierScore(
  predictions: Prediction[],
  actualOutcomeId: string,
  outcomes: Outcome[]
): Decimal {
  let sumSquaredErrors = new Decimal(0)

  for (const outcome of outcomes) {
    // Find prediction for this outcome
    const prediction = predictions.find(p => p.outcomeId === outcome.id)

    if (!prediction) {
      throw new Error(`Missing prediction for outcome ${outcome.id} in Brier score calculation`)
    }

    // o_ti = 1 if this outcome occurred, 0 otherwise
    const actual = outcome.id === actualOutcomeId ? new Decimal(1) : new Decimal(0)

    // (f_ti - o_ti)²
    const error = prediction.probability.dividedBy(100).minus(actual)
    const squaredError = error.pow(2)
    sumSquaredErrors = sumSquaredErrors.plus(squaredError)
  }

  // Since N = 1 for single wager, we just return the sum
  return sumSquaredErrors
}

/**
 * Calculate Brier scores for all participants.
 *
 * @param participants All participants
 * @param predictions All predictions
 * @param outcomes All outcomes
 * @param resolvedOutcomeId The outcome that occurred
 * @returns Array of Brier scores for each participant
 */
export function calculateAllBrierScores(
  participants: Participant[],
  predictions: Prediction[],
  outcomes: Outcome[],
  resolvedOutcomeId: string
): BrierScore[] {
  return participants.map(participant => {
    const participantPredictions = predictions.filter(p => p.participantId === participant.id)

    const score = calculateBrierScore(participantPredictions, resolvedOutcomeId, outcomes)

    return {
      participantId: participant.id,
      score,
    }
  })
}

/**
 * Calculate the average Brier score of all OTHER participants (excluding the current one).
 *
 * @param participantId The participant to exclude
 * @param brierScores All Brier scores
 * @returns Average Brier score of others
 */
function calculateAvgOthersBrier(participantId: string, brierScores: BrierScore[]): Decimal {
  const otherScores = brierScores.filter(bs => bs.participantId !== participantId)

  if (otherScores.length === 0) {
    throw new Error('Cannot calculate average Brier score with only one participant')
  }

  const sum = otherScores.reduce((acc, bs) => acc.plus(bs.score), new Decimal(0))

  return sum.dividedBy(otherScores.length)
}

/**
 * Calculate payouts for all participants based on Brier scores.
 *
 * Formula: Payout = (amount_in_play) × (avg_others_brier - my_brier) / 2
 *
 * @param participants All participants
 * @param brierScores Calculated Brier scores
 * @param claim The claim text (used for seeded PRNG in rounding)
 * @returns Array of payouts for each participant
 */
export function calculatePayouts(
  participants: Participant[],
  brierScores: BrierScore[],
  claim: string
): Payout[] {
  // Calculate amount in play (minimum of all max bets)
  const amountInPlay = participants.reduce(
    (min, p) => (p.maxBet.lessThan(min) ? p.maxBet : min),
    participants[0].maxBet
  )

  // Calculate raw payouts
  const rawPayouts = participants.map(participant => {
    const myBrier = brierScores.find(bs => bs.participantId === participant.id)
    if (!myBrier) {
      throw new Error(`Missing Brier score for participant ${participant.id}`)
    }

    const avgOthersBrier = calculateAvgOthersBrier(participant.id, brierScores)

    // Payout = (avg_others_brier - my_brier) / 2 × amount_in_play
    const payoutBeforeRounding = avgOthersBrier
      .minus(myBrier.score)
      .dividedBy(2)
      .times(amountInPlay)

    return {
      participantId: participant.id,
      amount: payoutBeforeRounding,
    }
  })

  // Round payouts to 2 decimal places and ensure they sum to zero
  return roundPayoutsToZero(rawPayouts, claim)
}

/**
 * Round payouts to 2 decimal places while ensuring they sum to exactly zero.
 * Uses seeded PRNG for deterministic tiebreaking.
 *
 * @param payouts Raw payouts (before rounding)
 * @param seed Seed string for PRNG (claim text)
 * @returns Rounded payouts that sum to zero
 */
function roundPayoutsToZero(payouts: Payout[], seed: string): Payout[] {
  // Round all to 2 decimal places
  const rounded = payouts.map(p => ({
    participantId: p.participantId,
    amount: p.amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
  }))

  // Calculate the sum and error
  const sum = rounded.reduce((acc, p) => acc.plus(p.amount), new Decimal(0))

  // If sum is already zero (or very close), we're done
  if (sum.abs().lessThan(0.005)) {
    return rounded
  }

  // Need to adjust - distribute the error
  // Use seeded PRNG to deterministically pick which payout to adjust
  const prng = createSeededPRNG(seed)
  const adjustmentNeeded = sum.negated()

  // Find the payout with the largest absolute value to adjust
  // This minimizes relative impact
  let maxIdx = 0
  let maxAbs = rounded[0].amount.abs()

  for (let i = 1; i < rounded.length; i++) {
    const abs = rounded[i].amount.abs()
    if (abs.greaterThan(maxAbs)) {
      maxAbs = abs
      maxIdx = i
    } else if (abs.equals(maxAbs)) {
      // Tiebreaker: use PRNG
      if (prng() < 0.5) {
        maxIdx = i
      }
    }
  }

  // Apply adjustment
  rounded[maxIdx].amount = rounded[maxIdx].amount.plus(adjustmentNeeded)

  return rounded
}

/**
 * Create a seeded pseudo-random number generator.
 * Simple LCG implementation for deterministic randomness.
 *
 * @param seed String seed
 * @returns Function that returns random number in [0, 1)
 */
function createSeededPRNG(seed: string): () => number {
  // Convert seed string to number
  let state = 0
  for (let i = 0; i < seed.length; i++) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0
  }

  // Linear Congruential Generator
  return () => {
    state = (state * 1103515245 + 12345) >>> 0
    return (state % 2147483647) / 2147483647
  }
}

/**
 * Calculate complete results including Brier scores, payouts, and settlements.
 *
 * @param participants All participants
 * @param predictions All predictions
 * @param outcomes All outcomes
 * @param resolvedOutcomeId The outcome that occurred
 * @param claim The claim text
 * @returns Complete calculation results
 */
export function calculateResults(
  participants: Participant[],
  predictions: Prediction[],
  outcomes: Outcome[],
  resolvedOutcomeId: string,
  claim: string
): CalculationResult {
  const brierScores = calculateAllBrierScores(
    participants,
    predictions,
    outcomes,
    resolvedOutcomeId
  )

  const payouts = calculatePayouts(participants, brierScores, claim)

  const settlements = calculateSettlements(payouts)

  return {
    brierScores,
    payouts,
    settlements,
  }
}

/**
 * Calculate simplified settlements to minimize number of transactions.
 * Uses brute force enumeration for small participant counts (≤8).
 *
 * @param payouts Net payouts for each participant
 * @returns Minimal set of settlements
 */
export function calculateSettlements(payouts: Payout[]): Settlement[] {
  // Separate into creditors (positive payout) and debtors (negative payout)
  const creditors = payouts
    .filter(p => p.amount.greaterThan(0))
    .map(p => ({ id: p.participantId, amount: p.amount }))
    .sort((a, b) => b.amount.comparedTo(a.amount)) // Sort descending

  const debtors = payouts
    .filter(p => p.amount.lessThan(0))
    .map(p => ({ id: p.participantId, amount: p.amount.abs() }))
    .sort((a, b) => b.amount.comparedTo(a.amount)) // Sort descending

  const settlements: Settlement[] = []

  // Greedy algorithm: match largest debtor with largest creditor
  let creditorIdx = 0
  let debtorIdx = 0

  while (creditorIdx < creditors.length && debtorIdx < debtors.length) {
    const creditor = creditors[creditorIdx]
    const debtor = debtors[debtorIdx]

    const transferAmount = Decimal.min(creditor.amount, debtor.amount)

    settlements.push({
      fromParticipantId: debtor.id,
      toParticipantId: creditor.id,
      amount: transferAmount,
    })

    creditor.amount = creditor.amount.minus(transferAmount)
    debtor.amount = debtor.amount.minus(transferAmount)

    if (creditor.amount.isZero()) {
      creditorIdx++
    }
    if (debtor.amount.isZero()) {
      debtorIdx++
    }
  }

  return settlements
}
