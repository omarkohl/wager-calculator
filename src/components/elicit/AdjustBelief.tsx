import { useId, useState, type Ref } from 'react'
import Decimal from 'decimal.js'
import {
  adjustmentGap,
  defaultAdjusted,
  describeBand,
  describeGap,
  parseAdjusted,
} from '../../domain/elicitation/format'
import { fromPercent, type Band } from '../../domain/elicitation/logOdds'

interface AdjustBeliefProps {
  /** What the answers imply; fixed. */
  band: Band
  /** Its log-odds midpoint; null for a one-sided band. */
  pointEstimate: Decimal | null
  /** The user's own value in percent, or null if never set. */
  adjusted: string | null
  /** Without it the section is read-only (a shared result). */
  onChange?: (adjusted: string | null) => void
  /** Someone else's result: the labels do not say "your". */
  other?: boolean
  /** The field, for a caller that needs to send the user there. */
  inputRef?: Ref<HTMLInputElement>
  /** Told whenever the text becomes valid or invalid (empty counts as valid), as it is typed. */
  onTextValidity?: (valid: boolean) => void
}

/**
 * "Your answers imply" (fixed) beside "Your adjusted belief" (free to edit): once the
 * result is shown the user may set a value of their own, e.g. with a clearer sense of
 * what the numbers mean. The field starts at the point estimate, and empty when the band
 * is one-sided (no point estimate). A gap is described neutrally, never blocked.
 * [NEEDS PROTOTYPE]
 */
export default function AdjustBelief({
  band,
  pointEstimate,
  adjusted,
  onChange,
  other = false,
  inputRef,
  onTextValidity,
}: AdjustBeliefProps) {
  const fieldId = useId()
  const errorId = useId()
  const hintId = useId()
  const [text, setText] = useState(
    adjusted ?? (pointEstimate ? defaultAdjusted(pointEstimate) : '')
  )
  const [invalid, setInvalid] = useState(false)

  const handle = (value: string) => {
    setText(value)
    onTextValidity?.(value.trim() === '' || parseAdjusted(value) !== null)
    if (value.trim() === '') {
      setInvalid(false)
      onChange?.(null)
      return
    }
    // "4." on the way to "4.5" is not an error yet: complaints wait for the field to be left
    const parsed = parseAdjusted(value)
    if (parsed !== null) {
      setInvalid(false)
      onChange?.(parsed)
    }
  }

  const handleBlur = () => {
    if (text.trim() !== '' && parseAdjusted(text) === null) setInvalid(true)
  }

  // While the text is not a valid value (say "100" on the way past "10"), the last valid
  // value is still stored but would be described out of date: say nothing about a gap then
  const textIsValid = text.trim() === '' || parseAdjusted(text) !== null
  const gap = adjusted !== null && textIsValid ? adjustmentGap(fromPercent(adjusted), band) : null
  const showHint = !pointEstimate && adjusted === null && onChange !== undefined
  const describedBy = [showHint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(' ')

  // Read-only (a shared result) with no value set: nothing to show
  if (!onChange && adjusted === null) return null

  return (
    <section
      aria-labelledby={`${fieldId}-heading`}
      className="rounded-lg border border-gray-200 p-4"
    >
      <h3 id={`${fieldId}-heading`} className="sr-only">
        {onChange ? 'Adjust your belief' : other ? 'The adjusted belief' : 'Your belief'}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-600">
            {other ? 'The answers imply' : 'Your answers imply'}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{describeBand(band)}</p>
        </div>
        <div>
          {onChange ? (
            <>
              <label htmlFor={fieldId} className="text-sm font-medium text-gray-600">
                Your adjusted belief (%)
              </label>
              <input
                id={fieldId}
                ref={inputRef}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={text}
                onChange={e => handle(e.target.value)}
                onBlur={handleBlur}
                aria-invalid={invalid ? true : undefined}
                aria-describedby={describedBy || undefined}
                className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-2xl font-bold text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {invalid && (
                <p id={errorId} role="alert" className="mt-1 text-sm text-red-700">
                  Enter a percentage above 0 and below 100, with at most two decimals.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-600">
                {other ? 'The adjusted belief' : 'Your adjusted belief'}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{adjusted}%</p>
            </>
          )}
        </div>
      </div>
      {gap && <p className="mt-3 text-sm text-gray-700">{describeGap(gap, other)}</p>}
      {showHint && (
        <p id={hintId} className="mt-3 text-sm text-gray-600">
          Your answers only bound one side, so there is no starting value: set your own.
        </p>
      )}
    </section>
  )
}
