import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Decimal from 'decimal.js'
import HonestyExplorer from './HonestyExplorer'
import type { Outcome, Participant, Prediction } from '../domain/wager'

const outcomes: Outcome[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
]

const participants: Participant[] = [
  { id: 'a', name: 'Alice', maxBet: new Decimal(10) },
  { id: 'b', name: 'Bob', maxBet: new Decimal(10) },
]

function binary(participantId: string, yes: number): Prediction[] {
  return [
    { participantId, outcomeId: 'yes', probability: new Decimal(yes), touched: true },
    { participantId, outcomeId: 'no', probability: new Decimal(100 - yes), touched: true },
  ]
}

const predictions = [...binary('a', 70), ...binary('b', 40)]

describe('HonestyExplorer', () => {
  it('starts at the entered belief and calls it the best possible', () => {
    render(
      <HonestyExplorer
        participants={participants}
        outcomes={outcomes}
        predictions={predictions}
        stakes="usd"
      />
    )

    expect(screen.getByRole('slider', { name: /reported probability for yes/i })).toHaveValue('70')
    expect(screen.getByText(/best possible/i)).toHaveTextContent('+0.90 $')
  })

  it('shows the expected payout dropping when the report moves away from the belief', () => {
    render(
      <HonestyExplorer
        participants={participants}
        outcomes={outcomes}
        predictions={predictions}
        stakes="usd"
      />
    )

    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } })

    // 0.90 − 10 / 2 × (0.2² + 0.2²) = 0.50
    const result = screen.getByText(/instead of/i)
    expect(result).toHaveTextContent('+0.50 $ instead of +0.90 $')
    expect(result).toHaveTextContent('-0.40 $ less')
  })

  it('says the loss is tiny when it is under a cent', () => {
    render(
      <HonestyExplorer
        participants={participants}
        outcomes={outcomes}
        predictions={predictions}
        stakes="usd"
      />
    )

    fireEvent.change(screen.getByRole('slider'), { target: { value: '71' } })
    expect(screen.getByText(/a hair less/i)).toBeInTheDocument()
  })

  it('switches participant and resets to that participant’s belief', async () => {
    const user = userEvent.setup()
    render(
      <HonestyExplorer
        participants={participants}
        outcomes={outcomes}
        predictions={predictions}
        stakes="usd"
      />
    )

    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } })
    await user.selectOptions(screen.getByRole('combobox', { name: /participant/i }), 'b')

    expect(screen.getByRole('slider')).toHaveValue('40')
    expect(screen.getByText(/best possible/i)).toHaveTextContent('Expected payout for Bob')
  })

  it('only offers an outcome choice with more than two outcomes', () => {
    const three = [...outcomes, { id: 'maybe', label: 'Maybe' }]
    const preds = [
      { participantId: 'a', outcomeId: 'yes', probability: new Decimal(50), touched: true },
      { participantId: 'a', outcomeId: 'no', probability: new Decimal(30), touched: true },
      { participantId: 'a', outcomeId: 'maybe', probability: new Decimal(20), touched: true },
      { participantId: 'b', outcomeId: 'yes', probability: new Decimal(20), touched: true },
      { participantId: 'b', outcomeId: 'no', probability: new Decimal(30), touched: true },
      { participantId: 'b', outcomeId: 'maybe', probability: new Decimal(50), touched: true },
    ]
    const { rerender } = render(
      <HonestyExplorer
        participants={participants}
        outcomes={outcomes}
        predictions={predictions}
        stakes="usd"
      />
    )
    expect(screen.queryByRole('combobox', { name: /outcome/i })).not.toBeInTheDocument()

    rerender(
      <HonestyExplorer
        participants={participants}
        outcomes={three}
        predictions={preds}
        stakes="usd"
      />
    )
    expect(screen.getByRole('combobox', { name: /outcome/i })).toBeInTheDocument()
  })
})
