import { test, expect, type Page } from '@playwright/test'

/**
 * Helper to get a participant's prediction card by their name.
 */
function getParticipantCard(page: Page, name: string) {
  return page.locator('div.rounded-lg', { has: page.locator('h3', { hasText: name }) })
}

/**
 * Helper to set a prediction slider within a participant's card.
 */
async function setPrediction(
  page: Page,
  participantName: string,
  outcomeLabel: string,
  value: number
) {
  const card = getParticipantCard(page, participantName)
  const row = card.locator('div.flex', { has: page.locator(`label:text-is("${outcomeLabel}")`) })
  await row.locator('input[type="range"]').fill(String(value))
}

test.describe('Multi-categorical with Edge Cases', () => {
  test('should handle 4 participants with 3 outcomes and custom stakes', async ({ page }) => {
    await page.goto('/')

    // Set custom stakes (Cookies)
    const stakesInput = page.getByRole('combobox', { name: /stakes/i })
    await stakesInput.click()
    await stakesInput.fill('Cookies')
    await page.getByRole('option', { name: /cookies/i }).click()

    // Add third and fourth participants
    await page.getByRole('button', { name: /add participant/i }).click()
    await page.getByRole('button', { name: /add participant/i }).click()

    // Set participant names
    const participantInputs = page.locator('input[placeholder="Participant name"]')
    await participantInputs.nth(0).fill('Alice')
    await participantInputs.nth(1).fill('Bob')
    await participantInputs.nth(2).fill('Charlie')
    await participantInputs.nth(3).fill('Diana')

    // Set max bets
    const maxBetInputs = page.locator('input[type="number"]')
    await maxBetInputs.nth(0).fill('50')
    await maxBetInputs.nth(1).fill('50')
    await maxBetInputs.nth(2).fill('50')
    await maxBetInputs.nth(3).fill('50')

    // Add third outcome (defaults: Yes, No, Sunny)
    await page.getByRole('button', { name: /add outcome/i }).click()

    // Rename outcomes
    const outcomeInputs = page.locator('input[placeholder="Outcome label"]')
    await outcomeInputs.nth(0).fill('Early')
    await outcomeInputs.nth(1).fill('On Time')
    await outcomeInputs.nth(2).fill('Late')

    // Enter predictions for each participant
    await setPrediction(page, 'Alice', 'Early', 50)
    await setPrediction(page, 'Alice', 'On Time', 30)
    await setPrediction(page, 'Alice', 'Late', 20)

    await setPrediction(page, 'Bob', 'Early', 20)
    await setPrediction(page, 'Bob', 'On Time', 60)
    await setPrediction(page, 'Bob', 'Late', 20)

    await setPrediction(page, 'Charlie', 'Early', 33)
    await setPrediction(page, 'Charlie', 'On Time', 33)
    await setPrediction(page, 'Charlie', 'Late', 34)

    await setPrediction(page, 'Diana', 'Early', 10)
    await setPrediction(page, 'Diana', 'On Time', 70)
    await setPrediction(page, 'Diana', 'Late', 20)

    // Resolve to "On Time"
    await page.getByRole('button', { name: 'Unresolved' }).click()
    await page.getByRole('option', { name: 'On Time' }).click()

    // Verify payouts are displayed
    await expect(page.getByText(/payout/i).first()).toBeVisible()

    // Verify stakes are shown in cookies
    await expect(page.getByText(/cookies/i).first()).toBeVisible()
  })

  test('should handle identical predictions edge case', async ({ page }) => {
    await page.goto('/')

    // Set up two participants with identical predictions
    const participantInputs = page.locator('input[placeholder="Participant name"]')
    await participantInputs.nth(0).fill('Alice')
    await participantInputs.nth(1).fill('Bob')

    // Both predict 70% Yes, 30% No
    await setPrediction(page, 'Alice', 'Yes', 70)
    await setPrediction(page, 'Alice', 'No', 30)
    await setPrediction(page, 'Bob', 'Yes', 70)
    await setPrediction(page, 'Bob', 'No', 30)

    // Resolve to Yes
    await page.getByRole('button', { name: 'Unresolved' }).click()
    await page.getByRole('option', { name: 'Yes' }).click()

    // Should explain that payouts are zero due to identical predictions
    await expect(page.getByText(/all payouts are zero/i)).toBeVisible()
  })

  test('should handle settlement minimization with multiple transactions', async ({ page }) => {
    await page.goto('/')

    // Add third participant
    await page.getByRole('button', { name: /add participant/i }).click()

    // Set names
    const participantInputs = page.locator('input[placeholder="Participant name"]')
    await participantInputs.nth(0).fill('Alice')
    await participantInputs.nth(1).fill('Bob')
    await participantInputs.nth(2).fill('Charlie')

    // Set max bets
    const maxBetInputs = page.locator('input[type="number"]')
    await maxBetInputs.nth(0).fill('100')
    await maxBetInputs.nth(1).fill('100')
    await maxBetInputs.nth(2).fill('100')

    // Create predictions that will result in different payouts
    // Alice: very confident Yes
    await setPrediction(page, 'Alice', 'Yes', 90)
    await setPrediction(page, 'Alice', 'No', 10)

    // Bob: uncertain
    await setPrediction(page, 'Bob', 'Yes', 50)
    await setPrediction(page, 'Bob', 'No', 50)

    // Charlie: very confident No
    await setPrediction(page, 'Charlie', 'Yes', 10)
    await setPrediction(page, 'Charlie', 'No', 90)

    // Resolve to Yes
    await page.getByRole('button', { name: 'Unresolved' }).click()
    await page.getByRole('option', { name: 'Yes' }).click()

    // Verify payouts section is visible
    await expect(page.getByText(/payout/i).first()).toBeVisible()

    // Verify settlements are shown (someone pays someone)
    await expect(page.getByText(/pays/).first()).toBeVisible()
  })
})
