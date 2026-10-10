import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Decimal from 'decimal.js'
import QuestionScreen from './QuestionScreen'
import type { FlowQuestion } from './runFlow'

const question = (extra: Partial<FlowQuestion> = {}): FlowQuestion => ({
  wedge: new Decimal(0.45),
  frame: 'claim',
  armOrder: 'claim-first',
  tagged: null,
  ...extra,
})

function setup(props: Partial<React.ComponentProps<typeof QuestionScreen>> = {}) {
  const onAnswer = vi.fn()
  const onStop = vi.fn()
  render(
    <QuestionScreen
      claim="It rains"
      stake="20 EUR"
      question={question()}
      questionsLeft={{ count: 4, longer: false }}
      focusOnShow={false}
      onAnswer={onAnswer}
      onStop={onStop}
      {...props}
    />
  )
  return { onAnswer, onStop }
}

describe('QuestionScreen', () => {
  it('offers the claim, the spinner and "I can\'t separate these"', async () => {
    const { onAnswer } = setup()
    await userEvent.click(
      screen.getByRole('button', { name: /Win 20 EUR if this is true: “It rains”/ })
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Win 20 EUR if the spinner lands in the shaded part/ })
    )
    await userEvent.click(screen.getByRole('button', { name: /I can.t separate these/ }))
    expect(onAnswer.mock.calls.map(c => c[0])).toEqual(['claim', 'wedge', 'cant-separate'])
  })

  it('speaks of a ball drawn at random, not of a spinner or a shaded part, when balls are shown', async () => {
    const { onAnswer } = setup({ question: question({ wedge: new Decimal(0.03) }) })
    const arm = screen.getByRole('button', {
      name: /Win 20 EUR if a ball drawn at random is a winning ball/,
    })
    expect(arm).not.toHaveTextContent(/spinner|shaded/i)
    expect(arm).toHaveAccessibleName(/One ball is drawn at random from 3 winning balls out of 100/)
    expect(screen.getByText('3 winning balls out of 100 (3%)')).toBeInTheDocument()
    await userEvent.click(arm)
    expect(onAnswer).toHaveBeenCalledWith('wedge')
  })

  it('gives the spinner arm the number in its name', () => {
    setup()
    expect(
      screen.getByRole('button', { name: /spinner with a shaded wedge that wins 45% of the time/ })
    ).toBeInTheDocument()
  })

  it('shows the arms in the order the question says', () => {
    const order = () =>
      screen
        .getAllByRole('button')
        .slice(0, 2)
        .map(b => (/true|false/.test(b.textContent ?? '') ? 'claim' : 'spinner'))
    const { unmount } = render(
      <QuestionScreen
        claim="C"
        stake={null}
        question={question()}
        questionsLeft={null}
        focusOnShow={false}
        onAnswer={vi.fn()}
        onStop={vi.fn()}
      />
    )
    expect(order()).toEqual(['claim', 'spinner'])
    unmount()
    render(
      <QuestionScreen
        claim="C"
        stake={null}
        question={question({ armOrder: 'wedge-first' })}
        questionsLeft={null}
        focusOnShow={false}
        onAnswer={vi.fn()}
        onStop={vi.fn()}
      />
    )
    expect(order()).toEqual(['spinner', 'claim'])
  })

  it('words a question about the claim being false the same way, with no hint it is a check', () => {
    setup({ question: question({ frame: 'negation' }) })
    expect(
      screen.getByRole('button', { name: /Win 20 EUR if this is false: “It rains”/ })
    ).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(
      /check|consisten|coheren|opposite|negat|again|sure\?/i
    )
  })

  it('shows no band or range while the run goes on', () => {
    setup()
    expect(document.body.textContent).not.toMatch(/range|band|between|interval|so far/i)
  })

  it('shows the approximate questions left, singular and plural, or nothing', () => {
    const { unmount } = render(
      <QuestionScreen
        claim="C"
        stake={null}
        question={question()}
        questionsLeft={{ count: 1, longer: false }}
        focusOnShow={false}
        onAnswer={vi.fn()}
        onStop={vi.fn()}
      />
    )
    expect(screen.getByText('Approx. 1 question left')).toBeInTheDocument()
    unmount()
    setup({ questionsLeft: { count: 4, longer: false } })
    expect(screen.getByText('Approx. 4 questions left')).toBeInTheDocument()
  })

  it('explains a rise in the estimate in a sentence', () => {
    setup({ questionsLeft: { count: 5, longer: true } })
    expect(
      screen.getByText(/More than before: your last answer pushed the search further out/)
    ).toBeInTheDocument()
  })

  it('marks true and false in bold', () => {
    const { unmount } = render(
      <QuestionScreen
        claim="C"
        stake={null}
        question={question()}
        questionsLeft={null}
        focusOnShow={false}
        onAnswer={vi.fn()}
        onStop={vi.fn()}
      />
    )
    expect(screen.getByText('true').tagName).toBe('STRONG')
    unmount()
    render(
      <QuestionScreen
        claim="C"
        stake={null}
        question={question({ frame: 'negation' })}
        questionsLeft={null}
        focusOnShow={false}
        onAnswer={vi.fn()}
        onStop={vi.fn()}
      />
    )
    expect(screen.getByText('false').tagName).toBe('STRONG')
  })

  it('hides the line when there is no estimate, and has no question counter', () => {
    setup({ questionsLeft: null })
    expect(screen.queryByText(/left/)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/question \d|of \d+ questions/i)
  })

  it('always offers "Stop here"', async () => {
    const { onStop } = setup({ questionsLeft: null })
    await userEvent.click(screen.getByRole('button', { name: 'Stop here' }))
    expect(onStop).toHaveBeenCalled()
  })

  it('falls back to "the prize" without a remembered stake', () => {
    setup({ stake: null })
    expect(
      screen.getByRole('button', { name: /Win the prize if this is true/ })
    ).toBeInTheDocument()
  })

  it('moves focus to the question heading only when asked to', () => {
    setup({ focusOnShow: false })
    expect(screen.getByRole('heading', { level: 2 })).not.toHaveFocus()
  })

  it('does move focus to the heading when asked to', () => {
    setup({ focusOnShow: true })
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus()
  })
})
