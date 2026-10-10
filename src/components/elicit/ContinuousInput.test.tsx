import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ContinuousInput from './ContinuousInput'
import type { ContinuousRunData } from '../../storage/continuousRun'

const START: ContinuousRunData = {
  kind: 'continuous',
  claim: 'Noon temperature tomorrow',
  criteria: '',
  seed: 's1',
  unit: '',
  min: '',
  max: '',
  thresholds: [],
  phase: 'range',
  edges: [],
  percents: {},
  view: 'bars',
  curve: [],
}

function Harness({ initial = START, focusOnShow = false }) {
  const [run, setRun] = useState(initial)
  return (
    <ContinuousInput
      run={run}
      focusOnShow={focusOnShow}
      onChange={setRun}
      onStartAgain={() => {}}
    />
  )
}

type User = ReturnType<typeof userEvent.setup>
const type = async (user: User, name: string, text: string) => {
  const box = screen.getByRole('textbox', { name })
  await user.clear(box)
  await user.type(box, text)
}
async function range(user: User, min = '-10', max = '30') {
  await type(user, 'Plausible minimum', min)
  await type(user, 'Plausible maximum', max)
}
const draw = (user: User) =>
  user.click(screen.getByRole('button', { name: 'Draw the distribution' }))

beforeEach(() => sessionStorage.clear())

describe('ContinuousInput', () => {
  it('puts the cursor in the minimum on arrival when asked', () => {
    render(<Harness focusOnShow />)
    expect(screen.getByRole('textbox', { name: 'Plausible minimum' })).toHaveFocus()
  })

  it('asks for a usable range before drawing, and marks the field at fault', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await draw(user)
    expect(screen.getByRole('alert')).toHaveTextContent(/the plausible minimum as a number/)
    expect(screen.getByRole('textbox', { name: 'Plausible minimum' })).toBeInvalid()
    expect(screen.getByRole('textbox', { name: 'Plausible minimum' })).toHaveFocus()
    await range(user, '30', '-10')
    await draw(user)
    expect(screen.getByRole('alert')).toHaveTextContent(/maximum has to be above/)
    expect(screen.getByRole('textbox', { name: 'Plausible maximum' })).toHaveFocus()
    await user.type(screen.getByRole('textbox', { name: 'Plausible maximum' }), '1')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('adds thresholds in order, refusing repeats, non-numbers and values outside the range', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await range(user)
    const add = async (text: string) => {
      await type(user, 'Threshold', text)
      await user.click(screen.getByRole('button', { name: 'Add threshold' }))
    }
    await add('10')
    await add('0')
    expect(screen.getByRole('list', { name: 'Thresholds' }).textContent).toMatch(/0.*10/)
    await add('0')
    expect(screen.getByRole('alert')).toHaveTextContent(/already there/)
    await add('abc')
    expect(screen.getByRole('alert')).toHaveTextContent(/the threshold as a number/)
    await add('99')
    expect(screen.getByRole('alert')).toHaveTextContent(/between the minimum and the maximum/)
    await user.click(screen.getByRole('button', { name: 'Remove threshold 0' }))
    expect(screen.getByRole('textbox', { name: 'Threshold' })).toHaveFocus()
    expect(screen.getByRole('list', { name: 'Thresholds' })).not.toHaveTextContent(/^0/)
  })

  it('Enter in the threshold field adds it instead of drawing', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await range(user)
    await user.type(screen.getByRole('textbox', { name: 'Threshold' }), '5{Enter}')
    expect(screen.getByRole('list', { name: 'Thresholds' })).toHaveTextContent('5')
    expect(screen.queryByRole('heading', { name: 'Draw your distribution' })).toBeNull()
  })

  it('refuses a threshold left outside a range that was changed afterwards', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await range(user)
    await type(user, 'Threshold', '20')
    await user.click(screen.getByRole('button', { name: 'Add threshold' }))
    await type(user, 'Plausible maximum', '15')
    await draw(user)
    expect(screen.getByRole('alert')).toHaveTextContent(/outside the range/)
  })

  it('draws bars, with a bar per range, thresholds as edges, and a live total', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await range(user)
    await type(user, 'Unit (optional)', '°C')
    await type(user, 'Threshold', '0')
    await user.click(screen.getByRole('button', { name: 'Add threshold' }))
    await draw(user)
    expect(screen.getByRole('heading', { name: 'Draw your distribution' })).toHaveFocus()
    const bars = screen.getAllByRole('textbox', { name: /, percent$/ })
    expect(bars.length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText(/ 0 °C/, { selector: 'label' }).length).toBeGreaterThan(0)
    // nothing placed yet
    expect(screen.getByRole('status')).toHaveTextContent('100 points not yet placed')
    await user.type(bars[0], '40')
    await user.type(bars[1], '73')
    expect(screen.getByRole('status')).toHaveTextContent('13 points too many')
    expect(bars[0]).toBeValid()
  })

  it('normalizes the bars, keeping the cursor on the total, and allows empty and full bars', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await range(user)
    await draw(user)
    const bars = screen.getAllByRole('textbox', { name: /, percent$/ })
    await user.type(bars[0], '30')
    await user.type(bars[1], '10')
    await user.type(bars[2], '0')
    expect(screen.getByRole('status')).toHaveTextContent('60 points not yet placed')
    await user.click(screen.getByRole('button', { name: 'Normalize' }))
    expect(bars[0]).toHaveValue('75')
    expect(bars[1]).toHaveValue('25')
    expect(screen.getByRole('status')).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('add up to 100%')
    await user.clear(bars[0])
    await user.type(bars[0], '100')
    await user.clear(bars[1])
    expect(bars[0]).toBeValid()
    expect(screen.getByRole('status')).toHaveTextContent('add up to 100%')
  })

  it('flags a bar that is not a percentage and offers no Normalize meanwhile', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await range(user)
    await draw(user)
    const bars = screen.getAllByRole('textbox', { name: /, percent$/ })
    await user.type(bars[0], '30')
    await user.type(bars[1], 'x')
    expect(bars[1]).toBeInvalid()
    expect(screen.queryByRole('button', { name: 'Normalize' })).toBeNull()
  })

  it('refuses an ambiguous comma, and reads a leading or trailing point', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await type(user, 'Plausible minimum', '1,000')
    await type(user, 'Plausible maximum', '5000')
    await draw(user)
    expect(screen.getByRole('alert')).toHaveTextContent(/1000, not 1,000/)
    await type(user, 'Plausible minimum', '.5')
    await type(user, 'Plausible maximum', '10.')
    await draw(user)
    expect(screen.getByRole('heading', { name: 'Draw your distribution' })).toBeInTheDocument()
  })

  it('shows a fine threshold as typed, and gives every bar its own name', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await range(user, '0', '1000')
    await type(user, 'Threshold', '12.5')
    await user.click(screen.getByRole('button', { name: 'Add threshold' }))
    await draw(user)
    const names = screen.getAllByRole('textbox', { name: /, percent$/ }).map(b => b.id)
    const labels = screen.getAllByText(/, percent$/, { selector: 'label' }).map(l => l.textContent)
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels.join('|')).toContain('12.5')
    expect(names.length).toBe(labels.length)
  })

  it('does not announce the claim twice, and moves to it', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await range(user)
    await user.clear(screen.getByRole('textbox', { name: 'Claim' }))
    await draw(user)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.getByRole('textbox', { name: 'Claim' })).toHaveFocus()
  })

  it('announces the same problem again when it happens again', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await draw(user)
    const first = screen.getByRole('alert')
    await draw(user)
    expect(screen.getByRole('alert')).not.toBe(first)
  })

  it('keeps the bars when only the unit changed', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await range(user)
    await draw(user)
    await user.type(screen.getAllByRole('textbox', { name: /, percent$/ })[0], '30')
    await user.click(screen.getByRole('button', { name: 'Change the range' }))
    await type(user, 'Unit (optional)', 'C')
    await draw(user)
    expect(screen.getAllByRole('textbox', { name: /, percent$/ })[0]).toHaveValue('30')
  })

  it('goes back to the range, dropping the bars when the buckets change', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await range(user)
    await draw(user)
    await user.type(screen.getAllByRole('textbox', { name: /, percent$/ })[0], '30')
    await user.click(screen.getByRole('button', { name: 'Change the range' }))
    expect(screen.getByRole('textbox', { name: 'Plausible minimum' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Plausible minimum' })).toHaveValue('-10')
    await type(user, 'Plausible maximum', '100')
    await draw(user)
    expect(screen.getAllByRole('textbox', { name: /, percent$/ })[0]).toHaveValue('')
  })

  it('keeps the claim editable and required', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await range(user)
    await user.clear(screen.getByRole('textbox', { name: 'Claim' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/Write the claim/)
    await draw(user)
    expect(screen.getByRole('textbox', { name: 'Claim' })).toHaveFocus()
  })

  describe('curve view', () => {
    async function toCurve(user: User, threshold?: string) {
      await range(user)
      await type(user, 'Unit (optional)', '°C')
      if (threshold) {
        await type(user, 'Threshold', threshold)
        await user.click(screen.getByRole('button', { name: 'Add threshold' }))
      }
      await draw(user)
      await user.click(screen.getByRole('button', { name: 'Draw a curve instead' }))
    }
    const point = (name: RegExp) => screen.getByRole('textbox', { name })

    it('switches between bars and curve, with the cursor on the heading', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await toCurve(user)
      expect(screen.getByRole('heading', { name: 'Draw your distribution' })).toHaveFocus()
      expect(screen.queryByRole('list', { name: 'Bars' })).toBeNull()
      expect(screen.getByRole('list', { name: 'Curve points' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Use bars instead' }))
      expect(screen.getByRole('list', { name: 'Bars' })).toBeInTheDocument()
    })

    it('has a labelled field per point, spread over the range, in the unit', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await toCurve(user)
      const fields = screen.getAllByRole('textbox', { name: /^Relative likelihood at/ })
      expect(fields).toHaveLength(9)
      expect(fields[0]).toHaveAccessibleName('Relative likelihood at -10 °C')
      expect(fields[8]).toHaveAccessibleName('Relative likelihood at 30 °C')
      expect(screen.getByText(/Raise at least one point/)).toBeInTheDocument()
    })

    it('shows the chance per range live, adding up to 100%, with the thresholds as edges', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await toCurve(user, '0')
      const fields = screen.getAllByRole('textbox', { name: /^Relative likelihood at/ })
      for (const [i, h] of [
        [0, '10'],
        [1, '40'],
        [2, '80'],
        [3, '100'],
        [4, '80'],
        [5, '40'],
      ] as const) {
        await user.type(fields[i], h)
      }
      const list = screen.getByRole('list', { name: 'Chance per range' })
      const rows = Array.from(list.querySelectorAll('li'))
      expect(rows.length).toBeGreaterThanOrEqual(2)
      expect(list.textContent).toMatch(/0 °C/)
      const total = rows
        .map(li => Number(/([\d.]+)%$/.exec(li.textContent ?? '')?.[1] ?? NaN))
        .reduce((a, b) => a + b, 0)
      expect(Math.abs(total - 100)).toBeLessThan(1)
      // changing a point changes the percentages
      const before = list.textContent
      await user.clear(fields[3])
      await user.type(fields[3], '0')
      expect(screen.getByRole('list', { name: 'Chance per range' }).textContent).not.toBe(before)
    })

    it('flags a height that is not usable', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await toCurve(user)
      await user.type(point(/at 0 °C/), 'x')
      expect(point(/at 0 °C/)).toBeInvalid()
      expect(screen.getByText(/Some heights are not usable yet/)).toBeInTheDocument()
    })

    it('sets the nearest point from the pointer, also near the edges and in a box of another shape', async () => {
      const user = userEvent.setup()
      const { container } = render(<Harness />)
      await toCurve(user)
      const svg = container.querySelector('svg')!
      // 800 x 500: the drawing is scaled by 2 and centred vertically, 60 px above and below
      svg.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          width: 800,
          height: 500,
          right: 800,
          bottom: 500,
          x: 0,
          y: 0,
        }) as DOMRect
      // the left edge point (SVG x 28), halfway up the plot (SVG y 88)
      fireEvent.pointerDown(svg, { clientX: 56, clientY: 60 + 2 * 88, pointerId: 1 })
      fireEvent.pointerUp(svg, { pointerId: 1 })
      expect(point(/at -10 °C/)).toHaveValue('50')
      // the right edge point (SVG x 372), at the top of the plot
      fireEvent.pointerDown(svg, { clientX: 744, clientY: 60 + 2 * 16, pointerId: 1 })
      fireEvent.pointerUp(svg, { pointerId: 1 })
      expect(point(/at 30 °C/)).toHaveValue('100')
    })

    it('refuses a height written as a percentage', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await toCurve(user)
      await user.type(point(/at 0 °C/), '50%')
      expect(point(/at 0 °C/)).toBeInvalid()
    })

    it('labels the axes in the drawing and describes it in text', async () => {
      const user = userEvent.setup()
      const { container } = render(<Harness />)
      await toCurve(user)
      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
      expect(container.querySelector('svg')!.textContent).toMatch(/relative likelihood/)
      expect(container.querySelector('svg')!.textContent).toMatch(/-10 °C/)
      expect(screen.getByRole('figure')).toHaveTextContent(/not a percentage/)
    })

    it('carries the heights over to the new x positions when the range changes', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await toCurve(user)
      await user.type(point(/at 0 °C/), '40')
      await user.click(screen.getByRole('button', { name: 'Change the range' }))
      await type(user, 'Plausible maximum', '50')
      await draw(user)
      expect(screen.getAllByRole('textbox', { name: /^Relative likelihood at/ })[2]).toHaveValue(
        '40'
      )
    })
  })
})
