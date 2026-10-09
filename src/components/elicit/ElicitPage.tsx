import { useEffect, useRef, useState } from 'react'
import { CURRENCY_OPTIONS } from '../../domain/stakes'
import type { Choice } from '../../domain/elicitation/bandRule'
import {
  clearRun,
  generateSeed,
  getSavedElicitStake,
  loadRun,
  saveRun,
  type RunData,
} from '../../storage/elicitation'
import QuestionScreen from './QuestionScreen'
import SetupGate, { type SetupResult } from './SetupGate'
import { answerQuestion, nextFlowQuestion, questionsLeft, stopRun } from './runFlow'

function stakeText(): string | null {
  const stake = getSavedElicitStake()
  if (!stake) return null
  const currency = CURRENCY_OPTIONS.find(c => c.id === stake.currency)
  return `${stake.amount} ${currency?.id.toUpperCase() ?? stake.currency}`
}

/** What the page shows once no more questions come. Takes focus when the user just acted. */
function RunEnd({
  run,
  focusOnShow,
  onStartAgain,
}: {
  run: RunData
  focusOnShow: boolean
  onStartAgain: () => void
}) {
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (focusOnShow) ref.current?.focus()
  }, [focusOnShow])

  // Stopping before the first answer says nothing: no answers, no result
  if (run.answers.length === 0) {
    return (
      <div className="mt-4">
        <p ref={ref} tabIndex={-1} className="text-gray-700 focus:outline-none">
          You stopped before answering, so there is no result.
        </p>
        <button
          type="button"
          onClick={onStartAgain}
          className="mt-4 rounded-md bg-blue-600 px-5 py-2 text-base font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        >
          Start again
        </button>
      </div>
    )
  }
  return (
    <p ref={ref} tabIndex={-1} className="mt-4 text-gray-700 focus:outline-none">
      {run.stopped ? 'You stopped here.' : 'That was the last question.'} Your answers are in.
    </p>
  )
}

/** The elicitation tool: the setup gate, then the questions of the run it starts. */
export default function ElicitPage() {
  const [run, setRun] = useState<RunData | null>(loadRun)
  // Focus moves to a question only after the user acted, not on a plain reload
  const [focusQuestion, setFocusQuestion] = useState(false)

  const update = (next: RunData) => {
    saveRun(next)
    setRun(next)
    setFocusQuestion(true)
  }

  const start = ({ claim, mode }: SetupResult) => {
    const base = { claim, criteria: '', seed: generateSeed(), dropped: [], adjusted: null }
    update(mode === 'quick' ? { ...base, mode, answers: [] } : { ...base, mode, answers: [] })
  }

  const question = run && nextFlowQuestion(run)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-['Space_Grotesk'] text-3xl font-bold text-gray-900">How sure are you?</h1>
      {run === null ? (
        <div className="max-w-2xl">
          <p className="mt-2 mb-6 text-gray-700">
            Put a number on how likely you think something is, by comparing it with a spinner.
          </p>
          <SetupGate onStart={start} />
        </div>
      ) : question ? (
        <QuestionScreen
          claim={run.claim}
          stake={stakeText()}
          question={question}
          questionsLeft={questionsLeft(run)}
          focusOnShow={focusQuestion}
          onAnswer={(choice: Choice) => update(answerQuestion(run, question, choice))}
          onStop={() => update(stopRun(run))}
        />
      ) : (
        <RunEnd
          run={run}
          focusOnShow={focusQuestion}
          onStartAgain={() => {
            clearRun()
            setRun(null)
            setFocusQuestion(false)
          }}
        />
      )}
    </div>
  )
}
