import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
    const link = within(screen.getByRole('main')).getByRole('link', { name: /wager calculator/i })
    expect(link).toHaveAttribute('href', '/wager')
  })

  it('links the elicitation tool from the landing page', () => {
    render(<Site />)
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: 'How sure are you?' })
    ).toHaveAttribute('href', '/elicit')
  })

  it('follows the link without a reload', async () => {
    render(<Site />)
    await userEvent.click(
      within(screen.getByRole('main')).getByRole('link', { name: /wager calculator/i })
    )
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
    await userEvent.click(within(screen.getByRole('main')).getByRole('link', { name: /home/i }))
    expect(window.location.pathname).toBe('/')
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: /wager calculator/i })
    ).toBeInTheDocument()
  })

  it('follows the back button', async () => {
    render(<Site />)
    await userEvent.click(
      within(screen.getByRole('main')).getByRole('link', { name: /wager calculator/i })
    )
    window.history.back()
    expect(
      await within(await screen.findByRole('main')).findByRole('link', {
        name: /wager calculator/i,
      })
    ).toBeInTheDocument()
  })

  describe('shared shell', () => {
    it.each([
      ['/', 'landing'],
      ['/wager', 'wager'],
      ['/elicit', 'elicit'],
      ['/nope', 'not found'],
    ])('has a header with navigation, one main region and the footer at %s', url => {
      visit(url)
      render(<Site />)
      expect(screen.getByRole('banner')).toBeInTheDocument()
      const nav = screen.getByRole('navigation', { name: 'Main' })
      expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
      expect(within(nav).getByRole('link', { name: /wager calculator/i })).toHaveAttribute(
        'href',
        '/wager'
      )
      expect(within(nav).getByRole('link', { name: 'How sure are you?' })).toHaveAttribute(
        'href',
        '/elicit'
      )
      expect(screen.getAllByRole('main')).toHaveLength(1)
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    })

    it('marks the current page in the navigation', () => {
      visit('/wager')
      render(<Site />)
      const nav = screen.getByRole('navigation', { name: 'Main' })
      expect(within(nav).getByRole('link', { name: /wager calculator/i })).toHaveAttribute(
        'aria-current',
        'page'
      )
      expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
    })

    it('keeps the wager when the current page is clicked in the navigation', async () => {
      const hash = encodeWagerToHash({ ...createDefaultWager(), claim: 'Keep me' })
      visit(`/wager${hash}`)
      render(<Site />)
      const entries = window.history.length
      await userEvent.click(
        within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', {
          name: /wager calculator/i,
        })
      )
      expect(window.location.pathname).toBe('/wager')
      expect(window.location.hash).toBe(hash)
      expect(window.history.length).toBe(entries)
      expect(screen.getByText('Keep me')).toBeInTheDocument()
    })

    it('sets the document title per route', async () => {
      visit('/nope')
      render(<Site />)
      expect(document.title).toBe('Page not found – Wager Calculator')
      await userEvent.click(within(screen.getByRole('main')).getByRole('link', { name: /home/i }))
      expect(document.title).toBe('Home – Wager Calculator')
    })

    it('does not move focus or announce anything on the first render', () => {
      render(<Site />)
      expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus()
      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    })

    it('moves focus to the page heading and announces the page after navigating', async () => {
      render(<Site />)
      await userEvent.click(
        within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', {
          name: /wager calculator/i,
        })
      )
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveFocus()
      expect(screen.getByRole('status')).toHaveTextContent('Wager Calculator')
    })
  })
})
