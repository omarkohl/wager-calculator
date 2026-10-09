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
})
