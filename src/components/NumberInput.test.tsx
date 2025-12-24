import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Decimal from 'decimal.js'
import NumberInput from './NumberInput'

describe('NumberInput', () => {
  it('displays value when not focused', () => {
    const onChange = vi.fn()
    render(<NumberInput value={new Decimal(42.5678)} onChange={onChange} />)
    // Number inputs may strip trailing zeros, so check for the number value
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(42.57)
  })

  it('selects all text on focus', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumberInput value={new Decimal(100)} onChange={onChange} />)

    const input = screen.getByRole('spinbutton')
    await user.click(input)

    // After focus, input should be selected (we can't directly test selection,
    // but typing should replace the value)
    await user.keyboard('50')
    expect(onChange).toHaveBeenCalled()
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
    expect(lastCall[0].toNumber()).toBe(50)
  })

  it('calls onChange with parsed Decimal value on input change', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumberInput value={new Decimal(0)} onChange={onChange} />)

    const input = screen.getByRole('spinbutton')
    await user.click(input)
    await user.clear(input)
    await user.type(input, '123.45')

    expect(onChange).toHaveBeenCalled()
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
    expect(lastCall[0].toNumber()).toBe(123.45)
  })

  it('sets value to 0 on blur when input is empty', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumberInput value={new Decimal(50)} onChange={onChange} />)

    const input = screen.getByRole('spinbutton')
    await user.click(input)
    await user.clear(input)
    await user.tab()

    expect(onChange).toHaveBeenCalledWith(expect.any(Decimal))
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
    expect(lastCall[0].toNumber()).toBe(0)
  })

  it('sets value to 0 on blur when input is invalid', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumberInput value={new Decimal(50)} onChange={onChange} />)

    const input = screen.getByRole('spinbutton')
    await user.click(input)
    await user.clear(input)
    await user.type(input, 'invalid')
    await user.tab()

    expect(onChange).toHaveBeenCalledWith(expect.any(Decimal))
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
    expect(lastCall[0].toNumber()).toBe(0)
  })

  it('applies min, max, step, and placeholder attributes', () => {
    const onChange = vi.fn()
    render(
      <NumberInput
        value={new Decimal(50)}
        onChange={onChange}
        min={0}
        max={100}
        step={0.01}
        placeholder="Enter amount"
      />
    )

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '100')
    expect(input).toHaveAttribute('step', '0.01')
    expect(input).toHaveAttribute('placeholder', 'Enter amount')
  })

  it('applies custom className', () => {
    const onChange = vi.fn()
    render(<NumberInput value={new Decimal(50)} onChange={onChange} className="custom-class" />)

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveClass('custom-class')
  })

  it('maintains editing state during typing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumberInput value={new Decimal(100)} onChange={onChange} />)

    const input = screen.getByRole('spinbutton')
    await user.click(input)
    await user.clear(input)
    await user.type(input, '1')

    // During typing, onChange is called
    expect(onChange).toHaveBeenCalled()

    await user.type(input, '2.5')
    // Check that onChange was called with the final value
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
    expect(lastCall[0].toNumber()).toBe(12.5)
  })
})
