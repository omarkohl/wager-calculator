import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  it('renders the header', () => {
    render(<App />)
    expect(screen.getByText('Wager Calculator')).toBeInTheDocument()
    expect(screen.getByText('Betting is a tax on bullshit')).toBeInTheDocument()
  })

  it('renders action buttons', () => {
    render(<App />)
    // Buttons appear twice (top and bottom of form)
    const resetButtons = screen.getAllByRole('button', { name: /Reset/ })
    const shareButtons = screen.getAllByRole('button', { name: /Share/ })
    expect(resetButtons.length).toBeGreaterThanOrEqual(1)
    expect(shareButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('autofocuses claim field when loading without URL state', () => {
    // Explicitly ensure no hash
    window.history.replaceState(null, '', window.location.pathname)

    render(<App />)
    const claimField = screen.getByRole('button', { name: 'What are you betting on?' })
    expect(claimField).toHaveFocus()
  })

  it('auto-distributes untouched probabilities when a new outcome is added', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', window.location.pathname)

    render(<App />)

    // Wait for initial render (default participants are Artem and Baani)
    await waitFor(() => {
      expect(screen.getByText('Artem')).toBeInTheDocument()
    })

    // Initial state: 2 outcomes (Yes/No), each should have 50%
    const initialSliders = screen.getAllByRole('slider')
    expect(initialSliders.length).toBe(4) // 2 participants × 2 outcomes

    // Touch one prediction by changing it (Artem's first outcome)
    const artemFirstSlider = initialSliders[0]
    await user.pointer({ keys: '[MouseLeft]', target: artemFirstSlider })
    artemFirstSlider.setAttribute('value', '70')
    await user.type(artemFirstSlider, '{ArrowUp}')

    // Wait for auto-distribution to happen
    await waitFor(() => {
      const sliders = screen.getAllByRole('slider')
      expect(sliders.length).toBe(4)
    })

    // Now add a third outcome
    const addButton = screen.getByRole('button', { name: /add outcome/i })
    await user.click(addButton)

    // Wait for new outcome to be added
    await waitFor(() => {
      const sliders = screen.getAllByRole('slider')
      expect(sliders.length).toBe(6) // 2 participants × 3 outcomes
    })

    // Check that the untouched prediction (Artem's second outcome) was redistributed
    // Artem: touched first outcome (should stay touched), untouched second + new third should auto-distribute
    const allSliders = screen.getAllByRole('slider')
    const artemSliders = allSliders.slice(0, 3) // First 3 sliders are Artem's

    // The second and third outcomes should have equal probabilities (auto-distributed)
    const secondValue = parseFloat(artemSliders[1].getAttribute('value') || '0')
    const thirdValue = parseFloat(artemSliders[2].getAttribute('value') || '0')

    // Allow for small floating point differences
    expect(Math.abs(secondValue - thirdValue)).toBeLessThan(1)
    expect(secondValue).toBeGreaterThan(0)
  })
})
