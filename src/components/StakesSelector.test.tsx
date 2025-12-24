import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StakesSelector from './StakesSelector'

describe('StakesSelector', () => {
  it('displays placeholder when no value is selected', () => {
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)
    expect(screen.getByPlaceholderText('Select stakes...')).toBeInTheDocument()
  })

  it('displays selected option label', () => {
    const onChange = vi.fn()
    render(<StakesSelector value="usd" onChange={onChange} />)
    expect(screen.getByDisplayValue('USD ($)')).toBeInTheDocument()
  })

  it('opens dropdown when input is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const input = screen.getByPlaceholderText('Select stakes...')
    await user.click(input)

    // Check that options are visible - use getAllByText for labels that appear multiple times
    const usdOptions = screen.getAllByText('USD ($)')
    expect(usdOptions.length).toBeGreaterThan(0)
    expect(screen.getByText('Cookies')).toBeInTheDocument()
    // "Other" appears as both group header and option, so use getAllByText
    const otherElements = screen.getAllByText('Other')
    expect(otherElements.length).toBeGreaterThan(0)
  })

  it('filters options based on search query', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const input = screen.getByPlaceholderText('Select stakes...')
    await user.click(input)
    await user.type(input, 'cookie')

    // Only Cookies should be visible
    expect(screen.getByText('Cookies')).toBeInTheDocument()
    expect(screen.queryByText('USD ($)')).not.toBeInTheDocument()
  })

  it('shows "No options found" message when no results match query', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const input = screen.getByPlaceholderText('Select stakes...')
    await user.click(input)
    await user.type(input, 'xyz123nonexistent')

    expect(screen.getByText('No options found.')).toBeInTheDocument()
  })

  it('calls onChange when an option is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const input = screen.getByPlaceholderText('Select stakes...')
    await user.click(input)
    await user.click(screen.getByText('Cookies'))

    expect(onChange).toHaveBeenCalledWith('cookies')
  })

  it('groups options by category', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const input = screen.getByPlaceholderText('Select stakes...')
    await user.click(input)

    // Check that group headers are present (displayed as uppercase due to CSS class)
    expect(screen.getByText('Currencies')).toBeInTheDocument()
    expect(screen.getByText('Fun')).toBeInTheDocument()
    // "Other" appears as both group header and option, so use getAllByText
    const otherElements = screen.getAllByText('Other')
    expect(otherElements.length).toBe(2) // One as group header, one as option
  })

  it('maintains grouped structure when filtering', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const input = screen.getByPlaceholderText('Select stakes...')
    await user.click(input)
    await user.type(input, 'usd')

    // Should show Currencies group header
    expect(screen.getByText('Currencies')).toBeInTheDocument()
    const usdOptions = screen.getAllByText('USD ($)')
    expect(usdOptions.length).toBeGreaterThan(0)
    // Should not show Fun or Other group headers since they have no matches
    expect(screen.queryByText('Fun')).not.toBeInTheDocument()
  })

  it('selects all text on focus', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="usd" onChange={onChange} />)

    const input = screen.getByDisplayValue('USD ($)')
    await user.click(input)

    // Typing should replace the current value (indicating text was selected)
    await user.keyboard('eur')
    expect(screen.getByDisplayValue('eur')).toBeInTheDocument()
  })

  it('handles case-insensitive filtering', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const input = screen.getByPlaceholderText('Select stakes...')
    await user.click(input)
    await user.type(input, 'COOKIES')

    expect(screen.getByText('Cookies')).toBeInTheDocument()
  })

  it('displays all currency options in correct order', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const input = screen.getByPlaceholderText('Select stakes...')
    await user.click(input)

    // Check that all currency options are present
    expect(screen.getByText('USD ($)')).toBeInTheDocument()
    expect(screen.getByText('EUR (€)')).toBeInTheDocument()
    expect(screen.getByText('GBP (£)')).toBeInTheDocument()
    expect(screen.getByText('CAD ($)')).toBeInTheDocument()
    expect(screen.getByText('AUD ($)')).toBeInTheDocument()
    expect(screen.getByText('JPY (¥)')).toBeInTheDocument()
    expect(screen.getByText('CHF (Fr)')).toBeInTheDocument()
    expect(screen.getByText('CNY (¥)')).toBeInTheDocument()
  })

  it('displays all fun and other options', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const input = screen.getByPlaceholderText('Select stakes...')
    await user.click(input)

    expect(screen.getByText('Cookies')).toBeInTheDocument()
    expect(screen.getByText('Hugs')).toBeInTheDocument()
    expect(screen.getByText('I was wrong')).toBeInTheDocument()
    // "Other" appears as both group header and option
    const otherElements = screen.getAllByText('Other')
    expect(otherElements.length).toBe(2) // One as group header, one as option
  })
})
