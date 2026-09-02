import { useId, useState } from 'react'
import Decimal from 'decimal.js'
import type { Outcome, Participant, Prediction } from '../domain/wager'
import { expectedPayoutIfReporting } from '../domain/expectation'
import { shiftPrediction } from '../domain/predictions'
import { formatPayout } from '../domain/stakes'
import PayoutAmount from './PayoutAmount'

interface HonestyExplorerProps {
  participants: Participant[]
  outcomes: Outcome[]
  predictions: Prediction[]
  stakes: string
}

/**
 * Lets the user slide one probability away from the belief they entered and
 * watch the expected payout drop, which is what makes Brier scoring honest.
 */
export default function HonestyExplorer({
  participants,
  outcomes,
  predictions,
  stakes,
}: HonestyExplorerProps) {
  const id = useId()
  const [participantId, setParticipantId] = useState(participants[0].id)
  const [outcomeId, setOutcomeId] = useState(outcomes[0].id)
  // null means "exactly the entered belief"
  const [reported, setReported] = useState<number | null>(null)

  const participant = participants.find(p => p.id === participantId) ?? participants[0]
  const outcome = outcomes.find(o => o.id === outcomeId) ?? outcomes[0]
  const belief =
    predictions.find(p => p.participantId === participant.id && p.outcomeId === outcome.id)
      ?.probability ?? new Decimal(0)
  const reportedValue = reported ?? belief.toNumber()

  const honest = expectedPayoutIfReporting(
    participants,
    predictions,
    outcomes,
    participant.id,
    predictions
  )
  const shaded = expectedPayoutIfReporting(
    participants,
    predictions,
    outcomes,
    participant.id,
    shiftPrediction(predictions, participant.id, outcome.id, new Decimal(reportedValue), outcomes)
  )
  const loss = honest.minus(shaded)
  const isHonest = belief.equals(reportedValue)
  const lossIsInvisible = formatPayout(loss.toNumber(), stakes).roundedAmount === 0

  const name = participant.name || 'This participant'

  return (
    <div className="space-y-3 text-sm text-gray-700">
      <p>
        Brier scoring rewards honesty: the expected payout is highest when you report exactly what
        you believe. This experiment takes the probabilities entered above as the participant's true
        beliefs and lets you try a "strategic" deviation here, without changing the wager: slide the
        reported probability away from the belief and watch the expected payout drop. The other
        outcomes are scaled so the total stays at 100%.
      </p>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2">
          Participant
          <select
            value={participant.id}
            onChange={e => {
              setParticipantId(e.target.value)
              setReported(null)
            }}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            {participants.map(p => (
              <option key={p.id} value={p.id}>
                {p.name || 'Unnamed participant'}
              </option>
            ))}
          </select>
        </label>

        {outcomes.length > 2 && (
          <label className="flex items-center gap-2">
            Outcome
            <select
              value={outcome.id}
              onChange={e => {
                setOutcomeId(e.target.value)
                setReported(null)
              }}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              {outcomes.map(o => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-reported`} className="block">
          Reported probability for <span className="font-medium">{outcome.label}</span>:{' '}
          <span className="tabular-nums">{reportedValue}%</span>{' '}
          <span className="text-gray-500">(true belief: {belief.toString()}%)</span>
        </label>
        <input
          id={`${id}-reported`}
          type="range"
          min="0"
          max="100"
          step="1"
          value={reportedValue}
          onChange={e => setReported(Number(e.target.value))}
          className="mt-1 h-8 w-full max-w-md cursor-pointer"
        />
      </div>

      <p aria-live="polite">
        {isHonest ? (
          <>
            Expected payout for {name}:{' '}
            <PayoutAmount amount={honest.toNumber()} stakes={stakes} signed />. That is the best
            possible, because it is the honest belief.
          </>
        ) : (
          <>
            Expected payout for {name}:{' '}
            <PayoutAmount amount={shaded.toNumber()} stakes={stakes} signed /> instead of{' '}
            <PayoutAmount amount={honest.toNumber()} stakes={stakes} signed /> when honest, so{' '}
            {lossIsInvisible ? (
              <>a hair less (under 0.01)</>
            ) : (
              <>
                <PayoutAmount amount={loss.negated().toNumber()} stakes={stakes} signed /> less
              </>
            )}
            .
          </>
        )}
      </p>
    </div>
  )
}
