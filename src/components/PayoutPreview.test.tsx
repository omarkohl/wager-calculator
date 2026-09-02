import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Decimal from 'decimal.js'
import PayoutPreview from './PayoutPreview'
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

function renderPreview(overrides: Partial<Parameters<typeof PayoutPreview>[0]> = {}) {
  return render(
    <PayoutPreview
      participants={participants}
      outcomes={outcomes}
      predictions={predictions}
      stakes="usd"
      claim="Rain?"
      resolvedOutcomeId={null}
      {...overrides}
    />
  )
}

describe('PayoutPreview', () => {
  it('is collapsed by default', () => {
    renderPreview()
    expect(screen.getByRole('button', { name: /preview payouts/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows every outcome’s payouts side by side with the expected payout', async () => {
    const user = userEvent.setup()
    renderPreview()
    await user.click(screen.getByRole('button', { name: /preview payouts/i }))

    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Yes' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'No' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Expected' })).toBeInTheDocument()

    const alice = within(table).getByRole('row', { name: /alice/i })
    const cells = within(alice).getAllByRole('cell')
    expect(cells[0]).toHaveTextContent('+2.70 $')
    expect(cells[1]).toHaveTextContent('-3.30 $')
    expect(cells[2]).toHaveTextContent('+0.90 $')

    const bob = within(table).getByRole('row', { name: /bob/i })
    expect(within(bob).getAllByRole('cell')[2]).toHaveTextContent('+0.90 $')
  })

  it('marks the resolved outcome column', async () => {
    const user = userEvent.setup()
    renderPreview({ resolvedOutcomeId: 'no' })
    await user.click(screen.getByRole('button', { name: /preview payouts/i }))

    expect(screen.getByRole('columnheader', { name: /no ?\(resolved\)/i })).toBeInTheDocument()
  })

  it('explains what expected means and links to the FAQ', async () => {
    const user = userEvent.setup()
    const onOpenFaq = vi.fn()
    renderPreview({ onOpenFaq })
    await user.click(screen.getByRole('button', { name: /preview payouts/i }))

    expect(screen.getByText(/going by their own probabilities/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /more about expected value/i }))
    expect(onOpenFaq).toHaveBeenCalledWith('expected-value')
  })

  it('can show how the expected payout was calculated', async () => {
    const user = userEvent.setup()
    renderPreview()
    await user.click(screen.getByRole('button', { name: /preview payouts/i }))
    await user.click(screen.getByRole('button', { name: /show calculation/i }))

    expect(screen.getByText('Alice: 0.7 × +2.70 + 0.3 × -3.30 = +0.90')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hide calculation/i })).toBeInTheDocument()
  })

  it('can open the honesty explorer', async () => {
    const user = userEvent.setup()
    renderPreview()
    await user.click(screen.getByRole('button', { name: /preview payouts/i }))
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /why report honestly/i }))
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('asks for complete probabilities before previewing', async () => {
    const user = userEvent.setup()
    renderPreview({ predictions: [...binary('a', 70), ...binary('b', 40).slice(0, 1)] })
    await user.click(screen.getByRole('button', { name: /preview payouts/i }))

    expect(screen.getByText(/add up to 100%.*Bob/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('asks for max bets before previewing', async () => {
    const user = userEvent.setup()
    renderPreview({
      participants: [participants[0], { ...participants[1], maxBet: new Decimal(0) }],
    })
    await user.click(screen.getByRole('button', { name: /preview payouts/i }))

    expect(screen.getByText(/max bet above 0/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
