import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronRightIcon } from '@heroicons/react/20/solid'
import type Decimal from 'decimal.js'
import type { Outcome, Participant } from '../domain/wager'
import type { ResultExplanation } from '../domain/explanation'
import { formatPayout, getStakesSymbol } from '../domain/stakes'

interface CalculationDetailsProps {
  explanation: ResultExplanation
  participants: Participant[]
  outcomes: Outcome[]
  stakes: string
}

/** Up to four decimals, with a proper minus sign */
function num(value: Decimal): string {
  return value.toDecimalPlaces(4).toString().replace(/^-/, '−')
}

/**
 * The resolved wager's payouts, step by step, so every number on screen can
 * be checked by hand.
 */
export default function CalculationDetails({
  explanation,
  participants,
  outcomes,
  stakes,
}: CalculationDetailsProps) {
  const symbol = getStakesSymbol(stakes)
  const nameOf = (participantId: string) =>
    participants.find(p => p.id === participantId)?.name || 'Unnamed participant'
  const labelOf = (outcomeId: string) => outcomes.find(o => o.id === outcomeId)?.label ?? ''

  return (
    <Disclosure>
      {({ open }) => (
        <div>
          <DisclosureButton className="flex items-center gap-1 rounded text-sm text-gray-600 hover:text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <ChevronRightIcon
              className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`}
              aria-hidden="true"
            />
            {open ? 'Hide calculation' : 'Show calculation'}
          </DisclosureButton>

          <DisclosurePanel className="mt-3 space-y-4 text-sm text-gray-700">
            <p className="text-xs text-gray-600">
              Brier score = Σ (probability − actual)², where actual is 1 for the outcome that
              occurred and 0 for every other outcome. Payout = amount in play × (others' average −
              own score) / 2. Amount in play: {num(explanation.amountInPlay)} {symbol}. Intermediate
              values are shown with up to four decimals.
            </p>

            {explanation.participants.map(p => (
              <div key={p.participantId} className="overflow-x-auto">
                <h5 className="mb-1 font-medium text-gray-900">{nameOf(p.participantId)}</h5>
                <div className="space-y-1 font-mono text-xs whitespace-nowrap">
                  <div className="text-gray-500">Brier score</div>
                  <ul className="ml-4 space-y-0.5">
                    {p.terms.map(t => (
                      <li key={t.outcomeId}>
                        {labelOf(t.outcomeId)}
                        {t.occurred && <span className="text-blue-700"> (occurred)</span>}: (
                        {num(t.probability)} − {t.occurred ? 1 : 0})² = {num(t.squaredError)}
                      </li>
                    ))}
                    <li>
                      Sum = <strong>{num(p.brierScore)}</strong>
                    </li>
                  </ul>
                  <div>
                    <span className="text-gray-500">Others' average: </span>(
                    {p.othersBrierScores
                      .map(s => `${nameOf(s.participantId)} ${num(s.score)}`)
                      .join(' + ')}
                    ) / {p.othersBrierScores.length} = <strong>{num(p.avgOthersBrier)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Payout: </span>
                    {num(explanation.amountInPlay)} × ({num(p.avgOthersBrier)} − {num(p.brierScore)}
                    ) / 2 = {num(p.rawPayout)} →{' '}
                    <strong>
                      {formatPayout(p.payout.toNumber(), stakes).compactAmount} {symbol}
                    </strong>
                    {p.roundingAdjusted && (
                      <span className="text-gray-500">
                        {' '}
                        (nudged so that all payouts sum to zero)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  )
}
