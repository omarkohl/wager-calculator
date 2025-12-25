import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HelpModal from './HelpSection'

describe('HelpModal', () => {
  it('does not render when closed', () => {
    const onClose = vi.fn()
    render(<HelpModal isOpen={false} onClose={onClose} />)
    expect(screen.queryByText('How Wager Works')).not.toBeInTheDocument()
  })

  it('renders when open', async () => {
    const onClose = vi.fn()
    render(<HelpModal isOpen={true} onClose={onClose} />)
    expect(await screen.findByText('How Wager Works')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<HelpModal isOpen={true} onClose={onClose} />)

    const closeButton = screen.getByRole('button', { name: /close help dialog/i })
    await user.click(closeButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('displays FAQ disclosure buttons', async () => {
    const onClose = vi.fn()
    render(<HelpModal isOpen={true} onClose={onClose} />)
    expect(
      await screen.findByRole('button', { name: /Why use Brier scoring?/i })
    ).toBeInTheDocument()
  })

  it('expands disclosure content when clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<HelpModal isOpen={true} onClose={onClose} />)

    const brierButton = screen.getByRole('button', { name: /Why use Brier scoring?/i })

    // Content should not be visible initially
    expect(screen.queryByText(/proper scoring rule/i)).not.toBeInTheDocument()

    await user.click(brierButton)

    // Content should be visible after clicking
    expect(screen.getByText(/proper scoring rule/i)).toBeInTheDocument()
  })

  it('collapses disclosure content when clicked again', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<HelpModal isOpen={true} onClose={onClose} />)

    const brierButton = screen.getByRole('button', { name: /Why use Brier scoring?/i })

    await user.click(brierButton)
    expect(screen.getByText(/proper scoring rule/i)).toBeInTheDocument()

    await user.click(brierButton)
    expect(screen.queryByText(/proper scoring rule/i)).not.toBeInTheDocument()
  })
})
