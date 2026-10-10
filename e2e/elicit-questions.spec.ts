import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function startRun(page: Page, mode: 'Quick' | 'Thorough' = 'Quick') {
  await page.goto('/elicit')
  await page.getByRole('textbox', { name: 'Claim' }).fill('The bridge opens on time')
  await page.getByRole('textbox', { name: 'Amount' }).fill('10')
  await page.getByRole('radio', { name: new RegExp(mode) }).check()
  await page.getByRole('button', { name: 'Start' }).click()
}

const separate = (page: Page) => page.getByRole('button', { name: /I can.t separate these/ })

test.describe('Elicitation questions', () => {
  test('shows the reference lottery with its number and an accessible name, and passes axe', async ({
    page,
  }) => {
    await startRun(page)

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

  test('offers the claim, the spinner and "I can\'t separate these", with Stop here always there', async ({
    page,
  }) => {
    await startRun(page)
    await expect(
      page.getByRole('heading', { level: 2, name: 'Which would you rather have?' })
    ).toBeFocused()
    await expect(
      page.getByRole('button', { name: /Win 10 USD if this is true: “The bridge opens on time”/ })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Win 10 USD if the spinner lands in the shaded part/ })
    ).toBeVisible()
    await expect(separate(page)).toBeVisible()
    await expect(page.getByText(/Approx\. \d+ questions? left/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Stop here' })).toBeVisible()

    await separate(page).click()
    await expect(page.getByRole('heading', { level: 2 })).toBeFocused()
    await expect(page.getByRole('button', { name: 'Stop here' })).toBeVisible()
  })

  test('a reload resumes the run where it was', async ({ page }) => {
    await startRun(page)
    await separate(page).click()
    const spinnerArm = page.getByRole('button', { name: /spinner lands in the shaded part/ })
    const text = await spinnerArm.textContent()

    await page.reload()
    await expect(page.getByRole('button', { name: /spinner lands in the shaded part/ })).toHaveText(
      text!
    )
    await expect(page.getByRole('heading', { level: 2 })).not.toBeFocused()
  })

  test('walking a whole quick run ends it, and the address bar never holds the claim', async ({
    page,
  }) => {
    await startRun(page)
    for (let i = 0; i < 14 && (await separate(page).count()) > 0; i++) {
      await separate(page).click()
    }
    await expect(
      page.getByRole('heading', { name: /Your answers say|You could not tell the claim/ })
    ).toBeFocused()
    expect(page.url()).not.toContain('bridge')
    expect(page.url()).not.toContain('#')
  })

  test('"Stop here" ends the run and stays ended after a reload', async ({ page }) => {
    await startRun(page)
    await page.getByRole('button', { name: /if this is true/ }).click()
    await page.getByRole('button', { name: 'Stop here' }).click()
    await expect(
      page.getByRole('heading', { name: /Your answers say|You could not tell the claim/ })
    ).toBeVisible()
    await page.reload()
    await expect(
      page.getByRole('heading', { name: /Your answers say|You could not tell the claim/ })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Stop here' })).toHaveCount(0)
  })

  test('a thorough run has Stop here and an estimate of the questions left', async ({ page }) => {
    await startRun(page, 'Thorough')
    await expect(page.getByRole('button', { name: 'Stop here' })).toBeVisible()
    await expect(page.getByText(/Approx\. \d+ questions? left/)).toBeVisible()
  })

  test('stopping before the first answer gives no result', async ({ page }) => {
    await startRun(page)
    await page.getByRole('button', { name: 'Stop here' }).click()
    await expect(
      page.getByText('You stopped before answering, so there is no result.')
    ).toBeFocused()
    await page.getByRole('button', { name: 'Start a new claim' }).click()
    await expect(page.getByRole('textbox', { name: 'Claim' })).toBeVisible()
  })

  test('a thorough run never says what a question is for', async ({ page }) => {
    await startRun(page, 'Thorough')
    let sawFalse = false
    // A user who believes 50/50: the claim wins below 50%, the spinner above
    for (let i = 0; i < 26 && (await separate(page).count()) > 0; i++) {
      const lottery = page.getByRole('img', { name: /of the time/ })
      const label = (await lottery.getAttribute('aria-label'))!
      const chance = Number(/([\d.]+)% of the time/.exec(label)![1])
      if ((await page.getByRole('button', { name: /if this is false/ }).count()) > 0) {
        sawFalse = true
        const body = (await page.locator('body').innerText()).toLowerCase()
        expect(body).not.toMatch(/check|consisten|coheren|opposite|negat/)
      }
      if (chance < 50) await page.getByRole('button', { name: /if this is (true|false)/ }).click()
      else await page.getByRole('button', { name: /spinner lands/ }).click()
    }
    expect(sawFalse).toBe(true)
  })
})
