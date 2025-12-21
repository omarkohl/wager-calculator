import { describe, it, expect } from '@jest/globals'
import { scaleProbabilities, scaleProbabilitiesPercent, checkExtremePayouts } from '../../src/modules/validation'

describe('Probability Utilities', () => {
  describe('scaleProbabilities', () => {
    it('should scale probabilities to sum to 1', () => {
      const probabilities = [0.6, 0.5] // sum = 1.1
      const scaled = scaleProbabilities(probabilities)

      expect(scaled[0]).toBeCloseTo(0.6 / 1.1, 10)
      expect(scaled[1]).toBeCloseTo(0.5 / 1.1, 10)

      const sum = scaled.reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1.0, 10)
    })

    it('should handle already normalized probabilities', () => {
      const probabilities = [0.7, 0.3] // sum = 1.0
      const scaled = scaleProbabilities(probabilities)

      expect(scaled).toEqual([0.7, 0.3])
    })

    it('should throw error for zero sum', () => {
      expect(() => scaleProbabilities([0, 0])).toThrow(
        'Cannot scale probabilities that sum to zero'
      )
    })
  })

  describe('scaleProbabilitiesPercent', () => {
    it('should scale percentage probabilities to sum to 100%', () => {
      const probabilities = [60, 50] // sum = 110
      const scaled = scaleProbabilitiesPercent(probabilities)

      expect(scaled[0]).toBeCloseTo((60 / 110) * 100, 10) // ≈ 54.55%
      expect(scaled[1]).toBeCloseTo((50 / 110) * 100, 10) // ≈ 45.45%

      const sum = scaled.reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(100, 10)
    })

    it('should handle multi-categorical scenarios', () => {
      const probabilities = [30, 40, 50] // sum = 120
      const scaled = scaleProbabilitiesPercent(probabilities)

      expect(scaled[0]).toBeCloseTo(25, 10) // 30/120 * 100 = 25%
      expect(scaled[1]).toBeCloseTo(33.333333, 5) // 40/120 * 100 = 33.33%
      expect(scaled[2]).toBeCloseTo(41.666667, 5) // 50/120 * 100 = 41.67%

      const sum = scaled.reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(100, 10)
    })
  })

  describe('checkExtremePayouts', () => {
    it('should detect extreme low probabilities', () => {
      const probabilities = [2, 98] // 2% is very low
      const warnings = checkExtremePayouts(probabilities)

      expect(warnings).toContain(
        'Category 1 has very low probability (2%) - this may result in large payouts'
      )
    })

    it('should detect extreme high probabilities', () => {
      const probabilities = [3, 97] // 97% is very high
      const warnings = checkExtremePayouts(probabilities)

      expect(warnings).toContain(
        'Category 2 has very high probability (97%) - this may result in large payouts'
      )
    })

    it('should detect both extremes', () => {
      const probabilities = [2, 98]
      const warnings = checkExtremePayouts(probabilities)

      expect(warnings).toHaveLength(2)
      expect(warnings[0]).toContain('very low probability')
      expect(warnings[1]).toContain('very high probability')
    })

    it('should return no warnings for moderate probabilities', () => {
      const probabilities = [30, 40, 30]
      const warnings = checkExtremePayouts(probabilities)

      expect(warnings).toHaveLength(0)
    })

    it('should respect custom threshold', () => {
      const probabilities = [8, 92]
      const warnings = checkExtremePayouts(probabilities, 10) // 10% threshold

      expect(warnings).toHaveLength(2)
      expect(warnings[0]).toContain('very low probability (8%)')
      expect(warnings[1]).toContain('very high probability (92%)')
    })
  })
})
