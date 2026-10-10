import { describe, expect, it } from 'vitest'
import { describeLottery, describeLotteryWin, lotteryForm, lotteryNoun } from './lottery'

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
    expect(describeLottery(0.0004)).toBe(
      'One ball is drawn at random from 1 winning ball out of 1000: it wins 0.1% of the time'
    )
    expect(lotteryForm(0.0995).kind).toBe('wedge')
    expect(describeLottery(0.0995)).toContain('10%')
    expect(describeLottery(0.9645)).toBe(
      'One ball is drawn at random from 964 winning balls and 36 losing balls out of 1000: it wins 96.4% of the time'
    )
  })
})

describe('describeLottery', () => {
  it('always carries the probability', () => {
    expect(describeLottery(0.45)).toBe('A spinner with a shaded wedge that wins 45% of the time')
    expect(describeLottery(0.03)).toBe(
      'One ball is drawn at random from 3 winning balls out of 100: it wins 3% of the time'
    )
    expect(describeLottery(0.036)).toBe(
      'One ball is drawn at random from 36 winning balls out of 1000: it wins 3.6% of the time'
    )
    expect(describeLottery(0.001)).toBe(
      'One ball is drawn at random from 1 winning ball out of 1000: it wins 0.1% of the time'
    )
  })

  it('names the losing balls too in the upper tail', () => {
    expect(describeLottery(0.97)).toBe(
      'One ball is drawn at random from 97 winning balls and 3 losing balls out of 100: it wins 97% of the time'
    )
    expect(describeLottery(0.999)).toBe(
      'One ball is drawn at random from 999 winning balls and 1 losing ball out of 1000: it wins 99.9% of the time'
    )
  })
})

describe('the words that match the visual', () => {
  it('speaks of a spinner and its shaded part only when a spinner is shown', () => {
    expect(lotteryNoun(0.45)).toBe('spinner')
    expect(describeLotteryWin(0.45)).toBe('the spinner lands in the shaded part')
  })
  it('speaks of a ball drawn at random in the tails, never of a spinner or an area', () => {
    for (const p of [0.03, 0.001, 0.97, 0.999]) {
      expect(lotteryNoun(p)).toBe('ball draw')
      expect(describeLotteryWin(p)).toBe('a ball drawn at random is a winning ball')
      expect(describeLottery(p)).not.toMatch(/spinner|shaded|wedge/i)
    }
  })
  it('switches where the visual switches', () => {
    expect(lotteryNoun(0.1)).toBe('spinner')
    expect(lotteryNoun(0.0999)).toBe('spinner')
    expect(lotteryNoun(0.09)).toBe('ball draw')
  })
})
