import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ElicitPage from './ElicitPage'
import {
  encodeInviteHash,
  encodeResultHash,
  loadRun,
  saveRun,
  type RunData,
} from '../../storage/elicitation'
import { decodeWagerFromHash } from '../../storage/urlHash'
import { answerQuestion, nextFlowQuestion } from './runFlow'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
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

function finishedQuickRun(): RunData {
  let run = {
    claim: 'The bridge opens',
    criteria: 'By noon',
    seed: 'share-1',
    dropped: [],
    adjusted: '55',
    mode: 'quick',
    answers: [],
  } as RunData
  for (let q = nextFlowQuestion(run); q; q = nextFlowQuestion(run)) {
    run = answerQuestion(
      run,
      q,
      q.wedge.lt(0.4) ? 'claim' : q.wedge.gt(0.6) ? 'wedge' : 'cant-separate'
    )
  }
  return run
}

describe('ElicitPage shared links', () => {
  it('opens an invite at the gate with the claim filled in and the criteria shown', async () => {
    window.history.replaceState(
      null,
      '',
      `/elicit${encodeInviteHash({ claim: 'Pineapple on pizza', criteria: 'Ask five people' })}`
    )
    render(<ElicitPage />)
    expect(screen.getByRole('textbox', { name: 'Claim' })).toHaveValue('Pineapple on pizza')
    expect(screen.getByText(/Ask five people/)).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(/invited/)
  })

  it("carries the invite's criteria into the run, and clears the address bar when it starts", async () => {
    window.history.replaceState(
      null,
      '',
      `/elicit${encodeInviteHash({ claim: 'Pineapple on pizza', criteria: 'Ask five people' })}`
    )
    render(<ElicitPage />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Amount' }), '10')
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(loadRun()).toMatchObject({
      claim: 'Pineapple on pizza',
      criteria: 'Ask five people',
      answers: [],
    })
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/elicit')
  })

  it('shows an invite over a run in progress without touching that run', () => {
    saveRun(finishedQuickRun())
    window.history.replaceState(
      null,
      '',
      `/elicit${encodeInviteHash({ claim: 'Other claim', criteria: '' })}`
    )
    render(<ElicitPage />)
    expect(screen.getByRole('textbox', { name: 'Claim' })).toHaveValue('Other claim')
    expect(loadRun()!.claim).toBe('The bridge opens')
  })

  it('opens a shared result, recomputed, read-only and with the claim', () => {
    const shared = finishedQuickRun()
    window.history.replaceState(null, '', `/elicit${encodeResultHash(shared)}`)
    render(<ElicitPage />)
    expect(screen.getByText(/The claim:/)).toHaveTextContent('The bridge opens')
    expect(
      screen.getByRole('heading', { name: /The answers say the chance is/ })
    ).toBeInTheDocument()
    expect(screen.getByText(/shared result/)).toBeInTheDocument()
    // not editable, not asking questions, nothing stored
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Stop here|drop it|Copy/ })).not.toBeInTheDocument()
    expect(screen.getByText('55%')).toBeInTheDocument()
    expect(loadRun()).toBeNull()
  })

  it('labels a shared result that was stopped early as coarse', () => {
    const full = finishedQuickRun()
    const early = { ...full, answers: full.answers.slice(0, 1) } as RunData
    window.history.replaceState(null, '', `/elicit${encodeResultHash(early)}`)
    render(<ElicitPage />)
    expect(screen.getByText(/This is coarse/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /spinner lands/ })).not.toBeInTheDocument()
  })

  it('"Elicit your own" starts the gate from the shared claim, as an invite', async () => {
    const shared = finishedQuickRun()
    window.history.replaceState(null, '', `/elicit${encodeResultHash(shared)}`)
    render(<ElicitPage />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Elicit your own belief on this claim' })
    )
    expect(screen.getByRole('textbox', { name: 'Claim' })).toHaveValue('The bridge opens')
    expect(screen.getByText(/By noon/)).toBeInTheDocument()
    // the address bar now holds an invite, not the other person's answers
    expect(window.location.hash).toBe(
      encodeInviteHash({ claim: 'The bridge opens', criteria: 'By noon' })
    )
    expect(window.location.hash).not.toContain('share-1')
  })

  it('ignores a hash it cannot read', () => {
    window.history.replaceState(null, '', '/elicit#ev=9&t=i&c=x')
    render(<ElicitPage />)
    expect(screen.getByRole('textbox', { name: 'Claim' })).toHaveValue('')
  })

  it('offers sharing on your own result', () => {
    saveRun(finishedQuickRun())
    render(<ElicitPage />)
    expect(screen.getByRole('button', { name: 'Copy invite link' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy result link' })).toBeInTheDocument()
  })

  it("shows the sender's criteria on a shared result, read-only", () => {
    window.history.replaceState(null, '', `/elicit${encodeResultHash(finishedQuickRun())}`)
    render(<ElicitPage />)
    expect(screen.getByText(/Resolution criteria:/)).toHaveTextContent('By noon')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('speaks about the answers, not to the viewer, on a shared result', () => {
    for (const run of [finishedQuickRun(), contradictingRun()]) {
      window.history.replaceState(
        null,
        '',
        `/elicit${encodeResultHash({ ...run, adjusted: '55' })}`
      )
      const { container, unmount } = render(<ElicitPage />)
      const text = container
        .querySelector('section')!
        .textContent!.replace('Elicit your own belief on this claim', '')
      expect(text).not.toMatch(/\byou(r)?\b/i)
      unmount()
    }
  })

  it('reads a share link pasted into the same tab, without touching the stored run', () => {
    saveRun(finishedQuickRun())
    render(<ElicitPage />)
    expect(screen.getByRole('button', { name: 'Copy invite link' })).toBeInTheDocument()

    act(() => {
      window.history.replaceState(
        null,
        '',
        `/elicit${encodeInviteHash({ claim: 'Pasted claim', criteria: '' })}`
      )
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByRole('textbox', { name: 'Claim' })).toHaveValue('Pasted claim')
    expect(loadRun()!.claim).toBe('The bridge opens')

    act(() => {
      window.history.replaceState(null, '', `/elicit${encodeResultHash(finishedQuickRun())}`)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByText(/shared result/)).toBeInTheDocument()
    expect(loadRun()!.claim).toBe('The bridge opens')
  })

  it('warns on an invite that it replaces a run in progress, and only then', () => {
    window.history.replaceState(
      null,
      '',
      `/elicit${encodeInviteHash({ claim: 'X', criteria: '' })}`
    )
    const { unmount } = render(<ElicitPage />)
    expect(screen.queryByText(/run in progress in this tab/)).not.toBeInTheDocument()
    unmount()
    saveRun(finishedQuickRun())
    render(<ElicitPage />)
    expect(
      screen.getByText(/run in progress in this tab; starting here replaces it/)
    ).toBeInTheDocument()
  })

  it('puts focus in the claim field after "Elicit your own", not on a plain invite', async () => {
    window.history.replaceState(null, '', `/elicit${encodeResultHash(finishedQuickRun())}`)
    const { unmount } = render(<ElicitPage />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Elicit your own belief on this claim' })
    )
    expect(screen.getByRole('textbox', { name: 'Claim' })).toHaveFocus()
    unmount()

    window.history.replaceState(
      null,
      '',
      `/elicit${encodeInviteHash({ claim: 'X', criteria: '' })}`
    )
    render(<ElicitPage />)
    expect(screen.getByRole('textbox', { name: 'Claim' })).not.toHaveFocus()
  })

  it('shares a result of only "can\'t separate" answers too', async () => {
    let run = {
      claim: 'Unsure',
      criteria: '',
      seed: 'unsure-1',
      dropped: [],
      adjusted: null,
      mode: 'quick',
      answers: [],
    } as RunData
    for (let i = 0; i < 3; i++) run = answerQuestion(run, nextFlowQuestion(run)!, 'cant-separate')
    saveRun({ ...run, stopped: true })
    render(<ElicitPage />)
    expect(screen.getByRole('button', { name: 'Copy result link' })).toBeInTheDocument()
  })

  it('"Bet on this" opens a fresh wager on the wager page, with the provenance in the history entry', async () => {
    localStorage.setItem('howsure.stake', JSON.stringify({ amount: '10', currency: 'eur' }))
    saveRun(finishedQuickRun())
    render(<ElicitPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Bet on this' }))
    expect(window.location.pathname).toBe('/wager')
    const wager = decodeWagerFromHash(window.location.hash)!
    expect(wager.claim).toBe('The bridge opens')
    expect(wager.details).toBe('By noon')
    expect(wager.stakes).toBe('eur')
    // finishedQuickRun has an adjusted value of 55
    const mine = wager.predictions.filter(p => p.participantId === wager.participants[0].id)
    expect(mine.map(p => p.probability.toString())).toEqual(['55', '45'])
    expect((window.history.state as { provenance: string }).provenance).toMatch(
      / from elicitation$/
    )
    // the run in the tab is left alone
    expect(loadRun()!.claim).toBe('The bridge opens')
  })
})

describe('ElicitPage FAQ', () => {
  const faqButton = () => screen.queryByRole('button', { name: 'How does this work?' })

  it("opens the tool's own questions from a button on the gate", async () => {
    render(<ElicitPage />)
    await userEvent.click(faqButton()!)
    expect(await screen.findByRole('button', { name: 'How does it work?' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Why a range and not one number?' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Brier/ })).not.toBeInTheDocument()
  })

  it('is not offered while the questions are being answered, and is again on the result', async () => {
    render(<ElicitPage />)
    await start()
    expect(faqButton()).not.toBeInTheDocument()
    await press('Stop here')
    expect(faqButton()).toBeInTheDocument()
  })

  it('opens at the question a #faq link names, and takes the link out when it is closed', async () => {
    window.history.replaceState(null, '', '/elicit#faq=why-log-odds')
    render(<ElicitPage />)
    const question = await screen.findByRole('button', {
      name: 'Why do the spinner chances jump in odd steps?',
    })
    expect(question).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(screen.getByRole('button', { name: /close help dialog/i }))
    expect(window.location.hash).toBe('')
  })

  it('ignores a #faq link for a question it does not have', () => {
    window.history.replaceState(null, '', '/elicit#faq=why-bet')
    render(<ElicitPage />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is offered on an invite or a shared result even if a run is in progress', () => {
    // an unfinished run in the tab: questions would show, but a share link has taken over
    const unfinished = { ...finishedQuickRun(), answers: [], stopped: false } as RunData
    saveRun(unfinished)
    window.history.replaceState(
      null,
      '',
      `/elicit${encodeInviteHash({ claim: 'X', criteria: '' })}`
    )
    const { unmount } = render(<ElicitPage />)
    expect(faqButton()).toBeInTheDocument()
    unmount()
    window.history.replaceState(null, '', `/elicit${encodeResultHash(finishedQuickRun())}`)
    render(<ElicitPage />)
    expect(faqButton()).toBeInTheDocument()
  })

  it('keeps a shared result when a #faq link is pasted on top of it', () => {
    window.history.replaceState(null, '', `/elicit${encodeResultHash(finishedQuickRun())}`)
    render(<ElicitPage />)
    act(() => {
      window.history.replaceState(
        null,
        '',
        `/elicit${encodeResultHash(finishedQuickRun())}&faq=why-a-band`
      )
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByText(/shared result/)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('expands the question a #faq link names while the dialog is already open', async () => {
    render(<ElicitPage />)
    await userEvent.click(faqButton()!)
    expect(
      await screen.findByRole('button', { name: 'Why a range and not one number?' })
    ).toHaveAttribute('aria-expanded', 'false')
    act(() => {
      window.history.replaceState(null, '', '/elicit#faq=why-a-band')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByRole('button', { name: 'Why a range and not one number?' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
  })
})
