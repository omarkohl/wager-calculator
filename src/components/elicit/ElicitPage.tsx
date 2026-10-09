import { useState } from 'react'
import { generateSeed, loadRun, saveRun, type RunData } from '../../storage/elicitation'
import SetupGate, { type SetupResult } from './SetupGate'

/** The elicitation tool: today the setup gate, then the run it starts. */
export default function ElicitPage() {
  const [run, setRun] = useState<RunData | null>(loadRun)

  const start = ({ claim, mode }: SetupResult) => {
    const base = { claim, criteria: '', seed: generateSeed(), dropped: [], adjusted: null }
    const started: RunData =
      mode === 'quick' ? { ...base, mode, answers: [] } : { ...base, mode, answers: [] }
    saveRun(started)
    setRun(started)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-['Space_Grotesk'] text-3xl font-bold text-gray-900">How sure are you?</h1>
      {run === null ? (
        <>
          <p className="mt-2 mb-6 text-gray-700">
            Put a number on how likely you think something is, by comparing it with a spinner.
          </p>
          <SetupGate onStart={start} />
        </>
      ) : (
        <p className="mt-4 text-gray-700">
          Your {run.mode} run on &ldquo;{run.claim}&rdquo; has started.
        </p>
      )}
    </div>
  )
}
