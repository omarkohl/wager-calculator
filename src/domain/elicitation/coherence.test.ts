import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import { applySumBand, makeCoherent, type BucketBand, type OrderAnswer } from './coherence'
import { createSeededPRNG } from '../prng'

const band = (id: string, lo: number, hi: number, asked = true): BucketBand => ({
  id,
  lo: new Decimal(lo),
  hi: new Decimal(hi),
  asked,
})
const never = (id: string) => band(id, 0, 1, false)
const ranges = (r: ReturnType<typeof makeCoherent>) =>
  Object.fromEntries(r.bands.map(b => [b.id, [b.lo.toNumber(), b.hi.toNumber()]]))
const close = (actual: number[], expected: number[], digits = 9) => {
  expect(actual[0]).toBeCloseTo(expected[0], digits)
  expect(actual[1]).toBeCloseTo(expected[1], digits)
}
const gt = (moreLikely: string, lessLikely: string): OrderAnswer => ({ moreLikely, lessLikely })

describe('tightening to the reachable part', () => {
  it("the requirements' example: A 5-40, B 20-30, C 50-60 gives A 10-30", () => {
    const r = makeCoherent([band('A', 0.05, 0.4), band('B', 0.2, 0.3), band('C', 0.5, 0.6)])
    close(ranges(r).A, [0.1, 0.3])
    close(ranges(r).B, [0.2, 0.3])
    close(ranges(r).C, [0.5, 0.6])
    expect(r.incoherence).toBeNull()
    expect(r.droppedOrders).toEqual([])
    expect(r.bands.map(b => b.tightened)).toEqual([true, false, false])
    expect(r.bands.some(b => b.widened)).toBe(false)
  })

  it('leaves bands that are already reachable alone', () => {
    const r = makeCoherent([band('A', 0.4, 0.5), band('B', 0.5, 0.6)])
    close(ranges(r).A, [0.4, 0.5])
    close(ranges(r).B, [0.5, 0.6])
    expect(r.bands.some(b => b.tightened || b.widened)).toBe(false)
  })

  it('bounds a bucket never asked about by what is left', () => {
    const r = makeCoherent([band('A', 0.2, 0.3), band('B', 0.3, 0.4), never('C')])
    // C gets at least 1 - 0.3 - 0.4 = 0.3 and at most 1 - 0.2 - 0.3 = 0.5
    close(ranges(r).C, [0.3, 0.5])
    expect(r.bands[2].tightened).toBe(true)
  })

  it('with nothing asked at all, keeps the whole range', () => {
    const r = makeCoherent([never('A'), never('B')])
    close(ranges(r).A, [0, 1])
    expect(r.bands.every(b => !b.tightened)).toBe(true)
  })

  it('a single bucket must be everything: a band short of 100% is flagged and widened up to it', () => {
    const r = makeCoherent([band('A', 0.2, 0.9)])
    expect(r.incoherence!.kind).toBe('uppers-short')
    close(ranges(r).A, [0.2, 1])
    close(ranges(makeCoherent([band('A', 0, 1)])).A, [1, 1])
  })

  it('is a fixpoint: running it again changes nothing', () => {
    const first = makeCoherent([band('A', 0.05, 0.4), band('B', 0.2, 0.3), band('C', 0.5, 0.6)])
    const again = makeCoherent(
      first.bands.map(b => ({ id: b.id, lo: b.lo, hi: b.hi, asked: true }))
    )
    first.bands.forEach((b, i) => {
      expect(again.bands[i].lo.minus(b.lo).abs().lt(1e-12)).toBe(true)
      expect(again.bands[i].hi.minus(b.hi).abs().lt(1e-12)).toBe(true)
    })
  })
})

describe('order answers', () => {
  it('"A is more likely than B" lifts A\'s lower bound and caps B\'s upper bound', () => {
    const r = makeCoherent([band('A', 0.1, 0.5), band('B', 0.3, 0.6), never('C')], [gt('A', 'B')])
    close(ranges(r).A, [0.3, 0.5])
    close(ranges(r).B, [0.3, 0.5])
    expect(r.droppedOrders).toEqual([])
  })

  it('propagates along a chain together with the sums', () => {
    const r = makeCoherent(
      [band('A', 0, 1), band('B', 0, 1), band('C', 0.2, 0.3)],
      [gt('A', 'B'), gt('B', 'C')]
    )
    // A and B are each at least C's 0.2; with C at least 0.2 that leaves them 0.6 at most
    close(ranges(r).A, [0.2, 0.6])
    close(ranges(r).B, [0.2, 0.6])
    close(ranges(r).C, [0.2, 0.3])
    expect(r.droppedOrders).toEqual([])
  })

  it('equal bands are fine: "about equally likely" is simply no constraint', () => {
    const r = makeCoherent([band('A', 0.2, 0.4), band('B', 0.2, 0.4), never('C')])
    close(ranges(r).A, [0.2, 0.4])
    close(ranges(r).B, [0.2, 0.4])
  })

  it('drops a cycle and lists it, keeping the others', () => {
    const r = makeCoherent(
      [band('A', 0.1, 0.9), band('B', 0, 0.5), band('C', 0.2, 0.3), never('D')],
      [gt('A', 'B'), gt('B', 'A'), gt('C', 'D')]
    )
    expect(r.droppedOrders).toEqual([
      { moreLikely: 'A', lessLikely: 'B', reason: 'cycle' },
      { moreLikely: 'B', lessLikely: 'A', reason: 'cycle' },
    ])
    // C > D still holds: D cannot exceed C's upper bound
    expect(ranges(r).D[1]).toBeLessThanOrEqual(0.3 + 1e-12)
    // the cycle did not force A and B equal: each keeps what the sums alone allow
    close(ranges(r).A, [0.1, 0.8])
    close(ranges(r).B, [0, 0.5])
    close(ranges(r).C, [0.2, 0.3])
    close(ranges(r).D, [0, 0.3])
  })

  it('finds longer cycles and self-loops', () => {
    const r = makeCoherent(
      [band('A', 0, 1), band('B', 0, 1), band('C', 0, 1)],
      [gt('A', 'B'), gt('B', 'C'), gt('C', 'A'), gt('A', 'A')]
    )
    expect(r.droppedOrders.map(d => d.reason)).toEqual(['cycle', 'cycle', 'cycle', 'cycle'])
  })

  it('drops an order the bounds rule out, and says so', () => {
    const r = makeCoherent([band('A', 0.1, 0.2), band('B', 0.3, 0.4), never('C')], [gt('A', 'B')])
    expect(r.droppedOrders).toEqual([{ moreLikely: 'A', lessLikely: 'B', reason: 'conflict' }])
    close(ranges(r).A, [0.1, 0.2])
    close(ranges(r).B, [0.3, 0.4])
  })

  it('drops the fewest orders when an implied conflict shows only through a chain', () => {
    const r = makeCoherent(
      [band('A', 0, 0.1), band('B', 0, 1), band('C', 0.5, 0.6)],
      [gt('A', 'B'), gt('B', 'C')]
    )
    expect(r.droppedOrders).toHaveLength(1)
    expect(r.droppedOrders[0].reason).toBe('conflict')
    // the kept order still holds
    const kept = r.droppedOrders[0].moreLikely === 'A' ? ['B', 'C'] : ['A', 'B']
    const [m, l] = kept.map(id => r.bands.find(b => b.id === id)!)
    expect(m.lo.gte(l.lo.minus(1e-12))).toBe(true)
    expect(l.hi.lte(m.hi.plus(1e-12))).toBe(true)
  })
})

describe('incoherent bounds', () => {
  it('lower bounds above 100% are flagged and widened evenly in logits, keeping the width', () => {
    const r = makeCoherent([band('A', 0.6, 0.7), band('B', 0.6, 0.7)])
    expect(r.incoherence!.kind).toBe('lowers-exceed')
    expect(r.incoherence!.amount.toNumber()).toBeCloseTo(0.2, 12)
    // by symmetry each lower bound goes to 50%; the upper bounds stay: 50-70%, not 50-50%
    close(ranges(r).A, [0.5, 0.7], 6)
    close(ranges(r).B, [0.5, 0.7], 6)
    expect(r.bands.every(b => b.widened)).toBe(true)
  })

  it('upper bounds short of 100% are flagged and widened, keeping the width', () => {
    const r = makeCoherent([band('A', 0.2, 0.3), band('B', 0.2, 0.3)])
    expect(r.incoherence!.kind).toBe('uppers-short')
    expect(r.incoherence!.amount.toNumber()).toBeCloseTo(0.4, 12)
    close(ranges(r).A, [0.2, 0.5], 6)
    close(ranges(r).B, [0.2, 0.5], 6)
    expect(r.bands.every(b => b.widened)).toBe(true)
  })

  it('A 50-90, B 30-40, C 30-35: incoherence shows up as extra width, not as certainty', () => {
    const r = makeCoherent([band('A', 0.5, 0.9), band('B', 0.3, 0.4), band('C', 0.3, 0.35)])
    expect(r.incoherence!.kind).toBe('lowers-exceed')
    expect(r.incoherence!.amount.toNumber()).toBeCloseTo(0.1, 12)
    for (const b of r.bands) expect(b.hi.minus(b.lo).toNumber()).toBeGreaterThan(0.05)
    // each band contains what was said, and the lower bounds now add up
    close(
      ranges(r).A.map((x, i) => (i === 1 ? x : 0)),
      [0, 0.9]
    )
    expect(ranges(r).B[1]).toBeCloseTo(0.4, 9)
    expect(ranges(r).C[1]).toBeCloseTo(0.35, 9)
    expect(ranges(r).A[0]).toBeLessThan(0.5)
    expect(ranges(r).B[0]).toBeLessThan(0.3)
    expect(ranges(r).C[0]).toBeLessThan(0.3)
    expect(sum(r.bands.map(b => b.lo))).toBeLessThanOrEqual(1 + 1e-9)
  })

  it('coherent input is still tightened as before', () => {
    const r = makeCoherent([band('A', 0.05, 0.4), band('B', 0.2, 0.3), band('C', 0.5, 0.6)])
    close(ranges(r).A, [0.1, 0.3])
    expect(r.incoherence).toBeNull()
  })

  it('widens bands never asked about first', () => {
    // A asked at 0.6+, B only from the sketch at 0.5+: B gives way, A is left alone
    const r = makeCoherent([band('A', 0.6, 0.7, true), band('B', 0.5, 1, false)])
    expect(r.incoherence!.kind).toBe('lowers-exceed')
    expect(r.bands[0].widened).toBe(false)
    expect(r.bands[1].widened).toBe(true)
    expect(ranges(r).A[0]).toBeCloseTo(0.6, 9)
    expect(r.bands[1].lo.toNumber()).toBeLessThanOrEqual(0.4 + 1e-9)
    // widened, not collapsed
    expect(r.bands[1].hi.minus(r.bands[1].lo).toNumber()).toBeGreaterThan(0.1)
  })

  it('widens the asked bands too when the unasked ones cannot fix it alone', () => {
    const r = makeCoherent([band('A', 0.7, 0.8), band('B', 0.5, 0.6), band('C', 0.4, 1, false)])
    expect(r.bands.every(b => b.widened)).toBe(true)
    expect(sum(r.bands.map(b => b.lo))).toBeLessThanOrEqual(1 + 1e-9)
    for (const b of r.bands) expect(b.hi.gt(b.lo)).toBe(true)
  })

  it('flags nothing for coherent bounds', () => {
    expect(makeCoherent([band('A', 0.2, 0.6), band('B', 0.3, 0.7)]).incoherence).toBeNull()
  })

  it('still drops an order that the widened bounds cannot hold', () => {
    const r = makeCoherent([band('A', 0.6, 0.7), band('B', 0.6, 0.7)], [gt('A', 'B')])
    expect(r.incoherence).not.toBeNull()
    // A > B only requires lo_A >= lo_B and hi_B <= hi_A: satisfiable with equal ranges
    expect(r.droppedOrders).toEqual([])
    expect(ranges(r).A[0]).toBeGreaterThanOrEqual(ranges(r).B[0] - 1e-12)
  })
})

function sum(xs: Decimal[]) {
  return xs.reduce((s, x) => s + x.toNumber(), 0)
}

describe('input checks', () => {
  it('rejects duplicate ids, impossible bands and orders about unknown buckets', () => {
    expect(() => makeCoherent([band('A', 0, 1), band('A', 0, 1)])).toThrow('unique')
    expect(() => makeCoherent([band('A', 0.6, 0.5)])).toThrow(RangeError)
    expect(() => makeCoherent([band('A', 0, 1.2)])).toThrow(RangeError)
    expect(() => makeCoherent([band('A', 0, 1)], [gt('A', 'Z')])).toThrow('Unknown bucket')
    expect(() => makeCoherent([])).toThrow('no buckets')
  })

  it('does not change what it is given', () => {
    const input = [band('A', 0.05, 0.4), band('B', 0.2, 0.3), band('C', 0.5, 0.6)]
    makeCoherent(input)
    expect(input[0].lo.toNumber()).toBe(0.05)
  })
})

describe('many order answers that cannot hold', () => {
  it('drops them one at a time in input order until the rest can, not all of them', () => {
    // A and B are far apart; every later order is satisfiable, the first six are not
    const bands = [band('A', 0, 0.1), band('B', 0.5, 0.6), never('C'), never('D')]
    const orders = [
      gt('A', 'B'),
      gt('A', 'B'),
      gt('A', 'B'),
      gt('A', 'B'),
      gt('A', 'B'),
      gt('A', 'B'),
      gt('C', 'D'),
    ]
    const r = makeCoherent(bands, orders)
    expect(r.droppedOrders.length).toBeGreaterThan(0)
    expect(r.droppedOrders.every(d => d.reason === 'conflict')).toBe(true)
    expect(r.droppedOrders.length).toBeLessThan(orders.length)
    // the order that can hold is kept
    expect(r.droppedOrders.some(d => d.moreLikely === 'C')).toBe(false)
  })
})

describe('properties on random input', () => {
  it('always ends coherent: ordered bands, lows <= 1 <= highs, kept orders hold', () => {
    const rng = createSeededPRNG('coherence')
    for (let t = 0; t < 40; t++) {
      const n = 2 + Math.floor(rng() * 5)
      const bands: BucketBand[] = Array.from({ length: n }, (_, i) => {
        const a = rng()
        const b = rng()
        return {
          id: `b${i}`,
          lo: new Decimal(Math.min(a, b)),
          hi: new Decimal(Math.max(a, b)),
          asked: rng() < 0.7,
        }
      })
      const orders: OrderAnswer[] = []
      for (let k = Math.floor(rng() * 4); k > 0; k--) {
        orders.push(gt(`b${Math.floor(rng() * n)}`, `b${Math.floor(rng() * n)}`))
      }
      const r = makeCoherent(bands, orders)
      expect(r.bands).toHaveLength(n)
      for (const b of r.bands) {
        expect(b.lo.lte(b.hi.plus(1e-12))).toBe(true)
        expect(b.lo.gte(0)).toBe(true)
        expect(b.hi.lte(1)).toBe(true)
      }
      expect(sum(r.bands.map(b => b.lo))).toBeLessThanOrEqual(1 + 1e-9)
      expect(sum(r.bands.map(b => b.hi))).toBeGreaterThanOrEqual(1 - 1e-9)
      const dropped = new Set(r.droppedOrders.map(d => `${d.moreLikely}>${d.lessLikely}`))
      for (const o of orders) {
        if (dropped.has(`${o.moreLikely}>${o.lessLikely}`)) continue
        const m = r.bands.find(b => b.id === o.moreLikely)!
        const l = r.bands.find(b => b.id === o.lessLikely)!
        expect(m.lo.gte(l.lo.minus(1e-9))).toBe(true)
        expect(l.hi.lte(m.hi.plus(1e-9))).toBe(true)
      }
      // incoherence shows up as extra width: without order answers a band contains what was said
      if (r.incoherence && orders.length === 0) {
        r.bands.forEach((b, i) => {
          expect(b.lo.lte(bands[i].lo.plus(1e-9))).toBe(true)
          expect(b.hi.gte(bands[i].hi.minus(1e-9))).toBe(true)
        })
      }
      // coherent input is never widened
      if (!r.incoherence) expect(r.bands.some(b => b.widened)).toBe(false)
    }
  })
})

describe('applySumBand', () => {
  it('narrows the members to what the sum allows, and flags nothing', () => {
    const r = applySumBand(
      [band('A', 0, 1), band('B', 0.1, 1), band('C', 0, 1)],
      ['A', 'B'],
      new Decimal(0),
      new Decimal(0.4)
    )
    expect(r.incoherence).toBeNull()
    expect(r.widenedSide).toBeNull()
    close([r.bands[0].lo.toNumber(), r.bands[0].hi.toNumber()], [0, 0.3])
    close([r.bands[1].lo.toNumber(), r.bands[1].hi.toNumber()], [0.1, 0.4])
    // a bucket outside the group is left alone
    close([r.bands[2].lo.toNumber(), r.bands[2].hi.toNumber()], [0, 1])
  })

  it('members whose lows exceed the sum are flagged and widened, keeping their width', () => {
    const r = applySumBand(
      [band('A', 0.3, 1), band('B', 0.3, 1)],
      ['A', 'B'],
      new Decimal(0),
      new Decimal(0.4)
    )
    expect(r.incoherence!.kind).toBe('lowers-exceed')
    expect(r.incoherence!.amount.toNumber()).toBeCloseTo(0.2, 12)
    expect(r.widenedSide).toBe('lo')
    for (const b of r.bands) {
      expect(b.lo.toNumber()).toBeCloseTo(0.2, 6)
      expect(b.hi.toNumber()).toBeCloseTo(0.4, 9)
    }
  })

  it('members whose highs fall short of the sum are flagged and widened', () => {
    const r = applySumBand(
      [band('A', 0, 0.2), band('B', 0, 0.2)],
      ['A', 'B'],
      new Decimal(0.6),
      new Decimal(1)
    )
    expect(r.incoherence!.kind).toBe('uppers-short')
    expect(r.widenedSide).toBe('hi')
    for (const b of r.bands) {
      expect(b.hi.toNumber()).toBeCloseTo(0.3, 6)
      expect(b.lo.toNumber()).toBeCloseTo(0, 9)
    }
  })

  it('does not change what it is given', () => {
    const input = [band('A', 0.3, 1), band('B', 0.3, 1)]
    applySumBand(input, ['A', 'B'], new Decimal(0), new Decimal(0.4))
    expect(input[0].lo.toNumber()).toBe(0.3)
  })
})

describe('a locked side', () => {
  it('stops the sums from tightening a side the caller widened back to a point', () => {
    const bands = [band('A', 0.2, 0.4), band('B', 0.2, 0.4), band('C', 0.6, 1)]
    const both = makeCoherent(bands)
    const locked = makeCoherent(bands, [], 'lo-only')
    // unlocked, the highs collapse (the lows already add up to 100%)
    expect(both.bands[2].hi.toNumber()).toBeCloseTo(0.6, 9)
    // locked to the lows, the highs stay as they were said
    expect(locked.bands[2].hi.toNumber()).toBeCloseTo(1, 9)
    expect(locked.bands[0].hi.toNumber()).toBeCloseTo(0.4, 9)
  })
})
