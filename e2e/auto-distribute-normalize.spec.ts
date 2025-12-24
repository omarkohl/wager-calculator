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

/**
 * Helper to get the slider value for a participant's outcome.
 */
function getSlider(page: Page, participantName: string, outcomeLabel: string) {
  const card = getParticipantCard(page, participantName)
  const row = card.locator('div.flex', { has: page.locator(`label:text-is("${outcomeLabel}")`) })
  return row.locator('input[type="range"]')
}

test.describe('Auto-distribute and Normalize Workflow', () => {
  test('should auto-distribute remaining probability and normalize when needed', async ({
    page,
  }) => {
    await page.goto('/')

    // Add a third outcome
    await page.getByRole('button', { name: /add outcome/i }).click()

    // Use the default outcome labels (Yes, No, Sunny) instead of renaming
    // This keeps the test simpler and focused on auto-distribute behavior

    // Test auto-distribute: Set partial probabilities for first participant (Artem)
    // Set Yes=40%, No=30%, leave Sunny untouched
    await setPrediction(page, 'Artem', 'Yes', 40)
    await setPrediction(page, 'Artem', 'No', 30)

    // Verify Sunny was auto-filled with remaining 30%
    await expect(getSlider(page, 'Artem', 'Sunny')).toHaveValue('30')

    // Verify no warning since sum is 100%
    await expect(page.getByText(/must sum to 100%/i)).not.toBeVisible()

    // Test normalize: Create a scenario where probabilities don't sum to 100%
    // Second participant (Baani): Set 25%, 25%, 25% = 75% total
    await setPrediction(page, 'Baani', 'Yes', 25)
    await setPrediction(page, 'Baani', 'No', 25)
    await setPrediction(page, 'Baani', 'Sunny', 25)

    // Should show warning for Baani (sum is 75%)
    const baaniCard = getParticipantCard(page, 'Baani')
    await expect(baaniCard.getByText(/must sum to 100%/i)).toBeVisible()

    // Click Baani's normalize button
    await baaniCard.getByRole('button', { name: /normalize/i }).click()

    // Verify sliders are scaled to 100% (25/75 * 100 = 33.33 for each)
    await expect(getSlider(page, 'Baani', 'Yes')).toHaveValue('33')
    await expect(getSlider(page, 'Baani', 'No')).toHaveValue('33')
    await expect(getSlider(page, 'Baani', 'Sunny')).toHaveValue('33')

    // Warning should disappear
    await expect(baaniCard.getByText(/must sum to 100%/i)).not.toBeVisible()

    // Test that auto-distribute continues to work on untouched fields
    // Change Artem's Yes to 50%, No to 35%
    await setPrediction(page, 'Artem', 'Yes', 50)
    await setPrediction(page, 'Artem', 'No', 35)

    // Sunny was auto-distributed before (not touched by user), so it will auto-distribute again
    // Total: 50 + 35 + 15 = 100%, no warning
    await expect(getSlider(page, 'Artem', 'Sunny')).toHaveValue('15')
    await expect(getParticipantCard(page, 'Artem').getByText(/must sum to 100%/i)).not.toBeVisible()

    // Now manually touch the third slider to prevent auto-distribution
    await setPrediction(page, 'Artem', 'Sunny', 20)

    // Now all sliders are touched, so changing others won't auto-distribute
    await setPrediction(page, 'Artem', 'Yes', 60)

    // Total: 60 + 35 + 20 = 115%, should show warning
    await expect(getParticipantCard(page, 'Artem').getByText(/must sum to 100%/i)).toBeVisible()
  })
})
