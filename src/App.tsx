import { useState, useEffect, useMemo } from 'react'
import ActionBar from './components/ActionBar'
import InlineEdit from './components/InlineEdit'
import StakesSelector from './components/StakesSelector'
import ParticipantsList from './components/ParticipantsList'
import OutcomesList from './components/OutcomesList'
import PredictionsGrid from './components/PredictionsGrid'
import Resolution from './components/Resolution'
import HelpModal from './components/HelpSection'
import { isFaqId, type FaqId } from './components/faq'
import ConfirmDialog from './components/ConfirmDialog'
import { calculateResults } from './domain/brier'
import type { CalculationResult, Wager } from './domain/wager'
import {
  decodeWagerFromHash,
  encodeWagerToHash,
  getShareableURL,
  getFaqIdFromURL,
  removeFaqFromURL,
} from './storage/urlHash'
import { createDefaultWager } from './domain/defaults'
import { fillMissingPredictions } from './domain/predictions'
import { getSavedStakes, saveStakes } from './storage/stakesPreference'

/**
 * A blank wager that remembers the stakes the user picked last time
 */
function freshWager(): Wager {
  const wager = createDefaultWager()
  const savedStakes = getSavedStakes()
  return savedStakes ? { ...wager, stakes: savedStakes } : wager
}

function loadInitialWager(): { wager: Wager; isFromURL: boolean } {
  const fromURL = decodeWagerFromHash(window.location.hash)
  return fromURL ? { wager: fromURL, isFromURL: true } : { wager: freshWager(), isFromURL: false }
}

/**
 * "45–62% from elicitation", handed over in the history entry by the elicitation page,
 * with the first participant's numbers it belongs to. It describes those numbers only:
 * once they change it is not shown any more.
 */
function loadInitialProvenance(wager: Wager): { text: string; numbers: string } | null {
  const state = window.history.state as { provenance?: unknown } | null
  if (typeof state?.provenance !== 'string') return null
  return { text: state.provenance, numbers: firstParticipantNumbers(wager) }
}

function firstParticipantNumbers(wager: Wager): string {
  const first = wager.participants[0]
  return wager.predictions
    .filter(p => p.participantId === first?.id)
    .map(p => p.probability.toString())
    .join(',')
}

function loadInitialFaqId(): FaqId | null {
  const faqParam = getFaqIdFromURL(window.location.hash)
  return isFaqId(faqParam) ? faqParam : null
}

function App() {
  const [initial] = useState(loadInitialWager)
  const [initialFaqId] = useState(loadInitialFaqId)
  const shouldAutoFocusClaim = !initial.isFromURL

  const [wager, setWager] = useState<Wager>(initial.wager)
  const [provenance] = useState(() => loadInitialProvenance(initial.wager))
  const [provenanceGone, setProvenanceGone] = useState(false)
  // It describes those numbers as handed over: the first edit retires it for good, even if
  // they are later typed back to the same values
  if (provenance && !provenanceGone && provenance.numbers !== firstParticipantNumbers(wager)) {
    setProvenanceGone(true)
  }
  // The provenance is for this visit only: take it out of the history entry once it is read
  useEffect(() => {
    if (provenance) window.history.replaceState(null, '', window.location.href)
  }, [provenance])
  const { claim, details, stakes, participants, outcomes, predictions, resolvedOutcomeId } = wager
  const updateWager = (patch: Partial<Wager>) => setWager(current => ({ ...current, ...patch }))

  const [isHelpOpen, setIsHelpOpen] = useState(initialFaqId !== null)
  const [openFaqId, setOpenFaqId] = useState<FaqId | null>(initialFaqId)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Auto-sync state to URL with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      window.history.replaceState(null, '', encodeWagerToHash(wager))
    }, 400)

    return () => clearTimeout(timer)
  }, [wager])

  // Reflect the claim in the tab title so open tabs, history and bookmarks are identifiable
  useEffect(() => {
    const trimmedClaim = claim.trim()
    document.title = trimmedClaim ? `${trimmedClaim} – Wager Calculator` : 'Wager Calculator'
  }, [claim])

  // Auto-hide the toast
  useEffect(() => {
    if (toastMessage === null) return
    const timer = setTimeout(() => setToastMessage(null), 2500)
    return () => clearTimeout(timer)
  }, [toastMessage])

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

  // Keep the prediction grid complete whenever participants or outcomes change
  useEffect(() => {
    const filled = fillMissingPredictions(predictions, participants, outcomes)
    if (filled !== predictions) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      updateWager({ predictions: filled })
    }
  }, [participants, outcomes, predictions])

  // Reset form to defaults
  const handleReset = () => {
    setIsResetConfirmOpen(true)
  }

  const confirmReset = () => {
    setWager(freshWager())
    window.location.hash = ''
  }

  // Only a deliberate pick becomes the remembered preference; stakes that
  // arrived via a shared URL are someone else's choice
  const handleStakesChange = (value: string | null) => {
    if (value) {
      saveStakes(value)
      updateWager({ stakes: value })
    }
  }

  const openFaq = (faqId: FaqId | null) => {
    setOpenFaqId(faqId)
    setIsHelpOpen(true)
  }

  // Share wager: native share sheet on touch devices, clipboard elsewhere
  const handleShare = async () => {
    const url = getShareableURL(wager)
    // Make sure the address bar shows the same URL we are sharing
    window.history.replaceState(null, '', url)

    // On phones and tablets the share sheet (messenger apps etc.) beats the clipboard
    const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches ?? false
    if (typeof navigator.share === 'function' && isTouchDevice) {
      try {
        await navigator.share({ title: claim.trim() || 'Wager Calculator', url })
        return
      } catch (error) {
        // The user dismissed the share sheet
        if (error instanceof Error && error.name === 'AbortError') return
        console.error('Native share failed, falling back to clipboard:', error)
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setToastMessage('URL copied to clipboard')
    } catch (error) {
      console.error('Failed to copy URL to clipboard:', error)
      setToastMessage('Could not copy automatically. Copy the URL from the address bar.')
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-3 sm:gap-4">
          <img
            src={`${import.meta.env.BASE_URL}icon-180.png`}
            alt=""
            className="h-12 w-12 shrink-0 sm:h-16 sm:w-16"
          />
          <div>
            <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-gray-900 sm:text-4xl">
              Wager Calculator
            </h1>
            <p className="text-xs tracking-[0.12em] text-gray-600 sm:text-sm sm:tracking-[0.25em]">
              Betting is a tax on bullshit
            </p>
          </div>
        </div>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          <ActionBar
            position="top"
            onOpenFaq={() => openFaq(null)}
            onReset={handleReset}
            onShare={handleShare}
          />

          {/* Claim & Details Section */}
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-700">Claim</h2>
              <InlineEdit
                value={claim}
                onChange={claim => updateWager({ claim })}
                placeholder="What are you betting on?"
                displayClassName="text-lg font-semibold"
                autoFocus={shouldAutoFocusClaim}
              />
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-700">
                Details <span className="text-gray-500">(Optional)</span>
              </h2>
              <InlineEdit
                value={details}
                onChange={details => updateWager({ details })}
                placeholder="Add resolution criteria or context..."
                multiline
                displayClassName="text-sm"
              />
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-700">Stakes</h2>
              <StakesSelector value={stakes} onChange={handleStakesChange} />
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-700">Participants & Max Bets</h2>
              <ParticipantsList
                participants={participants}
                predictions={predictions}
                onChange={participants => updateWager({ participants })}
                onPredictionsChange={predictions => updateWager({ predictions })}
                stakes={stakes}
              />
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-700">Outcomes</h2>
              <OutcomesList
                outcomes={outcomes}
                predictions={predictions}
                onChange={outcomes => updateWager({ outcomes })}
                onPredictionsChange={predictions => updateWager({ predictions })}
              />
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-700">Predictions</h2>
              <PredictionsGrid
                participants={participants}
                outcomes={outcomes}
                predictions={predictions}
                onChange={predictions => updateWager({ predictions })}
                provenance={provenance && !provenanceGone ? provenance.text : null}
              />
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-700">Resolution</h2>
              <Resolution
                outcomes={outcomes}
                participants={participants}
                predictions={predictions}
                stakes={stakes}
                claim={claim}
                resolvedOutcomeId={resolvedOutcomeId}
                calculationResults={calculationResults}
                onChange={resolvedOutcomeId => updateWager({ resolvedOutcomeId })}
                onOpenFaq={openFaq}
              />
            </div>
          </div>
          <ActionBar
            position="bottom"
            onOpenFaq={() => openFaq(null)}
            onReset={handleReset}
            onShare={handleShare}
          />
        </section>
      </div>

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => {
          setIsHelpOpen(false)
          // Clear FAQ from URL when closing
          if (openFaqId) {
            setOpenFaqId(null)
            const cleanedHash = removeFaqFromURL(window.location.hash)
            window.history.replaceState(null, '', cleanedHash || window.location.pathname)
          }
        }}
        openFaqId={openFaqId}
      />

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={confirmReset}
        title="Reset Form?"
        message="This will clear all your data and return the form to its default state. This action cannot be undone."
        confirmLabel="Reset"
      />

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md bg-gray-900 px-4 py-2 text-center text-sm text-white shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </>
  )
}

export default App
