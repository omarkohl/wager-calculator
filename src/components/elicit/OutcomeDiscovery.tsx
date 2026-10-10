import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import {
  addOutcome,
  EVERYTHING_ELSE_LABEL,
  firstSketch,
  hasEnoughOutcomes,
  isAtCap,
  labelProblem,
  removeOutcome,
  shouldOfferEverythingElse,
  TIERS,
  type Tier,
} from '../../domain/elicitation/model'
import { MAX_OUTCOMES } from '../../domain/elicitation/constants'
import { parsePercent } from '../../domain/elicitation/format'
import { formatPercent } from '../../domain/elicitation/logOdds'
import { MAX_TEXT_LENGTH } from '../../storage/elicitation'
import KeptNotice from './KeptNotice'
import MultiQuestions from './MultiQuestions'
import type { BetItem } from './MultiResult'
import PercentList from './PercentList'
import SpotChecks from './SpotChecks'
import { toMultiRun, withAnswers } from '../../storage/multiAnswers'
import { spotChecksOf, type MultiRunData, type MultiView } from '../../storage/multiRun'

interface OutcomeDiscoveryProps {
  run: MultiRunData
  /** Put the cursor in the first field on arrival (after the user acted, not on a plain load). */
  focusOnShow?: boolean
  /** The stake as the user entered it ("20 EUR"), for the questions. */
  stake?: string | null
  /** "Bet on this" on the result: open a wager with these outcomes and numbers. */
  onBet?: (items: BetItem[]) => void
  onChange: (run: MultiRunData) => void
  onStartAgain: () => void
}

const PERCENT_PROBLEM = 'Enter a percentage above 0 and below 100, with at most two decimals.'

/** The percentage typed for an outcome, or null if it is not a usable one. */
const percentOf = (run: MultiRunData, id: string) => parsePercent(run.percents[id] ?? '')

const FIELD =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'
const PRIMARY =
  'rounded-md bg-blue-600 px-5 py-2 text-base font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
const SECONDARY =
  'rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'

/**
 * Collecting the outcomes of a claim with several outcomes, one at a time, each dropped
 * into a tier [NEEDS PROTOTYPE: tiers as radios under the label], then the first sketch
 * those tiers give. The claim stays editable throughout.
 */
type FocusTarget = 'label' | 'percent' | 'claim' | 'sketch' | 'cap'

export default function OutcomeDiscovery({
  run,
  focusOnShow,
  stake = null,
  onBet,
  onChange,
  onStartAgain,
}: OutcomeDiscoveryProps) {
  const [label, setLabel] = useState('')
  const [tier, setTier] = useState<Tier | null>(null)
  const [percent, setPercent] = useState('')
  const [checkFocus, setCheckFocus] = useState(false)
  const [askFocus, setAskFocus] = useState(false)
  const startQuestions = () => {
    setAskFocus(true)
    onChange({ ...run, phase: 'ask', answers: [], stopped: false })
  }
  const numbersUsable = toMultiRun(run) !== null
  const [error, setError] = useState<string | null>(null)
  /** Which field the message is about. */
  const [errorField, setErrorField] = useState<'label' | 'percent'>('label')
  const labelRef = useRef<HTMLInputElement>(null)
  const claimRef = useRef<HTMLTextAreaElement>(null)
  const percentRef = useRef<HTMLInputElement>(null)
  const sketchRef = useRef<HTMLHeadingElement>(null)
  const capRef = useRef<HTMLParagraphElement>(null)
  // Where focus goes once the next render has put the target on the page: a button that
  // unmounts must not drop the cursor on the page body
  const focusRequest = useRef<FocusTarget | null>(focusOnShow ? 'label' : null)
  useEffect(() => {
    const target = focusRequest.current
    if (!target) return
    focusRequest.current = null
    const refs = {
      label: labelRef,
      percent: percentRef,
      claim: claimRef,
      sketch: sketchRef,
      cap: capRef,
    }
    refs[target].current?.focus()
  })
  const ids = {
    review: useId(),
    percent: useId(),
    claim: useId(),
    claimError: useId(),
    label: useId(),
    error: useId(),
  }
  const items = run.outcomes.items

  const claimMissing = run.claim.trim() === ''
  const claimField = (
    <div>
      <label htmlFor={ids.claim} className="mb-1 block text-sm font-medium text-gray-700">
        Claim
      </label>
      <textarea
        id={ids.claim}
        rows={2}
        ref={claimRef}
        value={run.claim}
        maxLength={MAX_TEXT_LENGTH}
        aria-invalid={claimMissing ? true : undefined}
        aria-describedby={claimMissing ? ids.claimError : undefined}
        onChange={e => onChange({ ...run, claim: e.target.value })}
        className={FIELD}
      />
      {claimMissing && (
        <p id={ids.claimError} role="alert" className="mt-1 text-sm text-red-700">
          Write the claim these outcomes belong to.
        </p>
      )}
    </div>
  )

  const list = items.length > 0 && (
    <ul aria-label="Outcomes so far" className="space-y-2">
      {items.map(o => (
        <li
          key={o.id}
          className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2"
        >
          <span>
            <span className="font-medium text-gray-900">{o.label}</span>
            <span className="text-gray-600">
              {' '}
              —{' '}
              {run.view === 'numbers'
                ? percentOf(run, o.id)
                  ? `${percentOf(run, o.id)}%`
                  : 'no usable number'
                : o.tier}
            </span>
          </span>
          <button
            type="button"
            aria-label={`Remove ${o.label}`}
            onClick={() => {
              focusRequest.current = 'label'
              onChange({
                ...run,
                outcomes: removeOutcome(run.outcomes, o.id),
                percents: Object.fromEntries(
                  Object.entries(run.percents).filter(([id]) => id !== o.id)
                ),
              })
            }}
            className="text-sm text-blue-700 underline focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  )

  if (run.phase === 'ask') {
    return (
      <MultiQuestions
        claim={run.claim}
        base={withAnswers(toMultiRun(run), run.answers)}
        stopped={run.stopped}
        kept={run.kept}
        adjusted={run.adjusted}
        onAdjusted={adjusted => onChange({ ...run, adjusted })}
        merged={run.merged}
        onMerged={merged => onChange({ ...run, merged, adjusted: {} })}
        onBet={onBet}
        stake={stake}
        focusOnShow={askFocus}
        onAnswers={answers => onChange({ ...run, answers })}
        onStop={() => onChange({ ...run, stopped: true })}
        onStartAgain={onStartAgain}
      />
    )
  }

  if (run.phase === 'check') {
    return (
      <div className="mt-4 max-w-2xl space-y-6">
        {claimField}
        <SpotChecks
          run={run}
          onStartAgain={onStartAgain}
          focusOnShow={checkFocus}
          onChange={next => {
            // Where the cursor goes when the checks hand over
            if (next.phase === 'discover') {
              focusRequest.current = isAtCap(next.outcomes.items) ? 'cap' : 'label'
            }
            if (next.phase === 'sketch') focusRequest.current = 'sketch'
            onChange(next)
          }}
        />
      </div>
    )
  }

  if (run.phase === 'sketch' && run.view === 'numbers') {
    return (
      <div className="mt-4 max-w-2xl space-y-6">
        {claimField}
        <h2
          ref={sketchRef}
          tabIndex={-1}
          className="text-xl font-semibold text-gray-900 focus:outline-none"
        >
          Your numbers
        </h2>
        {run.kept && <KeptNotice />}
        <p className="text-gray-700">
          Your own percentages, taken as typed. They should add up to 100%; Normalize scales them if
          you want that. They have not been checked yet. More questions to refine them are coming.
        </p>
        <PercentList
          listLabel="Your numbers"
          rows={items}
          values={run.percents}
          onChange={percents => onChange({ ...run, percents })}
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={PRIMARY}
            disabled={!numbersUsable}
            onClick={startQuestions}
          >
            Start the questions
          </button>
          <button
            type="button"
            className={SECONDARY}
            onClick={() => {
              focusRequest.current = 'label'
              onChange({ ...run, phase: 'discover', checks: [], kept: false })
            }}
          >
            Change the outcomes
          </button>
          <button type="button" className={SECONDARY} onClick={onStartAgain}>
            Start again
          </button>
        </div>
      </div>
    )
  }

  if (run.phase === 'sketch') {
    const sketch = firstSketch(items)
    return (
      <div className="mt-4 max-w-2xl space-y-6">
        {claimField}
        <h2
          ref={sketchRef}
          tabIndex={-1}
          className="text-xl font-semibold text-gray-900 focus:outline-none"
        >
          First sketch
        </h2>
        {run.kept && <KeptNotice />}
        <p className="text-gray-700">
          A rough guess from the tiers you chose, scaled to add up to 100%. It has not been checked
          yet. More questions to refine this are coming.
        </p>
        <ul aria-label="First sketch" className="space-y-2">
          {items.map(o => (
            <li key={o.id} className="flex justify-between rounded-md bg-gray-50 px-3 py-2">
              <span className="font-medium text-gray-900">{o.label}</span>
              <span className="text-gray-800">{formatPercent(sketch.get(o.id)!)}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={PRIMARY} onClick={startQuestions}>
            Start the questions
          </button>
          <button
            type="button"
            className={SECONDARY}
            onClick={() => {
              focusRequest.current = 'label'
              onChange({ ...run, phase: 'discover', checks: [], kept: false })
            }}
          >
            Change the outcomes
          </button>
          <button type="button" className={SECONDARY} onClick={onStartAgain}>
            Start again
          </button>
        </div>
      </div>
    )
  }

  const add = (newLabel: string, newTier: Tier | null, newPercent?: string) => {
    // At the cap the form goes away: the notice takes the cursor
    focusRequest.current = items.length + 1 >= MAX_OUTCOMES ? 'cap' : 'label'
    const outcomes = addOutcome(run.outcomes, newLabel, newTier)
    const percents =
      newPercent === undefined
        ? run.percents
        : { ...run.percents, [outcomes.items[outcomes.items.length - 1].id]: newPercent }
    onChange({ ...run, outcomes, percents })
  }

  const switchView = (view: MultiView) => {
    focusRequest.current = 'label'
    setError(null)
    onChange({ ...run, view })
  }
  const numbersView = run.view === 'numbers'
  const parsedPercent = parsePercent(percent)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const problem = labelProblem(items, label)
    const message =
      problem === 'empty'
        ? 'Name the outcome first.'
        : problem === 'duplicate'
          ? 'That outcome is already in the list.'
          : label.trim().length > MAX_TEXT_LENGTH
            ? `Shorten the outcome to ${MAX_TEXT_LENGTH} characters or fewer.`
            : numbersView
              ? parsedPercent === null
                ? PERCENT_PROBLEM
                : null
              : tier === null
                ? 'Say how likely it is: pick a tier.'
                : null
    if (message || (numbersView ? parsedPercent === null : tier === null)) {
      const aboutPercent = problem === null && numbersView
      setError(message)
      setErrorField(aboutPercent ? 'percent' : 'label')
      ;(aboutPercent ? percentRef : labelRef).current?.focus()
      return
    }
    if (numbersView) add(label, null, parsedPercent!)
    else add(label, tier)
    setLabel('')
    setTier(null)
    setPercent('')
    setError(null)
  }

  const offerElse = !run.declinedElse && shouldOfferEverythingElse(items)
  const atCap = isAtCap(items)

  return (
    <div className="mt-4 max-w-2xl space-y-6">
      {claimField}
      {run.reviewing && (
        <p id={ids.review} role="note" className="rounded-lg bg-blue-50 p-3 text-sm text-gray-800">
          You are changing a list the checks found a problem with. Read the whole list again: the
          same problem may be somewhere else in it.
          {run.replaced !== null && ` Add the narrower outcomes that replace “${run.replaced}”.`}
        </p>
      )}
      {/* The offer appears while focus stays in the form: say so */}
      <div role="status" className="sr-only">
        {offerElse
          ? 'The last outcomes were all very unlikely. Should “Everything else” be an outcome too?'
          : ''}
      </div>
      {list}
      {offerElse && (
        <div role="group" aria-label="Everything else" className="rounded-lg bg-blue-50 p-3">
          <p className="text-sm text-gray-800">
            The last outcomes were all very unlikely, so something else may be what happens. Should
            “{EVERYTHING_ELSE_LABEL}” be an outcome too?
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="button"
              className={PRIMARY}
              onClick={() => add(EVERYTHING_ELSE_LABEL, 'unlikely')}
            >
              Add “{EVERYTHING_ELSE_LABEL}”
            </button>
            <button
              type="button"
              className={SECONDARY}
              onClick={() => {
                focusRequest.current = 'label'
                onChange({ ...run, declinedElse: true })
              }}
            >
              No, there is nothing else
            </button>
          </div>
        </div>
      )}
      {atCap ? (
        <p ref={capRef} tabIndex={-1} className="text-gray-700 focus:outline-none">
          That is the most outcomes the tool handles ({MAX_OUTCOMES}). Remove one to add another.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {items.length === 0 ? 'What is the first outcome?' : 'Is there another outcome?'}
          </h2>
          {items.length === 0 && (
            <button
              type="button"
              className="text-sm text-blue-700 underline focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onClick={() => switchView(numbersView ? 'tiers' : 'numbers')}
            >
              {numbersView ? 'Use tiers instead of numbers' : 'Use numbers instead of tiers'}
            </button>
          )}
          <div>
            <label htmlFor={ids.label} className="mb-1 block text-sm font-medium text-gray-700">
              Outcome
            </label>
            <input
              id={ids.label}
              ref={labelRef}
              type="text"
              autoComplete="off"
              value={label}
              onChange={e => {
                setLabel(e.target.value)
                setError(null)
              }}
              aria-invalid={error && errorField === 'label' ? true : undefined}
              aria-describedby={
                [
                  run.reviewing ? ids.review : null,
                  error && errorField === 'label' ? ids.error : null,
                ]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              className={FIELD}
            />
          </div>
          {numbersView ? (
            <div>
              <label htmlFor={ids.percent} className="mb-1 block text-sm font-medium text-gray-700">
                Percent
              </label>
              <input
                id={ids.percent}
                ref={percentRef}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={percent}
                onChange={e => {
                  setPercent(e.target.value)
                  setError(null)
                }}
                aria-invalid={error && errorField === 'percent' ? true : undefined}
                aria-describedby={error && errorField === 'percent' ? ids.error : undefined}
                className={`${FIELD} w-32`}
              />
            </div>
          ) : (
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-gray-700">How likely is it?</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {TIERS.map(t => (
                  <label key={t} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="tier"
                      value={t}
                      checked={tier === t}
                      onChange={() => {
                        setTier(t)
                        setError(null)
                      }}
                      className="h-4 w-4"
                    />
                    {t}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {error && (
            <p id={ids.error} role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" className={PRIMARY}>
            Add outcome
          </button>
        </form>
      )}
      {hasEnoughOutcomes(items) && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={atCap ? PRIMARY : SECONDARY}
            onClick={() => {
              if (claimMissing) {
                focusRequest.current = 'claim'
                onChange({ ...run })
                return
              }
              const reset = { checks: [], kept: false, reviewing: false, replaced: null }
              if (spotChecksOf(run.outcomes, run.seed).length === 0) {
                // Only "Everything else" and one other: nothing to ask
                focusRequest.current = 'sketch'
                onChange({ ...run, ...reset, phase: 'sketch' })
                return
              }
              setCheckFocus(true)
              onChange({ ...run, ...reset, phase: 'check' })
            }}
          >
            That is all the outcomes
          </button>
        </div>
      )}
    </div>
  )
}
