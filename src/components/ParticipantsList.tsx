import Decimal from 'decimal.js'
import type { Participant } from '../types/wager'
import { getStakesSymbol } from '../utils/stakes'

interface ParticipantsListProps {
  participants: Participant[]
  onChange: (participants: Participant[]) => void
  stakes: string
}

const PLACEHOLDER_NAMES = ['Artem', 'Baani']

export default function ParticipantsList({
  participants,
  onChange,
  stakes,
}: ParticipantsListProps) {
  const handleNameChange = (index: number, name: string, previousValue: string) => {
    const updated = [...participants]
    // Clear placeholder name on first input - only for default placeholder names
    if (PLACEHOLDER_NAMES.includes(previousValue) && name.length > 0 && name !== previousValue) {
      // User is typing into a placeholder name, replace it with just the new character
      const newChar = name.replace(previousValue, '')
      updated[index] = { ...updated[index], name: newChar }
    } else {
      updated[index] = { ...updated[index], name }
    }
    onChange(updated)
  }

  const handleMaxBetChange = (index: number, maxBet: number) => {
    const updated = [...participants]
    updated[index] = { ...updated[index], maxBet: new Decimal(maxBet) }
    onChange(updated)
  }

  const handleAddParticipant = () => {
    const newParticipant: Participant = {
      id: crypto.randomUUID(),
      name: '',
      maxBet: new Decimal(0),
    }
    onChange([...participants, newParticipant])
  }

  const handleRemoveParticipant = (index: number) => {
    onChange(participants.filter((_, i) => i !== index))
  }

  const isPlaceholderName = (name: string) => PLACEHOLDER_NAMES.includes(name)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {participants.map((participant, index) => (
          <div key={participant.id} className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={participant.name}
                onChange={e => handleNameChange(index, e.target.value, participant.name)}
                onFocus={e => {
                  if (isPlaceholderName(participant.name)) {
                    e.target.select()
                  }
                }}
                placeholder="Participant name"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex w-40 items-center gap-2">
              <input
                type="number"
                value={participant.maxBet.toDecimalPlaces(2).toNumber()}
                onChange={e => handleMaxBetChange(index, parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                placeholder="0"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-sm text-gray-600">{getStakesSymbol(stakes)}</span>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveParticipant(index)}
              disabled={participants.length <= 2}
              className="rounded-md border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
              aria-label={`Remove ${participant.name || 'participant'}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {participants.length < 8 && (
        <button
          type="button"
          onClick={handleAddParticipant}
          className="w-full rounded-md border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        >
          Add Participant
        </button>
      )}
    </div>
  )
}
