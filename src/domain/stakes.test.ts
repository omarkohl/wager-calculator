import { describe, it, expect } from 'vitest'
import {
  getStakesSymbol,
  getStakeOption,
  isDiscreteStake,
  formatPayout,
  NON_MONETARY_OPTIONS,
  CURRENCY_OPTIONS,
} from './stakes'

describe('stakes metadata', () => {
  describe('NON_MONETARY_OPTIONS', () => {
    it('has emoji symbols for all non-monetary options', () => {
      const expectedSymbols: Record<string, string> = {
        cookies: '🍪',
        hugs: '🤗',
        'i-was-wrong': '🏳️',
        other: '🃏',
      }

      NON_MONETARY_OPTIONS.forEach(option => {
        expect(option.symbol).toBe(expectedSymbols[option.id])
      })
    })

    it('has isDiscrete=true for discrete non-monetary options (except other)', () => {
      // "other" is not discrete since it could be any unit including unlisted currencies
      const discreteOptions = NON_MONETARY_OPTIONS.filter(o => o.id !== 'other')
      discreteOptions.forEach(option => {
        expect(option.isDiscrete).toBe(true)
      })
      expect(NON_MONETARY_OPTIONS.find(o => o.id === 'other')?.isDiscrete).toBe(false)
    })

    it('has unit metadata for discrete stakes', () => {
      const cookies = NON_MONETARY_OPTIONS.find(o => o.id === 'cookies')
      expect(cookies?.unitSingular).toBe('cookie')
      expect(cookies?.unitPlural).toBe('cookies')

      const hugs = NON_MONETARY_OPTIONS.find(o => o.id === 'hugs')
      expect(hugs?.unitSingular).toBe('hug')
      expect(hugs?.unitPlural).toBe('hugs')

      const iWasWrong = NON_MONETARY_OPTIONS.find(o => o.id === 'i-was-wrong')
      expect(iWasWrong?.unitSingular).toBe("'I was wrong' admission")
      expect(iWasWrong?.unitPlural).toBe("'I was wrong' admissions")
    })
  })

  describe('CURRENCY_OPTIONS', () => {
    it('has isDiscrete=false for all currency options', () => {
      CURRENCY_OPTIONS.forEach(option => {
        expect(option.isDiscrete).toBe(false)
      })
    })
  })

  describe('getStakesSymbol', () => {
    it('returns emoji for non-monetary stakes', () => {
      expect(getStakesSymbol('cookies')).toBe('🍪')
      expect(getStakesSymbol('hugs')).toBe('🤗')
      expect(getStakesSymbol('i-was-wrong')).toBe('🏳️')
      expect(getStakesSymbol('other')).toBe('🃏')
    })

    it('returns currency symbol for monetary stakes', () => {
      expect(getStakesSymbol('usd')).toBe('$')
      expect(getStakesSymbol('eur')).toBe('€')
      expect(getStakesSymbol('gbp')).toBe('£')
    })

    it('returns id for unknown stakes', () => {
      expect(getStakesSymbol('unknown')).toBe('unknown')
    })
  })

  describe('getStakeOption', () => {
    it('returns the stake option by id', () => {
      const usd = getStakeOption('usd')
      expect(usd?.id).toBe('usd')
      expect(usd?.symbol).toBe('$')
    })

    it('returns undefined for unknown id', () => {
      expect(getStakeOption('unknown')).toBeUndefined()
    })
  })

  describe('isDiscreteStake', () => {
    it('returns true for discrete non-monetary stakes', () => {
      expect(isDiscreteStake('cookies')).toBe(true)
      expect(isDiscreteStake('hugs')).toBe(true)
      expect(isDiscreteStake('i-was-wrong')).toBe(true)
    })

    it('returns false for "other" since it could be any unit', () => {
      expect(isDiscreteStake('other')).toBe(false)
    })

    it('returns false for currency stakes', () => {
      expect(isDiscreteStake('usd')).toBe(false)
      expect(isDiscreteStake('eur')).toBe(false)
      expect(isDiscreteStake('gbp')).toBe(false)
    })

    it('returns false for unknown stakes', () => {
      expect(isDiscreteStake('unknown')).toBe(false)
    })
  })
})

describe('formatPayout', () => {
  describe('currency stakes', () => {
    it('formats positive amounts with symbol suffix', () => {
      const result = formatPayout(10.52, 'usd')
      expect(result.compact).toBe('+10.52 $')
      expect(result.compactAmount).toBe('+10.52')
      expect(result.symbol).toBe('$')
      expect(result.verbose).toBe('+10.52 $')
      expect(result.roundedAmount).toBe(10.52)
    })

    it('formats negative amounts with symbol suffix', () => {
      const result = formatPayout(-10.52, 'usd')
      expect(result.compact).toBe('-10.52 $')
      expect(result.verbose).toBe('-10.52 $')
      expect(result.roundedAmount).toBe(-10.52)
    })

    it('formats zero amounts', () => {
      const result = formatPayout(0, 'usd')
      expect(result.compact).toBe('0.00 $')
      expect(result.verbose).toBe('0.00 $')
      expect(result.roundedAmount).toBe(0)
    })

    it('handles different currency symbols', () => {
      expect(formatPayout(5, 'eur').compact).toBe('+5.00 €')
      expect(formatPayout(5, 'gbp').compact).toBe('+5.00 £')
      expect(formatPayout(5, 'jpy').compact).toBe('+5.00 ¥')
    })
  })

  describe('discrete stakes', () => {
    it('rounds to nearest integer', () => {
      const result = formatPayout(4.52, 'cookies')
      expect(result.roundedAmount).toBe(5)
      expect(result.rawAmount).toBe(4.52)
    })

    it('rounds down when below .5', () => {
      const result = formatPayout(4.3, 'cookies')
      expect(result.roundedAmount).toBe(4)
    })

    it('enforces minimum of 1 for positive non-zero amounts', () => {
      const result = formatPayout(0.2, 'cookies')
      expect(result.roundedAmount).toBe(1)
    })

    it('enforces minimum of -1 for negative non-zero amounts', () => {
      const result = formatPayout(-0.2, 'cookies')
      expect(result.roundedAmount).toBe(-1)
    })

    it('keeps zero as zero', () => {
      const result = formatPayout(0, 'cookies')
      expect(result.roundedAmount).toBe(0)
      expect(result.compact).toBe('0 🍪')
    })

    it('formats compact with raw amount and emoji symbol (for net payouts)', () => {
      // Compact shows raw amounts - not rounded - for precise calculation display
      expect(formatPayout(5, 'cookies').compact).toBe('+5.00 🍪')
      expect(formatPayout(-3, 'hugs').compact).toBe('-3.00 🤗')
      expect(formatPayout(2.7, 'i-was-wrong').compact).toBe('+2.70 🏳️')
    })

    it('formats verbose with raw amount and unit names', () => {
      // Verbose shows raw amounts - not rounded
      expect(formatPayout(1, 'cookies').verbose).toBe('+1.00 cookie')
      expect(formatPayout(5, 'cookies').verbose).toBe('+5.00 cookies')
      expect(formatPayout(-1, 'hugs').verbose).toBe('-1.00 hug')
      expect(formatPayout(-3.5, 'hugs').verbose).toBe('-3.50 hugs')
    })

    it('formats i-was-wrong verbose correctly', () => {
      expect(formatPayout(1, 'i-was-wrong').verbose).toBe("+1.00 'I was wrong' admission")
      expect(formatPayout(5.25, 'i-was-wrong').verbose).toBe("+5.25 'I was wrong' admissions")
    })

    it('tracks when rounding occurred', () => {
      const result = formatPayout(4.52, 'cookies')
      expect(result.wasRounded).toBe(true)
      expect(result.roundedAmount).toBe(5)
    })

    it('tracks when no rounding occurred', () => {
      const result = formatPayout(5, 'cookies')
      expect(result.wasRounded).toBe(false)
      expect(result.roundedAmount).toBe(5)
    })
  })

  describe('settlement text', () => {
    it('formats currency settlement with symbol suffix', () => {
      const result = formatPayout(10.52, 'usd')
      expect(result.settlement).toBe('10.52 $')
    })

    it('formats discrete settlement with units', () => {
      const result = formatPayout(5, 'cookies')
      expect(result.settlement).toBe('5 cookies')
    })

    it('uses singular for 1', () => {
      const result = formatPayout(1, 'cookies')
      expect(result.settlement).toBe('1 cookie')
    })

    it('formats i-was-wrong settlement', () => {
      const result = formatPayout(3, 'i-was-wrong')
      expect(result.settlement).toBe("3 'I was wrong' admissions")
    })

    it('includes rounding info in settlement for discrete stakes', () => {
      const result = formatPayout(4.52, 'cookies')
      expect(result.settlement).toBe('5 cookies (from 4.52)')
    })
  })
})
