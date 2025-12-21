import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InlineEdit from './InlineEdit'

describe('InlineEdit', () => {
  it('displays placeholder when value is empty', () => {
    render(<InlineEdit value="" onChange={vi.fn()} placeholder="Click to edit" />)
    expect(screen.getByText('Click to edit')).toBeInTheDocument()
  })

  it('displays value when provided', () => {
    render(<InlineEdit value="Test value" onChange={vi.fn()} />)
    expect(screen.getByText('Test value')).toBeInTheDocument()
  })

  it('switches to edit mode on click', async () => {
    const user = userEvent.setup()
    render(<InlineEdit value="Test" onChange={vi.fn()} />)

    await user.click(screen.getByText('Test'))
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument()
  })

  it('calls onChange when blurred', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<InlineEdit value="Initial" onChange={onChange} />)

    await user.click(screen.getByText('Initial'))
    const input = screen.getByDisplayValue('Initial')
    await user.clear(input)
    await user.type(input, 'Updated')
    await user.tab()

    expect(onChange).toHaveBeenCalledWith('Updated')
  })

  it('renders textarea when multiline is true', async () => {
    const user = userEvent.setup()
    render(<InlineEdit value="Test" onChange={vi.fn()} multiline />)

    await user.click(screen.getByText('Test'))
    expect(screen.getByDisplayValue('Test').tagName).toBe('TEXTAREA')
  })

  it('submits on Enter for single-line input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<InlineEdit value="Test" onChange={onChange} />)

    await user.click(screen.getByText('Test'))
    const input = screen.getByDisplayValue('Test')
    await user.clear(input)
    await user.type(input, 'New value{Enter}')

    expect(onChange).toHaveBeenCalledWith('New value')
  })

  it('cancels edit on Escape', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<InlineEdit value="Original" onChange={onChange} />)

    await user.click(screen.getByText('Original'))
    const input = screen.getByDisplayValue('Original')
    await user.clear(input)
    await user.type(input, 'Changed{Escape}')

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText('Original')).toBeInTheDocument()
  })
})
