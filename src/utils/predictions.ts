import Decimal from 'decimal.js'
import type { Outcome, Participant, Prediction } from '../types/wager'

/**
 * Rules for a participant's probability distribution over the outcomes.
 *
 * Probabilities are percentages (0-100). A prediction is "touched" once the
 * participant has set it deliberately; untouched predictions are placeholders
 * the app is free to rewrite so that the distribution stays complete.
 *
 * Every function returns a new array and leaves its input untouched.
 */

/**
 * Totals within this distance of 100% count as complete. Absorbs the tiny
 * remainders that repeated division leaves behind.
 */
const TOTAL_TOLERANCE = new Decimal(0.001)

function isFor(participantId: string, outcomeId?: string) {
  return (p: Prediction) =>
    p.participantId === participantId && (outcomeId === undefined || p.outcomeId === outcomeId)
}

/**
 * Sum of a participant's probabilities
 */
export function participantTotal(predictions: Prediction[], participantId: string): Decimal {
  return predictions
    .filter(isFor(participantId))
    .reduce((sum, p) => sum.plus(p.probability), new Decimal(0))
}

/**
 * Whether a total counts as 100%
 */
export function isCompleteTotal(total: Decimal): boolean {
  return total.minus(100).abs().lessThan(TOTAL_TOLERANCE)
}

/**
 * Spread whatever probability the participant has not assigned yet evenly
 * over their untouched predictions. Touched predictions are never changed and
 * nothing happens when the touched ones already reach 100%.
 */
export function autoDistribute(predictions: Prediction[], participantId: string): Prediction[] {
  const participantPredictions = predictions.filter(isFor(participantId))
  const untouched = participantPredictions.filter(p => !p.touched)

  if (untouched.length === 0) {
    return predictions
  }

  const touchedTotal = participantPredictions
    .filter(p => p.touched)
    .reduce((sum, p) => sum.plus(p.probability), new Decimal(0))
  const remaining = new Decimal(100).minus(touchedTotal)
  const perUntouched = remaining.isPos() ? remaining.div(untouched.length) : new Decimal(0)

  return predictions.map(p =>
    p.participantId === participantId && !p.touched ? { ...p, probability: perUntouched } : p
  )
}

/**
 * Record a deliberate probability for one participant/outcome pair and
 * redistribute the remainder over that participant's untouched predictions.
 */
export function setPrediction(
  predictions: Prediction[],
  participantId: string,
  outcomeId: string,
  probability: Decimal
): Prediction[] {
  const updated: Prediction = { participantId, outcomeId, probability, touched: true }
  const index = predictions.findIndex(isFor(participantId, outcomeId))
  const next =
    index >= 0 ? predictions.map((p, i) => (i === index ? updated : p)) : [...predictions, updated]
  return autoDistribute(next, participantId)
}

/**
 * Make sure every participant has a prediction for every outcome. Missing
 * ones start untouched and share whatever probability is still unassigned.
 * Returns the input array itself when nothing was missing.
 */
export function fillMissingPredictions(
  predictions: Prediction[],
  participants: Participant[],
  outcomes: Outcome[]
): Prediction[] {
  const missing: Prediction[] = []
  for (const participant of participants) {
    for (const outcome of outcomes) {
      if (!predictions.some(isFor(participant.id, outcome.id))) {
        missing.push({
          participantId: participant.id,
          outcomeId: outcome.id,
          probability: new Decimal(0),
          touched: false,
        })
      }
    }
  }

  if (missing.length === 0) {
    return predictions
  }

  return participants.reduce(
    (result, participant) => autoDistribute(result, participant.id),
    [...predictions, ...missing]
  )
}

/**
 * Scale a participant's probabilities so they sum to exactly 100%, keeping
 * their proportions. Only predictions for the given outcomes take part;
 * stale predictions for removed outcomes are left alone. Rounding leftovers
 * go to the first outcomes in 0.01 steps so the result is deterministic.
 * Returns the input unchanged when the total is zero.
 */
export function normalizePredictions(
  predictions: Prediction[],
  participantId: string,
  outcomes: Outcome[]
): Prediction[] {
  const outcomeIds = new Set(outcomes.map(o => o.id))
  const own = predictions.filter(
    p => p.participantId === participantId && outcomeIds.has(p.outcomeId)
  )
  const total = own.reduce((sum, p) => sum.plus(p.probability), new Decimal(0))

  if (total.isZero()) {
    return predictions
  }

  const scale = new Decimal(100).div(total)
  const scaled = own.map(p => ({ ...p, probability: p.probability.mul(scale) }))

  const scaledTotal = scaled.reduce((sum, p) => sum.plus(p.probability), new Decimal(0))
  const roundingError = new Decimal(100).minus(scaledTotal)
  if (roundingError.abs().greaterThan(TOTAL_TOLERANCE)) {
    const step = new Decimal(roundingError.isPos() ? 0.01 : -0.01)
    let remaining = roundingError.abs()
    for (let i = 0; i < scaled.length && remaining.greaterThan(TOTAL_TOLERANCE); i++) {
      scaled[i].probability = scaled[i].probability.plus(step)
      remaining = remaining.minus(0.01)
    }
  }

  return predictions.map(p => scaled.find(isFor(p.participantId, p.outcomeId)) ?? p)
}

/**
 * True when every participant assigned the same probability to every outcome
 * as the first participant did, which makes all payouts zero.
 */
export function haveIdenticalPredictions(
  participants: Participant[],
  predictions: Prediction[]
): boolean {
  if (participants.length < 2) return false

  const byOutcome = (participantId: string) =>
    predictions.filter(isFor(participantId)).sort((a, b) => a.outcomeId.localeCompare(b.outcomeId))

  const reference = byOutcome(participants[0].id)
  return participants.slice(1).every(participant => {
    const own = byOutcome(participant.id)
    return (
      own.length === reference.length &&
      own.every(
        (p, i) =>
          p.outcomeId === reference[i].outcomeId && p.probability.equals(reference[i].probability)
      )
    )
  })
}
