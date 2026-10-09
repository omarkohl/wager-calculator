import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ElicitPage from './ElicitPage'
import { loadRun, saveRun, type RunData } from '../../storage/elicitation'
import { answerQuestion, nextFlowQuestion } from './runFlow'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

async function start(mode: 'Quick' | 'Thorough' = 'Quick') {
  await userEvent.type(screen.getByRole('textbox', { name: 'Claim' }), 'It rains')
  await userEvent.type(screen.getByRole('textbox', { name: 'Amount' }), '20')
  await userEvent.click(screen.getByRole('radio', { name: new RegExp(mode) }))
  await userEvent.click(screen.getByRole('button', { name: 'Start' }))
}

const press = (name: RegExp | string) => userEvent.click(screen.getByRole('button', { name }))

// Reload, full-run and address-bar flows are covered end to end in e2e/elicit-questions.spec.ts;
// these tests cover what is stored and where focus goes.
describe('ElicitPage', () => {
  it('goes from the gate to the first question, focused', async () => {
    render(<ElicitPage />)
    await start()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Which would you rather have?' })
    ).toHaveFocus()
    expect(
      screen.getByRole('button', { name: /Win 20 USD if this is true: “It rains”/ })
    ).toBeInTheDocument()
  })

  it('stores every answer as it is given', async () => {
    render(<ElicitPage />)
    await start()
    await press(/I can.t separate these/)
    expect(loadRun()!.answers.map(a => a.choice)).toEqual(['cant-separate'])
    await press(/if this is true/)
    expect(loadRun()!.answers.map(a => a.choice)).toEqual(['cant-separate', 'claim'])
  })

  it('shows the estimate of questions left in both modes', async () => {
    const { unmount } = render(<ElicitPage />)
    await start('Quick')
    expect(screen.getByText(/Approx\. \d+ questions? left/)).toBeInTheDocument()
    unmount()
    sessionStorage.clear()
    render(<ElicitPage />)
    await start('Thorough')
    expect(screen.getByText(/Approx\. \d+ questions? left/)).toBeInTheDocument()
  })

  it('"Stop here" after an answer shows the result, stores the stop and takes focus', async () => {
    render(<ElicitPage />)
    await start()
    await press(/if this is true/)
    await press('Stop here')
    expect(screen.getByRole('heading', { name: /Your answers say the chance is/ })).toHaveFocus()
    expect(screen.getByRole('heading', { name: /chance is above / })).toBeInTheDocument()
    expect(loadRun()!.stopped).toBe(true)
  })

  it('"Stop here" before the first answer gives no result, and a way back to the gate', async () => {
    render(<ElicitPage />)
    await start()
    await press('Stop here')
    const message = screen.getByText('You stopped before answering, so there is no result.')
    expect(message).toHaveFocus()
    expect(screen.queryByText(/Your answers are in/)).not.toBeInTheDocument()

    await press('Start again')
    expect(loadRun()).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Claim' })).toBeInTheDocument()
  })

  it('shows the result with focus after the last answer', async () => {
    render(<ElicitPage />)
    await start()
    for (let i = 0; i < 12 && screen.queryByRole('button', { name: /I can.t separate/ }); i++) {
      await press(/I can.t separate these/)
    }
    // all "can't separate": the span of wedges, not a band
    expect(
      screen.getByRole('heading', { name: /You could not tell the claim from spinners/ })
    ).toHaveFocus()
  })
})

// A thorough run whose answers contradict each other: the claim wins above 50%, the spinner below
function contradictingRun(): RunData {
  let run = {
    claim: 'It rains',
    criteria: '',
    seed: 'contra-1',
    dropped: [],
    adjusted: null,
    mode: 'thorough',
    answers: [],
  } as RunData
  for (let q = nextFlowQuestion(run); q; q = nextFlowQuestion(run)) {
    run = answerQuestion(run, q, q.wedge.lt(0.5) ? 'wedge' : 'claim')
  }
  return run
}

describe('ElicitPage result actions', () => {
  it('drops a misclicked answer, recomputes, and can bring it back', async () => {
    saveRun(contradictingRun())
    render(<ElicitPage />)
    expect(screen.getByText(/don.t hang together/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /don.t hang together/ })).not.toHaveFocus()

    const drop = screen.getAllByRole('button', {
      name: /^That was a misclick, drop it: answer \d+/,
    })[0]
    await userEvent.click(drop)
    expect(loadRun()!.dropped).toHaveLength(1)
    // the screen lands on its lead heading: the note while it still applies, else the result
    expect(document.activeElement?.tagName).toBe('H2')

    await userEvent.click(screen.getByText('Show the full trace of your answers'))
    await userEvent.click(screen.getByRole('button', { name: /^Bring back answer/ }))
    expect(loadRun()!.dropped).toEqual([])
  })

  it('saves resolution criteria as they are typed, without taking focus away', async () => {
    saveRun(contradictingRun())
    render(<ElicitPage />)
    const field = screen.getByRole('textbox', { name: /Resolution criteria/ })
    await userEvent.type(field, 'Any rain')
    expect(loadRun()!.criteria).toBe('Any rain')
    expect(field).toHaveFocus()
  })

  it('forgets the old adjusted belief when the run is run again', async () => {
    saveRun({ ...contradictingRun(), adjusted: '70' })
    render(<ElicitPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Run it again' }))
    expect(loadRun()!.adjusted).toBeNull()
  })

  it('runs it again with a fresh seed, keeping claim, criteria and mode', async () => {
    const old = contradictingRun()
    saveRun({ ...old, criteria: 'Any rain' })
    render(<ElicitPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Run it again' }))
    const run = loadRun()!
    expect(run.seed).not.toBe(old.seed)
    expect(run).toMatchObject({
      claim: 'It rains',
      criteria: 'Any rain',
      mode: 'thorough',
      answers: [],
      dropped: [],
    })
    expect(
      screen.getByRole('heading', { level: 2, name: 'Which would you rather have?' })
    ).toHaveFocus()
  })

  it('saves the adjusted belief as it is typed, without taking focus away', async () => {
    saveRun(contradictingRun())
    render(<ElicitPage />)
    const field = screen.getByRole('textbox', { name: 'Your adjusted belief (%)' })
    await userEvent.clear(field)
    await userEvent.type(field, '42.5')
    expect(loadRun()!.adjusted).toBe('42.5')
    expect(field).toHaveFocus()
    await userEvent.clear(field)
    expect(loadRun()!.adjusted).toBeNull()
  })
})
