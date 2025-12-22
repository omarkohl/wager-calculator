import Decimal from 'decimal.js'
import type { Prediction } from '../types/wager'

/**
 * Auto-distributes remaining probability to untouched predictions for a participant.
 * Only distributes when there are untouched predictions.
 * Distributes evenly among all untouched predictions.
 */
export function autoDistribute(predictions: Prediction[], participantId: string): Prediction[] {
  const participantPredictions = predictions.filter(p => p.participantId === participantId)
  const total = participantPredictions
    .filter(p => p.touched)
    .reduce((sum, p) => sum.plus(p.probability), new Decimal(0))

  // Find untouched predictions for this participant
  const untouchedPredictions = participantPredictions.filter(p => !p.touched)

  if (untouchedPredictions.length === 0) {
    return predictions
  }

  const remaining = new Decimal(100).minus(total)
  let perUntouched = new Decimal(0)
  if (remaining.isPos()) {
    perUntouched = remaining.div(untouchedPredictions.length)
  }

  // Create updated predictions array
  return predictions.map(p => {
    if (p.participantId === participantId && !p.touched) {
      return {
        ...p,
        probability: perUntouched,
      }
    }
    return p
  })
}
