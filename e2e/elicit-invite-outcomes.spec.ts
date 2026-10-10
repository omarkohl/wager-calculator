import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { expectWagerFrom, ownNumbers } from './helpers/bet'

/** The invite link the page offers, after pressing "Copy invite link". */
async function inviteLinkOf(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Copy invite link' }).click()
  return page.getByRole('textbox', { name: 'Invite link' }).inputValue()
}

/** The result link the page offers, after pressing "Copy result link". */
async function resultLinkOf(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Copy result link' }).click()
  return page.getByRole('textbox', { name: 'Result link' }).inputValue()
}

test.describe('Result links for several outcomes and numbers', () => {
  test('a categorical result opens read-only with the same ranges, and can be rated by the friend', async ({
    page,
    context,
  }) => {
    await page.goto('/elicit')
    await page.getByRole('radio', { name: /One of several outcomes/ }).check()
    await page.getByRole('textbox', { name: 'Claim' }).fill('Who wins the vote?')
    await page.getByRole('textbox', { name: 'Amount' }).fill('10')
    await page.getByRole('button', { name: 'Start' }).click()
    for (const [label, tier] of [
      ['Alice', 'likely'],
      ['Bob & Co', 'plausible'],
    ]) {
      await page.getByRole('textbox', { name: 'Outcome' }).fill(label)
      await page.getByRole('radio', { name: tier, exact: true }).check()
      await page.getByRole('button', { name: 'Add outcome' }).click()
    }
    await page.getByRole('button', { name: 'That is all the outcomes' }).click()
    const intro = await page.getByText(/^Check 1 of \d+/).textContent()
    for (let i = 0; i < Number(/of (\d+)/.exec(intro ?? '')?.[1]); i++) {
      await page
        .getByRole('button', { name: 'No, only one can happen' })
        .or(page.getByRole('button', { name: 'No, one of these will happen' }))
        .click()
    }
    await page.getByRole('button', { name: 'Start the questions' }).click()
    // a few answers, so that the replay on the other side has something to check
    for (let i = 0; i < 3; i++) {
      await page
        .getByRole('button', { name: /if the spinner lands|if a ball drawn at random/ })
        .or(page.getByRole('button', { name: 'About equally likely' }))
        .first()
        .click()
    }
    await page.getByRole('button', { name: 'Stop here' }).click()
    await page.getByRole('textbox', { name: 'Alice, percent' }).fill('62.5')
    // (the friend's view says "the first guess" where the sender's says "your first guess")
    const sender = (
      await page.getByRole('list', { name: 'Result per outcome' }).innerText()
    ).replace(/your first guess/g, 'the first guess')
    await page.getByText('Show the full trace of your answers').click()
    const senderSteps = await page
      .getByRole('list', { name: 'Answers' })
      .getByRole('listitem')
      .count()
    expect(senderSteps).toBeGreaterThan(0)
    const link = await resultLinkOf(page)

    const friend = await context.newPage()
    await friend.goto(link)
    await expect(friend.getByRole('heading', { name: 'Their result' })).toBeVisible()
    expect(await friend.getByRole('list', { name: 'Result per outcome' }).innerText()).toBe(sender)
    await expect(friend.getByRole('list', { name: 'Their own numbers' })).toContainText(
      'Alice: 62.5%'
    )
    await expect(friend.getByRole('button', { name: 'Bet on this' })).toHaveCount(0)
    await expect(friend.getByRole('textbox')).toHaveCount(0)
    const results = await new AxeBuilder({ page: friend }).analyze()
    expect(results.violations).toEqual([])
    // the trace is the sender's answers, replayed
    await friend.getByText('Show the full trace of the answers').click()
    await expect(friend.getByRole('list', { name: 'Answers' }).getByRole('listitem')).toHaveCount(
      senderSteps
    )

    // a link that was tampered with shows nothing
    const broken = await context.newPage()
    await broken.goto(link.replace('t=ro', 't=zz'))
    await expect(broken.getByRole('heading', { name: 'Their result' })).toHaveCount(0)

    // rating the same outcomes starts from the gate with them fixed
    await friend.getByRole('button', { name: 'Rate the same outcomes yourself' }).click()
    await expect(friend.getByRole('textbox', { name: 'Claim' })).toBeFocused()
    await expect(
      friend.getByRole('list', { name: 'Outcomes from the invite' }).getByRole('listitem')
    ).toHaveText(['Alice', 'Bob & Co'])
  })

  test('a number result opens read-only with the same parts', async ({ page, context }) => {
    await page.goto('/elicit')
    await page.getByRole('radio', { name: /A number/ }).check()
    await page.getByRole('textbox', { name: 'Claim' }).fill('Noon temperature tomorrow')
    await page.getByRole('textbox', { name: 'Amount' }).fill('10')
    await page.getByRole('button', { name: 'Start' }).click()
    await page.getByRole('textbox', { name: 'Plausible minimum' }).fill('-10')
    await page.getByRole('textbox', { name: 'Plausible maximum' }).fill('30')
    await page.getByRole('textbox', { name: 'Unit (optional)' }).fill('°C')
    await page.getByRole('textbox', { name: 'Threshold' }).fill('0')
    await page.getByRole('button', { name: 'Add threshold' }).click()
    await page.getByRole('button', { name: 'Draw the distribution' }).click()
    const bars = page.getByRole('textbox', { name: /, percent$/ })
    for (const [i, v] of ['5', '10', '25', '30', '20', '10'].entries()) await bars.nth(i).fill(v)
    await page.getByRole('button', { name: 'Start the questions' }).click()
    await page.getByRole('button', { name: 'Stop here' }).click()
    // (the friend's view says "the first guess" where the sender's says "your first guess")
    const sender = (
      await page.getByRole('list', { name: 'Result per outcome' }).innerText()
    ).replace(/your first guess/g, 'the first guess')
    const link = await resultLinkOf(page)

    const friend = await context.newPage()
    await friend.goto(link)
    await expect(friend.getByRole('heading', { name: 'Their result' })).toBeVisible()
    expect(await friend.getByRole('list', { name: 'Result per outcome' }).innerText()).toBe(sender)
    await expect(
      friend.getByRole('button', { name: 'Rate the same ranges yourself' })
    ).toBeVisible()
    await expect(friend.getByRole('button', { name: 'Bet on this' })).toHaveCount(0)
    const results = await new AxeBuilder({ page: friend }).analyze()
    expect(results.violations).toEqual([])
    await friend.reload()
    await expect(friend.getByRole('heading', { name: 'Their result' })).toBeVisible()
  })
})

test.describe('Invites with outcomes or edges', () => {
  test('a friend rates the sender’s outcomes, which they cannot change, and bets on them', async ({
    page,
    context,
  }) => {
    // the sender: three outcomes, stopped at once, to the result
    await page.goto('/elicit')
    await page.getByRole('radio', { name: /One of several outcomes/ }).check()
    await page.getByRole('textbox', { name: 'Claim' }).fill('Who wins the vote?')
    await page.getByRole('textbox', { name: 'Amount' }).fill('10')
    await page.getByRole('button', { name: 'Start' }).click()
    for (const [label, tier] of [
      ['Alice', 'likely'],
      ['Bob & Co', 'plausible'],
      ['Carol', 'very unlikely'],
    ]) {
      await page.getByRole('textbox', { name: 'Outcome' }).fill(label)
      await page.getByRole('radio', { name: tier, exact: true }).check()
      await page.getByRole('button', { name: 'Add outcome' }).click()
    }
    await page.getByRole('button', { name: 'That is all the outcomes' }).click()
    const intro = await page.getByText(/^Check 1 of \d+/).textContent()
    for (let i = 0; i < Number(/of (\d+)/.exec(intro ?? '')?.[1]); i++) {
      await page
        .getByRole('button', { name: 'No, only one can happen' })
        .or(page.getByRole('button', { name: 'No, one of these will happen' }))
        .click()
    }
    await page.getByRole('button', { name: 'Start the questions' }).click()
    await page.getByRole('button', { name: 'Stop here' }).click()
    const link = await inviteLinkOf(page)
    expect(link).not.toContain('likely')

    // the friend, in another tab: the outcomes are given
    const friend = await context.newPage()
    await friend.goto(link)
    const fixed = friend.getByRole('list', { name: 'Outcomes from the invite' })
    await expect(fixed.getByRole('listitem')).toHaveText(['Alice', 'Bob & Co', 'Carol'])
    await expect(friend.getByRole('textbox', { name: 'Claim' })).toHaveValue('Who wins the vote?')
    await expect(friend.getByRole('radio', { name: /One of several outcomes/ })).toHaveCount(0)
    const gateResults = await new AxeBuilder({ page: friend }).analyze()
    expect(gateResults.violations).toEqual([])
    await friend.getByRole('textbox', { name: 'Amount' }).fill('5')
    await friend.getByRole('button', { name: 'Start' }).click()

    // rating only: nothing to add, rename or remove
    await expect(friend.getByRole('heading', { name: 'How likely is each outcome?' })).toBeFocused()
    await expect(friend.getByRole('textbox', { name: 'Outcome' })).toHaveCount(0)
    await expect(friend.getByRole('button', { name: 'That is all rated' })).toBeDisabled()
    for (const [label, tier] of [
      ['Alice', 'plausible'],
      ['Bob & Co', 'likely'],
      ['Carol', 'unlikely'],
    ]) {
      await friend
        .getByRole('group', { name: label, exact: true })
        .getByRole('radio', { name: tier, exact: true })
        .check()
    }
    const ratingResults = await new AxeBuilder({ page: friend }).analyze()
    expect(ratingResults.violations).toEqual([])
    await friend.getByRole('button', { name: 'That is all rated' }).click()

    // no spot checks of the sender's list: the sketch, the questions, the result, the bet
    await expect(friend.getByRole('heading', { name: 'First sketch' })).toBeVisible()
    await friend.getByRole('button', { name: 'Start the questions' }).click()
    await friend.getByRole('button', { name: 'Stop here' }).click()
    // (the starting numbers may already add up to exactly 100%)
    const normalize = friend.getByRole('button', { name: 'Normalize' })
    if (await normalize.isVisible()) await normalize.click()
    const numbers = await ownNumbers(friend)
    expect(numbers.map(n => n.label)).toEqual(['Alice', 'Bob & Co', 'Carol'])
    await friend.getByRole('button', { name: 'Bet on this' }).click()
    await expect(friend).toHaveURL(/\/wager#/)
    await expectWagerFrom(friend, numbers)
  })

  test('a friend draws bars on the sender’s ranges, which they cannot change, and bets on them', async ({
    page,
    context,
  }) => {
    await page.goto('/elicit')
    await page.getByRole('radio', { name: /A number/ }).check()
    await page.getByRole('textbox', { name: 'Claim' }).fill('Noon temperature tomorrow')
    await page.getByRole('textbox', { name: 'Amount' }).fill('10')
    await page.getByRole('button', { name: 'Start' }).click()
    await page.getByRole('textbox', { name: 'Plausible minimum' }).fill('-10')
    await page.getByRole('textbox', { name: 'Plausible maximum' }).fill('30')
    await page.getByRole('textbox', { name: 'Unit (optional)' }).fill('°C')
    await page.getByRole('textbox', { name: 'Threshold' }).fill('0')
    await page.getByRole('button', { name: 'Add threshold' }).click()
    await page.getByRole('button', { name: 'Draw the distribution' }).click()
    const bars = page.getByRole('textbox', { name: /, percent$/ })
    for (const [i, v] of ['5', '10', '25', '30', '20', '10'].entries()) await bars.nth(i).fill(v)
    await page.getByRole('button', { name: 'Start the questions' }).click()
    await page.getByRole('button', { name: 'Stop here' }).click()
    const senderParts = (await ownNumbers(page)).map(n => n.label)
    const link = await inviteLinkOf(page)

    const friend = await context.newPage()
    await friend.goto(link)
    const fixed = friend.getByRole('list', { name: 'Outcomes from the invite' })
    await expect(fixed.getByRole('listitem')).toHaveText(senderParts)
    const gateResults = await new AxeBuilder({ page: friend }).analyze()
    expect(gateResults.violations).toEqual([])
    await friend.getByRole('textbox', { name: 'Amount' }).fill('5')
    await friend.getByRole('button', { name: 'Start' }).click()

    await expect(friend.getByRole('heading', { name: 'Draw your distribution' })).toBeFocused()
    await expect(friend.getByRole('button', { name: 'Draw a curve instead' })).toHaveCount(0)
    await expect(friend.getByRole('button', { name: 'Change the range' })).toHaveCount(0)
    const fields = friend.getByRole('textbox', { name: /, percent$/ })
    await expect(fields).toHaveCount(senderParts.length)
    for (const [i, v] of ['20', '20', '20', '20', '10', '10'].entries()) await fields.nth(i).fill(v)
    await friend.getByRole('button', { name: 'Start the questions' }).click()
    await friend.getByRole('button', { name: 'Stop here' }).click()
    // (the starting numbers may already add up to exactly 100%)
    const normalize = friend.getByRole('button', { name: 'Normalize' })
    if (await normalize.isVisible()) await normalize.click()
    const numbers = await ownNumbers(friend)
    expect(numbers.map(n => n.label)).toEqual(senderParts)
    await friend.getByRole('button', { name: 'Bet on this' }).click()
    await expect(friend).toHaveURL(/\/wager#/)
    await expectWagerFrom(friend, numbers)
  })
})
