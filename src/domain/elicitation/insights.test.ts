import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import {
  buildInsights,
  canBet,
  describeTotal,
  mergeOffer,
  normalizePercents,
  normalizePercentsAtLeast,
  oneInN,
  orderDisagreements,
  topCoverage,
  totalState,
  type ResultBucket,
} from './insights'

const b = (id: string, p: number, label = id): ResultBucket => ({
  id,
  label,
  estimate: new Decimal(p),
})
const dec = (...xs: number[]) => xs.map(x => new Decimal(x))
const num = (xs: Decimal[]) => xs.map(x => x.toNumber())

describe('topCoverage', () => {
  it('names the top two and what they cover', () => {
    const r = topCoverage([b('rain', 0.5), b('sun', 0.3), b('fog', 0.15), b('snow', 0.05)])!
    expect(r.ids).toEqual(['rain', 'sun'])
    expect(r.coverage.toNumber()).toBeCloseTo(0.8, 12)
  })

  it('has nothing to say when the top k are all there is', () => {
    expect(topCoverage([b('a', 0.6), b('b', 0.4)])).toBeNull()
    expect(topCoverage([b('a', 1)])).toBeNull()
    expect(topCoverage([b('a', 0.5), b('b', 0.3), b('c', 0.2)], 0)).toBeNull()
  })

  it('takes any k, and ties inside the top are fine', () => {
    const r = topCoverage([b('a', 0.4), b('b', 0.4), b('c', 0.15), b('d', 0.05)])!
    expect(r.ids).toEqual(['a', 'b'])
    expect(topCoverage([b('a', 0.5), b('b', 0.3), b('c', 0.15), b('d', 0.05)], 3)!.ids).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('says nothing when a tie spans the cut, since "the top two" would be arbitrary', () => {
    expect(topCoverage([b('a', 0.5), b('b', 0.2), b('c', 0.2), b('d', 0.1)])).toBeNull()
    expect(topCoverage([b('a', 0.25), b('b', 0.25), b('c', 0.25), b('d', 0.25)], 3)).toBeNull()
  })
})

describe('oneInN', () => {
  it('turns a tiny chance into 1-in-N', () => {
    expect(oneInN(0.02)).toBe(50)
    expect(oneInN(0.01)).toBe(100)
    expect(oneInN(0.0182)).toBe(55)
    expect(oneInN(0.001)).toBe(1000)
  })

  it('is not for chances that are not tiny, or not chances', () => {
    expect(oneInN(0.05)).toBeNull()
    expect(oneInN(0.3)).toBeNull()
    expect(oneInN(0)).toBeNull()
    expect(oneInN(-0.1)).toBeNull()
  })

  it('stays a whole number, and 1-in-20 is the edge', () => {
    expect(oneInN(0.0499)).toBe(20)
    expect(Number.isInteger(oneInN(0.0123)!)).toBe(true)
  })

  it('works for very small chances', () => {
    expect(oneInN(0.00001)).toBe(100000)
    expect(oneInN('0.0000123')).toBe(81000)
  })
})

describe('order against the sketch', () => {
  const sketch = new Map([
    ['rain', new Decimal(0.2)],
    ['cloud', new Decimal(0.4)],
    ['sun', new Decimal(0.4)],
  ])

  it('flags an order the sketch contradicts', () => {
    expect(orderDisagreements([{ moreLikely: 'rain', lessLikely: 'cloud' }], sketch)).toEqual([
      { moreLikely: 'rain', lessLikely: 'cloud' },
    ])
  })

  it('reports a pair once however often it was answered', () => {
    const o = { moreLikely: 'rain', lessLikely: 'cloud' }
    expect(orderDisagreements([o, o, o], sketch)).toEqual([o])
  })

  it('does not flag an agreeing order, an equal sketch or an unknown bucket', () => {
    expect(orderDisagreements([{ moreLikely: 'cloud', lessLikely: 'rain' }], sketch)).toEqual([])
    expect(orderDisagreements([{ moreLikely: 'cloud', lessLikely: 'sun' }], sketch)).toEqual([])
    expect(orderDisagreements([{ moreLikely: 'x', lessLikely: 'rain' }], sketch)).toEqual([])
  })
})

describe('buildInsights', () => {
  const buckets = [
    b('rain', 0.5, 'Rain'),
    b('cloud', 0.3, 'Cloudy'),
    b('fog', 0.18, 'Fog'),
    b('snow', 0.02, 'Snow'),
  ]
  const sketch = new Map(buckets.map(x => [x.id, x.estimate]))

  it('writes coverage, tiny buckets and disagreements in words', () => {
    const insights = buildInsights({
      buckets,
      orders: [{ moreLikely: 'fog', lessLikely: 'cloud' }],
      sketch: new Map([...sketch, ['cloud', new Decimal(0.4)], ['fog', new Decimal(0.1)]]),
    })
    expect(insights.map(i => i.kind)).toEqual(['coverage', 'tiny', 'disagreement'])
    expect(insights[0].text).toBe('Your top two outcomes (Rain and Cloudy) cover 80%.')
    expect(insights[1].text).toBe("You gave Snow almost nothing: that's a 1-in-50 claim.")
    expect(insights[2].text).toBe('You picked Fog over Cloudy but sketched Cloudy higher.')
  })

  it('has nothing to say with two outcomes of normal size', () => {
    expect(
      buildInsights({ buckets: [b('a', 0.6), b('b', 0.4)], orders: [], sketch: new Map() })
    ).toEqual([])
  })
})

describe('merging rare outcomes into "everything else"', () => {
  const buckets = [
    b('rain', 0.6),
    b('cloud', 0.3),
    b('fog', 0.06, 'Fog'),
    b('hail', 0.02, 'Hail'),
    b('snow', 0.015, 'Snow'),
    b('ash', 0.005, 'Ash'),
  ]

  it('is offered for two or more outcomes each below 3%', () => {
    const offer = mergeOffer(buckets)!
    expect(offer.ids).toEqual(['hail', 'snow', 'ash'])
    expect(offer.combined.toNumber()).toBeCloseTo(0.04, 12)
  })

  it('is not offered for fewer than two rare outcomes, or when too few would be left', () => {
    expect(mergeOffer([b('a', 0.9), b('b', 0.08), b('c', 0.02)])).toBeNull()
    expect(mergeOffer([b('a', 0.02), b('b', 0.01)])).toBeNull()
  })

  it('is only an offer: applying it is a separate step', () => {
    const before = [...buckets]
    mergeOffer(buckets)
    expect(buckets).toEqual(before)
  })
})

describe('the total of adjusted values', () => {
  it('is ok at exactly 100', () => {
    expect(totalState(dec(60, 40)).kind).toBe('ok')
    expect(describeTotal(totalState(dec(60, 40)))).toBeNull()
  })

  it('says how many points too many or not yet placed', () => {
    expect(describeTotal(totalState(dec(60, 52)))).toBe('12 points too many')
    expect(describeTotal(totalState(dec(60, 27)))).toBe('13 points not yet placed')
    expect(describeTotal(totalState(dec(60, 39)))).toBe('1 point not yet placed')
    expect(describeTotal(totalState(dec(60.5, 40)))).toBe('0.5 points too many')
    expect(describeTotal(totalState(dec(60, 41)))).toBe('1 point too many')
  })

  it('rounds before choosing the noun, and never says "0 points"', () => {
    expect(describeTotal(totalState(dec(60, 40.001)))).toBe('<0.01 points too many')
    expect(describeTotal(totalState(dec(60, 39.999)))).toBe('<0.01 points not yet placed')
    expect(describeTotal(totalState(dec(60, 41.001)))).toBe('1 point too many')
    expect(describeTotal(totalState(dec(60, 38.999)))).toBe('1 point not yet placed')
  })

  it('allows a bet only at exactly 100', () => {
    expect(canBet(dec(60, 40))).toBe(true)
    expect(canBet(dec(60, 39.99))).toBe(false)
    expect(canBet(dec(60.01, 40))).toBe(false)
    expect(canBet([])).toBe(false)
    // values that add up to 100 but are not percentages
    expect(canBet(dec(110, -10))).toBe(false)
    expect(canBet(dec(100, 0))).toBe(true)
  })
})

describe('normalizePercents', () => {
  it('scales to exactly 100 with two decimals', () => {
    const r = normalizePercents(dec(50, 30, 15))
    expect(r.reduce((s, x) => s.plus(x), new Decimal(0)).eq(100)).toBe(true)
    for (const x of r) expect(x.decimalPlaces()).toBeLessThanOrEqual(2)
    expect(num(r)).toEqual([52.63, 31.58, 15.79])
  })

  it('gives the leftover hundredths to the largest remainders, earlier first on a tie', () => {
    expect(num(normalizePercents(dec(1, 1, 1)))).toEqual([33.34, 33.33, 33.33])
  })

  it('leaves values that already sum to 100 alone', () => {
    expect(num(normalizePercents(dec(70, 20, 10)))).toEqual([70, 20, 10])
  })

  it('sums to exactly 100 for awkward inputs', () => {
    for (const values of [
      dec(0.1, 0.2, 0.3),
      dec(7, 7, 7, 7, 7, 7, 7),
      dec(99.99, 0.01, 40),
      dec(1, 2, 3, 4, 5, 6, 7, 8),
    ]) {
      const r = normalizePercents(values)
      expect(r.reduce((s, x) => s.plus(x), new Decimal(0)).eq(100)).toBe(true)
      expect(r.every(x => !x.isNeg())).toBe(true)
    }
  })

  it('refuses negatives and a total of zero', () => {
    expect(() => normalizePercents(dec(0, 0))).toThrow('zero')
    expect(() => normalizePercents(dec(5, -1))).toThrow('negative')
    expect(() => normalizePercents([])).toThrow('zero')
  })

  it('makes the bet possible', () => {
    expect(canBet(normalizePercents(dec(12, 34, 56)))).toBe(true)
  })
})

describe('normalizePercentsAtLeast', () => {
  const d = (...xs: number[]) => xs.map(x => new Decimal(x))
  it('keeps every value above zero and the sum at exactly 100', () => {
    const out = normalizePercentsAtLeast(d(0.01, 99, 99))
    expect(out.map(String)).toEqual(['0.01', '49.99', '50'])
    expect(out.reduce((a, b) => a.plus(b), new Decimal(0)).eq(100)).toBe(true)
  })
  it('matches normalizePercents when nothing rounds to zero', () => {
    expect(normalizePercentsAtLeast(d(70, 42)).map(String)).toEqual(['62.5', '37.5'])
  })
})
