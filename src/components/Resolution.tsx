import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'
import type { Outcome, Participant, Prediction, CalculationResult } from '../types/wager'

interface ResolutionProps {
  outcomes: Outcome[]
  participants: Participant[]
  predictions: Prediction[]
  stakes: string
  resolvedOutcomeId: string | null
  calculationResults: CalculationResult | null
  onChange: (outcomeId: string | null) => void
}

function Resolution({
  outcomes,
  participants,
  predictions,
  stakes,
  resolvedOutcomeId,
  calculationResults,
  onChange,
}: ResolutionProps) {
  const selectedOutcome = outcomes.find(o => o.id === resolvedOutcomeId)

  // Format currency/stakes display
  const formatAmount = (amount: number): string => {
    const stakeSymbols: Record<string, string> = {
      usd: '$',
      eur: '€',
      gbp: '£',
      cad: 'CA$',
      aud: 'AU$',
      jpy: '¥',
      chf: 'CHF ',
      cny: '¥',
      cookies: '',
      hugs: '',
      'i-was-wrong': '',
      other: '',
    }

    const stakeSuffixes: Record<string, string> = {
      cookies: ' cookies',
      hugs: ' hugs',
      'i-was-wrong': ' "I was wrong"',
      other: '',
    }

    const symbol = stakeSymbols[stakes] || ''
    const suffix = stakeSuffixes[stakes] || ''
    const formattedNum = Math.abs(amount).toFixed(2)

    return `${symbol}${formattedNum}${suffix}`
  }

  // Check if all participants have identical predictions
  const hasIdenticalPredictions = (): boolean => {
    if (participants.length < 2 || outcomes.length === 0) return false

    const firstParticipantPredictions = predictions
      .filter(p => p.participantId === participants[0].id)
      .sort((a, b) => a.outcomeId.localeCompare(b.outcomeId))

    return participants.slice(1).every(participant => {
      const participantPredictions = predictions
        .filter(p => p.participantId === participant.id)
        .sort((a, b) => a.outcomeId.localeCompare(b.outcomeId))

      if (participantPredictions.length !== firstParticipantPredictions.length) return false

      return participantPredictions.every(
        (pred, idx) =>
          pred.outcomeId === firstParticipantPredictions[idx].outcomeId &&
          pred.probability.equals(firstParticipantPredictions[idx].probability)
      )
    })
  }

  const showIdenticalPredictionsMessage = resolvedOutcomeId && hasIdenticalPredictions()

  return (
    <div className="space-y-4">
      <Listbox value={resolvedOutcomeId} onChange={onChange}>
        <div className="relative">
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

      {resolvedOutcomeId && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-900">Payout Summary</h3>
          {showIdenticalPredictionsMessage ? (
            <p className="text-sm text-gray-600">
              All participants have identical predictions. Therefore, all payouts are zero.
            </p>
          ) : calculationResults ? (
            <div className="space-y-4">
              {/* Net Payouts */}
              <div>
                <h4 className="mb-2 text-xs font-medium text-gray-700 uppercase">Net Payouts</h4>
                <div className="space-y-1">
                  {calculationResults.payouts.map(payout => {
                    const participant = participants.find(p => p.id === payout.participantId)
                    const amount = payout.amount.toNumber()
                    const isPositive = amount > 0
                    const isZero = amount === 0

                    return (
                      <div
                        key={payout.participantId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-700">{participant?.name || 'Unknown'}</span>
                        <span
                          className={
                            isZero
                              ? 'text-gray-500'
                              : isPositive
                                ? 'font-medium text-green-600'
                                : 'font-medium text-red-600'
                          }
                        >
                          {isPositive ? '+' : '-'}
                          {formatAmount(amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
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

                      return (
                        <div key={idx} className="text-sm text-gray-700">
                          <span className="font-medium">{from?.name || 'Unknown'}</span> pays{' '}
                          <span className="font-medium">{to?.name || 'Unknown'}</span>{' '}
                          <span className="font-semibold">{formatAmount(amount)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600 italic">
              Error calculating payouts. Please check your inputs.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default Resolution
