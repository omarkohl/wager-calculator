import { useEffect, useRef } from 'react'
import type { Choice } from '../../domain/elicitation/bandRule'
import type { Pick } from '../../domain/elicitation/comparisons'
import { describeBand } from '../../domain/elicitation/format'
import { provenanceFor } from '../../domain/elicitation/model'
import {
  analyse,
  answerMulti,
  answersInvolving,
  nextMultiQuestion,
  type MultiAnswer,
  type MultiRun,
} from '../../domain/elicitation/multiRun'
import { ARM, SECONDARY } from './questionStyles'
import QuestionScreen from './QuestionScreen'

interface MultiQuestionsProps {
  /** The claim, as the user wrote it. */
  claim: string
  /** The outcomes and the sketch, with the answers so far. Null if they cannot be used. */
  base: MultiRun | null
  stopped: boolean
  /** The stake as the user entered it ("20 EUR"), or null if none is remembered. */
  stake: string | null
  /** Move focus to the question heading (after an answer or the start, not on a plain reload). */
  focusOnShow: boolean
  /** The answers, with the new one added. */
  onAnswers: (answers: MultiAnswer[]) => void
  onStop: () => void
  onStartAgain: () => void
}

const PRIMARY =
  'rounded-md bg-blue-600 px-5 py-2 text-base font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'

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

  // TODO(step 25): the result screen replaces this standing
  if (!question) {
    const bands = analyse(base).coherent.bands
    return (
      <section aria-labelledby="standing-heading" className="mt-6 max-w-2xl space-y-4">
        <h2
          id="standing-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-semibold text-gray-900 focus:outline-none"
        >
          Where your answers stand
        </h2>
        <p className="text-gray-700">
          {stopped
            ? 'You stopped early, so some outcomes are still rough guesses.'
            : 'No further question is worth asking.'}{' '}
          These are the ranges your answers give so far.
        </p>
        <p className="text-gray-700">“{claim}”</p>
        <ul aria-label="Where your answers stand" className="space-y-2">
          {base.outcomes.map(o => {
            const band = bands.find(b => b.id === o.id)!
            const provenance = provenanceFor(answersInvolving(base, o.id))
            return (
              <li key={o.id} className="rounded-md bg-gray-50 px-3 py-2">
                <div className="flex justify-between gap-3">
                  <span className="font-medium text-gray-900">{o.label}</span>
                  <span className="text-gray-800">
                    {describeBand({
                      lo: band.lo.lte(0) ? null : band.lo,
                      hi: band.hi.gte(1) ? null : band.hi,
                    })}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {provenance.source === 'first-guess'
                    ? 'From your first guess'
                    : `From ${provenance.count} ${provenance.count === 1 ? 'answer' : 'answers'}`}
                </div>
              </li>
            )
          })}
        </ul>
        <button type="button" className={PRIMARY} onClick={onStartAgain}>
          Start again
        </button>
      </section>
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
