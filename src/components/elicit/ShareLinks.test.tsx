import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShareLinks from './ShareLinks'

const invite = () => 'https://example.org/elicit#ev=1&t=i&c=It+rains'
const result = () => 'https://example.org/elicit#ev=1&t=r&c=It+rains&m=q'

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard')
})

describe('ShareLinks', () => {
  it('offers both links and says what is in them', () => {
    render(<ShareLinks invite={invite} result={result} />)
    expect(screen.getByRole('button', { name: 'Copy invite link' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy result link' })).toBeInTheDocument()
    expect(screen.getByText(/Both links contain the claim itself/)).toBeInTheDocument()
  })

  it('copies the invite, says so, and shows the link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
    render(<ShareLinks invite={invite} result={result} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy invite link' }))
    expect(writeText).toHaveBeenCalledWith(invite())
    expect(screen.getByRole('status')).toHaveTextContent('Invite link copied')
    expect(screen.getByRole('textbox', { name: 'Invite link' })).toHaveValue(invite())
  })

  it('copies the result link the same way', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
    render(<ShareLinks invite={invite} result={result} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy result link' }))
    expect(writeText).toHaveBeenCalledWith(result())
    expect(screen.getByRole('status')).toHaveTextContent('Result link copied')
    expect(screen.getByRole('textbox', { name: 'Result link' })).toHaveValue(result())
  })

  it('falls back to showing the link when the browser refuses', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')))
    render(<ShareLinks invite={invite} result={result} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy invite link' }))
    expect(screen.getByRole('status')).toHaveTextContent(/Could not copy automatically/)
    expect(screen.getByRole('textbox', { name: 'Invite link' })).toHaveValue(invite())
  })

  it('still shows the link where there is no clipboard at all', async () => {
    render(<ShareLinks invite={invite} result={result} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy invite link' }))
    expect(screen.getByRole('status')).toHaveTextContent(/Could not copy automatically/)
    expect(screen.getByRole('textbox', { name: 'Invite link' })).toBeInTheDocument()
  })

  it('builds the link only once a button is pressed', async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined))
    const build = vi.fn(invite)
    render(<ShareLinks invite={build} result={result} />)
    expect(build).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Copy invite link' }))
    expect(build).toHaveBeenCalled()
  })

  it('shows the current link, and says so when the result changed after copying', async () => {
    stubClipboard(vi.fn().mockResolvedValue(undefined))
    const { rerender } = render(<ShareLinks invite={invite} result={result} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy result link' }))
    expect(screen.getByRole('status')).toHaveTextContent('Result link copied')
    const changed = () => 'https://example.org/elicit#ev=1&t=r&c=It+rains&m=q&adj=61'
    rerender(<ShareLinks invite={invite} result={changed} />)
    expect(screen.getByRole('textbox', { name: 'Result link' })).toHaveValue(changed())
    expect(screen.getByRole('status')).toHaveTextContent(/changed since you copied/)
    await userEvent.click(screen.getByRole('button', { name: 'Copy result link' }))
    expect(screen.getByRole('status')).toHaveTextContent('Result link copied')
  })

  it('clears the status while copying, so pressing again is announced again', async () => {
    let release: () => void = () => {}
    stubClipboard(() => new Promise<void>(resolve => (release = resolve)))
    render(<ShareLinks invite={invite} result={result} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy invite link' }))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    release()
    expect(await screen.findByText('Invite link copied')).toBeInTheDocument()
    stubClipboard(() => new Promise<void>(resolve => (release = resolve)))
    await userEvent.click(screen.getByRole('button', { name: 'Copy invite link' }))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    release()
    expect(await screen.findByText('Invite link copied')).toBeInTheDocument()
  })
})
