import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import {
  GRID_MAX_LOGIT,
  GRID_MIN_LOGIT,
  bandAbove,
  bandBelow,
  bandBetween,
  bandMidpoint,
  bandWidthLogit,
  clampToGrid,
  expit,
  formatPercent,
  fromPercent,
  isOneSided,
  logit,
  snapToGrid,
  stepWedge,
  toPercent,
} from './logOdds'

const close = (actual: Decimal | null, expected: number, digits = 6) => {
  expect(actual).not.toBeNull()
  expect(actual!.toNumber()).toBeCloseTo(expected, digits)
}

describe('logit and expit', () => {
  it('puts 50% at zero and is antisymmetric', () => {
    expect(logit(0.5).toNumber()).toBe(0)
    close(logit(0.1), -logit(0.9).toNumber())
  })

  it('knows a few values', () => {
    close(logit(0.9), Math.log(9))
    close(logit(0.01), -Math.log(99))
  })

  it('round-trips', () => {
    for (const p of [0.001, 0.01, 0.1, 0.35, 0.5, 0.77, 0.99, 0.999]) {
      close(expit(logit(p)), p, 12)
    }
  })

  it('rejects probabilities of 0, 1 and beyond', () => {
    for (const p of [0, 1, -0.1, 1.2]) expect(() => logit(p)).toThrow(RangeError)
  })

  it('measures the tails in logits: 1% vs 11% is about 2.5 logits', () => {
    close(logit(0.11).minus(logit(0.01)), 2.5, 1)
  })
})

describe('the wedge grid', () => {
  it('bottoms out at 1-in-1000 and tops out at 999-in-1000', () => {
    close(expit(GRID_MIN_LOGIT), 0.001, 12)
    close(expit(GRID_MAX_LOGIT), 0.999, 12)
  })

  it('clamps to the grid', () => {
    expect(clampToGrid(0.0001).toNumber()).toBe(0.001)
    expect(clampToGrid(0.99999).toNumber()).toBe(0.999)
    expect(clampToGrid(0.4).toNumber()).toBe(0.4)
  })

  it('steps roughly evenly in log-odds, not in percent', () => {
    let p = new Decimal(0.5)
    const ladder = [p]
    for (let i = 0; i < 4; i++) {
      p = stepWedge(p, -1.1)
      ladder.push(p)
    }
    expect(ladder.map(x => formatPercent(x))).toEqual(['50%', '25%', '10%', '3.6%', '1.2%'])
    for (let i = 1; i < ladder.length; i++) {
      // snapped to the display grid, so within a rounding error of the exact step
      expect(
        Math.abs(
          logit(ladder[i])
            .minus(logit(ladder[i - 1]))
            .toNumber() + 1.1
        )
      ).toBeLessThan(0.06)
    }
  })

  it('returns exactly the number it displays', () => {
    for (const start of [0.5, 0.37, 0.12, 0.05, 0.002, 0.95, 0.999]) {
      for (const delta of [-2, -1.1, -0.3, 0.05, 0.3, 1.1, 2]) {
        const w = stepWedge(start, delta)
        expect(snapToGrid(w).eq(w)).toBe(true)
        const shown = new Decimal(formatPercent(w).replace('%', ''))
        expect(fromPercent(shown).eq(w)).toBe(true)
      }
    }
  })

  it('moves monotonically down and up, never stalling or overshooting', () => {
    for (const delta of [-1.1, -0.3, -0.05]) {
      let p = new Decimal(0.65)
      for (let i = 0; i < 400 && p.gt(0.001); i++) {
        const next = stepWedge(p, delta)
        expect(next.lt(p)).toBe(true)
        // no step is bigger than the exact one plus a rounding error (above the tails,
        // where one display unit is a coarse logit step)
        if (p.lt(0.05)) {
          p = next
          continue
        }
        const moved = logit(p).minus(logit(next)).toNumber()
        expect(moved).toBeLessThan(-delta + 0.2)
        p = next
      }
      expect(p.toNumber()).toBe(0.001)
    }
    let p = new Decimal(0.35)
    for (let i = 0; i < 600 && p.lt(0.999); i++) {
      const next = stepWedge(p, 0.05)
      expect(next.gt(p)).toBe(true)
      p = next
    }
    expect(p.toNumber()).toBe(0.999)
  })

  it('snaps p and 1 - p alike', () => {
    for (const p of [0.5, 0.123, 0.0357, 0.0042, 0.2674]) {
      expect(snapToGrid(new Decimal(1).minus(p)).toString()).toBe(
        new Decimal(1).minus(snapToGrid(p)).toString()
      )
    }
  })

  it('never leaves the grid', () => {
    expect(stepWedge(0.002, -5).toNumber()).toBe(0.001)
    expect(stepWedge(0.998, 5).toNumber()).toBe(0.999)
  })
})

describe('the percent boundary', () => {
  it('converts both ways without float noise', () => {
    expect(fromPercent(45).toString()).toBe('0.45')
    expect(fromPercent('0.1').toString()).toBe('0.001')
    expect(toPercent(0.45).toString()).toBe('45')
  })

  it('rejects 0, 100 and beyond', () => {
    for (const x of [0, 100, -5, 120]) expect(() => fromPercent(x)).toThrow(RangeError)
  })

  it('formats for reading: whole in the middle, decimals in the tails', () => {
    expect(formatPercent(0.45)).toBe('45%')
    expect(formatPercent(0.1)).toBe('10%')
    expect(formatPercent(0.032)).toBe('3.2%')
    expect(formatPercent(0.03)).toBe('3%')
    expect(formatPercent(0.001)).toBe('0.1%')
    expect(formatPercent(0.999)).toBe('99.9%')
    expect(formatPercent(0.9677)).toBe('96.8%')
    expect(formatPercent(0.0004)).toBe('0.04%')
  })

  it('shows p and 1 - p as complements', () => {
    for (const p of [0.0357, 0.0042, 0.123, 0.2674, 0.00049, 0.5, 0.0999]) {
      const low = Number(formatPercent(p).replace(/[<>%]/g, ''))
      const high = Number(formatPercent(new Decimal(1).minus(p)).replace(/[<>%]/g, ''))
      expect(Number((low + high).toFixed(6))).toBe(100)
    }
  })

  it('has no trailing zeros and never shows 0% or 100%', () => {
    expect(formatPercent(0.00099)).toBe('0.1%')
    expect(formatPercent(0.0000001)).toBe('<0.01%')
    expect(formatPercent(0.9999999)).toBe('>99.99%')
    expect(formatPercent(0.04)).toBe('4%')
    expect(formatPercent(0.0999)).toBe('10%')
  })
})

describe('bands', () => {
  it('orders the two ends whichever way round they come', () => {
    const band = bandBetween(0.6, 0.45)
    expect(band.lo!.toNumber()).toBe(0.45)
    expect(band.hi!.toNumber()).toBe(0.6)
  })

  it('measures width in logits: 1-16% is wide, not "15 points"', () => {
    close(bandWidthLogit(bandBetween(0.01, 0.16)), 2.94, 2)
    close(bandWidthLogit(bandBetween(0.5, 0.5)), 0)
  })

  it('puts the point estimate at the log-odds midpoint: 1-10% is about 3.2%', () => {
    close(bandMidpoint(bandBetween(0.01, 0.1)), 0.0324, 3)
    close(bandMidpoint(bandBetween(0.4, 0.6)), 0.5, 12)
  })

  it('rejects ends outside the open interval (0, 1)', () => {
    expect(() => bandBetween(0, 0.5)).toThrow(RangeError)
    expect(() => bandBetween(0.5, 1)).toThrow(RangeError)
    expect(() => bandAbove(1)).toThrow(RangeError)
    expect(() => bandBelow(0)).toThrow(RangeError)
  })

  it('has no width and no midpoint when one-sided', () => {
    const above = bandAbove(0.52)
    const below = bandBelow(0.2)
    expect(above.hi).toBeNull()
    expect(below.lo).toBeNull()
    for (const band of [above, below]) {
      expect(isOneSided(band)).toBe(true)
      expect(bandWidthLogit(band)).toBeNull()
      expect(bandMidpoint(band)).toBeNull()
    }
    expect(isOneSided(bandBetween(0.1, 0.2))).toBe(false)
  })
})
