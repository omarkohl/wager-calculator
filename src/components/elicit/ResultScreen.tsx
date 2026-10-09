import { useEffect, useId, useMemo, useRef } from 'react'
import { describeBand, describeGap } from '../../domain/elicitation/format'
import { formatPercent } from '../../domain/elicitation/logOdds'
import AdjustBelief from './AdjustBelief'
import { buildTrace, type RunTrace, type TraceStep } from '../../domain/elicitation/trace'
import { MAX_TEXT_LENGTH, type RunData } from '../../storage/elicitation'

interface ResultScreenProps {
  run: RunData
  /** Move focus to the result heading (after the user acted, not on a plain reload). */
  focusOnShow: boolean
  /** Without these the result is read-only (a shared result). */
  onDrop?: (index: number) => void
  onRestore?: (index: number) => void
  onCriteria?: (criteria: string) => void
  onAdjusted?: (adjusted: string | null) => void
  onRerun?: () => void
  onStartAgain?: () => void
}

const BUTTON =
  'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
const PRIMARY =
  'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'

function buildTraceFor(run: RunData): RunTrace {
  return run.mode === 'quick'
    ? buildTrace({
        mode: 'quick',
        seed: run.seed,
        answers: run.answers,
        dropped: run.dropped,
        adjusted: run.adjusted,
      })
    : buildTrace({
        mode: 'thorough',
        seed: run.seed,
        answers: run.answers,
        dropped: run.dropped,
        adjusted: run.adjusted,
      })
}

/** "a 40% spinner", "an 8% spinner", "an 18% spinner". */
function spinnerOf(wedge: TraceStep['wedge']): string {
  const percent = formatPercent(wedge)
  const article = /^(8|11(?!\d)|18(?!\d))/.test(percent) ? 'an' : 'a'
  return `${article} ${percent} spinner`
}

/** A short reference to an answer for buttons and sentences ("answer 3 (preferred the claim at 40%)"). */
function refer(step: TraceStep): string {
  // A spinner answer already names its percentage
  const where = step.choice === 'wedge' ? '' : ` at ${formatPercent(step.wedge)}`
  return `answer ${step.index + 1} (${step.answer.toLowerCase()}${where})`
}

/** The range of wedges the user could not separate from the claim, from kept answers. */
function indifferenceSpan(
  trace: RunTrace
): { lo: TraceStep['wedge']; hi: TraceStep['wedge'] } | null {
  const wedges = trace.steps
    .filter(s => !s.dropped && s.frame === 'claim' && s.choice === 'cant-separate')
    .map(s => s.wedge)
    .sort((a, b) => a.cmp(b))
  return wedges.length === 0 ? null : { lo: wedges[0], hi: wedges[wedges.length - 1] }
}

/**
 * The result of a yes/no run. The interval is the headline and the point estimate
 * is secondary; coarse and one-sided results are labelled as such. The full trace is
 * collapsed by default. Answers that contradict each other are listed with a "that was a
 * misclick, drop it" offer, a hard contradiction leads with a "sharpen the claim"
 * prompt, and resolution criteria are offered after the result. [NEEDS PROTOTYPE]
 */
export default function ResultScreen({
  run,
  focusOnShow,
  onDrop,
  onRestore,
  onCriteria,
  onAdjusted,
  onRerun,
  onStartAgain,
}: ResultScreenProps) {
  const trace = useMemo(() => buildTraceFor(run), [run])
  const result = trace.result
  const headingRef = useRef<HTMLHeadingElement>(null)
  const hardHeadingRef = useRef<HTMLHeadingElement>(null)
  const headingId = useId()
  const criteriaId = useId()
  const criteriaRef = useRef<HTMLTextAreaElement>(null)

  // Dropping or restoring an answer removes the button that had focus: land on the new result
  const droppedKey = run.dropped.join(',')
  const isHard = result?.isHardContradiction ?? false
  useEffect(() => {
    // A hard contradiction leads the screen, so that is where to land
    if (focusOnShow) (isHard ? hardHeadingRef : headingRef).current?.focus()
  }, [focusOnShow, droppedKey, isHard])
  const span = result === null ? indifferenceSpan(trace) : null
  const oneSided = result !== null && (result.band.lo === null || result.band.hi === null)
  const isCoarse = oneSided || run.stopped === true || trace.wouldAskMore

  const stepAt = (index: number) => trace.steps[index]

  const criteriaField = onCriteria && (
    <div>
      <label htmlFor={criteriaId} className="mb-1 block text-sm font-medium text-gray-700">
        Resolution criteria (optional)
      </label>
      <p className="mb-1 text-sm text-gray-600">
        What would have to happen for the claim to count as true? Writing it down makes the claim
        sharper, for you and for anyone you share it with.
      </p>
      <textarea
        id={criteriaId}
        ref={criteriaRef}
        rows={3}
        maxLength={MAX_TEXT_LENGTH}
        value={run.criteria}
        onChange={e => onCriteria(e.target.value)}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  )

  return (
    <section aria-labelledby={headingId} className="mt-6 space-y-6">
      {isHard && (
        <div role="note" className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
          <h2
            ref={hardHeadingRef}
            tabIndex={-1}
            className="text-lg font-semibold text-gray-900 focus:outline-none"
          >
            Your answers don&rsquo;t hang together
          </h2>
          <p className="mt-1 text-gray-800">
            The usual cause is that the claim can mean more than one thing. Say what would settle it
            below, then run it again with that in mind. The number below is still what your answers
            say.
          </p>
          <div className="mt-3">{criteriaField}</div>
          {onRerun && (
            <button type="button" onClick={onRerun} className={`${PRIMARY} mt-3`}>
              Run it again
            </button>
          )}
        </div>
      )}

      <div>
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="focus:outline-none">
          {result ? (
            <>
              <span className="block text-sm font-medium text-gray-600">
                Your answers say the chance is
              </span>{' '}
              <span className="mt-1 block text-5xl font-bold text-gray-900">
                {describeBand(result.band)}
              </span>
            </>
          ) : span ? (
            <>
              <span className="block text-sm font-medium text-gray-600">
                You could not tell the claim from spinners
              </span>{' '}
              <span className="mt-1 block text-4xl font-bold text-gray-900">
                {span.lo.eq(span.hi)
                  ? `at ${formatPercent(span.lo)}`
                  : `between ${formatPercent(span.lo)} and ${formatPercent(span.hi)}`}
              </span>
            </>
          ) : (
            <>
              <span className="block text-sm font-medium text-gray-600">Your answers say</span>{' '}
              <span className="mt-1 block text-xl font-semibold text-gray-900">No range yet</span>
            </>
          )}
        </h2>
        {result ? (
          <>
            {result.pointEstimate ? (
              <p className="mt-2 text-base text-gray-700">
                Best single guess: {formatPercent(result.pointEstimate)}
              </p>
            ) : (
              <p className="mt-2 text-base text-gray-700">
                No single best guess: your answers only bound one side.
              </p>
            )}
            {isCoarse && (
              <p className="mt-2 text-sm text-gray-600">
                {oneSided
                  ? 'This is coarse: your answers only bound one side of your belief.'
                  : run.stopped
                    ? 'This is coarse: you stopped before the search was finished.'
                    : 'This is coarse: answers you dropped leave the search unfinished.'}
              </p>
            )}
          </>
        ) : span ? (
          <p className="mt-2 text-base text-gray-700">
            No single best guess: you never preferred either side, which is an honest answer when
            you don&rsquo;t know.
          </p>
        ) : (
          <>
            <p className="mt-2 text-base text-gray-700">
              The answers you kept don&rsquo;t say which side of any spinner you prefer, so there is
              nothing to report.
            </p>
            {onStartAgain && (
              <button type="button" onClick={onStartAgain} className={`${PRIMARY} mt-3`}>
                Start again
              </button>
            )}
          </>
        )}
      </div>

      {result && (onAdjusted || run.adjusted !== null) && (
        <AdjustBelief
          // a fresh field when the result underneath changes (a drop moves the band)
          key={`${result.band.lo?.toString()}-${result.band.hi?.toString()}`}
          band={result.band}
          pointEstimate={result.pointEstimate}
          adjusted={run.adjusted}
          onChange={onAdjusted}
        />
      )}

      {result?.subadditivity && (
        <div role="note" className="rounded-lg bg-blue-50 p-4 text-gray-800">
          <h3 className="font-semibold">Something to ponder</h3>
          <p className="mt-1">
            {result.subadditivity.kind === 'sub'
              ? 'What you said about the claim and what you said about its being false add up to more than 100%.'
              : 'What you said about the claim and what you said about its being false add up to less than 100%.'}{' '}
            The range above is wider because of it.
          </p>
        </div>
      )}

      {(trace.contradictions.length > 0 || trace.repeatDisagreements.length > 0) && (
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Answers that contradict each other
          </h3>
          <ul className="mt-2 space-y-3">
            {trace.contradictions.map(pair => {
              const claimStep = stepAt(pair.claimIndex)
              const wedgeStep = stepAt(pair.wedgeIndex)
              return (
                <ContradictionItem
                  key={`c-${pair.claimIndex}-${pair.wedgeIndex}`}
                  text={`You preferred ${pair.frame === 'claim' ? 'the claim' : 'the claim being false'} to ${spinnerOf(claimStep.wedge)}, but ${spinnerOf(wedgeStep.wedge)} to it.`}
                  steps={[claimStep, wedgeStep]}
                  onDrop={onDrop}
                />
              )
            })}
            {trace.repeatDisagreements.map(pair => {
              const original = stepAt(pair.originalIndex)
              const repeat = stepAt(pair.repeatIndex)
              return (
                <ContradictionItem
                  key={`r-${pair.originalIndex}-${pair.repeatIndex}`}
                  text={`You answered the comparison with ${spinnerOf(original.wedge)} differently when it came back: first “${original.answer.toLowerCase()}”, then “${repeat.answer.toLowerCase()}”.`}
                  steps={[original, repeat]}
                  onDrop={onDrop}
                />
              )
            })}
          </ul>
        </div>
      )}

      {!isHard && criteriaField}

      <details className="rounded-lg border border-gray-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-gray-800">
          Show the full trace of your answers
        </summary>
        <ol className="mt-3 space-y-3">
          {trace.steps.map(step => (
            <li key={step.index} className={step.dropped ? 'text-gray-500' : 'text-gray-800'}>
              <p className={step.dropped ? 'line-through' : ''}>
                <span className="font-medium">Answer {step.index + 1}.</span> {step.question}?{' '}
                {step.answer}.
              </p>
              <p className="text-sm">{step.implication}</p>
              {step.dropped && (
                <p className="text-sm">
                  Dropped as a misclick.{' '}
                  {onRestore && (
                    <button
                      type="button"
                      onClick={() => onRestore(step.index)}
                      aria-label={`Bring back ${refer(step)}`}
                      className="text-blue-700 underline"
                    >
                      Bring it back
                    </button>
                  )}
                </p>
              )}
              {step.outsideRange && !step.dropped && (
                <p className="text-sm text-gray-600">
                  This one sits outside the range your other answers point to.
                </p>
              )}
              {!step.dropped && step.bandAfter && (
                <p className="text-sm text-gray-600">
                  After this, the range was {describeBand(step.bandAfter)}.
                </p>
              )}
            </li>
          ))}
        </ol>
        {trace.adjustment && (
          <p className="mt-3 border-t border-gray-200 pt-3 text-gray-800">
            Your answers implied {describeBand(trace.adjustment.implied)}. You then set your belief
            to {trace.adjustment.adjusted.times(100).toString()}%.{' '}
            {describeGap(trace.adjustment.gap)}
          </p>
        )}
      </details>
    </section>
  )
}

/** One pair of answers that disagree, with a drop offer for each (labels name the other answer). */
function ContradictionItem({
  text,
  steps,
  onDrop,
}: {
  text: string
  steps: [TraceStep, TraceStep]
  onDrop?: (index: number) => void
}) {
  return (
    <li className="rounded-lg border border-gray-200 p-3">
      <p className="text-gray-800">{text}</p>
      {onDrop && (
        <div className="mt-2 flex flex-wrap gap-2">
          {steps.map((step, k) => (
            <button
              key={step.index}
              type="button"
              onClick={() => onDrop(step.index)}
              aria-label={`That was a misclick, drop it: ${refer(step)}, which disagrees with ${refer(steps[1 - k])}`}
              className={BUTTON}
            >
              That was a misclick, drop it
              <span className="block text-xs font-normal text-gray-600">
                {step.answer}
                {step.choice === 'wedge' ? '' : ` at ${formatPercent(step.wedge)}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </li>
  )
}
