import { expect, type Page } from '@playwright/test'

/** The user's own numbers on the result, as shown: the outcome (or range) and its percent. */
export async function ownNumbers(page: Page): Promise<{ label: string; value: string }[]> {
  const items = page.getByRole('list', { name: 'Your own numbers' }).getByRole('listitem')
  const numbers: { label: string; value: string }[] = []
  for (let i = 0; i < (await items.count()); i++) {
    const label = ((await items.nth(i).locator('label').textContent()) ?? '').replace(
      /, percent$/,
      ''
    )
    numbers.push({ label, value: await items.nth(i).getByRole('textbox').inputValue() })
  }
  return numbers
}

/** The wager page holds exactly these outcomes with these numbers in the first participant's row. */
export async function expectWagerFrom(
  page: Page,
  numbers: { label: string; value: string }[]
): Promise<void> {
  expect(numbers.length).toBeGreaterThan(1)
  expect(numbers.reduce((sum, n) => sum + Number(n.value), 0)).toBeCloseTo(100, 6)
  for (const { label, value } of numbers) {
    const cell = page.getByRole('spinbutton', {
      name: `Artem probability for ${label}`,
      exact: true,
    })
    await expect(cell).toBeVisible()
    expect(Number(await cell.inputValue())).toBeCloseTo(Number(value), 6)
  }
  // with where the numbers came from, near the first participant's cell
  await expect(page.getByText(/your own numbers from elicitation/i)).toBeVisible()
}
