import { useEffect, useRef } from 'react'
import type { Choice } from '../../domain/elicitation/bandRule'
import type { Pick } from '../../domain/elicitation/comparisons'
import {
  answerMulti,
  nextMultiQuestion,
  type MultiAnswer,
  type MultiRun,
} from '../../domain/elicitation/multiRun'
import { ARM, SECONDARY } from './questionStyles'
import MultiResult, { type BetItem } from './MultiResult'
import QuestionScreen from './QuestionScreen'

interface MultiQuestionsProps {
  /** The claim, as the user wrote it. */
  claim: string
  /** The outcomes and the sketch, with the answers so far. Null if they cannot be used. */
  base: MultiRun | null
  stopped: boolean
  /** The user kept outcomes the checks found overlapping or incomplete. */
  kept?: boolean
  adjusted?: Record<string, string>
  onAdjusted?: (adjusted: Record<string, string>) => void
  merged?: string[]
  onMerged?: (ids: string[]) => void
  onBet?: (items: BetItem[]) => void
  invite?: () => string
  resultLink?: () => string
  /** The stake as the user entered it ("20 EUR"), or null if none is remembered. */
  stake: string | null
  /** Move focus to the question heading (after an answer or the start, not on a plain reload). */
  focusOnShow: boolean
  /** The answers, with the new one added. */
  onAnswers: (answers: MultiAnswer[]) => void
  onStop: () => void
  onStartAgain: () => void
}

/**
 * The questions of a claim with several outcomes, under the rules of the yes/no screen: no
 * band while the run goes on, the same look whichever side is asked about, "stop here" always
 * there. A comparison ("which is more likely?") or the reference lottery on one outcome or a
 * group. When the questions are over or the user stops, a first look at where the answers
 * stand [the result screen replaces it]. [NEEDS PROTOTYPE]
 */
export default function MultiQuestions({
  claim,
  base,
  stopped,
  kept = false,
  adjusted = {},
  onAdjusted = () => {},
  merged,
  onMerged,
  onBet,
  invite,
  resultLink,
  stake,
  focusOnShow,
  onAnswers,
  onStop,
  onStartAgain,
}: MultiQuestionsProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const question = base && !stopped ? nextMultiQuestion(base) : null
  const answered = base?.answers.length ?? 0
  const acted = useRef(focusOnShow)
  // The heading takes the cursor for each new question and for the standing, once the user acted
  useEffect(() => {
    if (acted.current) headingRef.current?.focus()
  }, [answered, stopped])

  const labelOf = (id: string) => base?.outcomes.find(o => o.id === id)?.label ?? id
  const record = (answer: MultiAnswer) => {
    acted.current = true
    if (base) onAnswers(answerMulti(base, answer).answers.slice())
  }
  const stop = () => {
    acted.current = true
    onStop()
  }

  if (!base) return null

  if (!question) {
    return (
      <MultiResult
        claim={claim}
        run={base}
        stopped={stopped}
        kept={kept}
        adjusted={adjusted}
        onAdjusted={onAdjusted}
        merged={merged}
        onMerged={onMerged}
        onBet={onBet}
        invite={invite}
        resultLink={resultLink}
        headingRef={headingRef}
        onStartAgain={onStartAgain}
      />
    )
  }

  // No count of questions left: there is no real estimate for several outcomes
  const footer = (
    <div className="mt-8 flex justify-end border-t border-gray-200 pt-4">
      <button type="button" onClick={stop} className={SECONDARY}>
        Stop here
      </button>
    </div>
  )

  if (question.kind === 'compare') {
    const pick = (p: Pick) =>
      record({ kind: 'compare', first: question.first, second: question.second, pick: p })
    return (
      <section aria-labelledby="question-heading" className="mt-6">
        <h2
          id="question-heading"
          ref={headingRef}
          tabIndex={-1}
          className="mb-4 text-xl font-semibold text-gray-900 focus:outline-none"
        >
          Which is more likely?
        </h2>
        <p className="mb-4 text-gray-700">“{claim}”</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button type="button" onClick={() => pick('first')} className={ARM}>
            {labelOf(question.first)}
          </button>
          <button type="button" onClick={() => pick('second')} className={ARM}>
            {labelOf(question.second)}
          </button>
        </div>
        <div className="mt-4 flex justify-center">
          <button type="button" onClick={() => pick('equal')} className={SECONDARY}>
            About equally likely
          </button>
        </div>
        {footer}
      </section>
    )
  }

  const answer = (choice: Choice) =>
    record({ kind: 'lottery', targets: question.targets, wedge: question.wedge, choice })
  const names = question.targets.map(labelOf).map(n => `“${n}”`)
  return (
    <QuestionScreen
      key={base.answers.length}
      claim={claim}
      stake={stake}
      question={{
        wedge: question.wedge,
        frame: 'claim',
        armOrder: question.armOrder,
        tagged: null,
      }}
      questionsLeft={null}
      focusOnShow={focusOnShow || base.answers.length > 0}
      onAnswer={answer}
      onStop={stop}
      statement={{
        arm:
          names.length === 1 ? (
            <>
              the result is: <span className="mt-1 block font-semibold">{names[0]}</span>
            </>
          ) : (
            <>
              the result is one of:{' '}
              <span className="mt-1 block font-semibold">{names.join(', ')}</span>
            </>
          ),
        lead: <p>“{claim}”</p>,
      }}
    />
  )
}
