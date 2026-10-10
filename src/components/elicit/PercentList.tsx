import Decimal from 'decimal.js'
import { useEffect, useId, useRef, type Ref } from 'react'
import { parseBar, parsePercent } from '../../domain/elicitation/format'
import {
  describeTotal,
  normalizePercents,
  normalizePercentsAtLeast,
  totalState,
} from '../../domain/elicitation/insights'

export interface PercentRow {
  id: string
  label: string
}

interface PercentListProps {
  /** Names the list for assistive technology. */
  listLabel: string
  rows: readonly PercentRow[]
  /** The percentage text per row id, as typed. */
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
  /**
   * Bars: a blank field is 0, 0 and 100 are allowed, and each row draws its bar. Otherwise
   * every row needs a usable percentage above 0 and below 100.
   */
  bars?: boolean
  /** A line under a row's field (say, how it sits against what the answers imply), by row id. */
  notes?: Record<string, string>
  /** The Normalize button, for a caller that needs to send the user there. */
  normalizeRef?: Ref<HTMLButtonElement>
  /** An empty field is not yet an error (the user is still filling them in); it is still not usable. */
  allowBlank?: boolean
}

const PROBLEM_STRICT = 'Enter a percentage above 0 and below 100, with at most two decimals.'
const PROBLEM_BARS = 'Enter a percentage from 0 to 100, with at most two decimals.'

const FIELD =
  'block w-32 rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'
const PRIMARY =
  'rounded-md bg-blue-600 px-5 py-2 text-base font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'

/**
 * A percentage per row with the live total ("12 points too many" / "13 points not yet
 * placed") and Normalize. The values are taken as typed; nothing is rescaled unless the
 * user presses Normalize.
 */
export default function PercentList({
  listLabel,
  rows,
  values,
  onChange,
  bars = false,
  notes = {},
  normalizeRef,
  allowBlank = false,
}: PercentListProps) {
  const base = useId()
  const totalRef = useRef<HTMLParagraphElement>(null)
  const focusTotal = useRef(false)
  // Normalize goes away once the total is 100: the total takes the cursor
  useEffect(() => {
    if (focusTotal.current) {
      focusTotal.current = false
      totalRef.current?.focus()
    }
  })

  const parse = (id: string): string | null => {
    const text = values[id] ?? ''
    if (bars && text.trim() === '') return '0'
    return bars ? parseBar(text) : parsePercent(text)
  }
  const parsed = rows.map(r => parse(r.id))
  const anyInvalid = parsed.some(p => p === null)
  const numbers = parsed.map(p => new Decimal(p ?? 0))
  const state = totalState(numbers)
  const total = numbers.reduce((s, v) => s.plus(v), new Decimal(0))

  const normalize = () => {
    focusTotal.current = true
    const next = bars ? normalizePercents(numbers) : normalizePercentsAtLeast(numbers)
    onChange(Object.fromEntries(next.map((v, i) => [rows[i].id, v.toString()])))
  }

  return (
    <>
      <ul aria-label={listLabel} className="space-y-3">
        {rows.map((row, i) => {
          const bad = parsed[i] === null && !(allowBlank && (values[row.id] ?? '').trim() === '')
          const inputId = `${base}-${row.id}`
          return (
            <li key={row.id}>
              <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">
                {row.label}, percent
              </label>
              <div className="flex items-center gap-3">
                <input
                  id={inputId}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={values[row.id] ?? ''}
                  onChange={e => onChange({ ...values, [row.id]: e.target.value })}
                  aria-invalid={bad ? true : undefined}
                  aria-describedby={
                    bad ? `${inputId}-error` : notes[row.id] ? `${inputId}-note` : undefined
                  }
                  className={FIELD}
                />
                {bars && (
                  <div aria-hidden="true" className="h-4 flex-1 rounded bg-gray-100">
                    <div
                      className="h-4 rounded bg-blue-500"
                      style={{ width: `${Math.min(100, Number(parsed[i] ?? 0))}%` }}
                    />
                  </div>
                )}
              </div>
              {!bad && notes[row.id] && (
                <p id={`${inputId}-note`} className="mt-1 text-sm text-gray-600">
                  {notes[row.id]}
                </p>
              )}
              {bad && (
                <p id={`${inputId}-error`} className="mt-1 text-sm text-red-700">
                  {bars ? PROBLEM_BARS : PROBLEM_STRICT}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      <p
        ref={totalRef}
        tabIndex={-1}
        role="status"
        className="mt-3 font-medium text-gray-900 focus:outline-none"
      >
        {anyInvalid
          ? 'Some numbers are not usable yet.'
          : (describeTotal(state) ?? 'The numbers add up to 100%.')}
      </p>
      {!anyInvalid && state.kind !== 'ok' && total.gt(0) && (
        <button ref={normalizeRef} type="button" className={`mt-3 ${PRIMARY}`} onClick={normalize}>
          Normalize
        </button>
      )}
    </>
  )
}
