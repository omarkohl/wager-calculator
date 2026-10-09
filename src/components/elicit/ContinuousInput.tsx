import Decimal from 'decimal.js'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { MAX_OUTCOMES } from '../../domain/elicitation/constants'
import { isAmbiguousNumber, parseNumber } from '../../domain/elicitation/format'
import { MAX_TEXT_LENGTH } from '../../storage/elicitation'
import {
  barIds,
  bucketsOf,
  MAX_NUMBER_TEXT,
  MAX_UNIT_LENGTH,
  rangeProblem,
  type ContinuousRunData,
} from '../../storage/continuousRun'
import PercentList from './PercentList'

interface ContinuousInputProps {
  run: ContinuousRunData
  /** Put the cursor in the first field on arrival (after the user acted, not on a plain load). */
  focusOnShow?: boolean
  onChange: (run: ContinuousRunData) => void
  onStartAgain: () => void
}

const FIELD =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'
const PRIMARY =
  'rounded-md bg-blue-600 px-5 py-2 text-base font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
const SECONDARY =
  'rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'

/** Why a typed number was refused: ambiguous commas get their own word. */
const numberMessage = (text: string, what: string) =>
  isAmbiguousNumber(text)
    ? `Write ${what} without a thousands separator (1000, not 1,000); use a dot for decimals.`
    : `Enter ${what} as a number.`

type Target = 'min' | 'max' | 'threshold' | 'bars' | 'claim'

/**
 * Entering a number claim: the plausible minimum and maximum and the thresholds that matter,
 * then a bar per bucket [NEEDS PROTOTYPE: bars here; the curve is the other way to draw].
 * Each bar is its bucket's probability, as typed; a live total says how far from 100% it is
 * until the user fixes it or presses Normalize. The claim stays editable.
 */
export default function ContinuousInput({
  run,
  focusOnShow,
  onChange,
  onStartAgain,
}: ContinuousInputProps) {
  const [threshold, setThreshold] = useState('')
  const [error, setError] = useState<{ field: Target; text: string } | null>(null)
  // Counts failures, so the same message twice in a row is announced twice
  const [failures, setFailures] = useState(0)
  const minRef = useRef<HTMLInputElement>(null)
  const maxRef = useRef<HTMLInputElement>(null)
  const thresholdRef = useRef<HTMLInputElement>(null)
  const barsRef = useRef<HTMLHeadingElement>(null)
  const claimRef = useRef<HTMLTextAreaElement>(null)
  // Where focus goes once the next render has put the target on the page
  const focusRequest = useRef<Target | null>(focusOnShow ? 'min' : null)
  useEffect(() => {
    const target = focusRequest.current
    if (!target) return
    focusRequest.current = null
    const refs = {
      min: minRef,
      max: maxRef,
      threshold: thresholdRef,
      bars: barsRef,
      claim: claimRef,
    }
    refs[target].current?.focus()
  })
  const ids = {
    claim: useId(),
    claimError: useId(),
    unit: useId(),
    min: useId(),
    max: useId(),
    threshold: useId(),
    error: useId(),
  }

  const claimMissing = run.claim.trim() === ''
  const claimField = (
    <div>
      <label htmlFor={ids.claim} className="mb-1 block text-sm font-medium text-gray-700">
        Claim
      </label>
      <textarea
        id={ids.claim}
        ref={claimRef}
        rows={2}
        value={run.claim}
        maxLength={MAX_TEXT_LENGTH}
        aria-invalid={claimMissing ? true : undefined}
        aria-describedby={claimMissing ? ids.claimError : undefined}
        onChange={e => onChange({ ...run, claim: e.target.value })}
        className={FIELD}
      />
      {claimMissing && (
        <p id={ids.claimError} role="alert" className="mt-1 text-sm text-red-700">
          Write the claim this number belongs to.
        </p>
      )}
    </div>
  )

  // ------------------------------------------------------------------- bars
  if (run.phase === 'bars') {
    const { labels } = bucketsOf(run)
    const rows = barIds(labels.length).map((id, i) => ({ id, label: labels[i] }))
    return (
      <div className="mt-4 max-w-2xl space-y-6">
        {claimField}
        <h2
          ref={barsRef}
          tabIndex={-1}
          className="text-xl font-semibold text-gray-900 focus:outline-none"
        >
          Draw your distribution
        </h2>
        <p className="text-gray-700">
          Give each range the chance that the number lands in it. Anything goes while you work; the
          total says how far you are from 100%, and Normalize scales the bars to 100% if you want
          that. Nothing has been checked yet. More questions to refine this are coming.
        </p>
        <PercentList
          listLabel="Bars"
          rows={rows}
          values={run.percents}
          onChange={percents => onChange({ ...run, percents })}
          bars
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={SECONDARY}
            onClick={() => {
              focusRequest.current = 'min'
              // The bars stay with the run: they carry over if the buckets come out the same
              onChange({ ...run, phase: 'range' })
            }}
          >
            Change the range
          </button>
          <button type="button" className={SECONDARY} onClick={onStartAgain}>
            Start again
          </button>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------------ range
  const fail = (field: Target, text: string) => {
    setError({ field, text })
    setFailures(n => n + 1)
    focusRequest.current = field
  }
  const fieldProps = (field: Target) => ({
    'aria-invalid': error?.field === field ? (true as const) : undefined,
    'aria-describedby': error?.field === field ? ids.error : undefined,
  })

  const insideRange = (value: string) => {
    const min = parseNumber(run.min)
    const max = parseNumber(run.max)
    return (
      min === null || max === null || (new Decimal(value).gt(min) && new Decimal(value).lt(max))
    )
  }

  const addThreshold = (event: FormEvent) => {
    event.preventDefault()
    const value = parseNumber(threshold)
    if (value === null) return fail('threshold', numberMessage(threshold, 'the threshold'))
    if (run.thresholds.includes(value)) return fail('threshold', 'That threshold is already there.')
    if (!insideRange(value)) {
      return fail('threshold', 'A threshold has to lie between the minimum and the maximum.')
    }
    if (run.thresholds.length >= MAX_OUTCOMES - 1) {
      return fail('threshold', `At most ${MAX_OUTCOMES - 1} thresholds fit.`)
    }
    setError(null)
    setThreshold('')
    focusRequest.current = 'threshold'
    onChange({
      ...run,
      thresholds: [...run.thresholds, value].sort((a, b) => new Decimal(a).cmp(b)),
    })
  }

  const draw = (event: FormEvent) => {
    event.preventDefault()
    if (claimMissing) {
      // The claim field already says so: just take the user there
      claimRef.current?.focus()
      return
    }
    const problem = rangeProblem(run)
    if (problem === 'min') return fail('min', numberMessage(run.min, 'the plausible minimum'))
    if (problem === 'max') return fail('max', numberMessage(run.max, 'the plausible maximum'))
    if (problem === 'order') return fail('max', 'The maximum has to be above the minimum.')
    if (!run.thresholds.every(insideRange)) {
      return fail('threshold', 'A threshold lies outside the range: remove it or widen the range.')
    }
    setError(null)
    focusRequest.current = 'bars'
    // Bars drawn for the same buckets are kept (only the unit may have changed)
    const edges = bucketsOf(run).edges.map(String)
    const same = edges.length === run.edges.length && edges.every((e, i) => e === run.edges[i])
    onChange({ ...run, phase: 'bars', edges, percents: same ? run.percents : {} })
  }

  return (
    <form onSubmit={draw} noValidate className="mt-4 max-w-2xl space-y-6">
      {claimField}
      <h2 className="text-xl font-semibold text-gray-900">What range could the number take?</h2>
      <div className="flex flex-wrap gap-4">
        <div className="w-40">
          <label htmlFor={ids.min} className="mb-1 block text-sm font-medium text-gray-700">
            Plausible minimum
          </label>
          <input
            id={ids.min}
            ref={minRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            maxLength={MAX_NUMBER_TEXT}
            value={run.min}
            onChange={e => {
              setError(null)
              onChange({ ...run, min: e.target.value })
            }}
            {...fieldProps('min')}
            className={FIELD}
          />
        </div>
        <div className="w-40">
          <label htmlFor={ids.max} className="mb-1 block text-sm font-medium text-gray-700">
            Plausible maximum
          </label>
          <input
            id={ids.max}
            ref={maxRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            maxLength={MAX_NUMBER_TEXT}
            value={run.max}
            onChange={e => {
              setError(null)
              onChange({ ...run, max: e.target.value })
            }}
            {...fieldProps('max')}
            className={FIELD}
          />
        </div>
        <div className="w-32">
          <label htmlFor={ids.unit} className="mb-1 block text-sm font-medium text-gray-700">
            Unit (optional)
          </label>
          <input
            id={ids.unit}
            type="text"
            autoComplete="off"
            maxLength={MAX_UNIT_LENGTH}
            value={run.unit}
            onChange={e => onChange({ ...run, unit: e.target.value })}
            className={FIELD}
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700">Thresholds that matter</legend>
        <p className="text-sm text-gray-600">
          Values where the answer changes something for you (frost at 0, a missed connection at 8).
          The ranges always break there.
        </p>
        {run.thresholds.length > 0 && (
          <ul aria-label="Thresholds" className="flex flex-wrap gap-2">
            {run.thresholds.map(t => (
              <li
                key={t}
                className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1"
              >
                {t}
                {run.unit ? ` ${run.unit}` : ''}
                <button
                  type="button"
                  aria-label={`Remove threshold ${t}`}
                  onClick={() => {
                    focusRequest.current = 'threshold'
                    onChange({ ...run, thresholds: run.thresholds.filter(x => x !== t) })
                  }}
                  className="text-sm text-blue-700 underline focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label htmlFor={ids.threshold} className="mb-1 block text-sm font-medium text-gray-700">
              Threshold
            </label>
            <input
              id={ids.threshold}
              ref={thresholdRef}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              maxLength={MAX_NUMBER_TEXT}
              value={threshold}
              onChange={e => {
                setThreshold(e.target.value)
                setError(null)
              }}
              onKeyDown={e => {
                // Enter adds the threshold; it does not draw the distribution
                if (e.key === 'Enter') addThreshold(e)
              }}
              {...fieldProps('threshold')}
              className={FIELD}
            />
          </div>
          <button type="button" className={SECONDARY} onClick={addThreshold}>
            Add threshold
          </button>
        </div>
      </fieldset>

      {error && (
        <p key={failures} id={ids.error} role="alert" className="text-sm text-red-700">
          {error.text}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={PRIMARY}>
          Draw the distribution
        </button>
        <button type="button" className={SECONDARY} onClick={onStartAgain}>
          Start again
        </button>
      </div>
    </form>
  )
}
