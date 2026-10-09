import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ElicitPage from './ElicitPage'
import { loadRun } from '../../storage/elicitation'

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

  it('"Stop here" after an answer says so, stores it and takes focus', async () => {
    render(<ElicitPage />)
    await start()
    await press(/if this is true/)
    await press('Stop here')
    const message = screen.getByText(/You stopped here\. Your answers are in\./)
    expect(message).toHaveFocus()
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

  it('moves focus to the end message after the last answer', async () => {
    render(<ElicitPage />)
    await start()
    for (let i = 0; i < 12 && screen.queryByRole('button', { name: /I can.t separate/ }); i++) {
      await press(/I can.t separate these/)
    }
    expect(screen.getByText(/That was the last question\. Your answers are in\./)).toHaveFocus()
  })
})
