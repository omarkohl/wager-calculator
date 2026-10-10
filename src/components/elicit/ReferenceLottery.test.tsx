import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReferenceLottery from './ReferenceLottery'

describe('ReferenceLottery', () => {
  it('names the probability and shows it small and muted, in the middle range', () => {
    const { container } = render(<ReferenceLottery probability={0.45} />)
    expect(
      screen.getByRole('img', { name: 'A spinner with a shaded wedge that wins 45% of the time' })
    ).toBeInTheDocument()
    // on screen too, but not as a headline: small and muted
    expect(container.textContent).toBe('45%')
    expect(screen.getByText('45%')).toHaveClass('text-xs', 'text-gray-600')
  })

  it('names the probability and shows the count and the chance small and muted, in the tails', () => {
    const { container } = render(<ReferenceLottery probability={0.03} />)
    expect(
      screen.getByRole('img', {
        name: 'One ball is drawn at random from 3 winning balls out of 100: it wins 3% of the time',
      })
    ).toBeInTheDocument()
    expect(container.textContent).toContain('3 winning balls out of 100 (3%)')
    expect(container.textContent).toContain('3 winning balls out of 100')
  })

  it('states the losing count in the upper tail', () => {
    const { container } = render(<ReferenceLottery probability={0.97} />)
    expect(
      screen.getByRole('img', {
        name: 'One ball is drawn at random from 97 winning balls and 3 losing balls out of 100: it wins 97% of the time',
      })
    ).toBeInTheDocument()
    expect(container.textContent).toContain('3 losing balls')
  })

  it('names the snapped chance for an off-grid chance, and shows its count', () => {
    const { container } = render(<ReferenceLottery probability={0.0004} />)
    expect(
      screen.getByRole('img', {
        name: /One ball is drawn at random from 1 winning ball out of 1000: it wins 0.1%/,
      })
    ).toBeInTheDocument()
    expect(container.textContent).toContain('1 winning ball out of 1000 (0.1%)')
  })

  it('hides the drawing from assistive technology (the name says it all)', () => {
    const { container } = render(<ReferenceLottery probability={0.5} />)
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    }
  })
})
