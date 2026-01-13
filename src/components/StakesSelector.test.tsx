import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StakesSelector from './StakesSelector'

describe('StakesSelector', () => {
  it('displays placeholder when no value is selected', () => {
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)
    expect(screen.getByText('Select stakes...')).toBeInTheDocument()
  })

  it('displays selected option label', () => {
    const onChange = vi.fn()
    render(<StakesSelector value="usd" onChange={onChange} />)
    expect(screen.getByText('USD ($)')).toBeInTheDocument()
  })

  it('opens dropdown when button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const button = screen.getByRole('button', { name: /stakes/i })
    await user.click(button)

    // Check that search input and options are visible
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
    expect(screen.getAllByText('Cookies').length).toBeGreaterThan(0)
    expect(screen.getAllByText('USD ($)').length).toBeGreaterThan(0)
  })

  it('filters options based on search query in label', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const button = screen.getByRole('button', { name: /stakes/i })
    await user.click(button)

    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'cookie')

    // Only Cookies should be visible
    expect(screen.getAllByText('Cookies').length).toBeGreaterThan(0)
    expect(screen.queryByText('USD ($)')).not.toBeInTheDocument()
  })

  it('filters options based on search query in currency name', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const button = screen.getByRole('button', { name: /stakes/i })
    await user.click(button)

    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'forint')

    // Should find HUF by currency name
    expect(screen.getByText('HUF (Ft)')).toBeInTheDocument()
    expect(screen.queryByText('USD ($)')).not.toBeInTheDocument()
  })

  it('filters options based on search query in currency code', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const button = screen.getByRole('button', { name: /stakes/i })
    await user.click(button)

    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'huf')

    // Should find HUF by currency code
    expect(screen.getByText('HUF (Ft)')).toBeInTheDocument()
    expect(screen.queryByText('USD ($)')).not.toBeInTheDocument()
  })

  it('handles case-insensitive filtering', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const button = screen.getByRole('button', { name: /stakes/i })
    await user.click(button)

    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'FORINT')

    expect(screen.getByText('HUF (Ft)')).toBeInTheDocument()
  })

  it('shows "No options found" message when no results match query', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const button = screen.getByRole('button', { name: /stakes/i })
    await user.click(button)

    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'xyz123nonexistent')

    expect(screen.getByText('No options found.')).toBeInTheDocument()
  })

  it('calls onChange when an option is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const button = screen.getByRole('button', { name: /stakes/i })
    await user.click(button)
    const cookiesOptions = screen.getAllByText('Cookies')
    await user.click(cookiesOptions[0])

    expect(onChange).toHaveBeenCalledWith('cookies')
  })

  it('groups options by category', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const button = screen.getByRole('button', { name: /stakes/i })
    await user.click(button)

    // Check that group headers are present
    expect(screen.getByText('Non-monetary')).toBeInTheDocument()
    expect(screen.getByText('Currencies')).toBeInTheDocument()
  })

  it('maintains grouped structure when filtering', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const button = screen.getByRole('button', { name: /stakes/i })
    await user.click(button)

    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'usd')

    // Should show Currencies group header
    expect(screen.getByText('Currencies')).toBeInTheDocument()
    expect(screen.getByText('USD ($)')).toBeInTheDocument()
    // Should not show Non-monetary group header since no matches
    expect(screen.queryByText('Non-monetary')).not.toBeInTheDocument()
  })

  it('displays 30 currency options', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const button = screen.getByRole('button', { name: /stakes/i })
    await user.click(button)

    // Check a sample of the 30 currencies
    expect(screen.getByText('USD ($)')).toBeInTheDocument()
    expect(screen.getByText('EUR (€)')).toBeInTheDocument()
    expect(screen.getByText('GBP (£)')).toBeInTheDocument()
    expect(screen.getByText('JPY (¥)')).toBeInTheDocument()
    expect(screen.getByText('AUD (A$)')).toBeInTheDocument()
    expect(screen.getByText('CAD (C$)')).toBeInTheDocument()
    expect(screen.getByText('CHF (Fr)')).toBeInTheDocument()
    expect(screen.getByText('CNY (¥)')).toBeInTheDocument()
    expect(screen.getByText('INR (₹)')).toBeInTheDocument()
    expect(screen.getByText('HUF (Ft)')).toBeInTheDocument()
    expect(screen.getByText('SGD (S$)')).toBeInTheDocument()
    expect(screen.getByText('ZAR (R)')).toBeInTheDocument()
  })

  it('displays currencies in alphabetical order by code', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const button = screen.getByRole('button', { name: /stakes/i })
    await user.click(button)

    const currencyOptions = screen.getAllByRole('option')
    // Skip non-monetary options (3) and Other (1) = first 4 options
    const currencyCodes = currencyOptions
      .slice(4)
      .map(opt => opt.textContent?.split(' ')[0])
      .filter(Boolean)

    // Check first few are in alphabetical order
    expect(currencyCodes[0]).toBe('AED')
    expect(currencyCodes[1]).toBe('AUD')
    expect(currencyCodes[2]).toBe('BRL')
    expect(currencyCodes[3]).toBe('CAD')
  })

  it('displays all non-monetary options', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const button = screen.getByRole('button', { name: /stakes/i })
    await user.click(button)

    expect(screen.getAllByText('Cookies').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Hugs').length).toBeGreaterThan(0)
    expect(screen.getAllByText('I was wrong').length).toBeGreaterThan(0)
  })

  it('displays Other option', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StakesSelector value="" onChange={onChange} />)

    const button = screen.getByRole('button', { name: /stakes/i })
    await user.click(button)

    expect(screen.getAllByText('Other').length).toBeGreaterThan(0)
  })

  it('uses disambiguated symbols for currencies', () => {
    const onChange = vi.fn()

    // AUD uses A$
    render(<StakesSelector value="aud" onChange={onChange} />)
    expect(screen.getByText('AUD (A$)')).toBeInTheDocument()
  })
})
