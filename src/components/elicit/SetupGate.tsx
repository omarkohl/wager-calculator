import { useId, useRef, useState, type FormEvent } from 'react'
import { CURRENCY_OPTIONS } from '../../domain/stakes'
import {
  getSavedElicitStake,
  isValidElicitStake,
  MAX_TEXT_LENGTH,
  saveElicitStake,
  type ElicitStake,
} from '../../storage/elicitation'

export type Mode = 'quick' | 'thorough'

export interface SetupResult {
  claim: string
  stake: ElicitStake
  mode: Mode
}

interface SetupGateProps {
  onStart: (setup: SetupResult) => void
}

const DEFAULT_STAKE: ElicitStake = { amount: '', currency: 'usd' }

const FIELD =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'

/**
 * The minimal gate in front of an elicitation run: the claim, a stake that makes
 * the user take the questions seriously (remembered across sessions), and the mode.
 * Resolution criteria are deliberately not asked here.
 */
export default function SetupGate({ onStart }: SetupGateProps) {
  const [saved] = useState(getSavedElicitStake)
  const [claim, setClaim] = useState('')
  const [amount, setAmount] = useState(saved?.amount ?? DEFAULT_STAKE.amount)
  const [currency, setCurrency] = useState(saved?.currency ?? DEFAULT_STAKE.currency)
  const [mode, setMode] = useState<Mode>('quick')
  const [showErrors, setShowErrors] = useState(false)
  const claimRef = useRef<HTMLTextAreaElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  const ids = {
    claim: useId(),
    claimError: useId(),
    amount: useId(),
    amountError: useId(),
    currency: useId(),
    stakeHint: useId(),
  }

  const claimError =
    claim.trim() === ''
      ? 'Write the claim you want to put a number on.'
      : claim.trim().length > MAX_TEXT_LENGTH
        ? `Shorten the claim to ${MAX_TEXT_LENGTH} characters or fewer.`
        : null
  const amountError = isValidElicitStake({ amount: amount.trim(), currency })
    ? null
    : 'Enter an amount above zero, with at most two decimals.'

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (claimError || amountError) {
      setShowErrors(true)
      // Send the user to the first thing to fix
      ;(claimError ? claimRef : amountRef).current?.focus()
      return
    }
    const stake = { amount: amount.trim(), currency }
    saveElicitStake(stake)
    onStart({ claim: claim.trim(), stake, mode })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div>
        <label htmlFor={ids.claim} className="mb-1 block text-sm font-medium text-gray-700">
          Claim
        </label>
        <textarea
          id={ids.claim}
          ref={claimRef}
          rows={2}
          required
          value={claim}
          onChange={e => setClaim(e.target.value)}
          placeholder="Something that will turn out true or false"
          aria-invalid={showErrors && claimError ? true : undefined}
          aria-describedby={showErrors && claimError ? ids.claimError : undefined}
          className={FIELD}
        />
        {showErrors && claimError && (
          <p id={ids.claimError} role="alert" className="mt-1 text-sm text-red-700">
            {claimError}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-gray-700">Stake</legend>
        <p id={ids.stakeHint} className="mb-2 text-sm text-gray-600">
          Pick an amount big enough that you would genuinely think before answering.
        </p>
        <div className="flex flex-wrap gap-3">
          <div className="w-40">
            <label htmlFor={ids.amount} className="mb-1 block text-sm text-gray-700">
              Amount
            </label>
            <input
              id={ids.amount}
              ref={amountRef}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              aria-invalid={showErrors && amountError ? true : undefined}
              aria-describedby={
                showErrors && amountError ? `${ids.stakeHint} ${ids.amountError}` : ids.stakeHint
              }
              className={FIELD}
            />
          </div>
          <div className="w-56">
            <label htmlFor={ids.currency} className="mb-1 block text-sm text-gray-700">
              Currency
            </label>
            <select
              id={ids.currency}
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className={FIELD}
            >
              {CURRENCY_OPTIONS.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {showErrors && amountError && (
          <p id={ids.amountError} role="alert" className="mt-1 text-sm text-red-700">
            {amountError}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-gray-700">How thorough?</legend>
        <div className="space-y-2">
          {(
            [
              ['quick', 'Quick', 'About 6 questions, a coarse range.'],
              ['thorough', 'Thorough', 'About 14 to 18 questions, a tighter range.'],
            ] as const
          ).map(([value, label, description]) => (
            <label key={value} className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="mode"
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">{label}</span>
                <span className="block text-sm text-gray-600">{description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        className="rounded-md bg-blue-600 px-5 py-2 text-base font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
      >
        Start
      </button>
    </form>
  )
}
