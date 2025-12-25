import { test, expect, type Page } from '@playwright/test'

/**
 * Helper to get a participant's prediction card by their name.
 * Each participant has a card with their name as an h3 heading.
 */
function getParticipantCard(page: Page, name: string) {
  return page.locator('div.rounded-lg', { has: page.locator('h3', { hasText: name }) })
}

/**
 * Helper to set a prediction slider within a participant's card.
 * Finds the row by the outcome label, then gets the slider in that row.
 */
async function setPrediction(
  page: Page,
  participantName: string,
  outcomeLabel: string,
  value: number
) {
  const card = getParticipantCard(page, participantName)
  // Find the specific row (flex container) that directly contains this outcome's label
  const row = card.locator('div.flex', { has: page.locator(`label:text-is("${outcomeLabel}")`) })
  await row.locator('input[type="range"]').fill(String(value))
}

test.describe('Complete Happy Path', () => {
  test('should create, predict, resolve, and share a wager', async ({ page }) => {
    await page.goto('/')

    // Verify the app loads
    await expect(page.locator('h1')).toContainText('Wager')

    // Edit the claim - click the placeholder text, then fill the input
    await page.getByRole('button', { name: /what are you betting on/i }).click()
    await page.getByRole('textbox').first().fill('Will it snow in Vancouver this December?')
    await page.getByRole('textbox').first().press('Enter')

    // Add a third participant
    await page.getByRole('button', { name: /add participant/i }).click()

    // Edit participant names - find by current placeholder values
    const participantInputs = page.locator('input[placeholder="Participant name"]')
    await participantInputs.nth(0).fill('Alice')
    await participantInputs.nth(1).fill('Bob')
    await participantInputs.nth(2).fill('Charlie')

    // Set max bets - the number inputs are next to participant names
    const maxBetInputs = page.locator('input[type="number"]')
    await maxBetInputs.nth(0).fill('100')
    await maxBetInputs.nth(1).fill('100')
    await maxBetInputs.nth(2).fill('100')

    // Enter predictions using the helper - more readable and user-centric
    await setPrediction(page, 'Alice', 'Yes', 70)
    await setPrediction(page, 'Alice', 'No', 30)

    await setPrediction(page, 'Bob', 'Yes', 40)
    await setPrediction(page, 'Bob', 'No', 60)

    await setPrediction(page, 'Charlie', 'Yes', 50)
    await setPrediction(page, 'Charlie', 'No', 50)

    // Verify no probability sum warnings
    await expect(page.getByText(/must sum to 100%/i)).not.toBeVisible()

    // Resolve the wager - click "Unresolved" and select "Yes"
    await page.getByRole('button', { name: 'Unresolved' }).click()
    await page.getByRole('option', { name: 'Yes' }).click()

    // Verify payouts are displayed
    await expect(page.getByText(/payout/i).first()).toBeVisible()

    // Share the wager
    await page.getByRole('button', { name: /share/i }).first().click()

    // Wait for URL to update with hash
    await expect(page).toHaveURL(/#.+/)

    // Save URL and reload to test persistence
    const sharedUrl = page.url()

    // Navigate away and back to test URL state restoration
    await page.goto('about:blank')
    await page.goto(sharedUrl)

    // Verify the wager data persists - check visible text
    await expect(page.getByText('Will it snow in Vancouver this December?')).toBeVisible()
    // Check participant names appear in their prediction cards (h3 headings)
    await expect(page.getByRole('heading', { name: 'Alice', level: 3 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bob', level: 3 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Charlie', level: 3 })).toBeVisible()

    // Verify Alice's Yes prediction shows 70% in her card
    const aliceCard = getParticipantCard(page, 'Alice')
    const aliceYesRow = aliceCard.locator('div.flex', { has: page.locator('label:text-is("Yes")') })
    await expect(aliceYesRow.locator('input[type="range"]')).toHaveValue('70')

    // Verify resolution persists
    await expect(page.getByText(/payout/i).first()).toBeVisible()
  })
})
