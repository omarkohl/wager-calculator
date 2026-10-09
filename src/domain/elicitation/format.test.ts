import { describe, expect, it } from 'vitest'
import { describeBand } from './format'
import { bandAbove, bandBelow, bandBetween } from './logOdds'

describe('describeBand', () => {
  it('writes a two-sided band with one percent sign', () => {
    expect(describeBand(bandBetween(0.45, 0.62))).toBe('45–62%')
    expect(describeBand(bandBetween(0.032, 0.1))).toBe('3.2–10%')
    expect(describeBand(bandBetween(0.001, 0.02))).toBe('0.1–2%')
  })

  it('says "about" for a band with no width, or one that reads as a single number', () => {
    expect(describeBand(bandBetween(0.5, 0.5))).toBe('about 50%')
    expect(describeBand(bandBetween(0.503, 0.504))).toBe('about 50%')
  })

  it('labels a one-sided band', () => {
    expect(describeBand(bandAbove(0.52))).toBe('above 52%')
    expect(describeBand(bandBelow(0.2))).toBe('below 20%')
  })

  it('has a fallback for no bounds', () => {
    expect(describeBand({ lo: null, hi: null })).toBe('no range yet')
  })
})
