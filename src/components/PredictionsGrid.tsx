import { useRef } from 'react'
import Decimal from 'decimal.js'
import { Input } from '@headlessui/react'
import type { Participant, Outcome, Prediction } from '../types/wager'
import { autoDistribute } from '../utils/autoDistribute'

interface PredictionsGridProps {
  participants: Participant[]
  outcomes: Outcome[]
  predictions: Prediction[]
  onChange: (predictions: Prediction[]) => void
}

export default function PredictionsGrid({
  participants,
  outcomes,
  predictions,
  onChange,
}: PredictionsGridProps) {
  const inputDebounceTimers = useRef<Record<string, NodeJS.Timeout>>({})
  const predictionsRef = useRef<Prediction[]>(predictions)

  const getPrediction = (participantId: string, outcomeId: string): Prediction => {
    return (
      predictions.find(p => p.participantId === participantId && p.outcomeId === outcomeId) || {
        participantId,
        outcomeId,
        probability: new Decimal(0),
        touched: false,
      }
    )
  }

  const handleSliderChange = (participantId: string, outcomeId: string, probability: number) => {
    const updated = [...predictions]
    const index = updated.findIndex(
      p => p.participantId === participantId && p.outcomeId === outcomeId
    )

    const newPrediction: Prediction = {
      participantId,
      outcomeId,
      probability: new Decimal(probability),
      touched: true,
    }

    if (index >= 0) {
      updated[index] = newPrediction
    } else {
      updated.push(newPrediction)
    }

    // Auto-distribute immediately to avoid flashing warning
    const distributed = autoDistribute(updated, participantId)
    onChange(distributed)
  }

  const handleSliderMouseUp = () => {
    // Auto-distribute already handled in handleSliderChange
  }

  const handleInputChange = (participantId: string, outcomeId: string, probability: number) => {
    const updated = [...predictions]
    const index = updated.findIndex(
      p => p.participantId === participantId && p.outcomeId === outcomeId
    )

    const newPrediction: Prediction = {
      participantId,
      outcomeId,
      probability: new Decimal(probability),
      touched: true,
    }

    if (index >= 0) {
      updated[index] = newPrediction
    } else {
      updated.push(newPrediction)
    }

    // Auto-distribute immediately to avoid flashing warning
    const distributed = autoDistribute(updated, participantId)
    onChange(distributed)
    predictionsRef.current = distributed

    // Clear any pending debounce timeout for this input
    const key = `${participantId}-${outcomeId}`
    if (inputDebounceTimers.current[key]) {
      clearTimeout(inputDebounceTimers.current[key])
    }
  }

  const getParticipantTotal = (participantId: string): Decimal => {
    return predictions
      .filter(p => p.participantId === participantId)
      .reduce((sum, p) => sum.plus(p.probability), new Decimal(0))
  }

  const hasWarning = (participantId: string): boolean => {
    const total = getParticipantTotal(participantId)
    return total.minus(100).abs().greaterThan(0.01) // Allow for floating point errors
  }

  const handleNormalize = (participantId: string) => {
    const validOutcomeIds = new Set(outcomes.map(o => o.id))
    const participantPredictions = predictions.filter(
      p => p.participantId === participantId && validOutcomeIds.has(p.outcomeId)
    )
    const total = participantPredictions.reduce((sum, p) => sum.plus(p.probability), new Decimal(0))

    if (total.isZero()) return

    const scale = new Decimal(100).div(total)

    // Scale values using high precision arithmetic - keep as Decimal
    const scaled = participantPredictions.map(p => ({
      ...p,
      probability: p.probability.mul(scale),
    }))

    // Calculate exact sum using high precision
    const scaledTotal = scaled.reduce((sum, p) => sum.plus(p.probability), new Decimal(0))
    const roundingError = new Decimal(100).minus(scaledTotal)

    // Distribute rounding error to earlier outcomes (deterministic)
    // Only adjust if error exceeds floating point precision threshold
    if (roundingError.abs().greaterThan(0.001)) {
      const adjustment = roundingError.greaterThan(0) ? new Decimal(0.01) : new Decimal(-0.01)
      let remaining = roundingError.abs()

      for (let i = 0; i < scaled.length && remaining.greaterThan(0.001); i++) {
        scaled[i].probability = scaled[i].probability.plus(adjustment)
        remaining = remaining.minus(0.01)
      }
    }

    // Update predictions - keep as Decimal in state
    const updated = predictions.map(p => {
      const scaledPrediction = scaled.find(
        sp => sp.participantId === p.participantId && sp.outcomeId === p.outcomeId
      )
      return scaledPrediction || p
    })

    onChange(updated)
  }

  return (
    <div className="space-y-6">
      {participants.map(participant => {
        const total = getParticipantTotal(participant.id)
        const showWarning = hasWarning(participant.id)

        return (
          <div key={participant.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">{participant.name}</h3>

            <div className="space-y-3">
              {outcomes.map(outcome => {
                const prediction = getPrediction(participant.id, outcome.id)

                return (
                  <div key={outcome.id} className="flex min-w-0 items-center gap-1.5 sm:gap-4">
                    <label className="w-10 shrink-0 text-xs text-gray-700 sm:w-16 sm:text-sm">
                      {outcome.label}
                    </label>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={prediction.probability.toNumber()}
                      onChange={e =>
                        handleSliderChange(participant.id, outcome.id, parseFloat(e.target.value))
                      }
                      onMouseUp={handleSliderMouseUp}
                      onClick={handleSliderMouseUp}
                      className={`min-w-0 flex-1 ${!prediction.touched ? 'opacity-40' : ''}`}
                    />

                    <div className="flex shrink-0 items-center gap-0.5">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={prediction.probability.toDecimalPlaces(2).toNumber()}
                        onChange={e =>
                          handleInputChange(
                            participant.id,
                            outcome.id,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className={`w-12 rounded-md border border-gray-300 px-1 py-1 text-sm focus:outline-none data-[focus]:border-blue-500 data-[focus]:ring-1 data-[focus]:ring-blue-500 sm:w-16 sm:px-1.5 ${!prediction.touched ? 'text-gray-400' : ''}`}
                      />
                      <span className="text-xs text-gray-600 sm:text-sm">%</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium text-gray-700">Total: </span>
                <span className={showWarning ? 'font-semibold text-amber-600' : 'text-gray-900'}>
                  {total.toDecimalPlaces(2).toString()}%
                </span>
              </div>

              {showWarning && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-amber-600">Probabilities must sum to 100%</span>
                  <button
                    type="button"
                    onClick={() => handleNormalize(participant.id)}
                    className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                  >
                    Normalize
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
