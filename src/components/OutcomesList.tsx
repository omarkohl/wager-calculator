import { useState } from 'react'
import type { Outcome, Prediction } from '../types/wager'
import ConfirmDialog from './ConfirmDialog'

interface OutcomesListProps {
  outcomes: Outcome[]
  predictions: Prediction[]
  onChange: (outcomes: Outcome[]) => void
}

const PLACEHOLDER_LABELS = ['Yes', 'No']

export default function OutcomesList({ outcomes, predictions, onChange }: OutcomesListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{ index: number; label: string } | null>(null)
  const handleLabelChange = (index: number, label: string, previousValue: string) => {
    const updated = [...outcomes]
    const outcome = updated[index]

    // Clear placeholder label on first input - only for untouched default placeholder labels
    if (
      !outcome.touched &&
      PLACEHOLDER_LABELS.includes(previousValue) &&
      label.length > 0 &&
      label !== previousValue
    ) {
      // User is typing into a placeholder label, replace it with just the new character
      const newChar = label.replace(previousValue, '')
      updated[index] = { ...updated[index], label: newChar, touched: true }
    } else {
      updated[index] = { ...updated[index], label, touched: true }
    }
    onChange(updated)
  }

  const handleAddOutcome = () => {
    const newOutcome: Outcome = {
      id: crypto.randomUUID(),
      label: '',
      touched: true, // New outcomes are considered touched
    }
    onChange([...outcomes, newOutcome])
  }

  const handleRemoveOutcome = (index: number) => {
    const outcome = outcomes[index]
    const hasModifications =
      outcome.touched || predictions.some(p => p.outcomeId === outcome.id && p.touched)

    if (hasModifications) {
      setDeleteConfirm({ index, label: outcome.label || 'this outcome' })
    } else {
      confirmRemoveOutcome(index)
    }
  }

  const confirmRemoveOutcome = (index: number) => {
    onChange(outcomes.filter((_, i) => i !== index))
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {outcomes.map((outcome, index) => (
          <div key={outcome.id} className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={outcome.label}
                onChange={e => handleLabelChange(index, e.target.value, outcome.label)}
                onFocus={e => {
                  if (!outcome.touched && PLACEHOLDER_LABELS.includes(outcome.label)) {
                    e.target.select()
                  }
                }}
                placeholder="Outcome label"
                className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${!outcome.touched ? 'text-gray-400' : ''}`}
              />
            </div>
            <button
              type="button"
              onClick={() => handleRemoveOutcome(index)}
              disabled={outcomes.length <= 2}
              className="rounded-md border p-2 focus:ring-2 focus:ring-offset-2 focus:outline-none enabled:border-red-300 enabled:bg-white enabled:text-red-600 enabled:hover:bg-red-50 enabled:focus:ring-red-500 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-white disabled:text-gray-400 disabled:hover:bg-white"
              aria-label={`Remove ${outcome.label || 'outcome'}`}
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

      {outcomes.length < 8 && (
        <button
          type="button"
          onClick={handleAddOutcome}
          className="w-full rounded-md border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        >
          Add Outcome
        </button>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => confirmRemoveOutcome(deleteConfirm.index)}
          title="Delete Outcome?"
          message={`Are you sure you want to delete "${deleteConfirm.label}"? This will remove all predictions for this outcome.`}
          confirmLabel="Delete"
        />
      )}
    </div>
  )
}
