import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Site from './Site'
import { encodeWagerToHash } from './storage/urlHash'
import { createDefaultWager } from './domain/defaults'

function visit(url: string) {
  window.history.replaceState(null, '', url)
}

describe('Site routing', () => {
  beforeEach(() => {
    window.localStorage.clear()
    visit('/')
  })

  it('shows a landing page with a link to the wager calculator', () => {
    render(<Site />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /wager calculator/i })
    expect(link).toHaveAttribute('href', '/wager')
  })

  it('does not link the elicitation tool yet', () => {
    render(<Site />)
    expect(screen.queryByRole('link', { name: /elicit/i })).not.toBeInTheDocument()
  })

  it('follows the link without a reload', async () => {
    render(<Site />)
    await userEvent.click(screen.getByRole('link', { name: /wager calculator/i }))
    expect(window.location.pathname).toBe('/wager')
    expect(screen.getByRole('heading', { name: /^Claim/, level: 2 })).toBeVisible()
  })

  it('renders the calculator at /wager', () => {
    visit('/wager')
    render(<Site />)
    expect(screen.getByRole('heading', { name: /^Predictions/, level: 2 })).toBeVisible()
  })

  it('opens a legacy link at / as the same wager at /wager, keeping the hash', () => {
    const wager = { ...createDefaultWager(), claim: 'It rains tomorrow' }
    const hash = encodeWagerToHash(wager)
    visit(`/${hash}`)
    render(<Site />)
    expect(window.location.pathname).toBe('/wager')
    expect(window.location.hash).toBe(hash)
    expect(screen.getByText('It rains tomorrow')).toBeInTheDocument()
  })

  it('shows a not-found message with a link home for unknown paths', async () => {
    visit('/nope')
    render(<Site />)
    expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: /home/i }))
    expect(window.location.pathname).toBe('/')
    expect(screen.getByRole('link', { name: /wager calculator/i })).toBeInTheDocument()
  })

  it('follows the back button', async () => {
    render(<Site />)
    await userEvent.click(screen.getByRole('link', { name: /wager calculator/i }))
    window.history.back()
    expect(await screen.findByRole('link', { name: /wager calculator/i })).toBeInTheDocument()
  })
})
