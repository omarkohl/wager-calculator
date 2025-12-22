import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Decimal from 'decimal.js'
import Resolution from './Resolution'
import type { Outcome, Participant, Prediction } from '../types/wager'

describe('Resolution', () => {
  const mockOutcomes: Outcome[] = [
    { id: '1', label: 'Yes' },
    { id: '2', label: 'No' },
  ]

  const mockParticipants: Participant[] = [
    { id: 'p1', name: 'Alice', maxBet: new Decimal(10) },
    { id: 'p2', name: 'Bob', maxBet: new Decimal(10) },
  ]

  const mockPredictions: Prediction[] = [
    { participantId: 'p1', outcomeId: '1', probability: new Decimal(70), touched: true },
    { participantId: 'p1', outcomeId: '2', probability: new Decimal(30), touched: true },
    { participantId: 'p2', outcomeId: '1', probability: new Decimal(40), touched: true },
    { participantId: 'p2', outcomeId: '2', probability: new Decimal(60), touched: true },
  ]

  it('renders unresolved state by default', () => {
    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={mockParticipants}
        predictions={mockPredictions}
        resolvedOutcomeId={null}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText('Unresolved')).toBeInTheDocument()
  })

  it('allows selecting an outcome', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={mockParticipants}
        predictions={mockPredictions}
        resolvedOutcomeId={null}
        onChange={onChange}
      />
    )

    // Click to open the listbox
    await user.click(screen.getByRole('button'))

    // Select "Yes"
    await user.click(screen.getByRole('option', { name: 'Yes' }))

    expect(onChange).toHaveBeenCalledWith('1')
  })

  it('displays selected outcome', () => {
    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={mockParticipants}
        predictions={mockPredictions}
        resolvedOutcomeId="1"
        onChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button')).toHaveTextContent('Yes')
  })

  it('allows changing selection back to unresolved', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={mockParticipants}
        predictions={mockPredictions}
        resolvedOutcomeId="1"
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('option', { name: 'Unresolved' }))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('displays placeholder payout summary when resolved', () => {
    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={mockParticipants}
        predictions={mockPredictions}
        resolvedOutcomeId="1"
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText(/Payout Summary/i)).toBeInTheDocument()
    expect(screen.getByText(/calculations will be shown here/i)).toBeInTheDocument()
  })

  it('does not display payout summary when unresolved', () => {
    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={mockParticipants}
        predictions={mockPredictions}
        resolvedOutcomeId={null}
        onChange={vi.fn()}
      />
    )

    expect(screen.queryByText(/Payout Summary/i)).not.toBeInTheDocument()
  })

  it('shows edge case message for identical predictions', () => {
    const identicalPredictions: Prediction[] = [
      { participantId: 'p1', outcomeId: '1', probability: new Decimal(50), touched: true },
      { participantId: 'p1', outcomeId: '2', probability: new Decimal(50), touched: true },
      { participantId: 'p2', outcomeId: '1', probability: new Decimal(50), touched: true },
      { participantId: 'p2', outcomeId: '2', probability: new Decimal(50), touched: true },
    ]

    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={mockParticipants}
        predictions={identicalPredictions}
        resolvedOutcomeId="1"
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText(/All participants have identical predictions/i)).toBeInTheDocument()
  })
})
