import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import {
  adjustmentGap,
  defaultAdjusted,
  describeBand,
  describeGap,
  parseAdjusted,
  parseBar,
  parseHeight,
  parseNumber,
  plainNumber,
  isAmbiguousNumber,
} from './format'
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

describe('adjustmentGap and describeGap', () => {
  const band = bandBetween(0.4, 0.6)

  it('is no gap inside the band, edges included', () => {
    for (const v of [0.4, 0.5, 0.6]) expect(adjustmentGap(v, band)).toBe('inside')
  })

  it('says above or below outside it', () => {
    expect(adjustmentGap(0.61, band)).toBe('above')
    expect(adjustmentGap(0.39, band)).toBe('below')
  })

  it('only knows the side a one-sided band bounds', () => {
    expect(adjustmentGap(0.99, bandAbove(0.52))).toBe('inside')
    expect(adjustmentGap(0.3, bandAbove(0.52))).toBe('below')
    expect(adjustmentGap(0.01, bandBelow(0.2))).toBe('inside')
    expect(adjustmentGap(0.5, bandBelow(0.2))).toBe('above')
  })

  it('words the gap for someone else\'s value without "you"', () => {
    expect(describeGap('above', true)).toBe('This was set above what the answers implied.')
    expect(describeGap('below', true)).toBe('This was set below what the answers implied.')
    expect(describeGap('inside', true)).toBe('This was set within what the answers implied.')
  })

  it('words the gap neutrally', () => {
    expect(describeGap('above')).toBe('You set this above what your answers implied.')
    expect(describeGap('below')).toBe('You set this below what your answers implied.')
    for (const gap of ['above', 'below', 'inside'] as const) {
      expect(describeGap(gap)).not.toMatch(/wrong|should|mistake|error|irrational|too /i)
    }
  })
})

describe('parseAdjusted and defaultAdjusted', () => {
  it('accepts a percentage with up to two decimals and writes it without trailing zeros', () => {
    expect(parseAdjusted('47.5')).toBe('47.5')
    expect(parseAdjusted(' 47.50 ')).toBe('47.5')
    expect(parseAdjusted('07')).toBe('7')
    expect(parseAdjusted('0.05')).toBe('0.05')
    expect(parseAdjusted('99.99')).toBe('99.99')
  })

  it('rejects everything else', () => {
    for (const text of [
      '',
      ' ',
      '0',
      '0.00',
      '100',
      '120',
      '-5',
      'abc',
      '4,5',
      '1.234',
      '12%',
      '.5',
    ])
      expect(parseAdjusted(text), text).toBeNull()
  })

  it('shows the point estimate in percent with at most two decimals', () => {
    expect(defaultAdjusted(0.5)).toBe('50')
    expect(defaultAdjusted(0.5768)).toBe('57.68')
    expect(defaultAdjusted(0.0324)).toBe('3.24')
    expect(parseAdjusted(defaultAdjusted(0.0324))).toBe('3.24')
  })
})

describe('parseBar, parseNumber', () => {
  it('reads a bar from 0 to 100, with a comma or percent sign', () => {
    expect(parseBar('0')).toBe('0')
    expect(parseBar('100')).toBe('100')
    expect(parseBar(' 12,5% ')).toBe('12.5')
    expect(parseBar('100.5')).toBeNull()
    expect(parseBar('-1')).toBeNull()
    expect(parseBar('1.234')).toBeNull()
    expect(parseBar('')).toBeNull()
  })
  it('does not guess at "1,000", and reads ".5" and "5."', () => {
    expect(parseNumber('1,000')).toBeNull()
    expect(isAmbiguousNumber('1,000')).toBe(true)
    expect(isAmbiguousNumber('1,000,000')).toBe(true)
    expect(isAmbiguousNumber('12,5')).toBe(false)
    expect(isAmbiguousNumber('1,0000')).toBe(false)
    expect(parseNumber('1000')).toBe('1000')
    expect(parseNumber('1.000')).toBe('1')
    expect(parseNumber('.5')).toBe('0.5')
    expect(parseNumber('5.')).toBe('5')
    expect(parseNumber('-.5')).toBe('-0.5')
    expect(parseNumber('.')).toBeNull()
  })
  it('keeps percentages strict: "1,000" is no percentage either', () => {
    expect(parseBar('1,000')).toBeNull()
    expect(parseAdjusted('1,000')).toBeNull()
  })
  it('reads a number with an optional minus', () => {
    expect(parseNumber('-12,50')).toBe('-12.5')
    expect(parseNumber('0')).toBe('0')
    expect(parseNumber('1e5')).toBeNull()
    expect(parseNumber('abc')).toBeNull()
    expect(parseNumber('')).toBeNull()
  })
})

describe('parseHeight', () => {
  it('reads a plain number from 0 to 100, and refuses a percentage', () => {
    expect(parseHeight('0')).toBe('0')
    expect(parseHeight(' 12,5 ')).toBe('12.5')
    expect(parseHeight('100')).toBe('100')
    expect(parseHeight('12%')).toBeNull()
    expect(parseHeight('101')).toBeNull()
    expect(parseHeight('-1')).toBeNull()
    expect(parseHeight('')).toBeNull()
  })
})

describe('plainNumber', () => {
  it('never uses exponent form, rounds to ten decimals, and reads back through parseNumber', () => {
    expect(plainNumber(new Decimal('5e-8'))).toBe('0.00000005')
    expect(plainNumber(new Decimal('1e21'))).toBe('1000000000000000000000')
    expect(plainNumber('0.123456789012345')).toBe('0.123456789')
    expect(plainNumber('-0')).toBe('0')
    expect(parseNumber(plainNumber(new Decimal('5e-8')))).toBe('0.00000005')
  })
})
