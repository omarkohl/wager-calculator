import { test, expect } from '@playwright/test'
import lzString from 'lz-string'

const { compressToEncodedURIComponent } = lzString

test.describe('Links from before the site had routes', () => {
  test('a v2 link at the root opens the same wager at /wager', async ({ page }) => {
    await page.goto('/#v=2&c=Will+it+rain+tomorrow%3F')

    await expect(page).toHaveURL(/\/wager#v=2/)
    await expect(page.getByText('Will it rain tomorrow?')).toBeVisible()
  })

  test('a v1 link at the root opens the same wager at /wager', async ({ page }) => {
    const v1 = {
      v: 1,
      claim: 'Old style claim',
      details: '',
      stakes: 'eur',
      participants: [
        { id: 'p1', name: 'Alice', maxBet: '100', touched: true },
        { id: 'p2', name: 'Bob', maxBet: '100', touched: true },
      ],
      outcomes: [
        { id: 'o1', label: 'Yes', touched: true },
        { id: 'o2', label: 'No', touched: true },
      ],
      predictions: [
        { participantId: 'p1', outcomeId: 'o1', probability: '60', touched: true },
        { participantId: 'p1', outcomeId: 'o2', probability: '40', touched: true },
        { participantId: 'p2', outcomeId: 'o1', probability: '30', touched: true },
        { participantId: 'p2', outcomeId: 'o2', probability: '70', touched: true },
      ],
      resolvedOutcomeId: null,
    }
    await page.goto(`/#${compressToEncodedURIComponent(JSON.stringify(v1))}`)

    await expect(page).toHaveURL(/\/wager#/)
    await expect(page.getByText('Old style claim')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Alice', level: 3 })).toBeVisible()
    const aliceCard = page.locator('div.rounded-lg', {
      has: page.locator('h3', { hasText: 'Alice' }),
    })
    const yesRow = aliceCard.locator('div.flex', { has: page.locator('label:text-is("Yes")') })
    await expect(yesRow.locator('input[type="range"]')).toHaveValue('60')
  })

  test('the server falls back to the app for deep links: landing, calculator, unknown path', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Wager Calculator' }).click()
    await expect(page).toHaveURL(/\/wager$/)

    await page.goto('/no-such-page')
    await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible()
    await page.getByRole('link', { name: /home/i }).click()
    await expect(page).toHaveURL(/\/$/)
  })
})
