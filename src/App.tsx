import { useState, useEffect, useRef } from 'react'
import Decimal from 'decimal.js'
import InlineEdit from './components/InlineEdit'
import StakesSelector from './components/StakesSelector'
import ParticipantsList from './components/ParticipantsList'
import OutcomesList from './components/OutcomesList'
import PredictionsGrid from './components/PredictionsGrid'
import type { Participant, Outcome, Prediction } from './types/wager'

function App() {
  const [claim, setClaim] = useState('')
  const [details, setDetails] = useState('')
  const [stakes, setStakes] = useState('usd')
  const [participants, setParticipants] = useState<Participant[]>([
    { id: crypto.randomUUID(), name: 'Artem', maxBet: new Decimal(0) },
    { id: crypto.randomUUID(), name: 'Baani', maxBet: new Decimal(0) },
  ])
  const [outcomes, setOutcomes] = useState<Outcome[]>([
    { id: crypto.randomUUID(), label: 'Yes' },
    { id: crypto.randomUUID(), label: 'No' },
  ])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const previousParticipantsRef = useRef<Participant[]>([])
  const previousOutcomesRef = useRef<Outcome[]>([])

  // Initialize predictions with even distribution when participants or outcomes change
  useEffect(() => {
    if (participants.length === 0 || outcomes.length === 0) return

    // Check if participants or outcomes actually changed
    const participantsChanged =
      participants.length !== previousParticipantsRef.current.length ||
      participants.some((p, i) => p.id !== previousParticipantsRef.current[i]?.id)
    const outcomesChanged =
      outcomes.length !== previousOutcomesRef.current.length ||
      outcomes.some((o, i) => o.id !== previousOutcomesRef.current[i]?.id)

    if (!participantsChanged && !outcomesChanged) return

    previousParticipantsRef.current = participants
    previousOutcomesRef.current = outcomes

    const evenProbability = new Decimal(100).div(outcomes.length)

    // Create predictions for all participant-outcome combinations
    const newPredictions: Prediction[] = []
    participants.forEach(participant => {
      outcomes.forEach(outcome => {
        // Only add if doesn't exist
        const exists = predictions.find(
          p => p.participantId === participant.id && p.outcomeId === outcome.id
        )
        if (!exists) {
          newPredictions.push({
            participantId: participant.id,
            outcomeId: outcome.id,
            probability: evenProbability,
            touched: false,
          })
        }
      })
    })

    if (newPredictions.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPredictions(prev => [...prev, ...newPredictions])
    }
  }, [participants, outcomes, predictions])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Wager</h1>
          <p className="mt-2 text-sm text-gray-600">
            Calculate fair betting odds using Brier scoring
          </p>
        </header>

        <main className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-6 flex justify-end gap-3">
            <button
              type="button"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              Reset Form
            </button>
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              Share Wager
            </button>
          </div>

          {/* Claim & Details Section */}
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Claim</label>
              <InlineEdit
                value={claim}
                onChange={setClaim}
                placeholder="What are you betting on?"
                displayClassName="text-lg font-semibold"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Details <span className="text-gray-400">(Optional)</span>
              </label>
              <InlineEdit
                value={details}
                onChange={setDetails}
                placeholder="Add resolution criteria or context..."
                multiline
                displayClassName="text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Stakes</label>
              <StakesSelector value={stakes} onChange={value => value && setStakes(value)} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Participants & Max Bets
              </label>
              <ParticipantsList
                participants={participants}
                onChange={setParticipants}
                stakes={stakes}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Outcomes</label>
              <OutcomesList outcomes={outcomes} onChange={setOutcomes} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Predictions</label>
              <PredictionsGrid
                participants={participants}
                outcomes={outcomes}
                predictions={predictions}
                onChange={setPredictions}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
