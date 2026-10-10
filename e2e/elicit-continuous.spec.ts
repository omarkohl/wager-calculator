import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Number claims: range and bars', () => {
  test('sets a range with a threshold, draws bars with a live total, normalizes, survives a reload', async ({
    page,
  }) => {
    await page.goto('/elicit')
    await page.getByRole('radio', { name: /A number/ }).check()
    await expect(page.getByRole('radio', { name: /Quick/ })).toHaveCount(0)
    await page.getByRole('textbox', { name: 'Claim' }).fill('Noon temperature tomorrow')
    await page.getByRole('textbox', { name: 'Amount' }).fill('10')
    await page.getByRole('button', { name: 'Start' }).click()

    await expect(page.getByRole('textbox', { name: 'Plausible minimum' })).toBeFocused()
    // a missing range is announced
    await page.getByRole('button', { name: 'Draw the distribution' }).click()
    await expect(page.getByRole('alert')).toContainText('minimum as a number')

    await page.getByRole('textbox', { name: 'Plausible minimum' }).fill('-10')
    await page.getByRole('textbox', { name: 'Plausible maximum' }).fill('30')
    await page.getByRole('textbox', { name: 'Unit (optional)' }).fill('°C')
    await page.getByRole('textbox', { name: 'Threshold' }).fill('0')
    await page.getByRole('button', { name: 'Add threshold' }).click()
    await expect(page.getByRole('list', { name: 'Thresholds' })).toContainText('0 °C')
    const rangeResults = await new AxeBuilder({ page }).analyze()
    expect(rangeResults.violations).toEqual([])

    await page.getByRole('button', { name: 'Draw the distribution' }).click()
    await expect(page.getByRole('heading', { name: 'Draw your distribution' })).toBeFocused()
    const bars = page.getByRole('textbox', { name: /, percent$/ })
    const total = page.getByRole('status').filter({ hasText: /points|100%/ })
    await expect(total).toContainText('100 points not yet placed')
    await bars.nth(0).fill('40')
    await bars.nth(1).fill('73')
    await expect(total).toContainText('13 points too many')
    const barResults = await new AxeBuilder({ page }).analyze()
    expect(barResults.violations).toEqual([])

    await page.reload()
    await expect(bars.nth(1)).toHaveValue('73')
    await page.getByRole('button', { name: 'Normalize' }).click()
    await expect(total).toContainText('add up to 100%')
    await expect(total).toBeFocused()
    await expect(bars.nth(0)).toHaveValue('35.4')
  })

  test('draws a curve: a height per point by keyboard or by dragging, with the chance per range live', async ({
    page,
  }) => {
    await page.goto('/elicit')
    await page.getByRole('radio', { name: /A number/ }).check()
    await page.getByRole('textbox', { name: 'Claim' }).fill('Noon temperature tomorrow')
    await page.getByRole('textbox', { name: 'Amount' }).fill('10')
    await page.getByRole('button', { name: 'Start' }).click()
    await page.getByRole('textbox', { name: 'Plausible minimum' }).fill('-10')
    await page.getByRole('textbox', { name: 'Plausible maximum' }).fill('30')
    await page.getByRole('textbox', { name: 'Unit (optional)' }).fill('°C')
    await page.getByRole('textbox', { name: 'Threshold' }).fill('0')
    await page.getByRole('button', { name: 'Add threshold' }).click()
    await page.getByRole('button', { name: 'Draw the distribution' }).click()
    await page.getByRole('button', { name: 'Draw a curve instead' }).click()
    await expect(page.getByRole('heading', { name: 'Draw your distribution' })).toBeFocused()
    await expect(page.getByText('Raise at least one point')).toBeVisible()

    // by keyboard: a height per point
    const points = page.getByRole('textbox', { name: /^Relative likelihood at/ })
    await expect(points).toHaveCount(9)
    for (const [i, h] of ['5', '20', '60', '100', '70', '30', '10', '0', '0'].entries()) {
      await points.nth(i).fill(h)
    }
    const chances = page.getByRole('list', { name: 'Chance per range' })
    await expect(chances.getByRole('listitem').first()).toContainText('%')
    await expect(chances).toContainText('0 °C')
    const before = await chances.textContent()

    // by pointer: pressing on the drawing sets the nearest point. The click is relative to the
    // figure (which Playwright scrolls into view first: the page is taller than the window), at
    // the points' own positions from the drawing's layout (400 x 190 units, the end points 28
    // units in from the sides, the plot between 16 and 160 units down), at any width
    const figure = page.getByRole('figure')
    const unit = (await figure.boundingBox())!.width / 400
    await figure.click({ position: { x: 200 * unit, y: 20 * unit } })
    await expect(points.nth(4)).not.toHaveValue('70')
    await expect(chances).not.toHaveText(before!)
    await figure.click({ position: { x: 28 * unit, y: 60 * unit } })
    await expect(points.nth(0)).not.toHaveValue('5')
    await figure.click({ position: { x: 372 * unit, y: 60 * unit } })
    await expect(points.nth(8)).not.toHaveValue('0')

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])

    await page.reload()
    await expect(points.nth(3)).toHaveValue('100')
    await page.getByRole('button', { name: 'Use bars instead' }).click()
    await expect(page.getByRole('list', { name: 'Bars' })).toBeVisible()
  })

  test('asks the questions on the buckets of the bars, resumes after a reload, ends with where the answers stand', async ({
    page,
  }) => {
    await page.goto('/elicit')
    await page.getByRole('radio', { name: /A number/ }).check()
    await page.getByRole('textbox', { name: 'Claim' }).fill('Noon temperature tomorrow')
    await page.getByRole('textbox', { name: 'Amount' }).fill('10')
    await page.getByRole('button', { name: 'Start' }).click()
    await page.getByRole('textbox', { name: 'Plausible minimum' }).fill('-10')
    await page.getByRole('textbox', { name: 'Plausible maximum' }).fill('30')
    await page.getByRole('textbox', { name: 'Unit (optional)' }).fill('°C')
    await page.getByRole('textbox', { name: 'Threshold' }).fill('0')
    await page.getByRole('button', { name: 'Add threshold' }).click()
    await page.getByRole('button', { name: 'Draw the distribution' }).click()
    await expect(page.getByRole('button', { name: 'Start the questions' })).toBeDisabled()
    const bars = page.getByRole('textbox', { name: /, percent$/ })
    for (const [i, v] of ['5', '10', '25', '30', '20', '10'].entries()) await bars.nth(i).fill(v)
    await page.getByRole('button', { name: 'Start the questions' }).click()

    await expect(page.getByRole('heading', { level: 2 }).first()).toBeFocused()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])

    const spinner = page.getByRole('button', { name: /if the spinner lands/ })
    const equal = page.getByRole('button', { name: 'About equally likely' })
    const standing = page.getByRole('heading', { name: 'Where your answers stand' })
    const answerOne = async () => {
      await spinner.or(equal).or(standing).first().waitFor()
      if (await standing.isVisible()) return false
      await spinner.or(equal).first().click()
      return true
    }
    await answerOne()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Stop here' })).toBeVisible()
    for (let i = 0; i < 45 && (await answerOne()); i++);
    await expect(standing).toBeFocused()
    const list = page.getByRole('list', { name: 'Where your answers stand' })
    await expect(list).toContainText('0 °C')
    await expect(list).toContainText('%')
  })
})
