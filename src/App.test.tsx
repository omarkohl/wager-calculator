import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const STAKES_STORAGE_KEY = 'wager-calculator.stakes'

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

describe('App - Stakes LocalStorage', () => {
  beforeEach(() => {
    // Clear localStorage and URL before each test
    localStorage.clear()
    // Explicitly clear the hash - pathname alone doesn't always work in jsdom
    window.location.hash = ''
    window.history.replaceState(null, '', window.location.pathname)
  })

  it('saves actively selected stakes to localStorage', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Open stakes selector (find the button by aria-label)
    const stakesButton = screen.getByRole('button', { name: 'Stakes' })
    expect(stakesButton).toHaveTextContent('USD ($)')
    await user.click(stakesButton)

    // Select a different currency (Euro) - use findByText pattern that works with HeadlessUI
    const euroOption = await screen.findByText('EUR (€)')
    await user.click(euroOption)

    // Wait for localStorage to be updated (debounced 400ms)
    await waitFor(
      () => {
        expect(localStorage.getItem(STAKES_STORAGE_KEY)).toBe('eur')
      },
      { timeout: 1000 }
    )
  })

  it('does NOT save stakes when loading from URL', async () => {
    // Set up URL with GBP stakes
    window.history.replaceState(
      null,
      '',
      '#v=2&c=Test%20Claim&s=gbp&pn=Alice,Bob&pb=100,100&on=Yes,No&op=50,50&pr=50,50;50,50'
    )

    render(<App />)

    // Verify GBP is displayed
    const stakesButton = screen.getByRole('button', { name: 'Stakes' })
    expect(stakesButton).toHaveTextContent('GBP (£)')

    // Wait a bit to ensure localStorage would have been set if it was going to be
    await new Promise(resolve => setTimeout(resolve, 500))

    // Verify localStorage was NOT updated
    expect(localStorage.getItem(STAKES_STORAGE_KEY)).toBeNull()
  })

  it('restores stakes from localStorage on reset when no URL state', async () => {
    const user = userEvent.setup()

    // Start with a saved preference
    localStorage.setItem(STAKES_STORAGE_KEY, 'eur')

    render(<App />)

    // Should load with Euro from localStorage
    let stakesButton = screen.getByRole('button', { name: 'Stakes' })
    expect(stakesButton).toHaveTextContent('EUR (€)')

    // Change to a different stakes
    await user.click(stakesButton)
    const gbpOption = await screen.findByText('GBP (£)')
    await user.click(gbpOption)

    // Wait for localStorage to update (real users take time, debounce is 400ms)
    await waitFor(
      () => {
        expect(localStorage.getItem(STAKES_STORAGE_KEY)).toBe('gbp')
      },
      { timeout: 1000 }
    )

    // Click reset button
    const resetButton = screen.getAllByRole('button', { name: /Reset/i })[0]
    await user.click(resetButton)

    // Confirm the reset in the dialog
    const confirmButton = await screen.findByRole('button', { name: /^Reset$/i })
    await user.click(confirmButton)

    // After reset, should restore from localStorage (which now has 'gbp')
    await waitFor(() => {
      stakesButton = screen.getByRole('button', { name: 'Stakes' })
      expect(stakesButton).toHaveTextContent('GBP (£)')
    })
  })

  it('uses localStorage preference when opening new session without URL', () => {
    // Simulate saved preference
    localStorage.setItem(STAKES_STORAGE_KEY, 'jpy')

    render(<App />)

    // Should load with Japanese Yen from localStorage
    const stakesButton = screen.getByRole('button', { name: 'Stakes' })
    expect(stakesButton).toHaveTextContent('JPY (¥)')
  })

  it('prioritizes URL stakes over localStorage but does not update localStorage', () => {
    // Set localStorage preference
    localStorage.setItem(STAKES_STORAGE_KEY, 'eur')

    // Set URL with different stakes
    window.history.replaceState(
      null,
      '',
      '#v=2&c=Test%20Claim&s=gbp&pn=Alice,Bob&pb=100,100&on=Yes,No&op=50,50&pr=50,50;50,50'
    )

    render(<App />)

    // Should display GBP from URL (URL has priority)
    const stakesButton = screen.getByRole('button', { name: 'Stakes' })
    expect(stakesButton).toHaveTextContent('GBP (£)')

    // localStorage should still have EUR (not updated to GBP)
    expect(localStorage.getItem(STAKES_STORAGE_KEY)).toBe('eur')
  })

  it('updates localStorage when user changes stakes after viewing URL with different stakes', async () => {
    const user = userEvent.setup()

    // Set localStorage preference
    localStorage.setItem(STAKES_STORAGE_KEY, 'eur')

    // Load URL with GBP
    window.history.replaceState(
      null,
      '',
      '#v=2&c=Test%20Claim&s=gbp&pn=Alice,Bob&pb=100,100&on=Yes,No&op=50,50&pr=50,50;50,50'
    )

    render(<App />)

    // Verify GBP is displayed
    const stakesButton = screen.getByRole('button', { name: 'Stakes' })
    expect(stakesButton).toHaveTextContent('GBP (£)')

    // Now user actively changes to USD
    await user.click(stakesButton)
    const usdOption = await screen.findByText('USD ($)')
    await user.click(usdOption)

    // Wait for localStorage to update
    await waitFor(
      () => {
        expect(localStorage.getItem(STAKES_STORAGE_KEY)).toBe('usd')
      },
      { timeout: 1000 }
    )
  })
})
