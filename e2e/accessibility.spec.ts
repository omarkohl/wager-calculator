import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should support keyboard navigation through interactive elements', async ({ page }) => {
    await page.goto('/')

    // Find and focus the stakes combobox directly
    const stakesInput = page.getByRole('combobox', { name: /stakes/i })
    await stakesInput.focus()
    await expect(stakesInput).toBeFocused()

    // Test opening stakes with keyboard
    await page.keyboard.press('ArrowDown')
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
    await page.goto('/')

    // Check heading structure
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Check form controls have labels
    const stakesCombobox = page.getByRole('combobox')
    await expect(stakesCombobox).toBeVisible()

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
    await page.goto('/')

    // Navigate to resolution section - it's a Headless UI Listbox
    // Find the Resolution label and then the button in its parent container
    const resolutionLabel = page.locator('label:has-text("Resolution")')
    const resolutionContainer = resolutionLabel.locator('..')
    const listboxButton = resolutionContainer.getByRole('button')
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
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze()

    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    )
    expect(contrastViolations).toEqual([])
  })
})
