import { test, expect } from '@playwright/test'

test.describe('Complete Happy Path', () => {
  test('should create, predict, resolve, and share a wager', async ({ page }) => {
    await page.goto('/')

    // Verify the app loads
    await expect(page.locator('h1')).toContainText('Wager')

    // Edit the claim
    const claimButton = page.getByRole('button', {
      name: /what are you betting on/i,
    })
    await claimButton.click()
    const claimInput = page.locator('input').first()
    await claimInput.fill('Will it snow in Vancouver this December?')
    await claimInput.press('Enter')

    // Add a third participant
    await page.getByRole('button', { name: /add participant/i }).click()

    // Edit participant names
    const participantInputs = page.locator('input[placeholder="Participant name"]')
    await participantInputs.nth(0).fill('Alice')
    await participantInputs.nth(1).fill('Bob')
    await participantInputs.nth(2).fill('Charlie')

    // Set max bets (first 3 number inputs)
    const allNumberInputs = page.locator('input[type="number"]')
    await allNumberInputs.nth(0).fill('100')
    await allNumberInputs.nth(1).fill('100')
    await allNumberInputs.nth(2).fill('100')

    // Enter predictions using sliders
    const sliders = page.locator('input[type="range"]')

    // Alice: 70% Yes, 30% No
    await sliders.nth(0).fill('70')
    await sliders.nth(1).fill('30')

    // Bob: 40% Yes, 60% No
    await sliders.nth(2).fill('40')
    await sliders.nth(3).fill('60')

    // Charlie: 50% Yes, 50% No
    await sliders.nth(4).fill('50')
    await sliders.nth(5).fill('50')

    // Verify no probability sum warnings
    await expect(page.getByText(/must sum to 100%/i)).not.toBeVisible()

    // Resolve the wager - click the "Unresolved" button
    await page.getByText('Unresolved').click()

    // Wait for the dropdown to appear and select "Yes" from the listbox
    const listbox = page.locator('[role="listbox"]')
    await listbox.locator('span', { hasText: 'Yes' }).first().click()

    // Verify payouts are displayed
    await expect(page.getByText(/payout/i).first()).toBeVisible()

    // Share the wager
    await page.getByRole('button', { name: /share/i }).first().click()

    // Wait for URL to contain hash
    await page.waitForURL(url => url.hash.length > 0)

    // Verify the URL contains encoded state
    const currentUrl = page.url()
    expect(currentUrl).toContain('#')
    const hash = currentUrl.split('#')[1]
    expect(hash.length).toBeGreaterThan(0)

    // Open the shared URL (simulating sharing)
    await page.goto('about:blank')
    await page.goto(currentUrl)

    // Verify the wager data persists
    await expect(page.getByText('Will it snow in Vancouver this December?')).toBeVisible()
    await expect(page.getByText('Alice').first()).toBeVisible()
    await expect(page.getByText('Bob').first()).toBeVisible()
    await expect(page.getByText('Charlie').first()).toBeVisible()

    // Verify predictions persist
    const reloadedSliders = page.locator('input[type="range"]')
    await expect(reloadedSliders.nth(0)).toHaveValue('70')
    await expect(reloadedSliders.nth(2)).toHaveValue('40')
    await expect(reloadedSliders.nth(4)).toHaveValue('50')

    // Verify resolution persists
    await expect(page.getByText(/payout/i).first()).toBeVisible()
  })
})
