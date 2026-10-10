import { useId } from 'react'

interface StaleRunPromptProps {
  /** When the run was last touched. */
  savedAt: number
  /** The claim of the stored run. */
  claim: string
  /** The run got to its result (or was stopped), rather than being left half-way. */
  finished: boolean
  onContinue: () => void
  onStartNew: () => void
}

const PRIMARY =
  'rounded-md bg-blue-600 px-5 py-2 text-base font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'

/**
 * Shown instead of a stored run that has been left for a while: neither continuing nor starting
 * over happens by itself, since either could throw away what the user came back for.
 */
export default function StaleRunPrompt({
  savedAt,
  claim,
  finished,
  onContinue,
  onStartNew,
}: StaleRunPromptProps) {
  const headingId = useId()
  const date = new Date(savedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return (
    <section
      aria-labelledby={headingId}
      className="mt-6 max-w-2xl space-y-4 rounded-lg border-2 border-amber-400 bg-amber-50 p-5"
    >
      <h2 id={headingId} className="text-xl font-semibold text-gray-900">
        You have {finished ? 'a finished' : 'an unfinished'} estimate from {date}
      </h2>
      <p className="text-gray-800">“{claim}”</p>
      <p className="text-gray-700">
        It is still saved in this browser tab. Pick up where you left off, or start on a new claim;
        nothing is deleted until you choose to start a new one.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={PRIMARY} onClick={onContinue}>
          Continue
        </button>
        <button type="button" className={PRIMARY} onClick={onStartNew}>
          Start a new claim
        </button>
      </div>
    </section>
  )
}
