import { useState, useEffect, useRef, useMemo } from 'react'
import Decimal from 'decimal.js'
import { QuestionMarkCircleIcon, ArrowPathIcon, ShareIcon } from '@heroicons/react/24/outline'
import InlineEdit from './components/InlineEdit'
import StakesSelector from './components/StakesSelector'
import ParticipantsList from './components/ParticipantsList'
import OutcomesList from './components/OutcomesList'
import PredictionsGrid from './components/PredictionsGrid'
import Resolution from './components/Resolution'
import HelpModal from './components/HelpSection'
import ConfirmDialog from './components/ConfirmDialog'
import Footer from './components/Footer'
import { calculateResults } from './modules/brier'
import type { Participant, Outcome, Prediction, CalculationResult } from './types/wager'
import {
  getDefaultState,
  serializeState,
  deserializeState,
  decodeStateFromURL,
  encodeStateToURL,
  getShareableURL,
} from './utils/urlState'

function App() {
  // Initialize state from URL if available, otherwise use defaults
  // Compute once and store in a ref-like pattern using lazy initialization
  const getInitialStateOnce = () => {
    const urlState = decodeStateFromURL(window.location.hash)
    if (urlState) {
      return { state: deserializeState(urlState), isFromURL: true }
    }
    const defaultState = getDefaultState()
    return { state: deserializeState(defaultState), isFromURL: false }
  }

  const initialStateData = useMemo(() => getInitialStateOnce(), [])
  const initialState = initialStateData.state
  const shouldAutoFocusClaim = !initialStateData.isFromURL

  const [claim, setClaim] = useState(initialState.claim)
  const [details, setDetails] = useState(initialState.details)
  const [stakes, setStakes] = useState(initialState.stakes)
  const [participants, setParticipants] = useState<Participant[]>(initialState.participants)
  const [outcomes, setOutcomes] = useState<Outcome[]>(initialState.outcomes)
  const [predictions, setPredictions] = useState<Prediction[]>(initialState.predictions)
  const [resolvedOutcomeId, setResolvedOutcomeId] = useState<string | null>(
    initialState.resolvedOutcomeId
  )
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const previousParticipantsRef = useRef<Participant[]>([])
  const previousOutcomesRef = useRef<Outcome[]>([])

  // Auto-sync state to URL with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      const state = serializeState(
        claim,
        details,
        stakes,
        participants,
        outcomes,
        predictions,
        resolvedOutcomeId
      )
      const hash = encodeStateToURL(state)
      window.history.replaceState(null, '', hash)
    }, 400)

    return () => clearTimeout(timer)
  }, [claim, details, stakes, participants, outcomes, predictions, resolvedOutcomeId])

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
    setIsResetConfirmOpen(true)
  }

  const confirmReset = () => {
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
      // Show toast
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL to clipboard:', error)
      // Fallback: just update the URL
      window.history.replaceState(null, '', url)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center gap-3 sm:gap-4">
          <img src="/icon-180.png" alt="" className="h-12 w-12 shrink-0 sm:h-16 sm:w-16" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-4xl">Wager Calculator</h1>
            <p className="text-xs text-gray-600 sm:text-sm">Betting is a tax on bullshit</p>
          </div>
        </header>

        <main className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-6 flex justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              <QuestionMarkCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              FAQ
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              <ArrowPathIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Reset
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              <ShareIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Share
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
                autoFocus={shouldAutoFocusClaim}
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
                predictions={predictions}
                onChange={setParticipants}
                onPredictionsChange={setPredictions}
                stakes={stakes}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Outcomes</label>
              <OutcomesList
                outcomes={outcomes}
                predictions={predictions}
                onChange={setOutcomes}
                onPredictionsChange={setPredictions}
              />
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
          <div className="mt-6 flex justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              <QuestionMarkCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              FAQ
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              <ArrowPathIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Reset
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              <ShareIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Share
            </button>
          </div>
        </main>
      </div>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={confirmReset}
        title="Reset Form?"
        message="This will clear all your data and return the form to its default state. This action cannot be undone."
        confirmLabel="Reset"
      />

      {showToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          URL copied to clipboard
        </div>
      )}

      <Footer commitDate={__COMMIT_DATE__} commitHash={__COMMIT_HASH__} repoUrl={__REPO_URL__} />
    </div>
  )
}

export default App
