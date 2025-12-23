import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Decimal from 'decimal.js'
import Resolution from './Resolution'
import { calculateResults } from '../modules/brier'
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
        stakes="usd"
        resolvedOutcomeId={null}
        calculationResults={null}
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
        stakes="usd"
        resolvedOutcomeId={null}
        calculationResults={null}
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
    const calculationResults = calculateResults(
      mockParticipants,
      mockPredictions,
      mockOutcomes,
      '1',
      'Test claim'
    )

    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={mockParticipants}
        predictions={mockPredictions}
        stakes="usd"
        resolvedOutcomeId="1"
        calculationResults={calculationResults}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button')).toHaveTextContent('Yes')
  })

  it('allows changing selection back to unresolved', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const calculationResults = calculateResults(
      mockParticipants,
      mockPredictions,
      mockOutcomes,
      '1',
      'Test claim'
    )

    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={mockParticipants}
        predictions={mockPredictions}
        stakes="usd"
        resolvedOutcomeId="1"
        calculationResults={calculationResults}
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('option', { name: 'Unresolved' }))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('displays payout summary with calculations when resolved', () => {
    const calculationResults = calculateResults(
      mockParticipants,
      mockPredictions,
      mockOutcomes,
      '1',
      'Test claim'
    )

    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={mockParticipants}
        predictions={mockPredictions}
        stakes="usd"
        resolvedOutcomeId="1"
        calculationResults={calculationResults}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText(/Payout Summary/i)).toBeInTheDocument()
    expect(screen.getByText(/Net Payouts/i)).toBeInTheDocument()
    expect(screen.getByText(/Simplified Settlements/i)).toBeInTheDocument()
    // Check that participant names appear (multiple times is fine)
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0)
  })

  it('does not display payout summary when unresolved', () => {
    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={mockParticipants}
        predictions={mockPredictions}
        stakes="usd"
        resolvedOutcomeId={null}
        calculationResults={null}
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
        stakes="usd"
        resolvedOutcomeId="1"
        calculationResults={null}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText(/All participants have identical predictions/i)).toBeInTheDocument()
  })

  it('shows error when probabilities do not add to 100', () => {
    const incompletePredictions: Prediction[] = [
      { participantId: 'p1', outcomeId: '1', probability: new Decimal(70), touched: true },
      { participantId: 'p1', outcomeId: '2', probability: new Decimal(20), touched: true },
      { participantId: 'p2', outcomeId: '1', probability: new Decimal(40), touched: true },
      { participantId: 'p2', outcomeId: '2', probability: new Decimal(60), touched: true },
    ]

    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={mockParticipants}
        predictions={incompletePredictions}
        stakes="usd"
        resolvedOutcomeId="1"
        calculationResults={null}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText(/probabilities do not add up to 100%/i)).toBeInTheDocument()
    expect(screen.getByText(/Alice/)).toBeInTheDocument()
    expect(screen.getByText(/90%/)).toBeInTheDocument()
    expect(screen.queryByText(/Payout Summary/i)).not.toBeInTheDocument()
  })

  it('shows error when any participant probabilities do not add to 100', () => {
    const mixedPredictions: Prediction[] = [
      { participantId: 'p1', outcomeId: '1', probability: new Decimal(50), touched: true },
      { participantId: 'p1', outcomeId: '2', probability: new Decimal(50), touched: true },
      { participantId: 'p2', outcomeId: '1', probability: new Decimal(40), touched: true },
      { participantId: 'p2', outcomeId: '2', probability: new Decimal(40), touched: true },
    ]

    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={mockParticipants}
        predictions={mixedPredictions}
        stakes="usd"
        resolvedOutcomeId="1"
        calculationResults={null}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText(/probabilities do not add up to 100%/i)).toBeInTheDocument()
    expect(screen.getByText(/Bob/)).toBeInTheDocument()
    expect(screen.getByText(/80%/)).toBeInTheDocument()
  })

  it('shows warning when any participant has max bet of 0', () => {
    const participantsWithZeroBet: Participant[] = [
      { id: 'p1', name: 'Alice', maxBet: new Decimal(10) },
      { id: 'p2', name: 'Bob', maxBet: new Decimal(0) },
    ]

    const calculationResults = calculateResults(
      participantsWithZeroBet,
      mockPredictions,
      mockOutcomes,
      '1',
      'Test claim'
    )

    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={participantsWithZeroBet}
        predictions={mockPredictions}
        stakes="usd"
        resolvedOutcomeId="1"
        calculationResults={calculationResults}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText(/Payout Summary/i)).toBeInTheDocument()
    expect(screen.getByText(/Bob has max bet set to 0/i)).toBeInTheDocument()
  })

  it('does not show warning when all participants have non-zero max bets', () => {
    const calculationResults = calculateResults(
      mockParticipants,
      mockPredictions,
      mockOutcomes,
      '1',
      'Test claim'
    )

    render(
      <Resolution
        outcomes={mockOutcomes}
        participants={mockParticipants}
        predictions={mockPredictions}
        stakes="usd"
        resolvedOutcomeId="1"
        calculationResults={calculationResults}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText(/Payout Summary/i)).toBeInTheDocument()
    expect(screen.queryByText(/has max bet set to 0/i)).not.toBeInTheDocument()
  })
})
