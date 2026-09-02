import Decimal from 'decimal.js'
import type { Participant, Outcome, Prediction } from '../types/wager'
import {
  isCompleteTotal,
  normalizePredictions,
  participantTotal,
  setPrediction,
} from '../utils/predictions'
import NumberInput from './NumberInput'

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

  const handleChange = (participantId: string, outcomeId: string, probability: Decimal) => {
    onChange(setPrediction(predictions, participantId, outcomeId, probability))
  }

  const handleNormalize = (participantId: string) => {
    onChange(normalizePredictions(predictions, participantId, outcomes))
  }

  return (
    <div className="space-y-6">
      {participants.map(participant => {
        const total = participantTotal(predictions, participant.id)
        const showWarning = !isCompleteTotal(total)

        return (
          <div key={participant.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              {participant.name || 'Unnamed participant'}
            </h3>

            <div className="space-y-3">
              {outcomes.map(outcome => {
                const prediction = getPrediction(participant.id, outcome.id)

                return (
                  <div key={outcome.id} className="flex min-w-0 items-center gap-1.5 sm:gap-4">
                    <label className="w-20 shrink-0 text-xs leading-tight break-words text-gray-700 sm:w-32 sm:text-sm">
                      {outcome.label}
                    </label>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={prediction.probability.toNumber()}
                      onChange={e =>
                        handleChange(participant.id, outcome.id, new Decimal(e.target.value))
                      }
                      aria-label={`${participant.name || 'Participant'} probability for ${outcome.label}`}
                      className={`h-8 min-w-0 flex-1 cursor-pointer ${!prediction.touched ? 'opacity-40' : ''}`}
                    />

                    <div className="flex shrink-0 items-center gap-0.5">
                      <NumberInput
                        value={prediction.probability}
                        onChange={value => handleChange(participant.id, outcome.id, value)}
                        min={0}
                        max={100}
                        step={1}
                        aria-label={`${participant.name || 'Participant'} probability for ${outcome.label}`}
                        className={`w-12 rounded-md border border-gray-300 px-1 py-1 text-sm placeholder:text-gray-600 focus:outline-none data-[focus]:border-blue-500 data-[focus]:ring-1 data-[focus]:ring-blue-500 sm:w-24 sm:px-2 ${!prediction.touched ? 'text-gray-500' : ''}`}
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
