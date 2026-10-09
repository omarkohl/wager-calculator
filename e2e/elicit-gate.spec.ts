import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Elicitation setup gate', () => {
  test('is not linked from the navigation or the landing page yet', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /sure|elicit/i })).toHaveCount(0)
    await page.goto('/elicit')
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /sure|elicit/i })
    ).toHaveCount(0)
  })

  test('asks for claim, stake and mode, validates, then starts a run that survives a reload', async ({
    page,
  }) => {
    await page.goto('/elicit')
    await expect(page.getByRole('heading', { level: 1, name: 'How sure are you?' })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Quick/ })).toBeChecked()

    // empty form: nothing starts, both problems are announced
    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page.getByRole('alert')).toHaveCount(2)
    await expect(page.getByRole('textbox', { name: 'Claim' })).toHaveAttribute(
      'aria-invalid',
      'true'
    )

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])

    await page.getByRole('textbox', { name: 'Claim' }).fill('It rains in Berlin tomorrow')
    await page.getByRole('textbox', { name: 'Amount' }).fill('20')
    await page.getByRole('combobox', { name: 'Currency' }).selectOption({ label: 'EUR (€)' })
    await page.getByRole('radio', { name: /Thorough/ }).check()
    await page.getByRole('button', { name: 'Start' }).click()

    await expect(page.getByText(/thorough run on/)).toBeVisible()
    // the claim is not in the address bar
    expect(page.url()).not.toContain('Berlin')
    expect(page.url()).not.toContain('#')

    await page.reload()
    await expect(page.getByText(/It rains in Berlin tomorrow/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(0)
  })

  test('remembers the stake for the next run', async ({ page }) => {
    await page.goto('/elicit')
    await page.getByRole('textbox', { name: 'Claim' }).fill('First claim')
    await page.getByRole('textbox', { name: 'Amount' }).fill('15')
    await page.getByRole('combobox', { name: 'Currency' }).selectOption({ label: 'GBP (£)' })
    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page.getByText(/First claim/)).toBeVisible()

    // a new run: the tab's run is gone, the stake preference stays
    await page.evaluate(() => sessionStorage.clear())
    await page.goto('/elicit')
    await expect(page.getByRole('textbox', { name: 'Amount' })).toHaveValue('15')
    await expect(page.getByRole('combobox', { name: 'Currency' })).toHaveValue('gbp')
    await expect(page.getByRole('textbox', { name: 'Claim' })).toHaveValue('')
  })
  // Step 11b moves this into the question-screen spec, where the lottery belongs.
  test('shows the reference lottery with its number and an accessible name, and passes axe', async ({
    page,
  }) => {
    await page.goto('/elicit')
    await page.getByRole('textbox', { name: 'Claim' }).fill('The bridge opens on time')
    await page.getByRole('textbox', { name: 'Amount' }).fill('10')
    await page.getByRole('button', { name: 'Start' }).click()

    const lottery = page.getByRole('img', {
      name: /spinner with a shaded wedge that wins \d+% of the time/,
    })
    await expect(lottery).toBeVisible()
    const name = (await lottery.getAttribute('aria-label'))!
    const chance = /wins (\d+%) of the time/.exec(name)![1]
    // the number is on screen too, not only in the name
    await expect(page.getByText(chance, { exact: true })).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
