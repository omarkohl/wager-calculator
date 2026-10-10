import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OutcomeDiscovery from './OutcomeDiscovery'
import { addOutcome, emptyOutcomeList } from '../../domain/elicitation/model'
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
  checks: [],
  kept: false,
  reviewing: false,
  replaced: null,
  answers: [],
  stopped: false,
  adjusted: {},
  merged: [],
}

function Harness({
  initial = START,
  onStartAgain = () => {},
}: {
  initial?: MultiRunData
  onStartAgain?: () => void
}) {
  const [run, setRun] = useState(initial)
  return <OutcomeDiscovery run={run} onChange={setRun} onStartAgain={onStartAgain} />
}

/** Close the list and answer every spot check with "nothing is wrong". */
async function closeAndPass(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
  for (;;) {
    const no =
      screen.queryByRole('button', { name: 'No, only one can happen' }) ??
      screen.queryByRole('button', { name: 'No, one of these will happen' })
    if (!no) return
    await user.click(no)
  }
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
    await closeAndPass(user)
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
    await closeAndPass(user)
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
      await closeAndPass(user)
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
      await closeAndPass(user)
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
      await closeAndPass(user)
      await user.type(screen.getByRole('textbox', { name: 'Bob, percent' }), 'x')
      expect(screen.getByRole('textbox', { name: 'Bob, percent' })).toBeInvalid()
      expect(screen.queryByRole('button', { name: 'Normalize' })).toBeNull()
    })
  })

  describe('starting the questions', () => {
    it('goes from the sketch to the first question, with the cursor on it', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await add(user, 'Alice', 'likely')
      await add(user, 'Bob', 'unlikely')
      await closeAndPass(user)
      await user.click(screen.getByRole('button', { name: 'Start the questions' }))
      const heading = screen.getByRole('heading', { level: 2 })
      expect(['Which would you rather have?', 'Which is more likely?']).toContain(
        heading.textContent
      )
      expect(heading).toHaveFocus()
      expect(screen.getByRole('button', { name: 'Stop here' })).toBeInTheDocument()
    })

    it('uses the typed numbers as the sketch, and waits for numbers that are usable', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await user.click(screen.getByRole('button', { name: 'Use numbers instead of tiers' }))
      await user.type(screen.getByRole('textbox', { name: 'Outcome' }), 'Alice')
      await user.type(screen.getByRole('textbox', { name: 'Percent' }), '70')
      await user.click(screen.getByRole('button', { name: 'Add outcome' }))
      await user.type(screen.getByRole('textbox', { name: 'Outcome' }), 'Bob')
      await user.type(screen.getByRole('textbox', { name: 'Percent' }), '20')
      await user.click(screen.getByRole('button', { name: 'Add outcome' }))
      await closeAndPass(user)
      const startButton = screen.getByRole('button', { name: 'Start the questions' })
      expect(startButton).toBeEnabled()
      await user.type(screen.getByRole('textbox', { name: 'Bob, percent' }), 'x')
      expect(startButton).toBeDisabled()
      await user.clear(screen.getByRole('textbox', { name: 'Bob, percent' }))
      await user.type(screen.getByRole('textbox', { name: 'Bob, percent' }), '30')
      await user.click(screen.getByRole('button', { name: 'Start the questions' }))
      expect(screen.getByRole('button', { name: 'Stop here' })).toBeInTheDocument()
    })
  })

  describe('spot checks', () => {
    async function listTwo(user: ReturnType<typeof userEvent.setup>) {
      await add(user, 'Rain', 'likely')
      await add(user, 'Rain in the morning', 'unlikely')
      await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
    }

    it('has a way out of every check: change the outcomes, or start again', async () => {
      const user = userEvent.setup()
      let started = 0
      render(<Harness onStartAgain={() => started++} />)
      await listTwo(user)
      await user.click(screen.getByRole('button', { name: 'Change the outcomes' }))
      expect(screen.getByRole('textbox', { name: 'Outcome' })).toHaveFocus()
      expect(screen.queryByRole('note')).toBeNull()
      await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
      await user.click(screen.getByRole('button', { name: 'Start again' }))
      expect(started).toBe(1)
    })

    it('ties the explanation to the question, and the reminder to the field', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await listTwo(user)
      const heading = screen.getByRole('heading', { name: /both happen/ })
      expect(heading).toHaveAccessibleDescription(/Check 1 of 2.*must not overlap/)
      await user.click(screen.getByRole('button', { name: 'Yes, both can happen' }))
      await user.click(screen.getByRole('button', { name: 'No, one of these will happen' }))
      await user.click(screen.getByRole('button', { name: 'Change the outcomes' }))
      expect(screen.getByRole('textbox', { name: 'Outcome' })).toHaveAccessibleDescription(
        /Read the whole list again/
      )
    })

    it('leaves "Everything else" out of the checks', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await add(user, 'Rain', 'likely')
      await add(user, 'Sun', 'plausible')
      await add(user, 'Everything else', 'unlikely')
      await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
      // one pair, no completeness check
      expect(screen.getByText(/Check 1 of 1/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'No, only one can happen' }))
      expect(screen.getByRole('heading', { name: 'First sketch' })).toBeInTheDocument()
    })

    it('goes straight to the sketch when there is nothing to ask', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await add(user, 'Rain', 'likely')
      await add(user, 'Everything else', 'unlikely')
      await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
      expect(screen.getByRole('heading', { name: 'First sketch' })).toHaveFocus()
    })

    it('asks about pairs and completeness before the sketch, one at a time', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await listTwo(user)
      expect(screen.getByText(/Check 1 of 2/)).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /Can “.+” and “.+” both happen\?/ })).toHaveFocus()
      await user.click(screen.getByRole('button', { name: 'No, only one can happen' }))
      expect(
        screen.getByRole('heading', { name: 'Could it turn out to be none of these?' })
      ).toHaveFocus()
      await user.click(screen.getByRole('button', { name: 'No, one of these will happen' }))
      expect(screen.getByRole('heading', { name: 'First sketch' })).toHaveFocus()
      expect(screen.queryByRole('note')).toBeNull()
    })

    it('says plainly that the tool is wrong for overlapping outcomes, and lets the user change the list', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await listTwo(user)
      await user.click(screen.getByRole('button', { name: 'Yes, both can happen' }))
      await user.click(screen.getByRole('button', { name: 'No, one of these will happen' }))
      expect(screen.getByRole('heading', { name: 'This list has a problem' })).toHaveFocus()
      expect(screen.getByText(/can both happen/)).toBeInTheDocument()
      expect(screen.getByText(/wrong tool/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Change the outcomes' }))
      expect(screen.getByRole('textbox', { name: 'Outcome' })).toHaveFocus()
      expect(screen.getByRole('note')).toHaveTextContent(/Read the whole list again/)
      // closing again starts the checks over, and the reminder is gone
      await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
      expect(screen.getByText(/Check 1 of 2/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'No, only one can happen' }))
      expect(screen.queryByRole('note')).toBeNull()
    })

    it('flags a list that could turn out to be none of these', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await listTwo(user)
      await user.click(screen.getByRole('button', { name: 'No, only one can happen' }))
      await user.click(screen.getByRole('button', { name: 'Yes, it could' }))
      expect(screen.getByText(/none of these/, { selector: 'li' })).toBeInTheDocument()
    })

    it('keeps a flawed list with a standing notice on the numbers', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await listTwo(user)
      await user.click(screen.getByRole('button', { name: 'Yes, both can happen' }))
      await user.click(screen.getByRole('button', { name: 'No, one of these will happen' }))
      await user.click(screen.getByRole('button', { name: 'Keep them as they are' }))
      expect(screen.getByRole('heading', { name: 'First sketch' })).toHaveFocus()
      expect(screen.getByRole('note')).toHaveTextContent(/do not mean anything/)
      // changing the list drops the notice until the checks are passed again
      await user.click(screen.getByRole('button', { name: 'Change the outcomes' }))
      await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
      expect(screen.queryByRole('note')).toBeNull()
    })

    describe('help to fix', () => {
      async function overlapping(user: ReturnType<typeof userEvent.setup>) {
        await add(user, 'Rain', 'likely')
        await add(user, 'Wet', 'plausible')
        await add(user, 'Sun', 'unlikely')
        await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
        // Yes to every pair, no to completeness: the first pair shown is a problem
        for (;;) {
          const yes = screen.queryByRole('button', { name: 'Yes, both can happen' })
          if (!yes) break
          await user.click(yes)
        }
        await user.click(screen.getByRole('button', { name: 'No, one of these will happen' }))
      }
      const outcomes = () =>
        within(screen.getByRole('list', { name: 'Outcomes so far' }))
          .getAllByRole('listitem')
          .map(li => li.textContent)

      it('renames the two outcomes in place and goes back to the list with the reminder', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await overlapping(user)
        const [rename] = screen.getAllByRole('button', { name: /^Rename / })
        await user.click(rename)
        const fields = screen.getAllByRole('textbox', { name: /^New name for/ })
        expect(fields[0]).toHaveFocus()
        await user.clear(fields[0])
        await user.type(fields[0], 'Rain all day')
        await user.click(screen.getByRole('button', { name: 'Save names' }))
        expect(screen.getByRole('textbox', { name: 'Outcome' })).toHaveFocus()
        expect(screen.getByRole('note')).toHaveTextContent(/Read the whole list again/)
        expect(outcomes().join()).toMatch(/Rain all day/)
      })

      it('refuses a name another outcome has, and can be cancelled back to its button', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await overlapping(user)
        const [rename] = screen.getAllByRole('button', { name: /^Rename / })
        await user.click(rename)
        const fields = screen.getAllByRole('textbox', { name: /^New name for/ })
        // the first one takes the other's name
        await user.clear(fields[0])
        await user.type(fields[0], (fields[1] as HTMLInputElement).value)
        await user.click(screen.getByRole('button', { name: 'Save names' }))
        expect(screen.getByRole('alert')).toHaveTextContent(/already has that name/)
        await user.click(screen.getByRole('button', { name: 'Cancel' }))
        expect(screen.getAllByRole('button', { name: /^Rename / })[0]).toHaveFocus()
      })

      it('merges the two into one outcome in the likelier tier', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await overlapping(user)
        const [merge] = screen.getAllByRole('button', { name: /^Merge “/ })
        await user.click(merge)
        const name = screen.getByRole('textbox', { name: 'Name of the merged outcome' })
        await user.clear(name)
        await user.type(name, 'Rain or wet')
        await user.click(screen.getByRole('button', { name: 'Merge them' }))
        expect(outcomes()).toHaveLength(2)
        expect(outcomes().join()).toMatch(/Rain or wet — likely/)
      })

      it('replaces one with narrower outcomes: removes it and returns to the list', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await overlapping(user)
        const [replace] = screen.getAllByRole('button', { name: /^Replace “/ })
        await user.click(replace)
        expect(outcomes()).toHaveLength(2)
        expect(screen.getByRole('textbox', { name: 'Outcome' })).toHaveFocus()
      })

      it('offers “Everything else” for a gap even after it was declined', async () => {
        const user = userEvent.setup()
        render(<Harness initial={{ ...START, declinedElse: true }} />)
        await add(user, 'Rain', 'likely')
        await add(user, 'Sun', 'plausible')
        await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
        await user.click(screen.getByRole('button', { name: 'No, only one can happen' }))
        await user.click(screen.getByRole('button', { name: 'Yes, it could' }))
        await user.click(screen.getByRole('button', { name: 'Add “Everything else”' }))
        expect(outcomes().join()).toMatch(/Everything else — unlikely/)
        expect(screen.getByRole('note')).toBeInTheDocument()
      })

      it('swaps the names of the two outcomes', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await overlapping(user)
        await user.click(screen.getAllByRole('button', { name: /^Rename / })[0])
        const fields = screen.getAllByRole('textbox', { name: /^New name for/ })
        const [a, b] = fields.map(f => (f as HTMLInputElement).value)
        await user.clear(fields[0])
        await user.type(fields[0], b)
        await user.clear(fields[1])
        await user.type(fields[1], a)
        await user.click(screen.getByRole('button', { name: 'Save names' }))
        expect(outcomes().join()).toContain(`${b} —`)
      })

      it('refuses a name too long to store, and an empty one, with the reason', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await overlapping(user)
        await user.click(screen.getAllByRole('button', { name: /^Merge “/ })[0])
        const name = screen.getByRole('textbox', { name: 'Name of the merged outcome' })
        expect(name).toHaveAttribute('maxlength', '2000')
        await user.clear(name)
        await user.click(screen.getByRole('button', { name: 'Merge them' }))
        expect(screen.getByRole('alert')).toHaveTextContent('Give it a name first.')
        // a pasted value bypasses maxlength in some browsers: the check still holds
        fireEvent.change(name, { target: { value: 'x'.repeat(2001) } })
        await user.click(screen.getByRole('button', { name: 'Merge them' }))
        expect(screen.getByRole('alert')).toHaveTextContent(/Shorten the outcome to 2000/)
      })

      it('tells the user to add the narrower outcomes after a replacement', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await overlapping(user)
        await user.click(screen.getAllByRole('button', { name: /^Replace “/ })[0])
        expect(screen.getByRole('note')).toHaveTextContent(/Add the narrower outcomes that replace/)
      })

      it('puts the cursor on the notice when “Everything else” fills the list', async () => {
        const user = userEvent.setup()
        let l = emptyOutcomeList()
        for (let i = 1; i <= 7; i++) l = addOutcome(l, `Outcome ${i}`, 'plausible')
        render(<Harness initial={{ ...START, outcomes: l }} />)
        await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
        for (let i = 0; i < 3; i++) {
          await user.click(screen.getByRole('button', { name: 'No, only one can happen' }))
        }
        await user.click(screen.getByRole('button', { name: 'Yes, it could' }))
        await user.click(screen.getByRole('button', { name: 'Add “Everything else”' }))
        expect(screen.getByText(/most outcomes the tool handles/)).toHaveFocus()
      })

      it('says the full list is fixed through “Change the outcomes”', async () => {
        const user = userEvent.setup()
        let l = emptyOutcomeList()
        for (let i = 1; i <= 8; i++) l = addOutcome(l, `Outcome ${i}`, 'plausible')
        render(<Harness initial={{ ...START, outcomes: l }} />)
        await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
        for (let i = 0; i < 3; i++) {
          await user.click(screen.getByRole('button', { name: 'No, only one can happen' }))
        }
        await user.click(screen.getByRole('button', { name: 'Yes, it could' }))
        expect(screen.getByText(/The list is full/)).toHaveTextContent(/Change the outcomes/)
      })

      it('asks for a percent when adding “Everything else” in the numbers view', async () => {
        const user = userEvent.setup()
        render(<Harness initial={{ ...START, view: 'numbers' }} />)
        for (const [label, pct] of [
          ['Rain', '60'],
          ['Sun', '30'],
        ]) {
          await user.type(screen.getByRole('textbox', { name: 'Outcome' }), label)
          await user.type(screen.getByRole('textbox', { name: 'Percent' }), pct)
          await user.click(screen.getByRole('button', { name: 'Add outcome' }))
        }
        await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
        await user.click(screen.getByRole('button', { name: 'No, only one can happen' }))
        await user.click(screen.getByRole('button', { name: 'Yes, it could' }))
        await user.click(screen.getByRole('button', { name: 'Add “Everything else”' }))
        await user.click(screen.getByRole('button', { name: 'Add it' }))
        expect(screen.getByRole('alert')).toHaveTextContent(/above 0 and below 100/)
        await user.type(screen.getByRole('textbox', { name: /Percent for/ }), '10')
        await user.click(screen.getByRole('button', { name: 'Add it' }))
        expect(outcomes().join()).toMatch(/Everything else — 10%/)
      })

      it('adds another outcome by going back to the list', async () => {
        const user = userEvent.setup()
        render(<Harness />)
        await add(user, 'Rain', 'likely')
        await add(user, 'Sun', 'plausible')
        await user.click(screen.getByRole('button', { name: /That is all the outcomes/ }))
        await user.click(screen.getByRole('button', { name: 'No, only one can happen' }))
        await user.click(screen.getByRole('button', { name: 'Yes, it could' }))
        await user.click(screen.getByRole('button', { name: 'Add another outcome' }))
        expect(screen.getByRole('textbox', { name: 'Outcome' })).toHaveFocus()
        expect(outcomes()).toHaveLength(2)
      })
    })
  })
})
