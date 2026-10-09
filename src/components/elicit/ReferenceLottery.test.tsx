import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReferenceLottery from './ReferenceLottery'

describe('ReferenceLottery', () => {
  it('names the probability and shows the number, in the middle range', () => {
    const { container } = render(<ReferenceLottery probability={0.45} />)
    expect(
      screen.getByRole('img', { name: 'A spinner with a shaded wedge that wins 45% of the time' })
    ).toBeInTheDocument()
    expect(container.textContent).toContain('45%')
  })

  it('names the count and shows the number in the tails', () => {
    const { container } = render(<ReferenceLottery probability={0.03} />)
    expect(
      screen.getByRole('img', { name: '3 winning balls out of 100, 3% of the time' })
    ).toBeInTheDocument()
    expect(container.textContent).toContain('3%')
    expect(container.textContent).toContain('3 winning balls out of 100')
  })

  it('states the losing count in the upper tail', () => {
    const { container } = render(<ReferenceLottery probability={0.97} />)
    expect(
      screen.getByRole('img', {
        name: '97 winning balls and 3 losing balls out of 100, 97% of the time',
      })
    ).toBeInTheDocument()
    expect(container.textContent).toContain('3 losing balls')
  })

  it('shows the snapped number for an off-grid chance, as in its name', () => {
    const { container } = render(<ReferenceLottery probability={0.0004} />)
    expect(
      screen.getByRole('img', { name: /1 winning ball out of 1000, 0.1%/ })
    ).toBeInTheDocument()
    expect(container.textContent).toContain('0.1%')
  })

  it('hides the drawing from assistive technology (the name says it all)', () => {
    const { container } = render(<ReferenceLottery probability={0.5} />)
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    }
  })
})
