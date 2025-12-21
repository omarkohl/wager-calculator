import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Decimal from 'decimal.js'
import PredictionsGrid from './PredictionsGrid'
import type { Participant, Outcome, Prediction } from '../types/wager'

describe('PredictionsGrid', () => {
  const participants: Participant[] = [
    { id: 'p1', name: 'Alice', maxBet: new Decimal(100) },
    { id: 'p2', name: 'Bob', maxBet: new Decimal(50) },
  ]

  const outcomes: Outcome[] = [
    { id: 'o1', label: 'Yes' },
    { id: 'o2', label: 'No' },
  ]

  it('renders a grid with participant names as headers', () => {
    const predictions: Prediction[] = []
    render(
      <PredictionsGrid
        participants={participants}
        outcomes={outcomes}
        predictions={predictions}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders outcome labels for each participant', () => {
    const predictions: Prediction[] = []
    render(
      <PredictionsGrid
        participants={participants}
        outcomes={outcomes}
        predictions={predictions}
        onChange={vi.fn()}
      />
    )

    // Should have "Yes" and "No" labels for each participant
    const yesLabels = screen.getAllByText('Yes')
    const noLabels = screen.getAllByText('No')
    expect(yesLabels.length).toBeGreaterThanOrEqual(2)
    expect(noLabels.length).toBeGreaterThanOrEqual(2)
  })

  it('renders slider and text input for each prediction', () => {
    const predictions: Prediction[] = [
      { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(60), touched: false },
      { participantId: 'p1', outcomeId: 'o2', probability: new Decimal(40), touched: false },
      { participantId: 'p2', outcomeId: 'o1', probability: new Decimal(70), touched: false },
      { participantId: 'p2', outcomeId: 'o2', probability: new Decimal(30), touched: false },
    ]

    render(
      <PredictionsGrid
        participants={participants}
        outcomes={outcomes}
        predictions={predictions}
        onChange={vi.fn()}
      />
    )

    // Check for sliders
    const sliders = screen.getAllByRole('slider')
    expect(sliders).toHaveLength(4)

    // Check for number inputs
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs).toHaveLength(4)
  })

  it('updates prediction when slider is moved', async () => {
    const user = userEvent.setup()
    let currentPredictions: Prediction[] = [
      { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(50), touched: false },
      { participantId: 'p1', outcomeId: 'o2', probability: new Decimal(50), touched: false },
    ]

    const onChange = vi.fn(newPredictions => {
      currentPredictions = newPredictions
    })

    const { rerender } = render(
      <PredictionsGrid
        participants={[participants[0]]}
        outcomes={outcomes}
        predictions={currentPredictions}
        onChange={onChange}
      />
    )

    const slider = screen.getAllByRole('slider')[0]
    await user.pointer({ keys: '[MouseLeft]', target: slider })
    slider.setAttribute('value', '75')
    slider.dispatchEvent(new Event('change', { bubbles: true }))

    rerender(
      <PredictionsGrid
        participants={[participants[0]]}
        outcomes={outcomes}
        predictions={currentPredictions}
        onChange={onChange}
      />
    )

    expect(onChange).toHaveBeenCalled()
    expect(currentPredictions[0].probability.equals(75)).toBe(true)
    expect(currentPredictions[0].touched).toBe(true)
  })

  it('updates prediction when text input is changed', () => {
    const onChange = vi.fn()
    const predictions: Prediction[] = [
      { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(0), touched: false },
      { participantId: 'p1', outcomeId: 'o2', probability: new Decimal(0), touched: false },
    ]

    render(
      <PredictionsGrid
        participants={[participants[0]]}
        outcomes={outcomes}
        predictions={predictions}
        onChange={onChange}
      />
    )

    const input = screen.getAllByRole('spinbutton')[0]
    fireEvent.change(input, { target: { value: '33.33' } })

    expect(onChange).toHaveBeenCalled()
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(lastCall[0].probability.equals(33.33)).toBe(true)
    expect(lastCall[0].touched).toBe(true)
  })

  it('shows warning when probabilities do not sum to 100', () => {
    const predictions: Prediction[] = [
      { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(60), touched: false },
      { participantId: 'p1', outcomeId: 'o2', probability: new Decimal(30), touched: false },
    ]

    render(
      <PredictionsGrid
        participants={[participants[0]]}
        outcomes={outcomes}
        predictions={predictions}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText(/must sum to 100%/i)).toBeInTheDocument()
  })

  it('does not show warning when probabilities sum to 100', () => {
    const predictions: Prediction[] = [
      { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(60), touched: false },
      { participantId: 'p1', outcomeId: 'o2', probability: new Decimal(40), touched: false },
    ]

    render(
      <PredictionsGrid
        participants={[participants[0]]}
        outcomes={outcomes}
        predictions={predictions}
        onChange={vi.fn()}
      />
    )

    expect(screen.queryByText(/must sum to 100%/i)).not.toBeInTheDocument()
  })

  it('shows normalize button when probabilities do not sum to 100', () => {
    const predictions: Prediction[] = [
      { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(60), touched: false },
      { participantId: 'p1', outcomeId: 'o2', probability: new Decimal(30), touched: false },
    ]

    render(
      <PredictionsGrid
        participants={[participants[0]]}
        outcomes={outcomes}
        predictions={predictions}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /normalize/i })).toBeInTheDocument()
  })

  it('normalizes probabilities when normalize button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const predictions: Prediction[] = [
      { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(60), touched: false },
      { participantId: 'p1', outcomeId: 'o2', probability: new Decimal(30), touched: false },
    ]

    render(
      <PredictionsGrid
        participants={[participants[0]]}
        outcomes={outcomes}
        predictions={predictions}
        onChange={onChange}
      />
    )

    const normalizeButton = screen.getByRole('button', { name: /normalize/i })
    await user.click(normalizeButton)

    expect(onChange).toHaveBeenCalled()
    const normalizedPredictions = onChange.mock.calls[0][0]
    const total = normalizedPredictions.reduce(
      (sum: Decimal, p: Prediction) => sum.plus(p.probability),
      new Decimal(0)
    )
    expect(Math.abs(total - 100)).toBeLessThan(0.01) // Allow for floating point errors
  })

  it('auto-distributes remaining probability to untouched predictions after slider interaction', () => {
    const threeOutcomes: Outcome[] = [
      { id: 'o1', label: 'Yes' },
      { id: 'o2', label: 'No' },
      { id: 'o3', label: 'Maybe' },
    ]

    let currentPredictions: Prediction[] = [
      { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(0), touched: false },
      { participantId: 'p1', outcomeId: 'o2', probability: new Decimal(0), touched: false },
      { participantId: 'p1', outcomeId: 'o3', probability: new Decimal(0), touched: false },
    ]

    const onChange = vi.fn(newPredictions => {
      currentPredictions = newPredictions
    })

    const { rerender } = render(
      <PredictionsGrid
        participants={[participants[0]]}
        outcomes={threeOutcomes}
        predictions={currentPredictions}
        onChange={onChange}
      />
    )

    // Get the first slider (for o1)
    const firstSlider = screen.getAllByRole('slider')[0]

    // Change slider to 40% (marks it as touched)
    fireEvent.change(firstSlider, { target: { value: '40' } })

    rerender(
      <PredictionsGrid
        participants={[participants[0]]}
        outcomes={threeOutcomes}
        predictions={currentPredictions}
        onChange={onChange}
      />
    )

    // Trigger auto-distribute by releasing the slider
    fireEvent.mouseUp(firstSlider)

    rerender(
      <PredictionsGrid
        participants={[participants[0]]}
        outcomes={threeOutcomes}
        predictions={currentPredictions}
        onChange={onChange}
      />
    )

    // Should have all 3 predictions
    expect(currentPredictions).toHaveLength(3)

    // First outcome should be touched and at 40%
    const firstPrediction = currentPredictions.find(p => p.outcomeId === 'o1')
    expect(firstPrediction?.probability.equals(40)).toBe(true)
    expect(firstPrediction?.touched).toBe(true)

    // The remaining 60% should be distributed equally to the 2 untouched outcomes (30% each)
    const untouchedPredictions = currentPredictions.filter(p => p.outcomeId !== 'o1')
    expect(untouchedPredictions).toHaveLength(2)
    untouchedPredictions.forEach((p: Prediction) => {
      expect(p.probability.equals(30)).toBe(true)
      expect(p.touched).toBe(false)
    })
  })

  it('does not auto-distribute when total is already 100 or more', async () => {
    const user = userEvent.setup()
    let currentPredictions: Prediction[] = [
      { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(50), touched: true },
      { participantId: 'p1', outcomeId: 'o2', probability: new Decimal(50), touched: true },
    ]

    const onChange = vi.fn(newPredictions => {
      currentPredictions = newPredictions
    })

    const { rerender } = render(
      <PredictionsGrid
        participants={[participants[0]]}
        outcomes={outcomes}
        predictions={currentPredictions}
        onChange={onChange}
      />
    )

    const firstInput = screen.getAllByRole('spinbutton')[0]
    await user.clear(firstInput)
    await user.type(firstInput, '60')
    rerender(
      <PredictionsGrid
        participants={[participants[0]]}
        outcomes={outcomes}
        predictions={currentPredictions}
        onChange={onChange}
      />
    )

    await user.tab() // Blur

    // Should not auto-distribute since total would be >= 100
    const finalPredictions = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(finalPredictions[1].probability.equals(50)).toBe(true) // Unchanged
  })
})
