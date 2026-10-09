import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Decimal from 'decimal.js'
import AdjustBelief from './AdjustBelief'
import { bandAbove, bandBetween } from '../../domain/elicitation/logOdds'

const two = bandBetween(0.4, 0.6)
const field = () => screen.getByRole('textbox', { name: 'Your adjusted belief (%)' })

describe('AdjustBelief', () => {
  it('shows what the answers imply, fixed, beside a field that starts at the point estimate', () => {
    render(
      <AdjustBelief
        band={two}
        pointEstimate={new Decimal(0.5)}
        adjusted={null}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Your answers imply')).toBeInTheDocument()
    expect(screen.getByText('40–60%')).toBeInTheDocument()
    expect(field()).toHaveValue('50')
  })

  it('starts empty for a one-sided band, and says why', () => {
    render(
      <AdjustBelief
        band={bandAbove(0.52)}
        pointEstimate={null}
        adjusted={null}
        onChange={vi.fn()}
      />
    )
    expect(field()).toHaveValue('')
    expect(screen.getByText(/no starting value/)).toBeInTheDocument()
  })

  it('shows a value set earlier instead of the estimate', () => {
    render(
      <AdjustBelief
        band={two}
        pointEstimate={new Decimal(0.5)}
        adjusted="73.5"
        onChange={vi.fn()}
      />
    )
    expect(field()).toHaveValue('73.5')
  })

  it('reports valid values in their canonical form and an empty field as null', async () => {
    const onChange = vi.fn()
    render(
      <AdjustBelief
        band={two}
        pointEstimate={new Decimal(0.5)}
        adjusted={null}
        onChange={onChange}
      />
    )
    await userEvent.clear(field())
    expect(onChange).toHaveBeenLastCalledWith(null)
    await userEvent.type(field(), '47.50')
    expect(onChange).toHaveBeenLastCalledWith('47.5')
  })

  it('does not scold while typing, only once the field is left', async () => {
    const onChange = vi.fn()
    render(
      <AdjustBelief
        band={two}
        pointEstimate={new Decimal(0.5)}
        adjusted={null}
        onChange={onChange}
      />
    )
    await userEvent.clear(field())
    await userEvent.type(field(), '4.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.tab()
    expect(screen.getByRole('alert')).toHaveTextContent(/above 0 and below 100/)
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    await userEvent.type(field(), '5')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith('4.5')
  })

  it.each(['0', '-3', 'ten'])('never reports %s', async text => {
    const onChange = vi.fn()
    render(
      <AdjustBelief
        band={two}
        pointEstimate={new Decimal(0.5)}
        adjusted={null}
        onChange={onChange}
      />
    )
    await userEvent.clear(field())
    onChange.mockClear()
    await userEvent.type(field(), text)
    await userEvent.tab()
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it.each(['100', '1.234'])(
    'never reports %s itself, only the valid prefixes before it',
    async text => {
      const onChange = vi.fn()
      render(
        <AdjustBelief
          band={two}
          pointEstimate={new Decimal(0.5)}
          adjusted={null}
          onChange={onChange}
        />
      )
      await userEvent.clear(field())
      onChange.mockClear()
      await userEvent.type(field(), text)
      await userEvent.tab()
      expect(onChange).not.toHaveBeenCalledWith(text)
      expect(onChange.mock.calls.every(([value]) => text.startsWith(String(value)))).toBe(true)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    }
  )

  it('stops describing a gap while the text is not a valid value', async () => {
    const Harness = () => {
      const [adjusted, setAdjusted] = useState<string | null>('55')
      return (
        <AdjustBelief
          band={two}
          pointEstimate={new Decimal(0.5)}
          adjusted={adjusted}
          onChange={setAdjusted}
        />
      )
    }
    render(<Harness />)
    expect(screen.getByText('You set this within what your answers implied.')).toBeInTheDocument()
    await userEvent.type(field(), '5')
    // "555" is not a valid percentage: the stored 55 is not described any more
    expect(screen.queryByText(/You set this/)).not.toBeInTheDocument()
    await userEvent.type(field(), '{Backspace}')
    expect(screen.getByText('You set this within what your answers implied.')).toBeInTheDocument()
  })

  it('links the one-sided hint to the field, joined with the error when there is one', async () => {
    render(
      <AdjustBelief
        band={bandAbove(0.52)}
        pointEstimate={null}
        adjusted={null}
        onChange={vi.fn()}
      />
    )
    expect(field()).toHaveAccessibleDescription(/no starting value/)
    await userEvent.type(field(), 'x')
    await userEvent.tab()
    expect(field()).toHaveAccessibleDescription(/no starting value.*Enter a percentage/)
  })

  it('does not link a hint when the band has a starting value', () => {
    render(
      <AdjustBelief
        band={two}
        pointEstimate={new Decimal(0.5)}
        adjusted={null}
        onChange={vi.fn()}
      />
    )
    expect(field()).not.toHaveAttribute('aria-describedby')
  })

  it('describes the gap neutrally: above, below, or within', () => {
    const { rerender } = render(
      <AdjustBelief band={two} pointEstimate={new Decimal(0.5)} adjusted="80" onChange={vi.fn()} />
    )
    expect(screen.getByText('You set this above what your answers implied.')).toBeInTheDocument()
    rerender(
      <AdjustBelief band={two} pointEstimate={new Decimal(0.5)} adjusted="10" onChange={vi.fn()} />
    )
    expect(screen.getByText('You set this below what your answers implied.')).toBeInTheDocument()
    rerender(
      <AdjustBelief band={two} pointEstimate={new Decimal(0.5)} adjusted="55" onChange={vi.fn()} />
    )
    expect(screen.getByText('You set this within what your answers implied.')).toBeInTheDocument()
  })

  it('does not say "your" in someone else\'s result', () => {
    render(<AdjustBelief band={two} pointEstimate={new Decimal(0.5)} adjusted="80" other />)
    expect(screen.getByText('The answers imply')).toBeInTheDocument()
    expect(screen.getAllByText('The adjusted belief').length).toBeGreaterThan(0)
    expect(screen.getByText('This was set above what the answers implied.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\byour?\b/i)
  })

  it('says nothing about a gap until a value is set', () => {
    render(
      <AdjustBelief
        band={two}
        pointEstimate={new Decimal(0.5)}
        adjusted={null}
        onChange={vi.fn()}
      />
    )
    expect(screen.queryByText(/You set this/)).not.toBeInTheDocument()
  })

  it('is read-only without a handler, headed "Your belief"', () => {
    render(<AdjustBelief band={two} pointEstimate={new Decimal(0.5)} adjusted="80" />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your belief' })).toBeInTheDocument()
  })

  it('shows nothing read-only when no value was set', () => {
    const { container } = render(
      <AdjustBelief band={two} pointEstimate={new Decimal(0.5)} adjusted={null} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
