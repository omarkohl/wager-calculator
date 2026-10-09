import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Several outcomes: discovery', () => {
  test('collects outcomes into tiers, offers "Everything else", shows the first sketch', async ({
    page,
  }) => {
    await page.goto('/elicit')
    await expect(page.getByRole('radio', { name: /A number/ })).toBeDisabled()
    await page.getByRole('radio', { name: /One of several outcomes/ }).check()
    await expect(page.getByRole('radio', { name: /Quick/ })).toHaveCount(0)
    await page.getByRole('textbox', { name: 'Claim' }).fill('Who wins the vote?')
    await page.getByRole('textbox', { name: 'Amount' }).fill('10')
    await page.getByRole('button', { name: 'Start' }).click()

    await expect(page.getByRole('heading', { name: 'What is the first outcome?' })).toBeVisible()
    const outcome = page.getByRole('textbox', { name: 'Outcome' })

    const addOne = async (label: string, tier: string) => {
      await outcome.fill(label)
      await page.getByRole('radio', { name: tier, exact: true }).check()
      await page.getByRole('button', { name: 'Add outcome' }).click()
    }
    await addOne('Alice', 'likely')
    await expect(page.getByRole('heading', { name: 'Is there another outcome?' })).toBeVisible()
    await expect(outcome).toBeFocused()
    await addOne('Bob', 'very unlikely')
    await addOne('Carol', 'very unlikely')

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])

    await page.getByRole('button', { name: 'Add “Everything else”' }).click()
    const list = page.getByRole('list', { name: 'Outcomes so far' })
    await expect(list.getByRole('listitem')).toHaveCount(4)

    // the claim stays editable, and the list survives a reload
    await page.getByRole('textbox', { name: 'Claim' }).fill('Who wins the final vote?')
    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Claim' })).toHaveValue(
      'Who wins the final vote?'
    )
    await expect(list.getByRole('listitem')).toHaveCount(4)

    await page.getByRole('button', { name: 'That is all the outcomes' }).click()
    await expect(page.getByRole('heading', { name: 'First sketch' })).toBeVisible()
    const sketch = page.getByRole('list', { name: 'First sketch' })
    await expect(sketch.getByRole('listitem')).toHaveCount(4)
    await expect(sketch.getByRole('listitem').filter({ hasText: 'Alice' })).toContainText('%')
    const sketchResults = await new AxeBuilder({ page }).analyze()
    expect(sketchResults.violations).toEqual([])

    await page.getByRole('button', { name: 'Start again' }).click()
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
  })

  test('numbers instead of tiers: live total, Normalize, and a reload keeps them', async ({
    page,
  }) => {
    await page.goto('/elicit')
    await page.getByRole('radio', { name: /One of several outcomes/ }).check()
    await page.getByRole('textbox', { name: 'Claim' }).fill('Who wins the vote?')
    await page.getByRole('textbox', { name: 'Amount' }).fill('10')
    await page.getByRole('button', { name: 'Start' }).click()
    await page.getByRole('button', { name: 'Use numbers instead of tiers' }).click()

    const addOne = async (label: string, percent: string) => {
      await page.getByRole('textbox', { name: 'Outcome' }).fill(label)
      await page.getByRole('textbox', { name: 'Percent' }).fill(percent)
      await page.getByRole('button', { name: 'Add outcome' }).click()
    }
    await addOne('Alice', '70')
    await addOne('Bob', '42')
    await page.getByRole('button', { name: 'That is all the outcomes' }).click()

    await expect(page.getByRole('heading', { name: 'Your numbers' })).toBeFocused()
    await expect(page.getByRole('status').filter({ hasText: /points|100%/ })).toContainText(
      '12 points too many'
    )
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])

    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Alice, percent' })).toHaveValue('70')
    await page.getByRole('button', { name: 'Normalize' }).click()
    await expect(page.getByRole('status').filter({ hasText: /points|100%/ })).toContainText(
      'add up to 100%'
    )
    await expect(page.getByRole('textbox', { name: 'Bob, percent' })).toHaveValue('37.5')
  })
})
