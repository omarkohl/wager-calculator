import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Decimal from 'decimal.js'
import OutcomesList from './OutcomesList'
import type { Outcome, Prediction } from '../types/wager'

const emptyPredictions: Prediction[] = []

describe('OutcomesList', () => {
  it('renders all outcomes with their labels', () => {
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes' },
      { id: '2', label: 'No' },
    ]
    render(<OutcomesList outcomes={outcomes} predictions={emptyPredictions} onChange={vi.fn()} />)

    expect(screen.getByDisplayValue('Yes')).toBeInTheDocument()
    expect(screen.getByDisplayValue('No')).toBeInTheDocument()
  })

  it('calls onChange when outcome label is edited', async () => {
    const user = userEvent.setup()
    let currentOutcomes: Outcome[] = [{ id: '1', label: '' }]
    const onChange = vi.fn(newOutcomes => {
      currentOutcomes = newOutcomes
    })

    const { rerender } = render(
      <OutcomesList outcomes={currentOutcomes} predictions={emptyPredictions} onChange={onChange} />
    )

    const labelInput = screen.getByPlaceholderText('Outcome label')

    for (const char of 'Maybe') {
      await user.type(labelInput, char)
      rerender(
        <OutcomesList
          outcomes={currentOutcomes}
          predictions={emptyPredictions}
          onChange={onChange}
        />
      )
    }

    expect(currentOutcomes[0].label).toBe('Maybe')
  })

  it('shows add outcome button when less than 8 outcomes', () => {
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes' },
      { id: '2', label: 'No' },
    ]
    render(<OutcomesList outcomes={outcomes} predictions={emptyPredictions} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: /add outcome/i })).toBeInTheDocument()
  })

  it('hides add outcome button when 8 outcomes', () => {
    const outcomes: Outcome[] = Array.from({ length: 8 }, (_, i) => ({
      id: `${i + 1}`,
      label: `Outcome ${i + 1}`,
    }))
    render(<OutcomesList outcomes={outcomes} predictions={emptyPredictions} onChange={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /add outcome/i })).not.toBeInTheDocument()
  })

  it('adds a new outcome when add button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const outcomes: Outcome[] = [{ id: '1', label: 'Yes' }]

    render(<OutcomesList outcomes={outcomes} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /add outcome/i }))

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([{ id: '1', label: 'Yes' }, expect.objectContaining({ label: '' })])
    )
  })

  it('shows remove button for each outcome', () => {
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes' },
      { id: '2', label: 'No' },
      { id: '3', label: 'Maybe' },
    ]
    render(<OutcomesList outcomes={outcomes} predictions={emptyPredictions} onChange={vi.fn()} />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    expect(removeButtons).toHaveLength(3)
  })

  it('disables remove buttons when exactly 2 outcomes', () => {
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes' },
      { id: '2', label: 'No' },
    ]
    render(<OutcomesList outcomes={outcomes} predictions={emptyPredictions} onChange={vi.fn()} />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    expect(removeButtons).toHaveLength(2)
    removeButtons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('enables remove buttons when more than 2 outcomes', () => {
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes' },
      { id: '2', label: 'No' },
      { id: '3', label: 'Maybe' },
    ]
    render(<OutcomesList outcomes={outcomes} predictions={emptyPredictions} onChange={vi.fn()} />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    removeButtons.forEach(button => {
      expect(button).not.toBeDisabled()
    })
  })

  it('removes an outcome when remove button is clicked (untouched)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes', touched: false },
      { id: '2', label: 'No', touched: false },
      { id: '3', label: 'Maybe', touched: false },
    ]

    render(<OutcomesList outcomes={outcomes} predictions={emptyPredictions} onChange={onChange} />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeButtons[1]) // Remove "No"

    expect(onChange).toHaveBeenCalledWith([
      { id: '1', label: 'Yes', touched: false },
      { id: '3', label: 'Maybe', touched: false },
    ])
  })

  it('renders default outcomes "Yes" and "No"', () => {
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes' },
      { id: '2', label: 'No' },
    ]
    render(<OutcomesList outcomes={outcomes} predictions={emptyPredictions} onChange={vi.fn()} />)

    expect(screen.getByDisplayValue('Yes')).toBeInTheDocument()
    expect(screen.getByDisplayValue('No')).toBeInTheDocument()
  })

  it('shows confirmation dialog when deleting touched outcome', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes', touched: true },
      { id: '2', label: 'No', touched: false },
      { id: '3', label: 'Maybe', touched: false },
    ]

    render(<OutcomesList outcomes={outcomes} predictions={emptyPredictions} onChange={onChange} />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeButtons[0]) // Try to remove "Yes"

    expect(screen.getByText('Delete Outcome?')).toBeInTheDocument()
    expect(screen.getByText(/Are you sure you want to delete "Yes"/i)).toBeInTheDocument()
  })

  it('shows confirmation dialog when deleting outcome with touched predictions', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes', touched: false },
      { id: '2', label: 'No', touched: false },
      { id: '3', label: 'Maybe', touched: false },
    ]
    const predictions: Prediction[] = [
      {
        participantId: 'participant1',
        outcomeId: '1',
        probability: new Decimal(50),
        touched: true,
      },
    ]

    render(<OutcomesList outcomes={outcomes} predictions={predictions} onChange={onChange} />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeButtons[0]) // Try to remove "Yes"

    expect(screen.getByText('Delete Outcome?')).toBeInTheDocument()
  })

  it('deletes outcome without confirmation when untouched', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes', touched: false },
      { id: '2', label: 'No', touched: false },
      { id: '3', label: 'Maybe', touched: false },
    ]
    const predictions: Prediction[] = [
      {
        participantId: 'participant1',
        outcomeId: '1',
        probability: new Decimal(50),
        touched: false,
      },
    ]

    render(<OutcomesList outcomes={outcomes} predictions={predictions} onChange={onChange} />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeButtons[1]) // Remove "No"

    expect(onChange).toHaveBeenCalledWith([
      { id: '1', label: 'Yes', touched: false },
      { id: '3', label: 'Maybe', touched: false },
    ])
    expect(screen.queryByText('Delete Outcome?')).not.toBeInTheDocument()
  })

  it('deletes outcome after confirmation', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes', touched: true },
      { id: '2', label: 'No', touched: false },
      { id: '3', label: 'Maybe', touched: false },
    ]

    render(<OutcomesList outcomes={outcomes} predictions={emptyPredictions} onChange={onChange} />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeButtons[0]) // Try to remove "Yes"

    // Confirm deletion
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onChange).toHaveBeenCalledWith([
      { id: '2', label: 'No', touched: false },
      { id: '3', label: 'Maybe', touched: false },
    ])
  })

  it('cancels outcome deletion when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes', touched: true },
      { id: '2', label: 'No', touched: false },
      { id: '3', label: 'Maybe', touched: false },
    ]

    render(<OutcomesList outcomes={outcomes} predictions={emptyPredictions} onChange={onChange} />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeButtons[0]) // Try to remove "Yes"

    // Cancel deletion
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByText('Delete Outcome?')).not.toBeInTheDocument()
  })
})
