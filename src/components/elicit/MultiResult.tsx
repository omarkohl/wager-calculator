import type { RefObject } from 'react'
import { describeBand } from '../../domain/elicitation/format'
import { formatPercent } from '../../domain/elicitation/logOdds'
import { multiResult } from '../../domain/elicitation/multiResult'
import type { MultiRun } from '../../domain/elicitation/multiRun'
import KeptNotice from './KeptNotice'

interface MultiResultProps {
  claim: string
  run: MultiRun
  stopped: boolean
  /** The user kept outcomes that overlap or leave something out: the numbers carry a notice. */
  kept: boolean
  headingRef: RefObject<HTMLHeadingElement | null>
  onStartAgain: () => void
}

const PRIMARY =
  'rounded-md bg-blue-600 px-5 py-2 text-base font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'

/**
 * The result of a claim with several outcomes: per outcome a band on its probability (the
 * headline), a point estimate (the band's log-odds midpoint) and where the number comes from;
 * what does not fit together, flagged and never rescaled; insights. [NEEDS PROTOTYPE]
 */
export default function MultiResult({
  claim,
  run,
  stopped,
  kept,
  headingRef,
  onStartAgain,
}: MultiResultProps) {
  const { rows, flags, insights } = multiResult(run)
  return (
    <section aria-labelledby="result-heading" className="mt-6 max-w-2xl space-y-5">
      <h2
        id="result-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-semibold text-gray-900 focus:outline-none"
      >
        Your result
      </h2>
      <p className="text-gray-700">“{claim}”</p>
      {kept && <KeptNotice />}
      {stopped && (
        <p className="text-gray-700">
          You stopped early, so some outcomes are still rough guesses.
        </p>
      )}

      <ul aria-label="Result per outcome" className="space-y-2">
        {rows.map(r => (
          <li key={r.id} className="rounded-md bg-gray-50 px-3 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-medium text-gray-900">{r.label}</span>
              <span className="text-lg font-semibold text-gray-900">
                {describeBand({
                  lo: r.lo.lte(0) ? null : r.lo,
                  hi: r.hi.gte(1) ? null : r.hi,
                })}
                {r.widened && (
                  <span className="ml-2 text-sm font-normal text-gray-600">(range widened)</span>
                )}
              </span>
            </div>
            <div className="text-sm text-gray-700">
              {r.estimate
                ? `Best single number: about ${formatPercent(r.estimate)}`
                : 'No single number yet: the range has no upper or lower end.'}
            </div>
            <div className="text-sm text-gray-600">
              {r.provenance.source === 'first-guess'
                ? 'From your first guess'
                : `From ${r.provenance.count} ${r.provenance.count === 1 ? 'answer' : 'answers'}`}
            </div>
          </li>
        ))}
      </ul>

      {flags.length > 0 && (
        <div role="note" className="rounded-lg bg-amber-50 p-3 text-sm text-gray-900">
          <p className="font-medium">Some of your answers do not fit together</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {flags.map(f => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="mt-1">Nothing was rescaled: the ranges just got wider.</p>
        </div>
      )}

      {insights.length > 0 && (
        <ul aria-label="Insights" className="list-disc space-y-1 pl-5 text-gray-800">
          {insights.map(i => (
            <li key={i.text}>{i.text}</li>
          ))}
        </ul>
      )}

      <button type="button" className={PRIMARY} onClick={onStartAgain}>
        Start again
      </button>
    </section>
  )
}
