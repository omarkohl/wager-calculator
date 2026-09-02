import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'
import type { Outcome, Participant, Prediction, CalculationResult } from '../domain/wager'
import type { FaqId } from './faq'
import { formatPayout, getStakeName } from '../domain/stakes'
import { amountInPlay } from '../domain/brier'
import { explainResults } from '../domain/explanation'
import { haveIdenticalPredictions, isCompleteTotal, participantTotal } from '../domain/predictions'
import CalculationDetails from './CalculationDetails'
import PayoutPreview from './PayoutPreview'

interface ResolutionProps {
  outcomes: Outcome[]
  participants: Participant[]
  predictions: Prediction[]
  stakes: string
  claim: string
  resolvedOutcomeId: string | null
  calculationResults: CalculationResult | null
  onChange: (outcomeId: string | null) => void
  onOpenFaq?: (faqId: FaqId) => void
}

function Resolution({
  outcomes,
  participants,
  predictions,
  stakes,
  claim,
  resolvedOutcomeId,
  calculationResults,
  onChange,
  onOpenFaq,
}: ResolutionProps) {
  const selectedOutcome = outcomes.find(o => o.id === resolvedOutcomeId)
  const stakeName = getStakeName(stakes)

  const formattedAmountInPlay = formatPayout(amountInPlay(participants).toNumber(), stakes)

  // Get participants with invalid probabilities
  const getInvalidProbabilityParticipants = (): Array<{ name: string; total: number }> => {
    return participants
      .map(participant => ({
        name: participant.name || 'Unknown',
        total: participantTotal(predictions, participant.id),
      }))
      .filter(p => !isCompleteTotal(p.total))
      .map(p => ({ name: p.name, total: p.total.toNumber() }))
  }

  // Get participants with max bet of 0
  const getZeroMaxBetParticipants = (): string[] => {
    return participants.filter(p => p.maxBet.equals(0)).map(p => p.name || 'Unknown')
  }

  const invalidProbabilityParticipants = resolvedOutcomeId
    ? getInvalidProbabilityParticipants()
    : []
  const zeroMaxBetParticipants = resolvedOutcomeId ? getZeroMaxBetParticipants() : []
  const showProbabilityError = invalidProbabilityParticipants.length > 0
  const showIdenticalPredictionsMessage =
    resolvedOutcomeId && outcomes.length > 0 && haveIdenticalPredictions(participants, predictions)
  const showZeroMaxBetWarning = zeroMaxBetParticipants.length > 0

  return (
    <div className="space-y-4">
      <Listbox value={resolvedOutcomeId} onChange={onChange}>
        <div className="relative max-w-xs">
          <ListboxButton className="relative w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2 pr-10 pl-3 text-left focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm">
            <span className="block truncate">
              {selectedOutcome ? selectedOutcome.label : 'Unresolved'}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </ListboxButton>

          <ListboxOptions
            anchor="bottom start"
            className="ring-opacity-5 z-10 mt-1 max-h-60 w-[var(--button-width)] overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black [--anchor-gap:0.25rem] [--anchor-padding:1rem] focus:outline-none sm:text-sm"
          >
            <ListboxOption
              value={null}
              className="relative cursor-pointer py-2 pr-4 pl-10 text-gray-900 select-none data-[focus]:bg-blue-100 data-[focus]:text-blue-900"
            >
              {({ selected }) => (
                <>
                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                    Unresolved
                  </span>
                  {selected && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </>
              )}
            </ListboxOption>

            {outcomes.map(outcome => (
              <ListboxOption
                key={outcome.id}
                value={outcome.id}
                className="relative cursor-pointer py-2 pr-4 pl-10 text-gray-900 select-none data-[focus]:bg-blue-100 data-[focus]:text-blue-900"
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      {outcome.label}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>

      {resolvedOutcomeId && showProbabilityError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-sm text-red-800">
            <strong>Error:</strong> Probabilities do not add up to 100% for the following
            participant{invalidProbabilityParticipants.length > 1 ? 's' : ''}:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
            {invalidProbabilityParticipants.map((p, idx) => (
              <li key={idx}>
                <strong>{p.name}</strong>: {p.total}%
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-red-800">
            Please ensure all predictions sum to exactly 100% before resolving.
          </p>
        </div>
      )}

      {resolvedOutcomeId && !showProbabilityError && (
        <div className="space-y-3">
          {showZeroMaxBetWarning && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> {zeroMaxBetParticipants.join(', ')}{' '}
                {zeroMaxBetParticipants.length === 1 ? 'has' : 'have'} max bet set to 0. Payouts may
                not be meaningful.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-900">Payout Summary</h3>
            {showIdenticalPredictionsMessage ? (
              <p className="text-sm text-gray-600">
                All participants have identical predictions. Therefore, all payouts are zero.
              </p>
            ) : calculationResults ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Amount in play:</span>{' '}
                  {formattedAmountInPlay.settlement
                    .replace(formattedAmountInPlay.symbol, '')
                    .trim()}{' '}
                  <span title={stakeName}>{formattedAmountInPlay.symbol}</span>{' '}
                  <span className="text-gray-500">(the lowest max bet)</span>
                </p>

                {/* Net Payouts */}
                <div>
                  <h4 className="mb-2 text-xs font-medium text-gray-700 uppercase">Net Payouts</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500">
                        <th scope="col" className="pb-1 text-left font-normal">
                          Participant
                        </th>
                        <th
                          scope="col"
                          className="pb-1 text-right font-normal"
                          title="Lower is better: 0 is a perfect prediction, 2 the worst possible"
                        >
                          Brier score
                        </th>
                        <th scope="col" className="pb-1 text-right font-normal">
                          Payout
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculationResults.payouts.map(payout => {
                        const participant = participants.find(p => p.id === payout.participantId)
                        const brierScore = calculationResults.brierScores.find(
                          bs => bs.participantId === payout.participantId
                        )
                        const amount = payout.amount.toNumber()
                        const formatted = formatPayout(amount, stakes)
                        const isPositive = formatted.roundedAmount > 0
                        const isZero = formatted.roundedAmount === 0

                        return (
                          <tr key={payout.participantId}>
                            <td className="py-0.5 text-gray-700">
                              {participant?.name || 'Unknown'}
                            </td>
                            <td className="py-0.5 text-right text-gray-500 tabular-nums">
                              {brierScore ? brierScore.score.toDecimalPlaces(3).toString() : ''}
                            </td>
                            <td
                              className={`py-0.5 text-right tabular-nums ${
                                isZero
                                  ? 'text-gray-700'
                                  : isPositive
                                    ? 'font-medium text-green-600'
                                    : 'font-medium text-red-600'
                              }`}
                            >
                              {formatted.compactAmount}{' '}
                              <span title={stakeName}>{formatted.symbol}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Simplified Settlements */}
                {calculationResults.settlements.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-medium text-gray-700 uppercase">
                      Simplified Settlements
                    </h4>
                    <div className="space-y-1">
                      {calculationResults.settlements.map((settlement, idx) => {
                        const from = participants.find(p => p.id === settlement.fromParticipantId)
                        const to = participants.find(p => p.id === settlement.toParticipantId)
                        const amount = settlement.amount.toNumber()
                        const formatted = formatPayout(amount, stakes)

                        return (
                          <div key={idx} className="text-sm text-gray-700">
                            <span className="font-medium">{from?.name || 'Unknown'}</span> owes{' '}
                            <span className="font-medium">{to?.name || 'Unknown'}</span>{' '}
                            <span className="font-semibold">
                              {/* Show amount without symbol, then symbol with tooltip */}
                              {formatted.settlement.replace(formatted.symbol, '').trim()}{' '}
                              <span title={stakeName}>{formatted.symbol}</span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <CalculationDetails
                  explanation={explainResults(
                    participants,
                    predictions,
                    outcomes,
                    resolvedOutcomeId,
                    claim
                  )}
                  participants={participants}
                  outcomes={outcomes}
                  stakes={stakes}
                />

                <p className="text-sm text-gray-600 italic">
                  See the FAQ to understand{' '}
                  {onOpenFaq ? (
                    <button
                      type="button"
                      onClick={() => onOpenFaq('calculation')}
                      className="text-blue-600 underline hover:text-blue-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      how these numbers are calculated
                    </button>
                  ) : (
                    'how these numbers are calculated'
                  )}
                  .
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600 italic">
                Error calculating payouts. Please check your inputs.
              </p>
            )}
          </div>
        </div>
      )}

      <PayoutPreview
        participants={participants}
        outcomes={outcomes}
        predictions={predictions}
        stakes={stakes}
        claim={claim}
        resolvedOutcomeId={resolvedOutcomeId}
        onOpenFaq={onOpenFaq}
      />
    </div>
  )
}

export default Resolution
