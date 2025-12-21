import { test, expect } from '@playwright/test'

test.describe('Wager Calculator App', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')
    
    // Check that the page loads with the correct title
    await expect(page).toHaveTitle(/Wager Calculator/)
    
    // Check that the main heading is visible
    await expect(page.getByRole('heading', { name: 'Wager Calculator' })).toBeVisible()
    
    // Check that the description is present
    await expect(page.getByText('Fair betting odds')).toBeVisible()
  })

  test('should display development message', async ({ page }) => {
    await page.goto('/')
    
    // Check that development environment message is visible
    await expect(page.getByText('Development environment is ready!')).toBeVisible()
    await expect(page.getByText('Time to start building with TDD...')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Check that content is still visible on mobile
    await expect(page.getByRole('heading', { name: 'Wager Calculator' })).toBeVisible()
    
    // Check that the container is properly sized
    const container = page.locator('.container')
    await expect(container).toBeVisible()
  })

  test('should have proper meta tags for PWA', async ({ page }) => {
    await page.goto('/')
    
    // Check for PWA-related meta tags
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1.0')
    
    const description = page.locator('meta[name="description"]')
    await expect(description).toHaveAttribute('content', /Progressive Web App/)
    
    const themeColor = page.locator('meta[name="theme-color"]')
    await expect(themeColor).toHaveAttribute('content', '#ffffff')
  })
})
