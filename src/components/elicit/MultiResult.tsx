import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import Decimal from 'decimal.js'
import {
  adjustmentGap,
  defaultAdjusted,
  describeBand,
  describeGap,
  parsePercent,
} from '../../domain/elicitation/format'
import { canBet, describeTotal, mergeOffer, totalState } from '../../domain/elicitation/insights'
import { formatPercent } from '../../domain/elicitation/logOdds'
import { multiResult } from '../../domain/elicitation/multiResult'
import { multiTrace } from '../../domain/elicitation/multiTrace'
import type { MultiRun } from '../../domain/elicitation/multiRun'
import KeptNotice from './KeptNotice'
import PercentList from './PercentList'

/** One outcome of a bet: its number, and the range the answers gave for it. */
export interface BetItem {
  label: string
  percent: string
  range: string
}

interface MultiResultProps {
  claim: string
  run: MultiRun
  stopped: boolean
  /** The user kept outcomes that overlap or leave something out: the numbers carry a notice. */
  kept: boolean
  headingRef: RefObject<HTMLHeadingElement | null>
  /** The user's own numbers (percent as typed) by row id; missing ones start at the best single number. */
  adjusted: Record<string, string>
  onAdjusted: (adjusted: Record<string, string>) => void
  /** Outcomes merged into "Everything else" (a view). Without `onMerged` no merge is offered. */
  merged?: string[]
  onMerged?: (ids: string[]) => void
  /** "Bet on this": the wager with these outcomes and the user's numbers (they add up to 100%). */
  onBet?: (items: BetItem[]) => void
  onStartAgain: () => void
}

const SECONDARY =
  'rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
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
  adjusted,
  onAdjusted,
  merged = [],
  onMerged,
  onBet,
  onStartAgain,
}: MultiResultProps) {
  const { rows, flags, insights } = multiResult(run, merged)
  const offer =
    onMerged && merged.length === 0
      ? mergeOffer(rows.map(r => ({ id: r.id, label: r.label, estimate: r.central })))
      : null
  const trace = multiTrace(run, adjusted, merged)
  const label = (id: string) => run.outcomes.find(o => o.id === id)?.label ?? id

  // Merging and undoing swap one button for the other: the cursor follows
  const undoRef = useRef<HTMLButtonElement>(null)
  const offerRef = useRef<HTMLDivElement>(null)
  const focusAfter = useRef<'undo' | 'offer' | null>(null)
  useEffect(() => {
    const target = focusAfter.current
    if (!target) return
    focusAfter.current = null
    ;(target === 'undo' ? undoRef.current : (offerRef.current ?? headingRef.current))?.focus()
  })

  // The user's own numbers start at the best single number, or the sketch where there is none
  const own = Object.fromEntries(
    rows.map(r => [
      r.id,
      adjusted[r.id] ??
        Decimal.min(
          Decimal.max(new Decimal(defaultAdjusted(r.central)), new Decimal('0.01')),
          new Decimal('99.99')
        ).toString(),
    ])
  )
  const notes = Object.fromEntries(
    rows.flatMap(r => {
      // untouched starting values are not "set" by the user: no remark on them
      const value = adjusted[r.id] === undefined ? null : parsePercent(own[r.id])
      if (value === null) return []
      const band = { lo: r.lo.lte(0) ? null : r.lo, hi: r.hi.gte(1) ? null : r.hi }
      return [[r.id, describeGap(adjustmentGap(new Decimal(value).div(100), band))]]
    })
  )
  // "Bet on this" only at exactly 100%: otherwise it points to Normalize, which the user presses
  const normalizeRef = useRef<HTMLButtonElement>(null)
  const betHintId = useId()
  // The hint belongs to the numbers it was said about: once they change it is gone
  const ownKey = JSON.stringify(own)
  const [hint, setHint] = useState<{ text: string; key: string } | null>(null)
  const betHint = hint && hint.key === ownKey ? hint.text : null
  const bet = () => {
    const say = (text: string) => setHint({ text, key: ownKey })
    const parsed = rows.map(r => parsePercent(own[r.id]))
    if (parsed.some(p => p === null)) {
      say('Some of your numbers are not percentages yet. Fix them, then bet.')
      return
    }
    const values = parsed.map(p => new Decimal(p!))
    if (!canBet(values)) {
      const gap = describeTotal(totalState(values))
      say(`Your numbers are not at 100% yet (${gap}). Press Normalize, or fix them, then bet.`)
      normalizeRef.current?.focus()
      return
    }
    setHint(null)
    onBet?.(
      rows.map((r, i) => ({
        label: r.label,
        percent: parsed[i]!,
        range: describeBand({ lo: r.lo.lte(0) ? null : r.lo, hi: r.hi.gte(1) ? null : r.hi }),
      }))
    )
  }
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

      {offer && onMerged && (
        <div
          ref={offerRef}
          tabIndex={-1}
          role="group"
          aria-label="Merge rare outcomes"
          className="rounded-lg bg-blue-50 p-3 focus:outline-none"
        >
          <p className="text-sm text-gray-800">
            {offer.ids.map(label).join(', ')} are each very unlikely (together about{' '}
            {formatPercent(offer.combined)}). You can merge them into “Everything else”; nothing is
            merged unless you choose to. Merging, and undoing it, resets your own numbers below.
          </p>
          <button
            type="button"
            className={`mt-2 ${SECONDARY}`}
            onClick={() => {
              focusAfter.current = 'undo'
              onMerged(offer.ids)
            }}
          >
            Merge them into “Everything else”
          </button>
        </div>
      )}
      {merged.length > 0 && onMerged && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-800">
          <span>Some outcomes are merged into “Everything else”.</span>
          <button
            ref={undoRef}
            type="button"
            className={SECONDARY}
            onClick={() => {
              focusAfter.current = 'offer'
              onMerged([])
            }}
          >
            Undo the merge
          </button>
        </div>
      )}

      <section aria-labelledby="own-heading" className="space-y-3">
        <h3 id="own-heading" className="text-lg font-semibold text-gray-900">
          Your own numbers
        </h3>
        <p className="text-sm text-gray-700">
          They start at the best single number. Change any you know better; they should add up to
          100%, and Normalize scales them if you want that.
        </p>
        <PercentList
          listLabel="Your own numbers"
          rows={rows.map(r => ({ id: r.id, label: r.label }))}
          values={own}
          onChange={onAdjusted}
          notes={notes}
          normalizeRef={normalizeRef}
        />
        {onBet && (
          <div>
            <button
              type="button"
              className={PRIMARY}
              onClick={bet}
              aria-describedby={betHint ? betHintId : undefined}
            >
              Bet on this
            </button>
            {betHint && (
              <p id={betHintId} role="alert" className="mt-2 text-sm text-gray-800">
                {betHint}
              </p>
            )}
          </div>
        )}
      </section>

      <details className="rounded-lg border border-gray-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-gray-800">
          Show the full trace of your answers
        </summary>
        <p className="mt-3 text-sm text-gray-800">
          You started from your first guess:{' '}
          {trace.start.map(s => `${s.label} ${s.chance}`).join(', ')}.
        </p>
        {trace.steps.length === 0 ? (
          <p className="mt-3 text-sm text-gray-700">No question was answered.</p>
        ) : (
          <ol aria-label="Answers" className="mt-3 space-y-3">
            {trace.steps.map(step => (
              <li key={step.index} className="text-gray-800">
                <p>
                  <span className="font-medium">Answer {step.index + 1}.</span> {step.question}{' '}
                  {step.answer}.
                </p>
                <p className="text-sm">{step.implication}</p>
                {step.rangeAfter && <p className="text-sm text-gray-600">{step.rangeAfter}</p>}
              </li>
            ))}
          </ol>
        )}
        {trace.adjustments.length > 0 && (
          <ul
            aria-label="Your own numbers against the answers"
            className="mt-3 space-y-2 border-t border-gray-200 pt-3 text-gray-800"
          >
            {trace.adjustments.map(a => (
              <li key={a.label}>
                {a.label}: your answers implied {a.implied}. You then set it to {a.adjusted}%.{' '}
                {a.gap}
              </li>
            ))}
          </ul>
        )}
      </details>

      <div className="border-t border-gray-200 pt-5">
        <p className="mb-2 text-gray-700">Done with this claim?</p>
        <button type="button" className={PRIMARY} onClick={onStartAgain}>
          Start a new claim
        </button>
      </div>
    </section>
  )
}
