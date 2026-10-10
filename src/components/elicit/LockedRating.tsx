import { useEffect, useRef } from 'react'
import { parsePercent } from '../../domain/elicitation/format'
import { TIERS, type Tier } from '../../domain/elicitation/model'
import type { MultiRunData } from '../../storage/multiRun'
import PercentList from './PercentList'

interface LockedRatingProps {
  run: MultiRunData
  /** Put the cursor on the heading on arrival (after the user acted, not on a plain load). */
  focusOnShow: boolean
  onChange: (run: MultiRunData) => void
  /** Every outcome is rated and the user says so. */
  onDone: () => void
}

const PRIMARY =
  'rounded-md bg-blue-600 px-5 py-2 text-base font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Rating the outcomes an invite fixes: each into a tier, or with a number of one's own. The
 * outcomes cannot be added, renamed or removed, so the answers can be compared with the sender's.
 */
export default function LockedRating({ run, focusOnShow, onChange, onDone }: LockedRatingProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focusOnShow) headingRef.current?.focus()
  }, [focusOnShow])
  const items = run.outcomes.items
  const numbers = run.view === 'numbers'
  const complete = numbers
    ? items.every(o => parsePercent(run.percents[o.id] ?? '') !== null)
    : items.every(o => o.tier !== null)

  const rate = (id: string, tier: Tier) =>
    onChange({
      ...run,
      outcomes: { ...run.outcomes, items: items.map(o => (o.id === id ? { ...o, tier } : o)) },
    })
  const switchView = () =>
    // The other way of rating starts clean: a tier and a number would not say the same thing
    onChange({
      ...run,
      view: numbers ? 'tiers' : 'numbers',
      percents: {},
      outcomes: { ...run.outcomes, items: items.map(o => ({ ...o, tier: null })) },
    })

  return (
    <div className="mt-4 max-w-2xl space-y-6">
      <p className="text-gray-700">“{run.claim}”</p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-semibold text-gray-900 focus:outline-none"
      >
        How likely is each outcome?
      </h2>
      <p className="text-sm text-gray-700">
        The outcomes come from the invite and cannot be changed. Rate each one.
      </p>
      <button type="button" className="text-sm text-blue-700 underline" onClick={switchView}>
        {numbers ? 'Use tiers instead of numbers' : 'Use numbers instead of tiers'}
      </button>

      {numbers ? (
        <PercentList
          listLabel="Your numbers"
          rows={items}
          values={run.percents}
          onChange={percents => onChange({ ...run, percents })}
          allowBlank
        />
      ) : (
        <div className="space-y-4">
          {items.map(o => (
            <fieldset key={o.id}>
              <legend className="mb-1 text-sm font-medium text-gray-900">{o.label}</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {TIERS.map(t => (
                  <label key={t} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`tier-${o.id}`}
                      value={t}
                      checked={o.tier === t}
                      onChange={() => rate(o.id, t)}
                      className="h-4 w-4"
                    />
                    {t}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={PRIMARY} disabled={!complete} onClick={onDone}>
          That is all rated
        </button>
        {!complete && <span className="text-sm text-gray-600">Rate every outcome first.</span>}
      </div>
    </div>
  )
}
