import { test, expect, type Page } from '@playwright/test'

function getParticipantCard(page: Page, name: string) {
  return page.locator('div.rounded-lg', { has: page.locator('h3', { hasText: name }) })
}

async function setPrediction(page: Page, participant: string, outcome: string, value: number) {
  const card = getParticipantCard(page, participant)
  const row = card.locator('div.flex', { has: page.locator(`label:text-is("${outcome}")`) })
  await row.locator('input[type="range"]').fill(String(value))
}

test.describe('Transparency: preview, expected value and calculation details', () => {
  test('a user can preview every outcome, test honesty and read the calculation', async ({
    page,
  }) => {
    await page.goto('/')

    const preview = page.getByRole('button', { name: /preview payouts for each outcome/i })
    await expect(preview).toHaveAttribute('aria-expanded', 'false')

    // Without max bets the preview explains what is missing
    await preview.click()
    await expect(page.getByText(/give every participant a max bet above 0/i)).toBeVisible()

    const maxBetInputs = page.locator('input[type="number"]')
    await maxBetInputs.nth(0).fill('10')
    await maxBetInputs.nth(1).fill('10')
    await setPrediction(page, 'Artem', 'Yes', 70)
    await setPrediction(page, 'Baani', 'Yes', 40)

    // Side by side payouts and the expected column
    const table = page.getByRole('table')
    await expect(table.getByRole('columnheader', { name: 'Yes' })).toBeVisible()
    await expect(table.getByRole('columnheader', { name: 'No' })).toBeVisible()
    await expect(table.getByRole('columnheader', { name: 'Expected' })).toBeVisible()
    const artemRow = table.getByRole('row', { name: /artem/i })
    await expect(artemRow).toContainText('+2.70 $')
    await expect(artemRow).toContainText('-3.30 $')
    await expect(artemRow).toContainText('+0.90 $')

    // The expected value can be traced
    await page.getByRole('button', { name: /show calculation/i }).click()
    await expect(page.getByText('Artem: 0.7 × +2.70 + 0.3 × -3.30 = +0.90')).toBeVisible()

    // Shading a prediction lowers the expected payout
    await page.getByRole('button', { name: /why report honestly/i }).click()
    const slider = page.getByRole('slider', { name: /reported probability for yes/i })
    await expect(slider).toHaveValue('70')
    await expect(page.getByText(/best possible/i)).toBeVisible()
    await slider.fill('50')
    await expect(page.getByText(/\+0\.50 \$ instead of \+0\.90 \$/)).toBeVisible()

    // Resolve and read the full calculation for the actual outcome
    await page.getByRole('button', { name: 'Unresolved' }).click()
    await page.getByRole('option', { name: 'Yes' }).click()
    await expect(table.getByRole('columnheader', { name: /yes.*resolved/i })).toBeVisible()

    await page
      .getByRole('button', { name: /show calculation/i })
      .first()
      .click()
    await expect(page.getByText('Yes (occurred): (0.7 − 1)² = 0.09')).toBeVisible()
    await expect(page.getByText('Payout: 10 × (0.72 − 0.18) / 2 = 2.7 → +2.70 $')).toBeVisible()
  })
})
