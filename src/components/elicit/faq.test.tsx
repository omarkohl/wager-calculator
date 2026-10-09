import { describe, expect, it } from 'vitest'
import { ELICIT_FAQ_ENTRIES, isElicitFaqId } from './faq'
import { FAQ_ENTRIES } from '../faq'

describe('ELICIT_FAQ_ENTRIES', () => {
  it('covers the method, log-odds, the range and the stake', () => {
    expect(ELICIT_FAQ_ENTRIES.map(e => e.id)).toEqual([
      'how-it-works',
      'why-log-odds',
      'why-a-band',
      'why-a-stake',
    ])
  })

  it("has unique ids, none of them shared with the wager calculator's FAQ", () => {
    const ids = ELICIT_FAQ_ENTRIES.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    const wagerIds = new Set<string>(FAQ_ENTRIES.map(e => e.id))
    expect(ids.some(id => wagerIds.has(id))).toBe(false)
  })

  it('recognises its own ids only', () => {
    expect(isElicitFaqId('why-log-odds')).toBe(true)
    expect(isElicitFaqId('why-bet')).toBe(false)
    expect(isElicitFaqId(null)).toBe(false)
  })
})
