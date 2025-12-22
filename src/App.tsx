import { useState, useEffect, useRef, useMemo } from 'react'
import Decimal from 'decimal.js'
import InlineEdit from './components/InlineEdit'
import StakesSelector from './components/StakesSelector'
import ParticipantsList from './components/ParticipantsList'
import OutcomesList from './components/OutcomesList'
import PredictionsGrid from './components/PredictionsGrid'
import Resolution from './components/Resolution'
import { calculateResults } from './modules/brier'
import type { Participant, Outcome, Prediction, CalculationResult } from './types/wager'
import {
  getDefaultState,
  serializeState,
  deserializeState,
  decodeStateFromURL,
  getShareableURL,
} from './utils/urlState'

function App() {
  // Initialize state from URL if available, otherwise use defaults
  // Compute once and store in a ref-like pattern using lazy initialization
  const getInitialStateOnce = () => {
    const urlState = decodeStateFromURL(window.location.hash)
    if (urlState) {
      return deserializeState(urlState)
    }
    const defaultState = getDefaultState()
    return deserializeState(defaultState)
  }

  const initialState = getInitialStateOnce()

  const [claim, setClaim] = useState(initialState.claim)
  const [details, setDetails] = useState(initialState.details)
  const [stakes, setStakes] = useState(initialState.stakes)
  const [participants, setParticipants] = useState<Participant[]>(initialState.participants)
  const [outcomes, setOutcomes] = useState<Outcome[]>(initialState.outcomes)
  const [predictions, setPredictions] = useState<Prediction[]>(initialState.predictions)
  const [resolvedOutcomeId, setResolvedOutcomeId] = useState<string | null>(
    initialState.resolvedOutcomeId
  )
  const previousParticipantsRef = useRef<Participant[]>([])
  const previousOutcomesRef = useRef<Outcome[]>([])

  // Calculate results when wager is resolved
  const calculationResults = useMemo<CalculationResult | null>(() => {
    if (!resolvedOutcomeId || participants.length === 0 || outcomes.length === 0) {
      return null
    }

    try {
      return calculateResults(participants, predictions, outcomes, resolvedOutcomeId, claim)
    } catch (error) {
      console.error('Error calculating results:', error)
      return null
    }
  }, [resolvedOutcomeId, participants, predictions, outcomes, claim])

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

  // Reset form to defaults
  const handleReset = () => {
    const defaultState = getDefaultState()
    const deserialized = deserializeState(defaultState)
    setClaim(deserialized.claim)
    setDetails(deserialized.details)
    setStakes(deserialized.stakes)
    setParticipants(deserialized.participants)
    setOutcomes(deserialized.outcomes)
    setPredictions(deserialized.predictions)
    setResolvedOutcomeId(deserialized.resolvedOutcomeId)
    window.location.hash = ''
  }

  // Share wager by copying URL to clipboard
  const handleShare = async () => {
    const state = serializeState(
      claim,
      details,
      stakes,
      participants,
      outcomes,
      predictions,
      resolvedOutcomeId
    )
    const url = getShareableURL(state)

    try {
      await navigator.clipboard.writeText(url)
      // Update URL hash without reloading
      window.history.replaceState(null, '', url)
    } catch (error) {
      console.error('Failed to copy URL to clipboard:', error)
      // Fallback: just update the URL
      window.history.replaceState(null, '', url)
    }
  }

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
              onClick={handleReset}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              Reset Form
            </button>
            <button
              type="button"
              onClick={handleShare}
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

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Resolution</label>
              <Resolution
                outcomes={outcomes}
                participants={participants}
                predictions={predictions}
                stakes={stakes}
                resolvedOutcomeId={resolvedOutcomeId}
                calculationResults={calculationResults}
                onChange={setResolvedOutcomeId}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
