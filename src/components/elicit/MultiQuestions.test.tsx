import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MultiQuestions from './MultiQuestions'
import { addOutcome, emptyOutcomeList } from '../../domain/elicitation/model'
import { selectSpotChecks } from '../../domain/elicitation/comparisons'
import { toMultiRun, withAnswers } from '../../storage/multiAnswers'
import { loadMultiRun, saveMultiRun, type MultiRunData } from '../../storage/multiRun'

function start(): MultiRunData {
  let outcomes = emptyOutcomeList()
  for (const [label, tier] of [
    ['Rain', 'likely'],
    ['Cloud', 'plausible'],
    ['Snow', 'very unlikely'],
  ] as const) {
    outcomes = addOutcome(outcomes, label, tier)
  }
  const ids = outcomes.items.map(o => o.id)
  return {
    kind: 'categorical',
    claim: 'What is the weather tomorrow?',
    criteria: '',
    seed: 'q-1',
    outcomes,
    declinedElse: false,
    phase: 'ask',
    view: 'tiers',
    percents: {},
    checks: selectSpotChecks(ids, 'q-1').map(q =>
      q.type === 'pair'
        ? { type: 'pair' as const, first: q.first, second: q.second, bothCanHappen: false }
        : { type: 'completeness' as const, couldBeNone: false }
    ),
    kept: false,
    reviewing: false,
    replaced: null,
    answers: [],
    stopped: false,
  }
}

function Harness({
  initial = start(),
  onStartAgain = () => {},
  focusOnShow = false,
  kept = false,
}) {
  const [run, setRun] = useState(initial)
  return (
    <MultiQuestions
      claim={run.claim}
      base={withAnswers(toMultiRun(run), run.answers)}
      stopped={run.stopped}
      kept={kept}
      stake="20 EUR"
      focusOnShow={focusOnShow}
      onAnswers={answers => {
        const next = { ...run, answers }
        saveMultiRun(next)
        setRun(next)
      }}
      onStop={() => {
        const next = { ...run, stopped: true }
        saveMultiRun(next)
        setRun(next)
      }}
      onStartAgain={onStartAgain}
    />
  )
}

const heading = () => screen.getByRole('heading', { level: 2 })

beforeEach(() => sessionStorage.clear())

describe('MultiQuestions', () => {
  it('asks a question in the yes/no look: arms, "can\'t separate", "stop here", no band', () => {
    render(<Harness />)
    const text = heading().textContent
    expect(text === 'Which would you rather have?' || text === 'Which is more likely?').toBe(true)
    expect(screen.getByRole('button', { name: 'Stop here' })).toBeInTheDocument()
    expect(screen.queryByText(/questions? left/)).toBeNull()
    expect(screen.getByText(/What is the weather tomorrow/)).toBeInTheDocument()
    expect(screen.queryByText(/%.*–|–.*%/)).toBeNull()
  })

  it('records an answer, stores it, and moves on with the cursor on the new question', async () => {
    const user = userEvent.setup()
    render(<Harness focusOnShow />)
    expect(heading()).toHaveFocus()
    const lottery = screen.queryByRole('button', { name: /if the spinner lands/ })
    if (lottery) await user.click(lottery)
    else await user.click(screen.getByRole('button', { name: 'About equally likely' }))
    expect(loadMultiRun()?.answers).toHaveLength(1)
    expect(heading()).toHaveFocus()
  })

  it('offers the lottery with the stake and the outcome in words', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    // answer until a lottery comes (the first question is one or the other)
    for (
      let i = 0;
      i < 12 && !screen.queryByRole('button', { name: /if the spinner lands/ });
      i++
    ) {
      await user.click(screen.getByRole('button', { name: 'About equally likely' }))
    }
    const arms = screen.getAllByRole('button').filter(b => /Win 20 EUR/.test(b.textContent ?? ''))
    expect(arms).toHaveLength(2)
    expect(arms.some(b => /the result is/.test(b.textContent ?? ''))).toBe(true)
    expect(screen.getByRole('button', { name: /can.t separate/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /./ })).toBeInTheDocument()
  })

  it('runs to the end and shows where the answers stand, with provenance', async () => {
    const user = userEvent.setup()
    render(<Harness focusOnShow />)
    for (let i = 0; i < 60 && !screen.queryByRole('heading', { name: 'Your result' }); i++) {
      const spinner = screen.queryByRole('button', { name: /if the spinner lands/ })
      if (spinner) await user.click(spinner)
      else await user.click(screen.getByRole('button', { name: 'About equally likely' }))
    }
    expect(screen.getByRole('heading', { name: 'Your result' })).toHaveFocus()
    const list = screen.getByRole('list', { name: 'Result per outcome' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(list.textContent).toMatch(/From \d+ answers?|From your first guess/)
    expect(list.textContent).toMatch(/%/)
  })

  it('stops on request, and "Start again" is offered at the end', async () => {
    const user = userEvent.setup()
    let again = 0
    render(<Harness onStartAgain={() => again++} />)
    await user.click(screen.getByRole('button', { name: 'Stop here' }))
    expect(screen.getByRole('heading', { name: 'Your result' })).toBeInTheDocument()
    expect(screen.getByText(/You stopped early/)).toBeInTheDocument()
    expect(loadMultiRun()?.stopped).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Start again' }))
    expect(again).toBe(1)
  })

  it('shows the result: band as headline, a best single number, where it comes from, insights', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    for (let i = 0; i < 60 && !screen.queryByRole('heading', { name: 'Your result' }); i++) {
      const spinner = screen.queryByRole('button', { name: /if the spinner lands/ })
      if (spinner) await user.click(spinner)
      else await user.click(screen.getByRole('button', { name: 'About equally likely' }))
    }
    const list = screen.getByRole('list', { name: 'Result per outcome' })
    expect(list.textContent).toMatch(/Best single number: about \d/)
    expect(list.textContent).toMatch(/From \d+ answers?|From your first guess/)
  })

  it('says there is no single number for an outcome with an open end, and invents none', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Stop here' }))
    const list = screen.getByRole('list', { name: 'Result per outcome' })
    expect(list.textContent).toMatch(/No single number yet/)
    expect(list.textContent).not.toMatch(/Best single number/)
  })

  it('carries the standing notice when the list was kept despite a failed check', async () => {
    const user = userEvent.setup()
    render(<Harness kept />)
    await user.click(screen.getByRole('button', { name: 'Stop here' }))
    expect(screen.getByRole('note')).toHaveTextContent(/do not mean anything/)
  })
})
