import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const separate = (page: Page) => page.getByRole('button', { name: /I can.t separate/ })

async function startRun(page: Page, claim: string) {
  await page.goto('/elicit')
  await page.getByRole('textbox', { name: 'Claim' }).fill(claim)
  await page.getByRole('textbox', { name: 'Amount' }).fill('10')
  await page.getByRole('button', { name: 'Start' }).click()
}

/** A believer at about 50%: the claim wins below 50%, the spinner above. */
async function answerAll(page: Page) {
  for (let i = 0; i < 30 && (await separate(page).count()) > 0; i++) {
    const label = await page.getByRole('img', { name: /of the time/ }).getAttribute('aria-label')
    const chance = Number(/([\d.]+)% of the time/.exec(label!)![1])
    if (chance < 50) await page.getByRole('button', { name: /if this is (true|false)/ }).click()
    else await page.getByRole('button', { name: /spinner lands|a ball drawn at random/ }).click()
  }
}

/** Press a copy button and read the link it shows (the clipboard is not readable in every browser). */
async function copiedLink(
  page: Page,
  button: 'Copy invite link' | 'Copy result link',
  field: string
) {
  await page.getByRole('button', { name: button }).click()
  await expect(page.getByRole('status').filter({ hasText: /copied|Could not copy/ })).toBeVisible()
  return page.getByRole('textbox', { name: field }).inputValue()
}

test.describe('Sharing an elicitation', () => {
  test("an invite opens the gate with the claim and criteria, and brings nothing of the sender's answers", async ({
    page,
    browser,
  }) => {
    await startRun(page, 'The bridge opens on time')
    await answerAll(page)
    await page.getByRole('textbox', { name: /Resolution criteria/ }).fill('Open to traffic by noon')

    const link = await copiedLink(page, 'Copy invite link', 'Invite link')
    const shareAxe = await new AxeBuilder({ page }).analyze()
    expect(shareAxe.violations).toEqual([])
    expect(link).toContain('#ev=1&t=i')
    expect(link).not.toMatch(/&a=|&s=|adj/)

    const friend = await (await browser.newContext()).newPage()
    await friend.goto(link)
    await expect(friend.getByRole('textbox', { name: 'Claim' })).toHaveValue(
      'The bridge opens on time'
    )
    await expect(friend.getByText(/Open to traffic by noon/)).toBeVisible()
    await expect(friend.getByRole('note')).toContainText(/invited/)

    // the friend elicits their own belief, and the address bar is clean from then on
    await friend.getByRole('textbox', { name: 'Amount' }).fill('5')
    await friend.getByRole('button', { name: 'Start' }).click()
    await expect(
      friend.getByRole('heading', { level: 2, name: 'Which would you rather have?' })
    ).toBeVisible()
    expect(friend.url()).not.toContain('#')
    await answerAll(friend)
    await expect(friend.getByRole('textbox', { name: /Resolution criteria/ })).toHaveValue(
      'Open to traffic by noon'
    )
    await friend.context().close()
  })

  test('a result link shows the same result, read-only, and "elicit your own" starts from its claim', async ({
    page,
    browser,
  }) => {
    await startRun(page, 'The bridge opens on time')
    await answerAll(page)
    await page.getByRole('textbox', { name: /Resolution criteria/ }).fill('Open to traffic by noon')
    await page.getByRole('textbox', { name: 'Your adjusted belief (%)' }).fill('61.5')
    const headline = await page
      .getByRole('heading', { name: /Your answers say the chance is/ })
      .textContent()

    const link = await copiedLink(page, 'Copy result link', 'Result link')
    expect(link).toContain('#ev=1&t=r')

    const friend = await (await browser.newContext()).newPage()
    await friend.goto(link)
    await expect(friend.getByText(/The claim:/)).toContainText('The bridge opens on time')
    await expect(friend.getByRole('heading', { name: /The answers say the chance is/ })).toHaveText(
      headline!.replace('Your answers', 'The answers')
    )
    await expect(friend.getByText('61.5%', { exact: true })).toBeVisible()
    await expect(friend.getByText(/shared result/)).toBeVisible()
    await expect(friend.getByText(/Resolution criteria:/)).toContainText('Open to traffic by noon')
    // read-only: nothing to edit, drop or share from here
    await expect(friend.getByRole('textbox')).toHaveCount(0)
    await expect(friend.getByRole('button', { name: /Copy|drop it|Stop here/ })).toHaveCount(0)
    // the trace is there, recomputed
    await friend.getByText('Show the full trace of the answers').click()
    await expect(friend.getByText(/^Answer 1\./)).toBeVisible()

    const results = await new AxeBuilder({ page: friend }).analyze()
    expect(results.violations).toEqual([])

    await friend.getByRole('button', { name: 'Elicit your own belief on this claim' }).click()
    await expect(friend.getByRole('textbox', { name: 'Claim' })).toHaveValue(
      'The bridge opens on time'
    )
    expect(friend.url()).toContain('#ev=1&t=i')
    expect(friend.url()).not.toContain('&a=')

    // a link pasted into the same tab is read, too
    await friend.evaluate(url => {
      window.location.hash = new URL(url).hash
    }, link)
    await expect(friend.getByText(/shared result/)).toBeVisible()
    await friend.context().close()
  })
})
