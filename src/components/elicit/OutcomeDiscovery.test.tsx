import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OutcomeDiscovery from './OutcomeDiscovery'
import { emptyOutcomeList } from '../../domain/elicitation/model'
import type { MultiRunData } from '../../storage/multiRun'

const START: MultiRunData = {
  kind: 'categorical',
  claim: 'Who wins the vote?',
  criteria: '',
  seed: 's1',
  outcomes: emptyOutcomeList(),
  declinedElse: false,
  phase: 'discover',
  view: 'tiers',
  percents: {},
}

function Harness({ initial = START }: { initial?: MultiRunData }) {
  const [run, setRun] = useState(initial)
  return <OutcomeDiscovery run={run} onChange={setRun} onStartAgain={() => {}} />
}

async function add(user: ReturnType<typeof userEvent.setup>, label: string, tier: string) {
  await user.type(screen.getByRole('textbox', { name: 'Outcome' }), label)
  await user.click(screen.getByRole('radio', { name: tier }))
  await user.click(screen.getByRole('button', { name: 'Add outcome' }))
}

beforeEach(() => sessionStorage.clear())

describe('OutcomeDiscovery', () => {
  it('asks for the first outcome, then "Is there another outcome?"', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByRole('heading', { name: 'What is the first outcome?' })).toBeInTheDocument()
    await add(user, 'Alice', 'likely')
    expect(screen.getByRole('heading', { name: 'Is there another outcome?' })).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Outcomes so far' })
    expect(within(list).getByText(/Alice/)).toBeInTheDocument()
    expect(within(list).getByText(/likely/)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Outcome' })).toHaveValue('')
  })

  it('needs a label and a tier, and refuses a repeated outcome', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Add outcome' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/name the outcome/i)
    await user.type(screen.getByRole('textbox', { name: 'Outcome' }), 'Alice')
    await user.click(screen.getByRole('button', { name: 'Add outcome' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/how likely/i)
    await user.click(screen.getByRole('radio', { name: 'likely' }))
    await user.click(screen.getByRole('button', { name: 'Add outcome' }))
    await add(user, ' alice ', 'unlikely')
    expect(screen.getByRole('alert')).toHaveTextContent(/already/i)
  })

  it('offers "Everything else" after two very unlikely in a row, and remembers a no', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await add(user, 'Alice', 'likely')
    await add(user, 'Bob', 'very unlikely')
    expect(screen.queryByRole('button', { name: /Add “Everything else”/ })).toBeNull()
    await add(user, 'Carol', 'very unlikely')
    await user.click(screen.getByRole('button', { name: 'No, there is nothing else' }))
    expect(screen.queryByRole('button', { name: /Add “Everything else”/ })).toBeNull()
    await add(user, 'Dan', 'very unlikely')
    expect(screen.queryByRole('button', { name: /Add “Everything else”/ })).toBeNull()
  })

  it('adds "Everything else" as an unlikely outcome on request', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await add(user, 'Alice', 'likely')
    await add(user, 'Bob', 'very unlikely')
    await add(user, 'Carol', 'very unlikely')
    await user.click(screen.getByRole('button', { name: 'Add “Everything else”' }))
    const list = screen.getByRole('list', { name: 'Outcomes so far' })
    expect(within(list).getByText(/Everything else/)).toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')).toHaveLength(4)
  })

  it('removes an outcome', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await add(user, 'Alice', 'likely')
    await user.click(screen.getByRole('button', { name: 'Remove Alice' }))
    expect(screen.queryByRole('list', { name: 'Outcomes so far' })).toBeNull()
  })

  it('needs two outcomes before the list can be closed, then shows the first sketch', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await add(user, 'Alice', 'likely')
    expect(screen.queryByRole('button', { name: /That is all the outcomes/ })).toBeNull()
    await add(user, 'Bob', 'unlikely')
    await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
    expect(screen.getByRole('heading', { name: 'First sketch' })).toBeInTheDocument()
    // 60 : 10 normalised
    expect(screen.getByText(/Alice/).closest('li')).toHaveTextContent('86%')
    expect(screen.getByText(/Bob/).closest('li')).toHaveTextContent('14%')
    await user.click(screen.getByRole('button', { name: 'Change the outcomes' }))
    expect(screen.getByRole('heading', { name: 'Is there another outcome?' })).toBeInTheDocument()
  })

  it('keeps the claim editable', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const claim = screen.getByRole('textbox', { name: 'Claim' })
    await user.clear(claim)
    await user.type(claim, 'Who wins the final?')
    expect(claim).toHaveValue('Who wins the final?')
  })

  it('keeps the cursor where the user is after each action', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const outcome = screen.getByRole('textbox', { name: 'Outcome' })
    await add(user, 'Alice', 'likely')
    expect(outcome).toHaveFocus()
    await add(user, 'Bob', 'very unlikely')
    await add(user, 'Carol', 'very unlikely')
    await user.click(screen.getByRole('button', { name: 'No, there is nothing else' }))
    expect(screen.getByRole('textbox', { name: 'Outcome' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Remove Carol' }))
    expect(screen.getByRole('textbox', { name: 'Outcome' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
    expect(screen.getByRole('heading', { name: 'First sketch' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Change the outcomes' }))
    expect(screen.getByRole('textbox', { name: 'Outcome' })).toHaveFocus()
  })

  it('moves the cursor to the notice at the cap, and to the field on arrival when asked', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Harness />)
    for (let i = 1; i <= 8; i++) await add(user, `Outcome ${i}`, 'plausible')
    expect(screen.getByText(/most outcomes the tool handles/)).toHaveFocus()
    unmount()
    render(<OutcomeDiscovery run={START} focusOnShow onChange={() => {}} onStartAgain={() => {}} />)
    expect(screen.getByRole('textbox', { name: 'Outcome' })).toHaveFocus()
  })

  it('focuses the "Everything else" button after adding it, and announces the offer', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await add(user, 'Alice', 'likely')
    await add(user, 'Bob', 'very unlikely')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    await add(user, 'Carol', 'very unlikely')
    expect(screen.getByRole('status')).toHaveTextContent(/Everything else/)
    await user.click(screen.getByRole('button', { name: 'Add “Everything else”' }))
    expect(screen.getByRole('textbox', { name: 'Outcome' })).toHaveFocus()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('clears the message when the user types or picks a tier', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Add outcome' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Outcome' }), 'A')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('does not let the claim be empty when closing the list', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await add(user, 'Alice', 'likely')
    await add(user, 'Bob', 'unlikely')
    await user.clear(screen.getByRole('textbox', { name: 'Claim' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/Write the claim/)
    await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
    expect(screen.queryByRole('heading', { name: 'First sketch' })).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Claim' })).toHaveFocus()
  })

  describe('numbers view', () => {
    async function addNumber(user: ReturnType<typeof userEvent.setup>, label: string, pct: string) {
      await user.type(screen.getByRole('textbox', { name: 'Outcome' }), label)
      await user.type(screen.getByRole('textbox', { name: 'Percent' }), pct)
      await user.click(screen.getByRole('button', { name: 'Add outcome' }))
    }

    it('offers the switch only before the first outcome, and swaps tiers for a percent field', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      expect(screen.queryByRole('textbox', { name: 'Percent' })).toBeNull()
      await user.click(screen.getByRole('button', { name: 'Use numbers instead of tiers' }))
      expect(screen.queryByRole('radio', { name: 'likely' })).toBeNull()
      expect(screen.getByRole('textbox', { name: 'Outcome' })).toHaveFocus()
      await addNumber(user, 'Alice', '60')
      expect(screen.getByRole('list', { name: 'Outcomes so far' })).toHaveTextContent('Alice — 60%')
      expect(screen.queryByRole('button', { name: /instead of/ })).toBeNull()
    })

    it('can switch back to tiers while the list is empty', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await user.click(screen.getByRole('button', { name: 'Use numbers instead of tiers' }))
      await user.click(screen.getByRole('button', { name: 'Use tiers instead of numbers' }))
      expect(screen.getByRole('radio', { name: 'likely' })).toBeInTheDocument()
    })

    it('refuses a missing or unusable percentage, and clears the message on typing', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await user.click(screen.getByRole('button', { name: 'Use numbers instead of tiers' }))
      await addNumber(user, 'Alice', '150')
      expect(screen.getByRole('alert')).toHaveTextContent(/above 0 and below 100/)
      await user.type(screen.getByRole('textbox', { name: 'Percent' }), '1')
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('shows the live total, with a warning in both directions, and Normalize', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await user.click(screen.getByRole('button', { name: 'Use numbers instead of tiers' }))
      await addNumber(user, 'Alice', '70')
      await addNumber(user, 'Bob', '42')
      await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
      expect(screen.getByRole('heading', { name: 'Your numbers' })).toHaveFocus()
      expect(screen.getByRole('status')).toHaveTextContent('12 points too many')
      await user.clear(screen.getByRole('textbox', { name: 'Bob, percent' }))
      await user.type(screen.getByRole('textbox', { name: 'Bob, percent' }), '17')
      expect(screen.getByRole('status')).toHaveTextContent('13 points not yet placed')
      await user.click(screen.getByRole('button', { name: 'Normalize' }))
      expect(screen.getByRole('textbox', { name: 'Alice, percent' })).toHaveValue('80.46')
      expect(screen.getByRole('textbox', { name: 'Bob, percent' })).toHaveValue('19.54')
      expect(screen.getByRole('status')).toHaveTextContent('add up to 100%')
      expect(screen.queryByRole('button', { name: 'Normalize' })).toBeNull()
    })

    it('marks the percent field when the percentage is the problem', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await user.click(screen.getByRole('button', { name: 'Use numbers instead of tiers' }))
      await addNumber(user, 'Alice', '150')
      const field = screen.getByRole('textbox', { name: 'Percent' })
      expect(field).toHaveFocus()
      expect(field).toBeInvalid()
      expect(screen.getByRole('textbox', { name: 'Outcome' })).toBeValid()
    })

    it('accepts a decimal comma and a percent sign', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await user.click(screen.getByRole('button', { name: 'Use numbers instead of tiers' }))
      await addNumber(user, 'Alice', '12,5')
      await addNumber(user, 'Bob', '30%')
      expect(screen.getByRole('list', { name: 'Outcomes so far' })).toHaveTextContent(
        'Alice — 12.5%'
      )
      expect(screen.getByRole('list', { name: 'Outcomes so far' })).toHaveTextContent('Bob — 30%')
    })

    it('keeps the cursor on the total after Normalize, and never turns a share into zero', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await user.click(screen.getByRole('button', { name: 'Use numbers instead of tiers' }))
      await addNumber(user, 'A', '0.01')
      await addNumber(user, 'B', '99')
      await addNumber(user, 'C', '99')
      await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
      await user.click(screen.getByRole('button', { name: 'Normalize' }))
      expect(screen.getByRole('textbox', { name: 'A, percent' })).toHaveValue('0.01')
      expect(screen.getByRole('textbox', { name: 'A, percent' })).toBeValid()
      expect(screen.getByRole('status')).toHaveFocus()
    })

    it('flags an unusable number and offers no Normalize until it is fixed', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await user.click(screen.getByRole('button', { name: 'Use numbers instead of tiers' }))
      await addNumber(user, 'Alice', '70')
      await addNumber(user, 'Bob', '42')
      await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
      await user.type(screen.getByRole('textbox', { name: 'Bob, percent' }), 'x')
      expect(screen.getByRole('textbox', { name: 'Bob, percent' })).toBeInvalid()
      expect(screen.queryByRole('button', { name: 'Normalize' })).toBeNull()
    })
  })
})
