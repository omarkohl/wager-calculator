import { test, expect, type Page } from '@playwright/test'

const separate = (page: Page) => page.getByRole('button', { name: /I can.t separate/ })

async function answerAll(page: Page) {
  for (let i = 0; i < 30 && (await separate(page).count()) > 0; i++) {
    const label = await page.getByRole('img', { name: /of the time/ }).getAttribute('aria-label')
    const chance = Number(/([\d.]+)% of the time/.exec(label!)![1])
    if (chance < 50) await page.getByRole('button', { name: /if this is (true|false)/ }).click()
    else await page.getByRole('button', { name: /spinner lands/ }).click()
  }
}

async function startFromLanding(page: Page, claim: string) {
  await page.goto('/')
  await page.getByRole('main').getByRole('link', { name: 'How sure are you?' }).click()
  await page.getByRole('textbox', { name: 'Claim' }).fill(claim)
  await page.getByRole('textbox', { name: 'Amount' }).fill('20')
  await page.getByRole('combobox', { name: 'Currency' }).selectOption({ label: 'EUR (€)' })
  await page.getByRole('button', { name: 'Start' }).click()
}

test.describe('From the elicitation to the wager', () => {
  test('a full flow: landing, gate, questions, result, adjusted belief, wager', async ({
    page,
  }) => {
    await startFromLanding(page, 'The bridge opens on time')
    await answerAll(page)
    await page.getByRole('textbox', { name: /Resolution criteria/ }).fill('Open to traffic by noon')
    const field = page.getByRole('textbox', { name: 'Your adjusted belief (%)' })
    await field.fill('62.5')
    const band = (await page
      .getByRole('heading', { name: /Your answers say the chance is/ })
      .textContent())!
      .replace('Your answers say the chance is', '')
      .trim()

    await page.getByRole('button', { name: 'Bet on this' }).click()

    // the wager calculator, with a fresh wager about the same claim
    await expect(page).toHaveURL(/\/wager#/)
    await expect(page.getByText('The bridge opens on time')).toBeVisible()
    await expect(page.getByText('Open to traffic by noon')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Wager Calculator' })).toBeFocused()

    // the first participant's cell holds the adjusted value, the other outcome the rest
    await expect(page.getByRole('spinbutton', { name: /^Artem probability for Yes$/ })).toHaveValue(
      '62.5'
    )
    await expect(page.getByRole('spinbutton', { name: /^Artem probability for No$/ })).toHaveValue(
      '37.5'
    )
    // with where it came from, near that cell
    await expect(page.getByText(`${band} from elicitation`)).toBeVisible()
    // in the stake of the gate
    await expect(page.getByRole('button', { name: /stakes/i })).toContainText(/EUR/)

    // editing those numbers retires the provenance
    await page.getByRole('spinbutton', { name: /^Artem probability for Yes$/ }).fill('70')
    await expect(page.getByText(`${band} from elicitation`)).toHaveCount(0)
  })

  test('without an adjusted value the point estimate is what is bet on', async ({ page }) => {
    await startFromLanding(page, 'It rains tomorrow')
    await answerAll(page)
    // the adjusted field starts at the point estimate, to two decimals
    const estimate = await page
      .getByRole('textbox', { name: 'Your adjusted belief (%)' })
      .inputValue()
    await page.getByRole('button', { name: 'Bet on this' }).click()
    await expect(page).toHaveURL(/\/wager#/)
    await expect(page.getByRole('spinbutton', { name: /^Artem probability for Yes$/ })).toHaveValue(
      estimate
    )
    const no = await page
      .getByRole('spinbutton', { name: /^Artem probability for No$/ })
      .inputValue()
    expect(Number(estimate) + Number(no)).toBeCloseTo(100, 6)
  })

  test('a one-sided result asks for the adjusted value first', async ({ page }) => {
    await startFromLanding(page, 'It rains tomorrow')
    await page.getByRole('button', { name: /if this is true/ }).click()
    await page.getByRole('button', { name: 'Stop here' }).click()

    await page.getByRole('button', { name: 'Bet on this' }).click()
    await expect(page).toHaveURL(/\/elicit$/)
    await expect(page.getByRole('alert')).toContainText(/Set your own belief above/)
    await expect(page.getByRole('textbox', { name: 'Your adjusted belief (%)' })).toBeFocused()

    await page.getByRole('textbox', { name: 'Your adjusted belief (%)' }).fill('80')
    await expect(page.getByRole('alert')).toHaveCount(0)
    await page.getByRole('button', { name: 'Bet on this' }).click()
    await expect(page).toHaveURL(/\/wager#/)
    await expect(page.getByRole('spinbutton', { name: /^Artem probability for Yes$/ })).toHaveValue(
      '80'
    )
  })

  test('a reload of the wager page keeps the wager but drops the provenance', async ({ page }) => {
    await startFromLanding(page, 'It rains tomorrow')
    await answerAll(page)
    await page.getByRole('button', { name: 'Bet on this' }).click()
    await expect(page.getByText(/from elicitation/)).toBeVisible()
    await page.reload()
    await expect(page.getByText('It rains tomorrow')).toBeVisible()
    await expect(page.getByText(/from elicitation/)).toHaveCount(0)
  })
})
