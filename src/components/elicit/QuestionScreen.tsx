import { useEffect, useRef } from 'react'
import type { Choice } from '../../domain/elicitation/bandRule'
import ReferenceLottery from './ReferenceLottery'
import type { FlowQuestion } from './runFlow'

interface QuestionScreenProps {
  claim: string
  /** The stake as the user entered it ("20 EUR"), or null if none is remembered. */
  stake: string | null
  question: FlowQuestion
  /** "Approx. N questions left"; null hides the line. */
  questionsLeft: { count: number; longer: boolean } | null
  /** Move focus to the question heading (after an answer, not on a plain reload). */
  focusOnShow: boolean
  onAnswer: (choice: Choice) => void
  onStop: () => void
}

const ARM =
  'flex w-full flex-col items-center gap-3 rounded-lg border-2 border-gray-300 bg-white p-4 text-center text-base text-gray-900 hover:border-blue-500 hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
const SECONDARY =
  'rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'

/**
 * One comparison: win the prize if the claim is true (or, for a check on the other
 * side, if it is false), or win the same prize if a spinner lands in the shaded part.
 * The three answers are the two arms and "I can't separate these". Both arms read
 * the same whichever side is asked about, so nothing hints at why a question comes.
 * No band is shown while the run goes on. [NEEDS PROTOTYPE]
 */
export default function QuestionScreen({
  claim,
  stake,
  question,
  questionsLeft,
  focusOnShow,
  onAnswer,
  onStop,
}: QuestionScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const prize = stake ? `Win ${stake}` : 'Win the prize'

  // One key per question shown, so the effect runs when the question changes, not on every render
  const questionKey = `${question.wedge.toString()}:${question.frame}:${question.armOrder}`
  useEffect(() => {
    if (focusOnShow) headingRef.current?.focus()
  }, [focusOnShow, questionKey])

  const statementArm = (
    <button key="statement" type="button" onClick={() => onAnswer('claim')} className={ARM}>
      <span>
        {prize} if this is <strong>{question.frame === 'claim' ? 'true' : 'false'}</strong>:{' '}
        <span className="mt-1 block font-semibold">&ldquo;{claim}&rdquo;</span>
      </span>
    </button>
  )
  const spinnerArm = (
    <button key="spinner" type="button" onClick={() => onAnswer('wedge')} className={ARM}>
      <span>{prize} if the spinner lands in the shaded part</span>
      <ReferenceLottery probability={question.wedge} />
    </button>
  )

  return (
    <section aria-labelledby="question-heading" className="mt-6">
      <h2
        id="question-heading"
        ref={headingRef}
        tabIndex={-1}
        className="mb-4 text-xl font-semibold text-gray-900 focus:outline-none"
      >
        Which would you rather have?
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {question.armOrder === 'claim-first'
          ? [statementArm, spinnerArm]
          : [spinnerArm, statementArm]}
      </div>

      <div className="mt-4 flex justify-center">
        <button type="button" onClick={() => onAnswer('cant-separate')} className={SECONDARY}>
          I can&rsquo;t separate these
        </button>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
        {questionsLeft !== null ? (
          <p className="text-sm text-gray-600">
            Approx. {questionsLeft.count} {questionsLeft.count === 1 ? 'question' : 'questions'}{' '}
            left
            {questionsLeft.longer && (
              <span className="block">
                More than before: your last answer pushed the search further out.
              </span>
            )}
          </p>
        ) : (
          <span />
        )}
        <button type="button" onClick={onStop} className={SECONDARY}>
          Stop here
        </button>
      </div>
    </section>
  )
}
