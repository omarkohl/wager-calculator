import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SharedMultiResult from './SharedMultiResult'
import { addOutcome, emptyOutcomeList } from '../../domain/elicitation/model'
import { decodeSharedMulti, encodeMultiResultHash } from '../../storage/multiShare'
import type { MultiRunData } from '../../storage/multiRun'

function run(): MultiRunData {
  let outcomes = emptyOutcomeList()
  for (const [label, tier] of [
    ['Alice', 'likely'],
    ['Bob', 'plausible'],
  ] as const) {
    outcomes = addOutcome(outcomes, label, tier)
  }
  return {
    kind: 'categorical',
    claim: 'Who wins?',
    criteria: '',
    seed: 'sh-1',
    outcomes,
    declinedElse: true,
    phase: 'ask',
    view: 'tiers',
    percents: {},
    checks: [],
    kept: true,
    reviewing: false,
    replaced: null,
    answers: [],
    stopped: true,
    adjusted: { o1: '70', o2: '30' },
    merged: [],
    locked: false,
  }
}

describe('SharedMultiResult', () => {
  const shared = decodeSharedMulti(encodeMultiResultHash(run()))!

  it('shows someone else’s result, read-only, with their own numbers and the notice', () => {
    render(<SharedMultiResult shared={shared} onElicitOwn={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Their result' })).toBeInTheDocument()
    expect(screen.getAllByRole('note').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/someone else’s result/)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Result per outcome' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Their own numbers' })).toHaveTextContent('Alice: 70%')
    expect(screen.getByText(/do not mean anything/)).toBeInTheDocument()
    // nothing to change, bet on, share or start over
    expect(screen.queryByRole('textbox')).toBeNull()
    for (const name of ['Bet on this', 'Normalize', 'Copy invite link', 'Start a new claim']) {
      expect(screen.queryByRole('button', { name })).toBeNull()
    }
  })

  it('offers to rate the same outcomes', async () => {
    const onElicitOwn = vi.fn()
    render(<SharedMultiResult shared={shared} onElicitOwn={onElicitOwn} />)
    await userEvent.click(screen.getByRole('button', { name: 'Rate the same outcomes yourself' }))
    expect(onElicitOwn).toHaveBeenCalledTimes(1)
  })

  it('says what was merged, without a way to undo it', () => {
    const merged = decodeSharedMulti(
      encodeMultiResultHash({ ...run(), adjusted: {}, merged: ['o1', 'o2'] })
    )!
    render(<SharedMultiResult shared={merged} onElicitOwn={vi.fn()} />)
    expect(screen.getByText('Some outcomes are merged into “Everything else”.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undo the merge' })).toBeNull()
  })

  it('speaks of the sharer, not of you, where that is cheap', () => {
    render(<SharedMultiResult shared={shared} onElicitOwn={vi.fn()} />)
    expect(screen.getByText('Show the full trace of the answers')).toBeInTheDocument()
    expect(screen.queryByText(/your (first guess|answers)/i)).toBeNull()
    expect(
      screen.getByText('Stopped early, so some outcomes are still rough guesses.')
    ).toBeInTheDocument()
  })

  it('has no section for their own numbers when they set none', () => {
    const plain = decodeSharedMulti(encodeMultiResultHash({ ...run(), adjusted: {} }))!
    render(<SharedMultiResult shared={plain} onElicitOwn={vi.fn()} />)
    expect(screen.queryByRole('list', { name: 'Their own numbers' })).toBeNull()
  })
})
