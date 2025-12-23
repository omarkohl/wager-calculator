import { useState } from 'react'
import Decimal from 'decimal.js'
import { PlusIcon } from '@heroicons/react/24/outline'
import type { Participant, Prediction } from '../types/wager'
import { getStakesSymbol } from '../utils/stakes'
import ConfirmDialog from './ConfirmDialog'
import NumberInput from './NumberInput'

interface ParticipantsListProps {
  participants: Participant[]
  predictions: Prediction[]
  onChange: (participants: Participant[]) => void
  onPredictionsChange?: (predictions: Prediction[]) => void
  stakes: string
}

const PLACEHOLDER_NAMES = ['Artem', 'Baani']

export default function ParticipantsList({
  participants,
  predictions,
  onChange,
  onPredictionsChange,
  stakes,
}: ParticipantsListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{ index: number; name: string } | null>(null)
  const handleNameChange = (index: number, name: string, previousValue: string) => {
    const updated = [...participants]
    const participant = updated[index]

    // Clear placeholder name on first input - only for untouched default placeholder names
    if (
      !participant.touched &&
      PLACEHOLDER_NAMES.includes(previousValue) &&
      name.length > 0 &&
      name !== previousValue
    ) {
      // User is typing into a placeholder name, replace it with just the new character
      const newChar = name.replace(previousValue, '')
      updated[index] = { ...updated[index], name: newChar, touched: true }
    } else {
      updated[index] = { ...updated[index], name, touched: true }
    }
    onChange(updated)
  }

  const handleMaxBetChange = (index: number, maxBet: Decimal) => {
    const updated = [...participants]
    updated[index] = { ...updated[index], maxBet, touched: true }
    onChange(updated)
  }

  const handleAddParticipant = () => {
    const newParticipant: Participant = {
      id: crypto.randomUUID(),
      name: '',
      maxBet: new Decimal(0),
      touched: true, // New participants are considered touched
    }
    onChange([...participants, newParticipant])
  }

  const handleRemoveParticipant = (index: number) => {
    const participant = participants[index]
    const hasModifications =
      participant.touched || predictions.some(p => p.participantId === participant.id && p.touched)

    if (hasModifications) {
      setDeleteConfirm({ index, name: participant.name || 'this participant' })
    } else {
      confirmRemoveParticipant(index)
    }
  }

  const confirmRemoveParticipant = (index: number) => {
    const participantId = participants[index].id
    onChange(participants.filter((_, i) => i !== index))

    // Clean up predictions for the deleted participant
    if (onPredictionsChange) {
      onPredictionsChange(predictions.filter(p => p.participantId !== participantId))
    }

    setDeleteConfirm(null)
  }

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
                  if (!participant.touched && PLACEHOLDER_NAMES.includes(participant.name)) {
                    e.target.select()
                  }
                }}
                placeholder="Participant name"
                className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${!participant.touched ? 'text-gray-400' : ''}`}
              />
            </div>
            <div className="flex w-40 items-center gap-2">
              <NumberInput
                value={participant.maxBet}
                onChange={value => handleMaxBetChange(index, value)}
                min={0}
                step={1}
                placeholder="0"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none data-[focus]:border-blue-500 data-[focus]:ring-1 data-[focus]:ring-blue-500"
              />
              <span className="text-sm text-gray-600">{getStakesSymbol(stakes)}</span>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveParticipant(index)}
              disabled={participants.length <= 2}
              className="rounded-md border p-2 focus:ring-2 focus:ring-offset-2 focus:outline-none enabled:border-red-300 enabled:bg-white enabled:text-red-600 enabled:hover:bg-red-50 enabled:focus:ring-red-500 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-white disabled:text-gray-400 disabled:hover:bg-white"
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        >
          <PlusIcon className="h-5 w-5" />
          Add Participant
        </button>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => confirmRemoveParticipant(deleteConfirm.index)}
          title="Delete Participant?"
          message={`Are you sure you want to delete ${deleteConfirm.name}? This will remove all their predictions.`}
          confirmLabel="Delete"
        />
      )}
    </div>
  )
}
