import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import Decimal from 'decimal.js'
import { bucketLabels } from '../../domain/elicitation/bucketing'
import { CURRENCY_OPTIONS } from '../../domain/stakes'
import {
  getSavedElicitStake,
  type Invite,
  type InviteShape,
  isValidElicitStake,
  MAX_TEXT_LENGTH,
  saveElicitStake,
  type ElicitStake,
} from '../../storage/elicitation'

export type Mode = 'quick' | 'thorough'

export type Kind = 'yes-no' | 'categorical' | 'continuous'

export interface SetupResult {
  claim: string
  stake: ElicitStake
  kind: Kind
  /** Only yes/no claims have a mode; a claim with several outcomes has one way of asking. */
  mode: Mode
}

interface SetupGateProps {
  onStart: (setup: SetupResult) => void
  /** From an invite: the claim to start with, and the criteria it came with. */
  invite?: Invite
  /** A run in this tab will be replaced when this one starts. */
  replacesRun?: boolean
  /** Put the cursor in the claim field on arrival (after the user acted, not on a plain load). */
  focusClaim?: boolean
}

const DEFAULT_STAKE: ElicitStake = { amount: '', currency: 'usd' }

const FIELD =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'

/**
 * The minimal gate in front of an elicitation run: the claim, a stake that makes
 * the user take the questions seriously (remembered across sessions), and the mode.
 * Resolution criteria are deliberately not asked here.
 */
export default function SetupGate({ onStart, invite, replacesRun, focusClaim }: SetupGateProps) {
  const [saved] = useState(getSavedElicitStake)
  const [claim, setClaim] = useState(invite?.claim ?? '')
  const [amount, setAmount] = useState(saved?.amount ?? DEFAULT_STAKE.amount)
  const [currency, setCurrency] = useState(saved?.currency ?? DEFAULT_STAKE.currency)
  const [mode, setMode] = useState<Mode>('quick')
  const [kind, setKind] = useState<Kind>('yes-no')
  const [showErrors, setShowErrors] = useState(false)
  const claimRef = useRef<HTMLTextAreaElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (focusClaim) claimRef.current?.focus()
  }, [focusClaim])

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
    // An invite carries a yes/no claim until invites carry their kind
    onStart({
      claim: claim.trim(),
      stake,
      kind: invite ? (invite.shape?.kind ?? 'yes-no') : kind,
      mode,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {invite && (
        <p role="note" className="rounded-lg bg-blue-50 p-3 text-sm text-gray-800">
          You were invited to put your own number on this claim. Your answers stay with you.
          {replacesRun && (
            <span className="mt-1 block">
              You have a run in progress in this tab; starting here replaces it.
            </span>
          )}
          {invite.criteria && (
            <span className="mt-1 block">
              <span className="font-medium">Resolution criteria from the invite:</span>{' '}
              {invite.criteria}
            </span>
          )}
        </p>
      )}

      {invite?.shape && <InviteShapeSummary shape={invite.shape} />}

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
          readOnly={invite?.shape !== undefined}
          onChange={e => setClaim(e.target.value)}
          placeholder={
            kind === 'yes-no'
              ? 'Something that will turn out true or false'
              : kind === 'categorical'
                ? 'A question with several possible answers'
                : 'Something that will turn out to be a number'
          }
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

      {!invite && (
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-gray-700">What kind of claim?</legend>
          <div className="space-y-2">
            {(
              [
                ['yes-no', 'Yes or no', 'It will turn out true or false.', false],
                [
                  'categorical',
                  'One of several outcomes',
                  'Exactly one of a list will happen.',
                  false,
                ],
                [
                  'continuous',
                  'A number',
                  'Something measured, such as a temperature or a time.',
                  false,
                ],
              ] as const
            ).map(([value, label, description, disabled]) => (
              <label
                key={value}
                className={`flex items-start gap-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={value}
                  disabled={disabled}
                  checked={kind === value}
                  onChange={() => setKind(value)}
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
      )}

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

      {((invite && !invite.shape) || (!invite && kind === 'yes-no')) && (
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
      )}

      <button
        type="submit"
        className="rounded-md bg-blue-600 px-5 py-2 text-base font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
      >
        Start
      </button>
    </form>
  )
}

/** What the invite fixes: the outcomes, or the range and its parts. They cannot be changed. */
function InviteShapeSummary({ shape }: { shape: InviteShape }) {
  const labels =
    shape.kind === 'categorical'
      ? shape.outcomes
      : bucketLabels(
          shape.edges.map(e => new Decimal(e)),
          shape.min,
          shape.max,
          shape.thresholds.filter(
            t => new Decimal(t).gt(shape.min) && new Decimal(t).lt(shape.max)
          ),
          shape.unit
        )
  return (
    <div
      role="group"
      aria-label="Fixed by the invite"
      className="rounded-lg border border-gray-200 p-3"
    >
      <p className="text-sm font-medium text-gray-900">
        {shape.kind === 'categorical'
          ? 'The invite fixes these outcomes, so your answer can be compared with the sender’s:'
          : `The invite fixes the range${shape.unit ? ` (in ${shape.unit})` : ''} and its parts, so your answer can be compared with the sender’s:`}
      </p>
      <ul
        aria-label="Outcomes from the invite"
        className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-800"
      >
        {labels.map(label => (
          <li key={label}>{label}</li>
        ))}
      </ul>
    </div>
  )
}
