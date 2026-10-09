import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Decimal from 'decimal.js'
import ResultScreen from './ResultScreen'
import { answerQuestion, nextFlowQuestion } from './runFlow'
import type { RunData } from '../../storage/elicitation'

const base = { claim: 'It rains', criteria: '', seed: 'result-seed', dropped: [], adjusted: null }
const empty = (mode: 'quick' | 'thorough'): RunData =>
  (mode === 'quick' ? { ...base, mode, answers: [] } : { ...base, mode, answers: [] }) as RunData

function play(
  mode: 'quick' | 'thorough',
  choose: (wedge: Decimal, frame: 'claim' | 'negation') => 'claim' | 'wedge' | 'cant-separate'
): RunData {
  let run = empty(mode)
  for (let q = nextFlowQuestion(run); q; q = nextFlowQuestion(run)) {
    run = answerQuestion(run, q, choose(q.wedge, q.frame))
  }
  return run
}

const coherent = (a: number, b: number) => (w: Decimal) =>
  w.lt(a) ? 'claim' : w.gt(b) ? 'wedge' : 'cant-separate'
// claim wins above 50%, the spinner below: every answer contradicts the search
const upsideDown = (w: Decimal) => (w.lt(0.5) ? 'wedge' : 'claim')

const props = { focusOnShow: false }

describe('ResultScreen', () => {
  it('leads with the interval, with the point estimate smaller below it', () => {
    const run = play('quick', coherent(0.4, 0.6))
    render(<ResultScreen run={run} {...props} />)
    const heading = screen.getByRole('heading', { name: /Your answers say the chance is/ })
    expect(heading).toBeInTheDocument()
    const headline = screen.getByText(/^\d+(\.\d)?–\d+(\.\d)?%$|^about /)
    expect(headline).toHaveClass('text-5xl')
    const guess = screen.getByText(/^Best single guess: \d+%$/)
    expect(guess).not.toHaveClass('text-5xl')
    // the interval comes before the single number
    expect(headline.compareDocumentPosition(guess) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('puts the interval in the heading, so focusing it reads the number', () => {
    render(<ResultScreen run={play('quick', coherent(0.4, 0.6))} {...props} />)
    expect(
      screen.getByRole('heading', {
        name: /^Your answers say the chance is (\d+(\.\d)?–\d+(\.\d)?%|about \d+%)$/,
      })
    ).toBeInTheDocument()
  })

  it('labels a one-sided result and gives no point estimate', () => {
    const run = play('quick', () => 'wedge')
    render(<ResultScreen run={run} {...props} />)
    expect(screen.getByText(/^below /)).toBeInTheDocument()
    expect(screen.getByText(/No single best guess/)).toBeInTheDocument()
    expect(screen.getByText(/This is coarse: your answers only bound one side/)).toBeInTheDocument()
    expect(screen.queryByText(/Best single guess/)).not.toBeInTheDocument()
  })

  it('labels a run stopped early as coarse', () => {
    let run = empty('quick')
    run = answerQuestion(run, nextFlowQuestion(run)!, 'claim')
    run = { ...run, stopped: true }
    render(<ResultScreen run={run} {...props} />)
    expect(screen.getByText(/^above /)).toBeInTheDocument()
    expect(screen.getByText(/This is coarse/)).toBeInTheDocument()
  })

  it('does not call a finished two-sided result coarse', () => {
    render(<ResultScreen run={play('quick', coherent(0.45, 0.55))} {...props} />)
    expect(screen.queryByText(/coarse/)).not.toBeInTheDocument()
  })

  it('keeps the trace collapsed by default, and lists every answer when opened', async () => {
    const run = play('quick', coherent(0.4, 0.6))
    const { container } = render(<ResultScreen run={run} {...props} />)
    const details = container.querySelector('details')!
    expect(details.open).toBe(false)
    await userEvent.click(screen.getByText('Show the full trace of your answers'))
    expect(details.open).toBe(true)
    expect(within(details).getAllByRole('listitem')).toHaveLength(run.answers.length)
    expect(within(details).getByText(/Answer 1\./)).toBeInTheDocument()
  })

  it('offers resolution criteria after the result, and saves what is typed', async () => {
    const onCriteria = vi.fn()
    render(
      <ResultScreen run={play('quick', coherent(0.4, 0.6))} {...props} onCriteria={onCriteria} />
    )
    const field = screen.getByRole('textbox', { name: /Resolution criteria/ })
    await userEvent.type(field, 'x')
    expect(onCriteria).toHaveBeenLastCalledWith('x')
    expect(screen.queryByText(/don.t hang together/)).not.toBeInTheDocument()
  })

  it('moves focus to the heading only when asked to', () => {
    const run = play('quick', coherent(0.4, 0.6))
    const { unmount } = render(<ResultScreen run={run} focusOnShow={false} />)
    expect(screen.getByRole('heading', { name: /Your answers say/ })).not.toHaveFocus()
    unmount()
    render(<ResultScreen run={run} focusOnShow />)
    expect(screen.getByRole('heading', { name: /Your answers say/ })).toHaveFocus()
  })

  it('shows an adjusted belief set earlier, read-only, and keeps it in the trace', async () => {
    const run = { ...play('quick', coherent(0.4, 0.6)), adjusted: '80' } as RunData
    render(<ResultScreen run={run} {...props} />)
    expect(screen.getByText('Your answers imply')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('You set this above what your answers implied.')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Show the full trace of your answers'))
    expect(
      screen.getByText(/Your answers implied .* You then set your belief to 80%\./)
    ).toBeInTheDocument()
  })

  it('offers the adjusted belief only when it can be edited or has been set', () => {
    render(<ResultScreen run={play('quick', coherent(0.4, 0.6))} {...props} />)
    expect(screen.queryByText('Your answers imply')).not.toBeInTheDocument()
  })

  it('is read-only without handlers', () => {
    render(<ResultScreen run={play('quick', coherent(0.4, 0.6))} {...props} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('ResultScreen with answers that contradict each other', () => {
  const contradicting = () => play('thorough', upsideDown)

  it('leads with the "sharpen the claim" prompt, criteria open, and a re-run', async () => {
    const onRerun = vi.fn()
    render(<ResultScreen run={contradicting()} {...props} onCriteria={vi.fn()} onRerun={onRerun} />)
    const prompt = screen.getByRole('note')
    expect(within(prompt).getByRole('heading', { name: /don.t hang together/ })).toBeInTheDocument()
    expect(within(prompt).getByText(/can mean more than one thing/)).toBeInTheDocument()
    expect(within(prompt).getByRole('textbox', { name: /Resolution criteria/ })).toBeVisible()
    // the prompt comes before the number
    const number = screen.getByRole('heading', { name: /Your answers say/ })
    expect(prompt.compareDocumentPosition(number) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Run it again' }))
    expect(onRerun).toHaveBeenCalled()
    // the criteria field is not shown twice
    expect(screen.getAllByRole('textbox', { name: /Resolution criteria/ })).toHaveLength(1)
  })

  it('lands on the lead note, not past it, when it takes focus', () => {
    render(<ResultScreen run={contradicting()} focusOnShow />)
    expect(screen.getByRole('heading', { name: /don.t hang together/ })).toHaveFocus()
  })

  it('still gives the number', () => {
    render(<ResultScreen run={contradicting()} {...props} />)
    expect(screen.getByText(/%$/, { selector: 'span.text-5xl' })).toBeInTheDocument()
  })

  it('lists the contradicting pairs with "that was a misclick, drop it" for each answer', async () => {
    const onDrop = vi.fn()
    render(<ResultScreen run={contradicting()} {...props} onDrop={onDrop} />)
    expect(
      screen.getByRole('heading', { name: 'Answers that contradict each other' })
    ).toBeInTheDocument()
    const drops = screen.getAllByRole('button', {
      name: /^That was a misclick, drop it: answer \d+/,
    })
    expect(drops.length).toBeGreaterThanOrEqual(2)
    await userEvent.click(drops[0])
    expect(onDrop).toHaveBeenCalledTimes(1)
    expect(typeof onDrop.mock.calls[0][0]).toBe('number')
  })

  it('shows dropped answers struck in the trace, with a way to bring them back', async () => {
    const onRestore = vi.fn()
    const run = { ...contradicting(), dropped: [0] } as RunData
    render(<ResultScreen run={run} {...props} onRestore={onRestore} />)
    await userEvent.click(screen.getByText('Show the full trace of your answers'))
    expect(screen.getByText(/Dropped as a misclick/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Bring back answer 1/ }))
    expect(onRestore).toHaveBeenCalledWith(0)
  })
})

describe('ResultScreen subadditivity', () => {
  it('flags it in words, neutrally, as something to ponder', () => {
    // believes the claim 60-70% and its being false 60-70% too
    const run = play('thorough', (w, frame) => {
      void frame
      return w.lt(0.6) ? 'claim' : w.gt(0.7) ? 'wedge' : 'cant-separate'
    })
    render(<ResultScreen run={run} {...props} />)
    const note = screen.getByText('Something to ponder').closest('div')!
    expect(note).toHaveTextContent(/add up to more than 100%/)
    expect(note).toHaveTextContent(/range above is wider/)
    expect(note.textContent).not.toMatch(/wrong|mistake|error|irrational/i)
  })

  it('is not mentioned for a coherent run', () => {
    render(<ResultScreen run={play('thorough', coherent(0.4, 0.6))} {...props} />)
    expect(screen.queryByText('Something to ponder')).not.toBeInTheDocument()
  })
})

describe('ResultScreen with nothing usable', () => {
  const onlyUnsure = () => {
    let run = empty('quick')
    for (let i = 0; i < 4; i++) {
      run = answerQuestion(run, nextFlowQuestion(run)!, 'cant-separate')
    }
    return run
  }

  it('shows the span of wedges the user could not separate from the claim, with no best guess', () => {
    render(<ResultScreen run={onlyUnsure()} {...props} />)
    expect(
      screen.getByRole('heading', {
        name: /^You could not tell the claim from spinners (between \d+(\.\d)?% and \d+(\.\d)?%|at \d+%)$/,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/No single best guess: you never preferred either side/)
    ).toBeInTheDocument()
    expect(screen.queryByText(/Best single guess/)).not.toBeInTheDocument()
    expect(screen.queryByText('No range yet')).not.toBeInTheDocument()
  })

  it('says there is no range yet when every kept answer was dropped', () => {
    const run = { ...onlyUnsure(), dropped: [0, 1, 2, 3], stopped: true } as RunData
    const onStartAgain = vi.fn()
    render(<ResultScreen run={run} {...props} onStartAgain={onStartAgain} />)
    expect(screen.getByText('No range yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start again' })).toBeInTheDocument()
  })
})

describe('ResultScreen wording and repeats', () => {
  it('gives every drop button its own name, naming the answer it disagrees with', () => {
    render(<ResultScreen run={play('thorough', upsideDown)} {...props} onDrop={vi.fn()} />)
    const names = screen
      .getAllByRole('button', { name: /^That was a misclick, drop it/ })
      .map(b => b.getAttribute('aria-label'))
    expect(new Set(names).size).toBe(names.length)
    expect(names[0]).toMatch(/which disagrees with answer \d+/)
  })

  it('does not repeat the percentage for a spinner answer, and says "an" before 8 and 11', () => {
    render(<ResultScreen run={play('thorough', upsideDown)} {...props} onDrop={vi.fn()} />)
    for (const button of screen.getAllByRole('button', { name: /^That was a misclick/ })) {
      const label = button.getAttribute('aria-label')!
      expect(label).not.toMatch(/spinner at /)
    }
    for (const note of screen.getAllByRole('listitem')) {
      expect(note.textContent).not.toMatch(/\ba (8|11|18)\d*(\.\d)?% spinner/)
    }
  })

  it('lists a repeated comparison answered differently, with a drop offer for both answers', async () => {
    const onDrop = vi.fn()
    let run = empty('thorough')
    for (let q = nextFlowQuestion(run); q; q = nextFlowQuestion(run)) {
      const sensible = q.wedge.lt(0.4) ? 'claim' : q.wedge.gt(0.6) ? 'wedge' : 'cant-separate'
      const flip =
        q.tagged?.kind === 'repeat' ? (sensible === 'claim' ? 'wedge' : 'claim') : sensible
      run = answerQuestion(run, q, flip)
    }
    render(<ResultScreen run={run} {...props} onDrop={onDrop} />)
    const item = screen.getAllByText(/differently when it came back/)[0].closest('li')!
    const buttons = within(item).getAllByRole('button', { name: /^That was a misclick, drop it/ })
    expect(buttons).toHaveLength(2)
    await userEvent.click(buttons[1])
    expect(onDrop).toHaveBeenCalledTimes(1)
  })
})

describe('ResultScreen "Bet on this"', () => {
  it('hands over the point estimate and the band', async () => {
    const onBet = vi.fn()
    render(<ResultScreen run={play('quick', coherent(0.4, 0.6))} {...props} onBet={onBet} />)
    await userEvent.click(screen.getByRole('button', { name: 'Bet on this' }))
    expect(onBet).toHaveBeenCalledTimes(1)
    const { probability, band } = onBet.mock.calls[0][0]
    expect(probability.toNumber()).toBeGreaterThan(0.4)
    expect(probability.toNumber()).toBeLessThan(0.6)
    expect(band.lo).not.toBeNull()
    expect(band.hi).not.toBeNull()
  })

  it('hands over the adjusted value instead, when there is one', async () => {
    const onBet = vi.fn()
    const run = { ...play('quick', coherent(0.4, 0.6)), adjusted: '72.5' } as RunData
    render(<ResultScreen run={run} {...props} onBet={onBet} />)
    await userEvent.click(screen.getByRole('button', { name: 'Bet on this' }))
    expect(onBet.mock.calls[0][0].probability.toString()).toBe('0.725')
  })

  it('asks for the adjusted value first on a one-sided band, and sends the user to the field', async () => {
    const onBet = vi.fn()
    const run = play('quick', () => 'wedge')
    render(<ResultScreen run={run} {...props} onAdjusted={vi.fn()} onBet={onBet} />)
    await userEvent.click(screen.getByRole('button', { name: 'Bet on this' }))
    expect(onBet).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/Set your own belief above/)
    expect(screen.getByRole('textbox', { name: 'Your adjusted belief (%)' })).toHaveFocus()
  })

  it('bets on the adjusted value of a one-sided band once it is set', async () => {
    const onBet = vi.fn()
    const run = { ...play('quick', () => 'wedge'), adjusted: '2' } as RunData
    render(<ResultScreen run={run} {...props} onAdjusted={vi.fn()} onBet={onBet} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Bet on this' }))
    expect(onBet.mock.calls[0][0].probability.toString()).toBe('0.02')
  })

  it('is not offered without a handler, or without a result', () => {
    render(<ResultScreen run={play('quick', coherent(0.4, 0.6))} {...props} />)
    expect(screen.queryByRole('button', { name: 'Bet on this' })).not.toBeInTheDocument()
  })

  // The page keeps `adjusted` in the run; this does the same for the screen
  function Harness({ initial, onBet }: { initial: RunData; onBet: (bet: unknown) => void }) {
    const [run, setRun] = useState(initial)
    return (
      <ResultScreen
        run={run}
        focusOnShow={false}
        onAdjusted={adjusted => setRun({ ...run, adjusted })}
        onBet={onBet}
      />
    )
  }
  const field = () => screen.getByRole('textbox', { name: 'Your adjusted belief (%)' })

  it('refuses to bet on an older value while the field shows text that is not one', async () => {
    const onBet = vi.fn()
    render(<Harness initial={play('quick', coherent(0.4, 0.6))} onBet={onBet} />)
    await userEvent.clear(field())
    await userEvent.type(field(), '620')
    // "62" was reported on the way; the field now shows "620"
    await userEvent.click(screen.getByRole('button', { name: 'Bet on this' }))
    expect(onBet).not.toHaveBeenCalled()
    expect(screen.getByText(/not a percentage yet/)).toBeInTheDocument()
    expect(field()).toHaveFocus()

    await userEvent.type(field(), '{Backspace}')
    expect(screen.queryByText(/not a percentage yet/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Bet on this' }))
    expect((onBet.mock.calls[0][0] as { probability: Decimal }).probability.toString()).toBe('0.62')
  })

  it('forgets the one-sided warning when the value changes, and links it only while shown', async () => {
    const onBet = vi.fn()
    render(<Harness initial={play('quick', () => 'wedge')} onBet={onBet} />)
    const bet = screen.getByRole('button', { name: 'Bet on this' })
    expect(bet).not.toHaveAttribute('aria-describedby')
    await userEvent.click(bet)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(bet).toHaveAttribute('aria-describedby', screen.getByRole('alert').id)

    await userEvent.type(field(), '80')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(bet).not.toHaveAttribute('aria-describedby')

    // clearing the value again does not bring the old warning back by itself
    await userEvent.clear(field())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(bet).not.toHaveAttribute('aria-describedby')
    await userEvent.click(bet)
    expect(onBet).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
