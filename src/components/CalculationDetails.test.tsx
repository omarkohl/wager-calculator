import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Decimal from 'decimal.js'
import CalculationDetails from './CalculationDetails'
import { explainResults } from '../domain/explanation'
import type { Outcome, Participant, Prediction } from '../domain/wager'

// The FAQ's worked example
const outcomes: Outcome[] = [
  { id: 'few', label: 'Less than 5' },
  { id: 'some', label: 'Between 5 and 10' },
  { id: 'many', label: 'More than 10' },
]

const participants: Participant[] = [
  { id: 'artem', name: 'Artem', maxBet: new Decimal(50) },
  { id: 'baani', name: 'Baani', maxBet: new Decimal(40) },
  { id: 'chau', name: 'Chau', maxBet: new Decimal(30) },
]

function spread(participantId: string, probabilities: number[]): Prediction[] {
  return outcomes.map((outcome, i) => ({
    participantId,
    outcomeId: outcome.id,
    probability: new Decimal(probabilities[i]),
    touched: true,
  }))
}

const predictions = [
  ...spread('artem', [70, 20, 10]),
  ...spread('baani', [10, 80, 10]),
  ...spread('chau', [20, 60, 20]),
]

/** Matches the innermost element whose full text is exactly `text` */
function line(text: string) {
  return (_: string, element: Element | null) =>
    element?.textContent === text &&
    !Array.from(element.children).some(child => child.textContent === text)
}

describe('CalculationDetails', () => {
  const explanation = explainResults(participants, predictions, outcomes, 'some', 'party')

  it('is collapsed by default', () => {
    render(
      <CalculationDetails
        explanation={explanation}
        participants={participants}
        outcomes={outcomes}
        stakes="usd"
      />
    )
    expect(screen.getByRole('button', { name: /show calculation/i })).toBeInTheDocument()
    expect(screen.queryByText(/brier score =/i)).not.toBeInTheDocument()
  })

  it('walks through every step with the wager’s numbers', async () => {
    const user = userEvent.setup()
    render(
      <CalculationDetails
        explanation={explanation}
        participants={participants}
        outcomes={outcomes}
        stakes="usd"
      />
    )
    await user.click(screen.getByRole('button', { name: /show calculation/i }))

    expect(screen.getByText(/amount in play: 30 \$/i)).toBeInTheDocument()

    // Artem's Brier score, term by term
    expect(screen.getByText(line('Less than 5: (0.7 − 0)² = 0.49'))).toBeInTheDocument()
    expect(
      screen.getByText(line('Between 5 and 10 (occurred): (0.2 − 1)² = 0.64'))
    ).toBeInTheDocument()
    expect(screen.getAllByText(line('More than 10: (0.1 − 0)² = 0.01')).length).toBeGreaterThan(0)
    expect(screen.getByText(line('Sum = 1.14'))).toBeInTheDocument()

    // Artem's payout
    expect(
      screen.getByText(line("Others' average: (Baani 0.06 + Chau 0.24) / 2 = 0.15"))
    ).toBeInTheDocument()
    expect(
      screen.getByText(line('Payout: 30 × (0.15 − 1.14) / 2 = −14.85 → -14.85 $'))
    ).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /hide calculation/i })).toBeInTheDocument()
  })

  it('points out a payout that was nudged for a zero sum', async () => {
    const user = userEvent.setup()
    const three: Participant[] = [
      { id: 'a', name: 'A', maxBet: new Decimal(1) },
      { id: 'b', name: 'B', maxBet: new Decimal(1) },
      { id: 'c', name: 'C', maxBet: new Decimal(1) },
    ]
    const preds = [
      ...spread('a', [0, 5, 95]),
      ...spread('b', [0, 10, 90]),
      ...spread('c', [33, 33, 34]),
    ]
    render(
      <CalculationDetails
        explanation={explainResults(three, preds, outcomes, 'few', 'seed')}
        participants={three}
        outcomes={outcomes}
        stakes="usd"
      />
    )
    await user.click(screen.getByRole('button', { name: /show calculation/i }))

    expect(screen.getAllByText(/nudged so that all payouts sum to zero/i)).toHaveLength(1)
  })
})
