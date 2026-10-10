import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function reachSketch(page: Page) {
  await page.goto('/elicit')
  await page.getByRole('radio', { name: /One of several outcomes/ }).check()
  await page.getByRole('textbox', { name: 'Claim' }).fill('What is the weather tomorrow?')
  await page.getByRole('textbox', { name: 'Amount' }).fill('20')
  await page.getByRole('button', { name: 'Start' }).click()
  for (const [label, tier] of [
    ['Rain', 'likely'],
    ['Cloud', 'plausible'],
    ['Snow', 'very unlikely'],
  ]) {
    await page.getByRole('textbox', { name: 'Outcome' }).fill(label)
    await page.getByRole('radio', { name: tier, exact: true }).check()
    await page.getByRole('button', { name: 'Add outcome' }).click()
  }
  await page.getByRole('button', { name: 'That is all the outcomes' }).click()
  const intro = await page.getByText(/^Check 1 of \d+/).textContent()
  for (let i = 0; i < Number(/of (\d+)/.exec(intro ?? '')?.[1]); i++) {
    await page
      .getByRole('button', { name: 'No, only one can happen' })
      .or(page.getByRole('button', { name: 'No, one of these will happen' }))
      .click()
  }
  await expect(page.getByRole('heading', { name: 'First sketch' })).toBeVisible()
}

test.describe('Several outcomes: the questions', () => {
  test('asks comparisons and lotteries, resumes after a reload, and ends with where the answers stand', async ({
    page,
  }) => {
    await reachSketch(page)
    await page.getByRole('button', { name: 'Start the questions' }).click()

    const question = page.getByRole('heading', { level: 2 }).first()
    await expect(question).toBeFocused()
    await expect(page.getByRole('button', { name: 'Stop here' })).toBeVisible()
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
    await answerOne()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Stop here' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start the questions' })).toHaveCount(0)

    for (let i = 0; i < 45 && (await answerOne()); i++);
    await expect(standing).toBeFocused()
    const list = page.getByRole('list', { name: 'Where your answers stand' })
    await expect(list.getByRole('listitem')).toHaveCount(3)
    await expect(list).toContainText('%')
    const endResults = await new AxeBuilder({ page }).analyze()
    expect(endResults.violations).toEqual([])

    // the standing survives a reload, and "Start again" returns to the gate
    await page.reload()
    await expect(standing).toBeVisible()
    await page.getByRole('button', { name: 'Start again' }).click()
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
  })
})
