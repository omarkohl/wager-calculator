import { useState } from 'react'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronRightIcon } from '@heroicons/react/20/solid'
import type { Outcome, Participant, Prediction } from '../domain/wager'
import type { FaqId } from './faq'
import { amountInPlay } from '../domain/brier'
import { expectedPayouts, payoutsForEveryOutcome } from '../domain/expectation'
import { isCompleteTotal, participantTotal } from '../domain/predictions'
import { formatPayout, getStakesSymbol } from '../domain/stakes'
import PayoutAmount from './PayoutAmount'
import HonestyExplorer from './HonestyExplorer'

interface PayoutPreviewProps {
  participants: Participant[]
  outcomes: Outcome[]
  predictions: Prediction[]
  stakes: string
  claim: string
  resolvedOutcomeId: string | null
  onOpenFaq?: (faqId: FaqId) => void
}

const toggleClass =
  'text-sm text-blue-600 underline hover:text-blue-800 focus:ring-2 focus:ring-blue-500 focus:outline-none'

/**
 * Collapsed by default: what every possible resolution would pay out, what
 * each participant should expect, and why honesty pays.
 */
export default function PayoutPreview({
  participants,
  outcomes,
  predictions,
  stakes,
  claim,
  resolvedOutcomeId,
  onOpenFaq,
}: PayoutPreviewProps) {
  const [showCalculation, setShowCalculation] = useState(false)
  const [showHonesty, setShowHonesty] = useState(false)

  const incomplete = participants.filter(p => !isCompleteTotal(participantTotal(predictions, p.id)))
  const noStake = amountInPlay(participants).isZero()
  const ready =
    participants.length >= 2 && outcomes.length > 0 && incomplete.length === 0 && !noStake

  const table = ready ? payoutsForEveryOutcome(participants, predictions, outcomes, claim) : []
  const expected = ready ? expectedPayouts(participants, predictions, table) : []
  const symbol = getStakesSymbol(stakes)

  const payoutOf = (outcomeId: string, participantId: string) =>
    table
      .find(t => t.outcomeId === outcomeId)
      ?.payouts.find(p => p.participantId === participantId)
      ?.amount.toNumber() ?? 0
  const expectedOf = (participantId: string) =>
    expected.find(p => p.participantId === participantId)?.amount.toNumber() ?? 0
  const probabilityOf = (participantId: string, outcomeId: string) =>
    predictions
      .find(p => p.participantId === participantId && p.outcomeId === outcomeId)
      ?.probability.dividedBy(100)
      .toString() ?? '0'

  return (
    <Disclosure>
      {({ open }) => (
        <div>
          <DisclosureButton className="flex items-center gap-1 rounded text-sm text-gray-600 hover:text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <ChevronRightIcon
              className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`}
              aria-hidden="true"
            />
            Preview payouts for each outcome
          </DisclosureButton>

          <DisclosurePanel className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {!ready ? (
              <p>
                {incomplete.length > 0
                  ? `To preview payouts, every participant's probabilities need to add up to 100% (${incomplete
                      .map(p => p.name || 'Unnamed participant')
                      .join(', ')}).`
                  : noStake
                    ? 'To preview payouts, give every participant a max bet above 0. The amount in play is the lowest max bet.'
                    : 'Add at least two participants and one outcome to preview payouts.'}
              </p>
            ) : (
              <div className="space-y-4">
                <p>Net payout for each participant, depending on how the wager resolves:</p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500">
                        <th scope="col" className="pb-1 text-left font-normal">
                          Participant
                        </th>
                        {outcomes.map(outcome => (
                          <th
                            key={outcome.id}
                            scope="col"
                            className={`pb-1 pl-3 text-right font-normal ${
                              outcome.id === resolvedOutcomeId ? 'font-medium text-blue-700' : ''
                            }`}
                          >
                            {outcome.label}
                            {outcome.id === resolvedOutcomeId && (
                              <span className="sr-only">{' (resolved)'}</span>
                            )}
                          </th>
                        ))}
                        <th
                          scope="col"
                          className="pb-1 pl-6 text-right font-normal"
                          title="By their own probabilities: each outcome's payout times how likely they think it is, added up"
                        >
                          Expected
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map(participant => (
                        <tr key={participant.id}>
                          <th scope="row" className="py-0.5 text-left font-normal text-gray-700">
                            {participant.name || 'Unnamed participant'}
                          </th>
                          {outcomes.map(outcome => (
                            <td
                              key={outcome.id}
                              className={`py-0.5 pl-3 text-right ${
                                outcome.id === resolvedOutcomeId ? 'bg-blue-50' : ''
                              }`}
                            >
                              <PayoutAmount
                                amount={payoutOf(outcome.id, participant.id)}
                                stakes={stakes}
                                signed
                              />
                            </td>
                          ))}
                          <td className="py-0.5 pl-6 text-right">
                            <PayoutAmount
                              amount={expectedOf(participant.id)}
                              stakes={stakes}
                              signed
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p>
                  <strong>Expected</strong> is what each participant should expect on average, going
                  by their own probabilities: each outcome's payout multiplied by how likely they
                  think it is, added up. Everyone who reports their honest belief expects to come
                  out ahead. Who actually does depends on what happens.
                  {onOpenFaq && (
                    <>
                      {' '}
                      <button
                        type="button"
                        onClick={() => onOpenFaq('expected-value')}
                        className={toggleClass}
                      >
                        More about expected value
                      </button>
                    </>
                  )}
                </p>

                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    aria-expanded={showCalculation}
                    onClick={() => setShowCalculation(v => !v)}
                    className={toggleClass}
                  >
                    {showCalculation ? 'Hide calculation' : 'Show calculation'}
                  </button>
                  <button
                    type="button"
                    aria-expanded={showHonesty}
                    onClick={() => setShowHonesty(v => !v)}
                    className={toggleClass}
                  >
                    Why report honestly?
                  </button>
                </div>

                {showCalculation && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600">
                      Expected payout = Σ probability × payout, over every outcome. Amounts in{' '}
                      {symbol}.
                    </p>
                    <ul className="space-y-1 overflow-x-auto font-mono text-xs whitespace-nowrap">
                      {participants.map(participant => (
                        <li key={participant.id}>
                          {participant.name || 'Unnamed participant'}:{' '}
                          {outcomes
                            .map(
                              outcome =>
                                `${probabilityOf(participant.id, outcome.id)} × ${
                                  formatPayout(payoutOf(outcome.id, participant.id), stakes)
                                    .compactAmount
                                }`
                            )
                            .join(' + ')}{' '}
                          = {formatPayout(expectedOf(participant.id), stakes).compactAmount}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {showHonesty && (
                  <HonestyExplorer
                    participants={participants}
                    outcomes={outcomes}
                    predictions={predictions}
                    stakes={stakes}
                  />
                )}
              </div>
            )}
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  )
}
