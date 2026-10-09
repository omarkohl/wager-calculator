import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function startRun(page: Page, mode: 'Quick' | 'Thorough') {
  await page.goto('/elicit')
  await page.getByRole('textbox', { name: 'Claim' }).fill('The bridge opens on time')
  await page.getByRole('textbox', { name: 'Amount' }).fill('10')
  await page.getByRole('radio', { name: new RegExp(mode) }).check()
  await page.getByRole('button', { name: 'Start' }).click()
}

const chanceOnScreen = async (page: Page) => {
  const label = await page.getByRole('img', { name: /of the time/ }).getAttribute('aria-label')
  return Number(/([\d.]+)% of the time/.exec(label!)![1])
}

/** Answer until the questions stop. `sensible`: the claim wins below 50%; otherwise the other way round. */
async function answerAll(page: Page, sensible: boolean) {
  for (
    let i = 0;
    i < 30 && (await page.getByRole('button', { name: /I can.t separate/ }).count()) > 0;
    i++
  ) {
    const claimWins = (await chanceOnScreen(page)) < 50 === sensible
    if (claimWins) await page.getByRole('button', { name: /if this is (true|false)/ }).click()
    else await page.getByRole('button', { name: /spinner lands/ }).click()
  }
}

test.describe('Elicitation result', () => {
  test('a quick run ends in an interval with a smaller best guess, a collapsed trace, and passes axe', async ({
    page,
  }) => {
    await startRun(page, 'Quick')
    await answerAll(page, true)

    await expect(
      page.getByRole('heading', { name: /Your answers say the chance is/ })
    ).toBeFocused()
    await expect(page.getByText(/^\d+(\.\d)?–\d+(\.\d)?%$|^(about|above|below) /)).toBeVisible()
    await expect(page.getByText(/Best single guess: \d/)).toBeVisible()
    await expect(page.getByRole('textbox', { name: /Resolution criteria/ })).toBeVisible()
    // the claim stays out of the address bar
    expect(page.url()).not.toContain('bridge')

    // the trace is collapsed until asked for
    await expect(page.getByText(/^Answer 1\./)).toBeHidden()
    await page.getByText('Show the full trace of your answers').click()
    await expect(page.getByText(/^Answer 1\./)).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('a result survives a reload, with its criteria', async ({ page }) => {
    await startRun(page, 'Quick')
    await answerAll(page, true)
    await page.getByRole('textbox', { name: /Resolution criteria/ }).fill('Open to traffic by noon')
    await page.reload()
    await expect(
      page.getByRole('heading', { name: /Your answers say the chance is/ })
    ).toBeVisible()
    await expect(page.getByRole('textbox', { name: /Resolution criteria/ })).toHaveValue(
      'Open to traffic by noon'
    )
  })

  test('answers that do not hang together lead with "sharpen the claim"; a drop recomputes; a re-run starts fresh', async ({
    page,
  }) => {
    await startRun(page, 'Thorough')
    await answerAll(page, false)

    const prompt = page.getByRole('note').filter({ hasText: /hang together/ })
    await expect(prompt).toBeVisible()
    await expect(prompt.getByText(/can mean more than one thing/)).toBeVisible()
    await expect(prompt.getByRole('textbox', { name: /Resolution criteria/ })).toBeVisible()
    // the number is still there
    await expect(
      page.getByRole('heading', { name: /Your answers say the chance is/ })
    ).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])

    // dropping a misclicked answer recomputes the result: its pairs go, so do their buttons
    const drops = page.getByRole('button', { name: /^That was a misclick, drop it: answer \d+/ })
    const before = await drops.count()
    expect(before).toBeGreaterThanOrEqual(2)
    await drops.first().click()
    await expect.poll(() => drops.count()).toBeLessThan(before)
    await page.getByText('Show the full trace of your answers').click()
    await expect(page.getByText(/Dropped as a misclick/).first()).toBeVisible()
    await page
      .getByRole('button', { name: /^Bring back answer/ })
      .first()
      .click()
    await expect(page.getByText(/Dropped as a misclick/)).toHaveCount(0)
    await expect.poll(() => drops.count()).toBe(before)

    // a re-run: fresh questions, same claim
    await prompt
      .getByRole('textbox', { name: /Resolution criteria/ })
      .fill('Open to traffic by noon')
    await page.getByRole('button', { name: 'Run it again' }).click()
    await expect(
      page.getByRole('heading', { level: 2, name: 'Which would you rather have?' })
    ).toBeFocused()
    await expect(
      page
        .getByRole('button', { name: /if this is true: “The bridge opens on time”/ })
        .or(page.getByRole('button', { name: /if this is false: “The bridge opens on time”/ }))
    ).toBeVisible()
    await answerAll(page, true)
    await expect(page.getByRole('textbox', { name: /Resolution criteria/ })).toHaveValue(
      'Open to traffic by noon'
    )
  })

  test('a repeated comparison answered differently is listed with a drop offer for each answer', async ({
    page,
  }) => {
    await startRun(page, 'Thorough')
    const seen = new Set<string>()
    for (
      let i = 0;
      i < 30 && (await page.getByRole('button', { name: /I can.t separate/ }).count()) > 0;
      i++
    ) {
      const chance = await chanceOnScreen(page)
      const key = `${chance}|${await page.getByRole('button', { name: /if this is (true|false)/ }).textContent()}`
      const repeat = seen.has(key)
      seen.add(key)
      // sensible answers, except that a comparison seen before gets the opposite answer
      const claimWins = chance < 50 !== repeat
      if (claimWins) await page.getByRole('button', { name: /if this is (true|false)/ }).click()
      else await page.getByRole('button', { name: /spinner lands/ }).click()
    }
    await expect(page.getByText(/differently when it came back/).first()).toBeVisible()
    await expect(
      page
        .getByRole('button', { name: /^That was a misclick, drop it: .* which disagrees with/ })
        .first()
    ).toBeVisible()
  })

  test('stopping after the first answer gives a coarse, one-sided result', async ({ page }) => {
    await startRun(page, 'Quick')
    await page.getByRole('button', { name: /if this is true/ }).click()
    await page.getByRole('button', { name: 'Stop here' }).click()
    await expect(page.getByText(/^(above|below) /)).toBeVisible()
    await expect(page.getByText(/No single best guess/)).toBeVisible()
    await expect(page.getByText(/This is coarse/)).toBeVisible()
  })
})
