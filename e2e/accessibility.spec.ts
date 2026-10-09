import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/wager')

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should support keyboard navigation through interactive elements', async ({ page }) => {
    await page.goto('/wager')

    // Find and focus the stakes listbox button directly
    const stakesButton = page.getByRole('button', { name: /stakes/i })
    await stakesButton.click()

    // Wait for the listbox options to be visible
    await expect(page.getByRole('option').first()).toBeVisible()

    // Navigate options with arrow keys and select
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    // Test the claim field (InlineEdit)
    const claimField = page.getByRole('button', { name: /what are you betting on/i })
    await claimField.focus()
    await expect(claimField).toBeFocused()

    // Enter edit mode with keyboard
    await page.keyboard.press('Enter')
    // Now an input should be visible
    const claimInput = page.locator('input').first()
    await expect(claimInput).toBeFocused()
  })

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/wager')

    // Check heading structure
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Check form controls have labels - stakes is now a listbox button
    const stakesButton = page.getByRole('button', { name: /stakes/i })
    await expect(stakesButton).toBeVisible()

    // Check buttons are accessible (using .first() since they appear at top and bottom)
    await expect(page.getByRole('button', { name: /reset/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /share/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /faq/i }).first()).toBeVisible()

    // Check participant controls
    await expect(page.getByRole('button', { name: /add participant/i })).toBeVisible()

    // Check outcome controls
    await expect(page.getByRole('button', { name: /add outcome/i })).toBeVisible()
  })

  test('should support resolution listbox keyboard navigation', async ({ page }) => {
    await page.goto('/wager')

    // Navigate to resolution section - it's a Headless UI Listbox
    // Find the Resolution heading and then the button in its parent container
    const resolutionHeading = page.getByRole('heading', { name: 'Resolution' })
    const resolutionContainer = resolutionHeading.locator('..')
    const listboxButton = resolutionContainer.getByRole('button').first()
    await expect(listboxButton).toHaveText('Unresolved')

    // Open the listbox
    await listboxButton.click()
    await expect(page.getByRole('listbox')).toBeVisible()

    // Navigate with arrow keys - ArrowDown goes to "Yes" option
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    // Verify selection changed - button should now show "Yes" instead of "Unresolved"
    await expect(listboxButton).toHaveText('Yes')
  })

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/wager')

    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze()

    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    )
    expect(contrastViolations).toEqual([])
  })
  for (const [name, path] of [
    ['landing page', '/'],
    ['elicitation page', '/elicit'],
    ['not-found page', '/no-such-page'],
  ]) {
    test(`the ${name} has no automatically detectable accessibility issues`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      const results = await new AxeBuilder({ page }).analyze()

      expect(results.violations).toEqual([])
    })
  }

  test('navigating with the keyboard moves focus to the new page heading', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Main' })
    await nav.getByRole('link', { name: 'Wager Calculator' }).focus()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/wager$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
    await expect(page.getByRole('status').filter({ hasText: 'Wager Calculator' })).toBeAttached()
  })
})
