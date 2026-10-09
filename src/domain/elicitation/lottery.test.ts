import { describe, expect, it } from 'vitest'
import { describeLottery, lotteryForm } from './lottery'

describe('lotteryForm', () => {
  it('is an area from 10% to 90%, boundaries included', () => {
    for (const p of [0.1, 0.25, 0.5, 0.9]) expect(lotteryForm(p).kind).toBe('wedge')
  })

  it('is a count in the tails, out of 100 for whole percents', () => {
    expect(lotteryForm(0.03)).toEqual({ kind: 'count', winning: 3, losing: 97, total: 100 })
    expect(lotteryForm(0.01)).toEqual({ kind: 'count', winning: 1, losing: 99, total: 100 })
    expect(lotteryForm(0.97)).toEqual({ kind: 'count', winning: 97, losing: 3, total: 100 })
  })

  it('is a count out of 1000 for fractions of a percent, down to 1 in 1000', () => {
    expect(lotteryForm(0.036)).toEqual({ kind: 'count', winning: 36, losing: 964, total: 1000 })
    expect(lotteryForm(0.001)).toEqual({ kind: 'count', winning: 1, losing: 999, total: 1000 })
    expect(lotteryForm(0.999)).toEqual({ kind: 'count', winning: 999, losing: 1, total: 1000 })
    expect(lotteryForm(0.099)).toEqual({ kind: 'count', winning: 99, losing: 901, total: 1000 })
    expect(lotteryForm(0.901)).toEqual({ kind: 'count', winning: 901, losing: 99, total: 1000 })
  })

  it('rejects chances of 0, 1 and beyond', () => {
    for (const p of [0, 1, -0.2, 1.5]) expect(() => lotteryForm(p)).toThrow(RangeError)
  })
})

describe('off-grid input: the counts always agree with the label', () => {
  it.each([0.0004, 0.0995, 0.9645, 0.0996, 0.00149, 0.9995, 0.1004, 0.0357])('%s', p => {
    const name = describeLottery(p)
    const form = lotteryForm(p)
    const shown = /([\d.]+)% of the time/.exec(name)![1]
    if (form.kind === 'count') {
      expect(form.winning + form.losing).toBe(form.total)
      expect(form.winning).toBeGreaterThanOrEqual(1)
      expect(form.losing).toBeGreaterThanOrEqual(1)
      // winners / total is the number shown (to the precision it is shown with)
      expect((form.winning / form.total) * 100).toBeCloseTo(Number(shown), 6)
    } else {
      expect(name).toContain(`${shown}%`)
    }
  })

  it('snaps first: 0.0004 is the 1-in-1000 floor, 0.0995 is the 10% area', () => {
    expect(lotteryForm(0.0004)).toMatchObject({ kind: 'count', winning: 1, total: 1000 })
    expect(describeLottery(0.0004)).toBe('1 winning ball out of 1000, 0.1% of the time')
    expect(lotteryForm(0.0995).kind).toBe('wedge')
    expect(describeLottery(0.0995)).toContain('10%')
    expect(describeLottery(0.9645)).toBe(
      '964 winning balls and 36 losing balls out of 1000, 96.4% of the time'
    )
  })
})

describe('describeLottery', () => {
  it('always carries the probability', () => {
    expect(describeLottery(0.45)).toBe('A spinner with a shaded wedge that wins 45% of the time')
    expect(describeLottery(0.03)).toBe('3 winning balls out of 100, 3% of the time')
    expect(describeLottery(0.036)).toBe('36 winning balls out of 1000, 3.6% of the time')
    expect(describeLottery(0.001)).toBe('1 winning ball out of 1000, 0.1% of the time')
  })

  it('names the losing balls too in the upper tail', () => {
    expect(describeLottery(0.97)).toBe(
      '97 winning balls and 3 losing balls out of 100, 97% of the time'
    )
    expect(describeLottery(0.999)).toBe(
      '999 winning balls and 1 losing ball out of 1000, 99.9% of the time'
    )
  })
})
