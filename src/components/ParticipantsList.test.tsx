import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Decimal from 'decimal.js'
import ParticipantsList from './ParticipantsList'
import type { Participant } from '../types/wager'

describe('ParticipantsList', () => {
  it('renders all participants with their names', () => {
    const participants: Participant[] = [
      { id: '1', name: 'Alice', maxBet: new Decimal(100) },
      { id: '2', name: 'Bob', maxBet: new Decimal(50) },
    ]
    render(<ParticipantsList participants={participants} onChange={vi.fn()} stakes="usd" />)

    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bob')).toBeInTheDocument()
  })

  it('renders max bet inputs with values', () => {
    const participants: Participant[] = [
      { id: '1', name: 'Alice', maxBet: new Decimal(100) },
      { id: '2', name: 'Bob', maxBet: new Decimal(50) },
    ]
    render(<ParticipantsList participants={participants} onChange={vi.fn()} stakes="usd" />)

    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50')).toBeInTheDocument()
  })

  it('calls onChange when participant name is edited', async () => {
    const user = userEvent.setup()
    let currentParticipants: Participant[] = [{ id: '1', name: '', maxBet: new Decimal(100) }]
    const onChange = vi.fn(newParticipants => {
      currentParticipants = newParticipants
    })

    const { rerender } = render(
      <ParticipantsList participants={currentParticipants} onChange={onChange} stakes="usd" />
    )

    const nameInput = screen.getByPlaceholderText('Participant name')

    for (const char of 'Charlie') {
      await user.type(nameInput, char)
      rerender(
        <ParticipantsList participants={currentParticipants} onChange={onChange} stakes="usd" />
      )
    }

    expect(currentParticipants[0].name).toBe('Charlie')
  })

  it('calls onChange when max bet is edited', async () => {
    const user = userEvent.setup()
    let currentParticipants: Participant[] = [{ id: '1', name: 'Alice', maxBet: new Decimal(0) }]
    const onChange = vi.fn(newParticipants => {
      currentParticipants = newParticipants
    })

    const { rerender } = render(
      <ParticipantsList participants={currentParticipants} onChange={onChange} stakes="usd" />
    )

    const maxBetInputs = screen.getAllByPlaceholderText('0')

    for (const char of '200') {
      await user.type(maxBetInputs[0], char)
      rerender(
        <ParticipantsList participants={currentParticipants} onChange={onChange} stakes="usd" />
      )
    }

    expect(currentParticipants[0].maxBet.toNumber()).toBe(200)
  })

  it('shows add participant button when less than 8 participants', () => {
    const participants: Participant[] = [
      { id: '1', name: 'Alice', maxBet: new Decimal(100) },
      { id: '2', name: 'Bob', maxBet: new Decimal(50) },
    ]
    render(<ParticipantsList participants={participants} onChange={vi.fn()} stakes="usd" />)

    expect(screen.getByRole('button', { name: /add participant/i })).toBeInTheDocument()
  })

  it('hides add participant button when 8 participants', () => {
    const participants: Participant[] = Array.from({ length: 8 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Person ${i + 1}`,
      maxBet: new Decimal(100),
    }))
    render(<ParticipantsList participants={participants} onChange={vi.fn()} stakes="usd" />)

    expect(screen.queryByRole('button', { name: /add participant/i })).not.toBeInTheDocument()
  })

  it('adds a new participant when add button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const participants: Participant[] = [{ id: '1', name: 'Alice', maxBet: new Decimal(100) }]

    render(<ParticipantsList participants={participants} onChange={onChange} stakes="usd" />)

    await user.click(screen.getByRole('button', { name: /add participant/i }))

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        { id: '1', name: 'Alice', maxBet: new Decimal(100) },
        expect.objectContaining({ name: '', maxBet: new Decimal(0) }),
      ])
    )
  })

  it('shows remove button for each participant', () => {
    const participants: Participant[] = [
      { id: '1', name: 'Alice', maxBet: new Decimal(100) },
      { id: '2', name: 'Bob', maxBet: new Decimal(50) },
      { id: '3', name: 'Charlie', maxBet: new Decimal(75) },
    ]
    render(<ParticipantsList participants={participants} onChange={vi.fn()} stakes="usd" />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    expect(removeButtons).toHaveLength(3)
  })

  it('disables remove buttons when exactly 2 participants', () => {
    const participants: Participant[] = [
      { id: '1', name: 'Alice', maxBet: new Decimal(100) },
      { id: '2', name: 'Bob', maxBet: new Decimal(50) },
    ]
    render(<ParticipantsList participants={participants} onChange={vi.fn()} stakes="usd" />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    expect(removeButtons).toHaveLength(2)
    removeButtons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('enables remove buttons when more than 2 participants', () => {
    const participants: Participant[] = [
      { id: '1', name: 'Alice', maxBet: new Decimal(100) },
      { id: '2', name: 'Bob', maxBet: new Decimal(50) },
      { id: '3', name: 'Charlie', maxBet: new Decimal(75) },
    ]
    render(<ParticipantsList participants={participants} onChange={vi.fn()} stakes="usd" />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    removeButtons.forEach(button => {
      expect(button).not.toBeDisabled()
    })
  })

  it('removes a participant when remove button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const participants: Participant[] = [
      { id: '1', name: 'Alice', maxBet: new Decimal(100) },
      { id: '2', name: 'Bob', maxBet: new Decimal(50) },
      { id: '3', name: 'Charlie', maxBet: new Decimal(75) },
    ]

    render(<ParticipantsList participants={participants} onChange={onChange} stakes="usd" />)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeButtons[1]) // Remove Bob

    expect(onChange).toHaveBeenCalledWith([
      { id: '1', name: 'Alice', maxBet: new Decimal(100) },
      { id: '3', name: 'Charlie', maxBet: new Decimal(75) },
    ])
  })

  it('renders default placeholder names "Artem" and "Baani"', () => {
    const participants: Participant[] = [
      { id: '1', name: 'Artem', maxBet: new Decimal(0) },
      { id: '2', name: 'Baani', maxBet: new Decimal(0) },
    ]
    render(<ParticipantsList participants={participants} onChange={vi.fn()} stakes="usd" />)

    expect(screen.getByDisplayValue('Artem')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Baani')).toBeInTheDocument()
  })

  it('clears placeholder name on first input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const participants: Participant[] = [{ id: '1', name: 'Artem', maxBet: new Decimal(0) }]

    render(<ParticipantsList participants={participants} onChange={onChange} stakes="usd" />)

    const nameInput = screen.getByDisplayValue('Artem')
    await user.click(nameInput)
    await user.type(nameInput, 'A')

    expect(onChange).toHaveBeenLastCalledWith([
      { id: '1', name: 'A', maxBet: new Decimal(0), touched: true },
    ])
  })

  it('displays currency symbol for monetary stakes', () => {
    const participants: Participant[] = [{ id: '1', name: 'Alice', maxBet: new Decimal(100) }]
    render(<ParticipantsList participants={participants} onChange={vi.fn()} stakes="usd" />)

    expect(screen.getByText('$')).toBeInTheDocument()
  })

  it('displays unit label for non-monetary stakes', () => {
    const participants: Participant[] = [{ id: '1', name: 'Alice', maxBet: new Decimal(10) }]
    render(<ParticipantsList participants={participants} onChange={vi.fn()} stakes="cookies" />)

    expect(screen.getByText('cookies')).toBeInTheDocument()
  })
})
