import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SetupGate from './SetupGate'
import ElicitPage from './ElicitPage'
import {
  getSavedElicitStake,
  loadRun,
  MAX_TEXT_LENGTH,
  saveElicitStake,
} from '../../storage/elicitation'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('SetupGate', () => {
  it('asks for the claim, a stake and the mode, and nothing about resolution criteria', () => {
    render(<SetupGate onStart={vi.fn()} />)
    expect(screen.getByRole('textbox', { name: 'Claim' })).toBeRequired()
    expect(screen.getByRole('textbox', { name: 'Amount' })).toBeRequired()
    expect(screen.getByRole('combobox', { name: 'Currency' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Quick/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Thorough/ })).not.toBeChecked()
    expect(screen.queryByText(/criteria/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('frames the stake as a reason to think, and never as an input to a calculation', () => {
    render(<SetupGate onStart={vi.fn()} />)
    expect(screen.getByText(/genuinely think before answering/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/calculat|payout|odds|wager/i)
  })

  it('offers currencies only, no fun stakes', () => {
    render(<SetupGate onStart={vi.fn()} />)
    const options = screen.getAllByRole('option').map(o => o.textContent)
    expect(options.some(o => /USD/.test(o ?? ''))).toBe(true)
    expect(options.some(o => /cookie|hug/i.test(o ?? ''))).toBe(false)
  })

  it('moves focus to the first field to fix after a failed start', async () => {
    render(<SetupGate onStart={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByRole('textbox', { name: 'Claim' })).toHaveFocus()

    await userEvent.type(screen.getByRole('textbox', { name: 'Claim' }), 'It rains')
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveFocus()
  })

  it('links the amount to the stake hint, and to its error when there is one', async () => {
    render(<SetupGate onStart={vi.fn()} />)
    const amount = screen.getByRole('textbox', { name: 'Amount' })
    expect(amount).toHaveAccessibleDescription(/genuinely think/)
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(amount).toHaveAccessibleDescription(/genuinely think.*amount above zero/)
  })

  it('refuses a claim longer than a run can store, with a message instead of truncating', async () => {
    const onStart = vi.fn()
    render(<SetupGate onStart={onStart} />)
    await userEvent.click(screen.getByRole('textbox', { name: 'Claim' }))
    await userEvent.paste('x'.repeat(MAX_TEXT_LENGTH + 1))
    await userEvent.type(screen.getByRole('textbox', { name: 'Amount' }), '10')
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(onStart).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/2000 characters/)

    await userEvent.clear(screen.getByRole('textbox', { name: 'Claim' }))
    await userEvent.click(screen.getByRole('textbox', { name: 'Claim' }))
    await userEvent.paste('x'.repeat(MAX_TEXT_LENGTH))
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('does not start without a claim, and says why', async () => {
    const onStart = vi.fn()
    render(<SetupGate onStart={onStart} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Amount' }), '10')
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(onStart).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/claim/i)
    expect(screen.getByRole('textbox', { name: 'Claim' })).toBeInvalid()
  })

  it.each(['', '0', '-5', 'ten', '1.234', '1,5'])(
    'does not start with the amount "%s"',
    async amount => {
      const onStart = vi.fn()
      render(<SetupGate onStart={onStart} />)
      await userEvent.type(screen.getByRole('textbox', { name: 'Claim' }), 'It rains')
      if (amount) await userEvent.type(screen.getByRole('textbox', { name: 'Amount' }), amount)
      await userEvent.click(screen.getByRole('button', { name: 'Start' }))
      expect(onStart).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent(/amount/i)
      expect(screen.getByRole('textbox', { name: 'Amount' })).toBeInvalid()
    }
  )

  it('starts with the trimmed claim, the stake and the chosen mode, and remembers the stake', async () => {
    const onStart = vi.fn()
    render(<SetupGate onStart={onStart} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Claim' }), '  It rains tomorrow  ')
    await userEvent.type(screen.getByRole('textbox', { name: 'Amount' }), '25')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Currency' }), 'eur')
    await userEvent.click(screen.getByRole('radio', { name: /Thorough/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(onStart).toHaveBeenCalledWith({
      claim: 'It rains tomorrow',
      stake: { amount: '25', currency: 'eur' },
      kind: 'yes-no',
      mode: 'thorough',
    })
    expect(getSavedElicitStake()).toEqual({ amount: '25', currency: 'eur' })
  })

  it('fills in the remembered stake', () => {
    saveElicitStake({ amount: '40', currency: 'gbp' })
    render(<SetupGate onStart={vi.fn()} />)
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('40')
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveValue('gbp')
  })
})

describe('ElicitPage', () => {
  it('stores the started run in sessionStorage with a fresh seed (the reload itself is in the E2E spec)', async () => {
    render(<ElicitPage />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Claim' }), 'It rains')
    await userEvent.type(screen.getByRole('textbox', { name: 'Amount' }), '10')
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))

    const run = loadRun()!
    expect(run).toMatchObject({ claim: 'It rains', mode: 'quick', criteria: '', answers: [] })
    expect(run.seed).toMatch(/^[A-Za-z0-9]{16}$/)
    expect(localStorage.getItem('howsure.run')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument()
  })

  describe('kind of claim', () => {
    it('offers yes/no (default), several outcomes, and a number', () => {
      render(<SetupGate onStart={vi.fn()} />)
      expect(screen.getByRole('radio', { name: /Yes or no/ })).toBeChecked()
      expect(screen.getByRole('radio', { name: /One of several outcomes/ })).not.toBeChecked()
      expect(screen.getByRole('radio', { name: /A number/ })).toBeEnabled()
    })

    it('hides the mode for several outcomes and reports the kind', async () => {
      const user = userEvent.setup()
      const onStart = vi.fn()
      render(<SetupGate onStart={onStart} />)
      await user.click(screen.getByRole('radio', { name: /One of several outcomes/ }))
      expect(screen.queryByRole('radio', { name: /Quick/ })).toBeNull()
      await user.type(screen.getByRole('textbox', { name: 'Claim' }), 'Who wins?')
      await user.type(screen.getByRole('textbox', { name: 'Amount' }), '5')
      await user.click(screen.getByRole('button', { name: 'Start' }))
      expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ kind: 'categorical' }))
    })

    it('does not offer the kind when opened from an invite, and starts a yes/no run', async () => {
      const user = userEvent.setup()
      const onStart = vi.fn()
      render(<SetupGate onStart={onStart} invite={{ claim: 'It rains', criteria: '' }} />)
      expect(screen.queryByRole('radio', { name: /One of several outcomes/ })).toBeNull()
      await user.type(screen.getByRole('textbox', { name: 'Amount' }), '5')
      await user.click(screen.getByRole('button', { name: 'Start' }))
      expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ kind: 'yes-no' }))
    })

    it('shows the outcomes an invite fixes, locks the claim, and starts that kind', async () => {
      const user = userEvent.setup()
      const onStart = vi.fn()
      render(
        <SetupGate
          onStart={onStart}
          invite={{
            claim: 'Who wins?',
            criteria: '',
            shape: { kind: 'categorical', outcomes: ['Alice', 'Bob'] },
          }}
        />
      )
      const list = screen.getByRole('list', { name: 'Outcomes from the invite' })
      expect(
        within(list)
          .getAllByRole('listitem')
          .map(li => li.textContent)
      ).toEqual(['Alice', 'Bob'])
      expect(screen.getByRole('textbox', { name: 'Claim' })).toHaveAttribute('readonly')
      expect(screen.queryByRole('radio', { name: /One of several outcomes/ })).toBeNull()
      expect(screen.queryByRole('radio', { name: /Quick/ })).toBeNull()
      await user.type(screen.getByRole('textbox', { name: 'Amount' }), '5')
      await user.click(screen.getByRole('button', { name: 'Start' }))
      expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ kind: 'categorical' }))
    })

    it('names the parts of the range an invite fixes', () => {
      render(
        <SetupGate
          onStart={vi.fn()}
          invite={{
            claim: 'Noon temperature',
            criteria: '',
            shape: {
              kind: 'continuous',
              unit: '°C',
              min: '-10',
              max: '30',
              thresholds: ['0'],
              edges: ['0', '10'],
            },
          }}
        />
      )
      const list = screen.getByRole('list', { name: 'Outcomes from the invite' })
      expect(
        within(list)
          .getAllByRole('listitem')
          .map(li => li.textContent)
      ).toEqual(['below 0 °C', '0 to 10 °C', '10 °C or more'])
    })
  })
})
