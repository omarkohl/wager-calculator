import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OutcomesList from './OutcomesList'
import type { Outcome } from '../types/wager'

describe('OutcomesList', () => {
  it('renders all outcomes with their labels', () => {
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes' },
      { id: '2', label: 'No' },
    ]
    render(<OutcomesList outcomes={outcomes} onChange={vi.fn()} />)

    expect(screen.getByDisplayValue('Yes')).toBeInTheDocument()
    expect(screen.getByDisplayValue('No')).toBeInTheDocument()
  })

  it('calls onChange when outcome label is edited', async () => {
    const user = userEvent.setup()
    let currentOutcomes: Outcome[] = [{ id: '1', label: '' }]
    const onChange = vi.fn(newOutcomes => {
      currentOutcomes = newOutcomes
    })

    const { rerender } = render(<OutcomesList outcomes={currentOutcomes} onChange={onChange} />)

    const labelInput = screen.getByPlaceholderText('Outcome label')

    for (const char of 'Maybe') {
      await user.type(labelInput, char)
      rerender(<OutcomesList outcomes={currentOutcomes} onChange={onChange} />)
    }

    expect(currentOutcomes[0].label).toBe('Maybe')
  })

  it('shows add outcome button when less than 8 outcomes', () => {
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes' },
      { id: '2', label: 'No' },
    ]
    render(<OutcomesList outcomes={outcomes} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: /add outcome/i })).toBeInTheDocument()
  })

  it('hides add outcome button when 8 outcomes', () => {
    const outcomes: Outcome[] = Array.from({ length: 8 }, (_, i) => ({
      id: `${i + 1}`,
      label: `Outcome ${i + 1}`,
    }))
    render(<OutcomesList outcomes={outcomes} onChange={vi.fn()} />)

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
    render(<OutcomesList outcomes={outcomes} onChange={vi.fn()} />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    expect(removeButtons).toHaveLength(3)
  })

  it('disables remove buttons when exactly 2 outcomes', () => {
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes' },
      { id: '2', label: 'No' },
    ]
    render(<OutcomesList outcomes={outcomes} onChange={vi.fn()} />)

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
    render(<OutcomesList outcomes={outcomes} onChange={vi.fn()} />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    removeButtons.forEach(button => {
      expect(button).not.toBeDisabled()
    })
  })

  it('removes an outcome when remove button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes' },
      { id: '2', label: 'No' },
      { id: '3', label: 'Maybe' },
    ]

    render(<OutcomesList outcomes={outcomes} onChange={onChange} />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeButtons[1]) // Remove "No"

    expect(onChange).toHaveBeenCalledWith([
      { id: '1', label: 'Yes' },
      { id: '3', label: 'Maybe' },
    ])
  })

  it('renders default outcomes "Yes" and "No"', () => {
    const outcomes: Outcome[] = [
      { id: '1', label: 'Yes' },
      { id: '2', label: 'No' },
    ]
    render(<OutcomesList outcomes={outcomes} onChange={vi.fn()} />)

    expect(screen.getByDisplayValue('Yes')).toBeInTheDocument()
    expect(screen.getByDisplayValue('No')).toBeInTheDocument()
  })
})
