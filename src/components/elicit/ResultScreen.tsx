import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Decimal from 'decimal.js'
import { describeBand, describeGap } from '../../domain/elicitation/format'
import { handoffProbability } from '../../domain/elicitation/handoff'
import { lotteryNoun } from '../../domain/elicitation/lottery'
import { formatPercent, type Band } from '../../domain/elicitation/logOdds'
import AdjustBelief from './AdjustBelief'
import ShareLinks from './ShareLinks'
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
  /** Builders for the share links; without them there is no Share section. */
  share?: { invite: () => string; result: () => string }
  /** "Bet on this": hand the belief over to the wager calculator. */
  onBet?: (bet: { probability: Decimal; band: Band }) => void
  /** Set on a shared result: start the gate from its claim. */
  onElicitOwn?: () => void
}

const BUTTON =
  'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
const PRIMARY =
  'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'

function buildTraceFor(run: RunData, other: boolean): RunTrace {
  const voice = other ? ('other' as const) : ('own' as const)
  return run.mode === 'quick'
    ? buildTrace({
        voice,
        mode: 'quick',
        seed: run.seed,
        answers: run.answers,
        dropped: run.dropped,
        adjusted: run.adjusted,
      })
    : buildTrace({
        voice,
        mode: 'thorough',
        seed: run.seed,
        answers: run.answers,
        dropped: run.dropped,
        adjusted: run.adjusted,
      })
}

/** "a 40% spinner", "an 18% spinner", "a 3% ball draw", "an 8% ball draw". */
function spinnerOf(wedge: TraceStep['wedge']): string {
  const percent = formatPercent(wedge)
  const article = /^(8|11(?!\d)|18(?!\d))/.test(percent) ? 'an' : 'a'
  return `${article} ${percent} ${lotteryNoun(wedge)}`
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
  share,
  onBet,
  onElicitOwn,
}: ResultScreenProps) {
  // A shared result is someone else's: its wording does not say "you"
  const other = onElicitOwn !== undefined
  const say = (own: string, theirs: string) => (other ? theirs : own)
  const trace = useMemo(() => buildTraceFor(run, onElicitOwn !== undefined), [run, onElicitOwn])
  const result = trace.result
  const headingRef = useRef<HTMLHeadingElement>(null)
  const hardHeadingRef = useRef<HTMLHeadingElement>(null)
  const headingId = useId()
  const criteriaId = useId()
  const criteriaRef = useRef<HTMLTextAreaElement>(null)
  const adjustRef = useRef<HTMLInputElement>(null)
  // Why "Bet on this" did not go anywhere, if it did not: the adjusted field needs attention
  const [blocked, setBlocked] = useState<'one-sided' | 'invalid' | null>(null)
  const [textValid, setTextValid] = useState(true)
  const [lastAdjusted, setLastAdjusted] = useState(run.adjusted)
  if (lastAdjusted !== run.adjusted) {
    // The value changed: whatever was said about it earlier no longer applies
    setLastAdjusted(run.adjusted)
    setBlocked(null)
  }
  const adjustedHintId = useId()

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

  const readOnlyCriteria = !onCriteria && run.criteria !== ''

  return (
    <section aria-labelledby={headingId} className="mt-6 space-y-6">
      {onElicitOwn && (
        <div role="note" className="rounded-lg bg-blue-50 p-4 text-gray-800">
          <p>This is a shared result: someone else's answers about this claim.</p>
          <button type="button" onClick={onElicitOwn} className={`${PRIMARY} mt-3`}>
            Elicit your own belief on this claim
          </button>
        </div>
      )}
      <p className="text-gray-800">
        The claim: <span className="font-semibold">&ldquo;{run.claim}&rdquo;</span>
      </p>
      {readOnlyCriteria && (
        <p className="text-gray-800">
          Resolution criteria: <span className="font-semibold">{run.criteria}</span>
        </p>
      )}

      {isHard && (
        <div role="note" className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
          <h2
            ref={hardHeadingRef}
            tabIndex={-1}
            className="text-lg font-semibold text-gray-900 focus:outline-none"
          >
            {say('Your answers don’t hang together', 'These answers don’t hang together')}
          </h2>
          <p className="mt-1 text-gray-800">
            {other
              ? 'The usual cause is that the claim can mean more than one thing. The number below is still what the answers say.'
              : 'The usual cause is that the claim can mean more than one thing. Say what would settle it below, then run it again with that in mind. The number below is still what your answers say.'}
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
                {say('Your answers say the chance is', 'The answers say the chance is')}
              </span>{' '}
              <span className="mt-1 block text-5xl font-bold text-gray-900">
                {describeBand(result.band)}
              </span>
            </>
          ) : span ? (
            <>
              <span className="block text-sm font-medium text-gray-600">
                {say(
                  'You could not tell the claim from the lotteries',
                  'The answers did not separate the claim from the lotteries'
                )}
              </span>{' '}
              <span className="mt-1 block text-4xl font-bold text-gray-900">
                {span.lo.eq(span.hi)
                  ? `at ${formatPercent(span.lo)}`
                  : `between ${formatPercent(span.lo)} and ${formatPercent(span.hi)}`}
              </span>
            </>
          ) : (
            <>
              <span className="block text-sm font-medium text-gray-600">
                {say('Your answers say', 'The answers say')}
              </span>{' '}
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
                {say(
                  'No single best guess: your answers only bound one side.',
                  'No single best guess: the answers only bound one side.'
                )}
              </p>
            )}
            {isCoarse && (
              <p className="mt-2 text-sm text-gray-600">
                {oneSided
                  ? say(
                      'This is coarse: your answers only bound one side of your belief.',
                      'This is coarse: the answers only bound one side of the belief.'
                    )
                  : run.stopped
                    ? say(
                        'This is coarse: you stopped before the search was finished.',
                        'This is coarse: the search was stopped before it was finished.'
                      )
                    : say(
                        'This is coarse: answers you dropped leave the search unfinished.',
                        'This is coarse: answers that were dropped leave the search unfinished.'
                      )}
              </p>
            )}
          </>
        ) : span ? (
          <p className="mt-2 text-base text-gray-700">
            {say(
              'No single best guess: you never preferred either side, which is an honest answer when you don’t know.',
              'No single best guess: neither side was ever preferred, which is an honest answer when someone does not know.'
            )}
          </p>
        ) : (
          <>
            <p className="mt-2 text-base text-gray-700">
              {say(
                'The answers you kept don’t say which side of any of the chances offered you prefer, so there is nothing to report.',
                'The answers that were kept don’t say which side of any of the chances offered was preferred, so there is nothing to report.'
              )}
            </p>
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
          other={other}
          inputRef={adjustRef}
          onTextValidity={valid => {
            setTextValid(valid)
            if (valid) setBlocked(null)
          }}
        />
      )}

      {result?.subadditivity && (
        <div role="note" className="rounded-lg bg-blue-50 p-4 text-gray-800">
          <h3 className="font-semibold">Something to ponder</h3>
          <p className="mt-1">
            {say(
              'What you said about the claim and what you said about its being false add up to',
              'What was said about the claim and what was said about its being false add up to'
            )}{' '}
            {result.subadditivity.kind === 'sub' ? 'more than 100%.' : 'less than 100%.'} The range
            above is wider because of it.
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
                  text={`${say('You preferred', 'Preferred:')} ${pair.frame === 'claim' ? 'the claim' : 'the claim being false'} to ${spinnerOf(claimStep.wedge)}, but ${spinnerOf(wedgeStep.wedge)} to it.`}
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
                  text={`${say('You answered', 'Answered:')} the comparison with ${spinnerOf(original.wedge)} differently when it came back: first “${original.answer.toLowerCase()}”, then “${repeat.answer.toLowerCase()}”.`}
                  steps={[original, repeat]}
                  onDrop={onDrop}
                />
              )
            })}
          </ul>
        </div>
      )}

      {!isHard && criteriaField}

      {onBet && result && (
        <div>
          <button
            type="button"
            onClick={() => {
              if (!textValid) {
                // The field shows something that is not a value: do not bet on an older one
                setBlocked('invalid')
                adjustRef.current?.focus()
                return
              }
              const probability = handoffProbability(result.pointEstimate, run.adjusted)
              if (probability === null) {
                // One-sided and not adjusted: there is no number to bet on yet
                setBlocked('one-sided')
                adjustRef.current?.focus()
                return
              }
              onBet({ probability, band: result.band })
            }}
            aria-describedby={blocked ? adjustedHintId : undefined}
            className={PRIMARY}
          >
            Bet on this
          </button>
          {blocked === 'one-sided' && (
            <p id={adjustedHintId} role="alert" className="mt-2 text-sm text-gray-800">
              Your answers only bound one side, so there is no single number yet. Set your own
              belief above, then bet on it.
            </p>
          )}
          {blocked === 'invalid' && (
            // the field announces its own error; this says why the button did nothing
            <p id={adjustedHintId} className="mt-2 text-sm text-gray-800">
              The adjusted belief above is not a percentage yet. Fix it, then bet.
            </p>
          )}
        </div>
      )}

      {share && (result || span) && <ShareLinks invite={share.invite} result={share.result} />}

      <details className="rounded-lg border border-gray-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-gray-800">
          {say('Show the full trace of your answers', 'Show the full trace of the answers')}
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
                  {say(
                    'This one sits outside the range your other answers point to.',
                    'This one sits outside the range the other answers point to.'
                  )}
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
            {say('Your answers implied', 'The answers implied')}{' '}
            {describeBand(trace.adjustment.implied)}.{' '}
            {say('You then set your belief to', 'The belief was then set to')}{' '}
            {trace.adjustment.adjusted.times(100).toString()}%.{' '}
            {describeGap(trace.adjustment.gap, other)}
          </p>
        )}
      </details>

      {onStartAgain && (
        <div className="border-t border-gray-200 pt-5">
          <p className="mb-2 text-gray-700">Done with this claim?</p>
          <button type="button" onClick={onStartAgain} className={PRIMARY}>
            Start a new claim
          </button>
        </div>
      )}
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
