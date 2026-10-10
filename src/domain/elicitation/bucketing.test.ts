import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import {
  barBuckets,
  barEdges,
  barsToProbabilities,
  bucketCurve,
  labelBuckets,
  placesFor,
  shapeEdges,
  snapRound,
} from './bucketing'
import { createSeededPRNG } from '../prng'

const curve = (...pts: [number, number][]) => pts.map(([x, y]) => ({ x, y }))
const edgesOf = (r: ReturnType<typeof bucketCurve>) => r.edges.map(e => e.toNumber())
const probsOf = (r: ReturnType<typeof bucketCurve>) => r.buckets.map(b => b.probability.toNumber())
const total = (r: ReturnType<typeof bucketCurve>) =>
  r.buckets.reduce((s, b) => s.plus(b.probability), new Decimal(0))

describe('snapRound', () => {
  const snap = (x: number, min = 0, max = 100) =>
    snapRound(new Decimal(x), new Decimal(max - min).div(40), new Decimal(max - min)).toNumber()

  it('takes the roundest number within reach', () => {
    expect(snap(48)).toBe(50)
    expect(snap(21)).toBe(20)
    expect(snap(2.5, 0, 10)).toBe(2.5)
    expect(snap(7.4, 0, 10)).toBe(7.5)
  })

  it('prefers the roundest number even if another is nearer', () => {
    // 35 is 2.3 away, within reach (2.5), and rounder than 37.5 which is 0.2 away
    expect(snap(37.3, 0, 100)).toBe(35)
    expect(Number.isFinite(snap(0.123456, 0, 1))).toBe(true)
  })
})

describe('a single hump', () => {
  // a triangle from 0 to 10 peaking at 5: half height at 2.5 and 7.5
  const r = bucketCurve({ min: 0, max: 10, thresholds: [], curve: curve([0, 0], [5, 1], [10, 0]) })

  it('gets a bucket for the hump and one for each flank', () => {
    expect(edgesOf(r)).toEqual([2.5, 7.5])
    expect(probsOf(r)).toEqual([0.125, 0.75, 0.125])
  })

  it('has open-ended outer buckets and labels that read', () => {
    expect(r.buckets.map(b => [b.lo?.toNumber() ?? null, b.hi?.toNumber() ?? null])).toEqual([
      [null, 2.5],
      [2.5, 7.5],
      [7.5, null],
    ])
    expect(r.buckets.map(b => b.label)).toEqual(['below 2.5', '2.5 to 7.5', '7.5 or more'])
  })

  it('sums to exactly one', () => {
    expect(total(r).eq(1)).toBe(true)
  })

  it('puts the unit in the labels', () => {
    const c = bucketCurve(
      { min: 0, max: 10, thresholds: [], curve: curve([0, 0], [5, 1], [10, 0]) },
      '°C'
    )
    expect(c.buckets[0].label).toBe('below 2.5 °C')
    expect(c.buckets[1].label).toBe('2.5 to 7.5 °C')
    expect(c.buckets[2].label).toBe('7.5 °C or more')
  })
})

describe('two humps', () => {
  it('cuts at the valley between them, and at the flanks', () => {
    const r = bucketCurve({
      min: 0,
      max: 20,
      thresholds: [],
      curve: curve([0, 0], [5, 1], [10, 0.1], [15, 1], [20, 0]),
    })
    expect(edgesOf(r)).toContain(10)
    expect(r.buckets.length).toBeGreaterThanOrEqual(4)
    expect(total(r).eq(1)).toBe(true)
    // the two humps are mirror images, so the buckets mirror each other
    const p = probsOf(r)
    for (let i = 0; i < p.length; i++) expect(p[i]).toBeCloseTo(p[p.length - 1 - i], 9)
  })
})

describe('thresholds', () => {
  it('are always edges, unrounded, even where nothing changes', () => {
    const r = bucketCurve({
      min: 0,
      max: 10,
      thresholds: [3.3],
      curve: curve([0, 0], [5, 1], [10, 0]),
    })
    expect(edgesOf(r)).toContain(3.3)
  })

  it('stay even when both neighbours are tiny', () => {
    const r = bucketCurve({
      min: 0,
      max: 100,
      thresholds: [1, 2],
      curve: curve([0, 0], [50, 1], [100, 0]),
    })
    expect(edgesOf(r)).toContain(1)
    expect(edgesOf(r)).toContain(2)
    // [below 1], [1 to 2] and [2 to ...] are all under 3%, yet kept
    expect(r.buckets[0].probability.lt(0.03)).toBe(true)
    expect(r.buckets[1].probability.lt(0.03)).toBe(true)
  })

  it('outside the range would only make an empty bucket, so they are set aside', () => {
    const r = bucketCurve({
      min: 5,
      max: 15,
      thresholds: [0, 5, 15, 20, 10],
      curve: curve([5, 0], [10, 1], [15, 0]),
    })
    expect(r.ignoredThresholds.map(t => t.toNumber())).toEqual([0, 5, 15, 20])
    expect(edgesOf(r)).toContain(10)
  })

  it('repeated thresholds are one edge', () => {
    const r = bucketCurve({
      min: 0,
      max: 10,
      thresholds: [4, 4, '4.0'],
      curve: curve([0, 1], [10, 1]),
    })
    expect(edgesOf(r).filter(e => e === 4)).toHaveLength(1)
  })

  it('at most seven fit in eight buckets', () => {
    expect(() =>
      bucketCurve({
        min: 0,
        max: 100,
        thresholds: [1, 2, 3, 4, 5, 6, 7, 8],
        curve: curve([0, 1], [100, 1]),
      })
    ).toThrow('At most 7')
    const seven = bucketCurve({
      min: 0,
      max: 100,
      thresholds: [10, 20, 30, 40, 50, 60, 70],
      curve: curve([0, 1], [100, 1]),
    })
    expect(seven.buckets).toHaveLength(8)
  })
})

describe('merging small neighbours', () => {
  // two tiny bumps in the left tail, a big hump at 50
  const wiggly = curve([0, 0], [4, 0.02], [6, 0], [8, 0.02], [10, 0], [50, 1], [100, 0])

  it('would cut the tail into many buckets by shape alone', () => {
    const raw = shapeEdges(wiggly.map(p => ({ x: new Decimal(p.x), y: new Decimal(p.y) })))
    expect(raw.length).toBeGreaterThanOrEqual(6)
  })

  it('merges neighbours that are both below 3% into one', () => {
    const r = bucketCurve({ min: 0, max: 100, thresholds: [], curve: wiggly })
    const p = probsOf(r)
    for (let i = 1; i < p.length; i++) expect(p[i] >= 0.03 || p[i - 1] >= 0.03).toBe(true)
    // the tail is one bucket, not one per wiggle
    expect(r.buckets.length).toBeLessThanOrEqual(4)
    expect(total(r).eq(1)).toBe(true)
  })

  it('does not merge across a threshold', () => {
    const r = bucketCurve({ min: 0, max: 100, thresholds: [5, 9], curve: wiggly })
    expect(edgesOf(r)).toEqual(expect.arrayContaining([5, 9]))
  })
})

describe('the cap of eight buckets', () => {
  it('drops the least informative shape edges when a curve has many humps', () => {
    const humps: [number, number][] = [[0, 0]]
    for (let i = 0; i < 10; i++) humps.push([i * 10 + 5, 1], [i * 10 + 10, 0.2])
    humps[humps.length - 1] = [100, 0]
    const pts = curve(...humps)
    expect(
      shapeEdges(pts.map(p => ({ x: new Decimal(p.x), y: new Decimal(p.y) }))).length
    ).toBeGreaterThan(7)
    const r = bucketCurve({ min: 0, max: 100, thresholds: [], curve: pts })
    expect(r.buckets.length).toBeLessThanOrEqual(8)
    expect(total(r).eq(1)).toBe(true)
  })

  it('keeps every threshold while it drops shape edges', () => {
    const humps: [number, number][] = [[0, 0]]
    for (let i = 0; i < 10; i++) humps.push([i * 10 + 5, 1], [i * 10 + 10, 0.2])
    humps[humps.length - 1] = [100, 0]
    const r = bucketCurve({ min: 0, max: 100, thresholds: [33, 66], curve: curve(...humps) })
    expect(r.buckets.length).toBeLessThanOrEqual(8)
    expect(edgesOf(r)).toEqual(expect.arrayContaining([33, 66]))
  })
})

describe('snapping', () => {
  it('drops a snapped edge that lands on a threshold', () => {
    const r = bucketCurve({
      min: 0,
      max: 10,
      thresholds: [2.5],
      curve: curve([0, 0], [5, 1], [10, 0]),
    })
    expect(edgesOf(r)).toEqual([2.5, 7.5])
  })

  it('does not fold both flanks of a narrow spike onto one number', () => {
    const r = bucketCurve({
      min: 0,
      max: 100,
      thresholds: [],
      curve: curve([0, 0], [49.9, 0], [50.1, 1], [50.3, 0], [100, 0]),
    })
    expect(r.buckets.length).toBeGreaterThanOrEqual(3)
    for (const b of r.buckets)
      expect(b.probability.gt(0) || b.lo === null || b.hi === null).toBe(true)
    const core = r.buckets.reduce((a, b) => (b.probability.gt(a.probability) ? b : a))
    expect(core.probability.toNumber()).toBeGreaterThan(0.7)
    // the flanks hold the rest instead of an empty bucket
    expect(r.buckets.every(b => b.probability.gt(0.05))).toBe(true)
  })
})

describe('finite input only', () => {
  const ok = curve([0, 0], [5, 1], [10, 0])
  it('rejects infinite and NaN numbers instead of hanging', () => {
    expect(() => bucketCurve({ min: 0, max: Infinity, thresholds: [], curve: ok })).toThrow(
      'finite'
    )
    expect(() => bucketCurve({ min: -Infinity, max: 10, thresholds: [], curve: ok })).toThrow(
      'finite'
    )
    expect(() => bucketCurve({ min: 0, max: 10, thresholds: [NaN], curve: ok })).toThrow('finite')
    expect(() =>
      bucketCurve({ min: 0, max: 10, thresholds: [], curve: curve([0, NaN], [10, 1]) })
    ).toThrow('finite')
    expect(() =>
      bucketCurve({ min: 0, max: 10, thresholds: [], curve: curve([0, 0], [Infinity, 1]) })
    ).toThrow('finite')
    expect(() => barEdges(0, Infinity, [], 4)).toThrow('finite')
    expect(() => barEdges(0, 10, [NaN], 4)).toThrow('finite')
    expect(() => barsToProbabilities([NaN])).toThrow('percentage')
  })
})

describe('counting thresholds', () => {
  const flat = curve([0, 1], [100, 1])
  it('counts only the distinct ones inside the range', () => {
    const r = bucketCurve({ min: 0, max: 100, thresholds: [4, 4, 4, 4, 4, 4, 4, 4], curve: flat })
    expect(edgesOf(r)).toEqual([4])
    const outside = bucketCurve({
      min: 0,
      max: 100,
      thresholds: [-1, -2, 101, 102, 0, 100, 200, 300, 50],
      curve: flat,
    })
    expect(edgesOf(outside)).toEqual([50])
    expect(outside.ignoredThresholds).toHaveLength(8)
  })

  it('still refuses eight distinct ones', () => {
    expect(() =>
      bucketCurve({ min: 0, max: 100, thresholds: [1, 2, 3, 4, 5, 6, 7, 8], curve: flat })
    ).toThrow('At most 7')
  })
})

describe('labels at any scale', () => {
  it('tells the edges of a tiny range apart', () => {
    const r = bucketCurve({
      min: 0,
      max: 1e-7,
      thresholds: [],
      curve: curve([0, 0], [5e-8, 1], [1e-7, 0]),
    })
    expect(r.buckets.map(b => b.label)).toEqual([
      'below 0.000000025',
      '0.000000025 to 0.000000075',
      '0.000000075 or more',
    ])
  })

  it('does not use exponent notation for a huge range', () => {
    const r = bucketCurve({
      min: 0,
      max: 1e22,
      thresholds: [],
      curve: curve([0, 0], [5e21, 1], [1e22, 0]),
    })
    for (const b of r.buckets) expect(b.label).not.toMatch(/e[+-]?\d/)
    expect(r.buckets[0].label).toBe('below 2500000000000000000000')
  })

  it('shows as many decimals as the range needs', () => {
    expect(placesFor(new Decimal(100))).toBe(1)
    expect(placesFor(new Decimal(10))).toBe(2)
    expect(placesFor(new Decimal(1e22))).toBe(0)
    expect(placesFor(new Decimal(1e-7))).toBe(10)
  })
})

describe('a flat curve', () => {
  it('is split at the median so there are two buckets', () => {
    const r = bucketCurve({ min: 0, max: 10, thresholds: [], curve: curve([0, 1], [10, 1]) })
    expect(r.buckets).toHaveLength(2)
    expect(edgesOf(r)).toEqual([5])
    expect(probsOf(r)).toEqual([0.5, 0.5])
  })
})

describe('the curve outside the range', () => {
  it('counts only what lies between the minimum and the maximum', () => {
    const r = bucketCurve({ min: 0, max: 10, thresholds: [5], curve: curve([-10, 1], [20, 1]) })
    expect(probsOf(r)).toEqual([0.5, 0.5])
  })
})

describe('input checks', () => {
  const ok = curve([0, 0], [5, 1], [10, 0])
  it('rejects what is not a curve', () => {
    expect(() => bucketCurve({ min: 5, max: 5, thresholds: [], curve: ok })).toThrow('minimum')
    expect(() => bucketCurve({ min: 0, max: 10, thresholds: [], curve: [{ x: 1, y: 1 }] })).toThrow(
      'two points'
    )
    expect(() =>
      bucketCurve({ min: 0, max: 10, thresholds: [], curve: curve([1, 1], [1, 2]) })
    ).toThrow('distinct')
    expect(() =>
      bucketCurve({ min: 0, max: 10, thresholds: [], curve: curve([0, -1], [10, 1]) })
    ).toThrow('negative')
    expect(() =>
      bucketCurve({ min: 0, max: 10, thresholds: [], curve: curve([0, 0], [10, 0]) })
    ).toThrow('no likelihood')
    expect(() => bucketCurve({ min: 20, max: 30, thresholds: [], curve: ok })).toThrow(
      'no likelihood'
    )
  })

  it('accepts points in any order', () => {
    const r = bucketCurve({
      min: 0,
      max: 10,
      thresholds: [],
      curve: curve([10, 0], [0, 0], [5, 1]),
    })
    expect(edgesOf(r)).toEqual([2.5, 7.5])
  })
})

describe('on random curves', () => {
  it('always gives 2 to 8 ascending buckets that sum to one and keep every threshold', () => {
    const rng = createSeededPRNG('bucketing')
    for (let t = 0; t < 40; t++) {
      const n = 2 + Math.floor(rng() * 8)
      const xs = Array.from({ length: n }, (_, i) => (i * 100) / (n - 1))
      const pts = xs.map(x => ({ x, y: rng() < 0.2 ? 0 : rng() * 10 }))
      pts[Math.floor(rng() * n)].y = 5 + rng() * 5
      const thresholds = Array.from({ length: Math.floor(rng() * 4) }, () =>
        Math.round(rng() * 100)
      )
      const r = bucketCurve({ min: 0, max: 100, thresholds, curve: pts })
      expect(r.buckets.length).toBeGreaterThanOrEqual(2)
      expect(r.buckets.length).toBeLessThanOrEqual(8)
      expect(r.edges.every((e, i) => i === 0 || e.gt(r.edges[i - 1]))).toBe(true)
      expect(total(r).eq(1)).toBe(true)
      for (const th of thresholds) {
        if (th > 0 && th < 100) expect(r.edges.some(e => e.eq(th))).toBe(true)
      }
      const isEdge = (i: number) => thresholds.some(th => r.edges[i].eq(th))
      for (let i = 1; i < r.buckets.length; i++) {
        const bothSmall = r.buckets[i].probability.lt(0.03) && r.buckets[i - 1].probability.lt(0.03)
        if (bothSmall) expect(isEdge(i - 1)).toBe(true)
      }
    }
  })
})

describe('labelBuckets', () => {
  it('names the open ends and the ranges between', () => {
    expect(labelBuckets([new Decimal(0), new Decimal(5), new Decimal(10)])).toEqual([
      'below 0',
      '0 to 5',
      '5 to 10',
      '10 or more',
    ])
  })
})

describe('bars', () => {
  it('turns percentages into probabilities as they are, without normalising', () => {
    expect(barsToProbabilities([30, 50, 40]).map(p => p.toNumber())).toEqual([0.3, 0.5, 0.4])
  })

  it('rejects what is not a percentage', () => {
    expect(() => barsToProbabilities([-1, 5])).toThrow('percentage')
    expect(() => barsToProbabilities([101])).toThrow('percentage')
  })

  it('has round edges that make the bars, with the thresholds among them', () => {
    const edges = barEdges(0, 40, [5], 8).map(e => e.toNumber())
    expect(edges).toContain(5)
    expect(edges.length).toBeLessThanOrEqual(7)
    expect(edges.length).toBeGreaterThanOrEqual(4)
    expect(edges.every((e, i) => i === 0 || e > edges[i - 1])).toBe(true)
    expect(edges.every(e => e > 0 && e < 40)).toBe(true)
  })

  it('makes round, even bars when there are no thresholds', () => {
    expect(barEdges(0, 40, [], 4).map(e => e.toNumber())).toEqual([10, 20, 30])
    expect(barEdges(0, 100, [], 2).map(e => e.toNumber())).toEqual([50])
  })

  it('never makes more than eight bars, thresholds or not', () => {
    expect(barEdges(0, 100, [33], 8).length).toBeLessThanOrEqual(7)
    expect(barEdges(0, 100, [33], 8)).toContainEqual(new Decimal(33))
    const seven = barEdges(0, 100, [10, 20, 30, 40, 50, 60, 70], 8).map(e => e.toNumber())
    expect(seven).toEqual([10, 20, 30, 40, 50, 60, 70])
    expect(barEdges(0, 100, [], 99).length).toBeLessThanOrEqual(7)
  })

  it('refuses more thresholds than bars allow', () => {
    expect(() => barEdges(0, 40, [1, 2, 3], 3)).toThrow('At most 2')
    expect(() => barEdges(5, 5, [], 4)).toThrow('minimum')
  })
})

describe('bucketCurve labels', () => {
  it('shows a typed threshold exactly', () => {
    const curve = [0, 250, 500, 750, 1000].map((x, i) => ({ x, y: [1, 3, 5, 3, 1][i] }))
    const { buckets } = bucketCurve({ min: 0, max: 1000, thresholds: [12.5], curve })
    expect(buckets.map(b => b.label).join('|')).toContain('12.5')
    expect(new Set(buckets.map(b => b.label)).size).toBe(buckets.length)
  })
})

describe('barBuckets', () => {
  it('labels the buckets of the bars view, thresholds included', () => {
    const { edges, labels } = barBuckets(-10, 30, [0], '°C')
    expect(edges.some(e => e.eq(0))).toBe(true)
    expect(labels).toHaveLength(edges.length + 1)
    expect(labels[0]).toMatch(/^below .* °C$/)
    expect(labels[labels.length - 1]).toMatch(/ °C or more$/)
    expect(edges.length).toBeLessThanOrEqual(7)
  })
  it('shows every threshold exactly, and gives every bucket its own label', () => {
    for (const [min, max, thresholds] of [
      [0, 1000, [12.5]],
      [0, 100, [0.001, 0.002]],
      [-10, 30, [0, 7.25, 7.5]],
    ] as [number, number, number[]][]) {
      const { edges, labels } = barBuckets(min, max, thresholds)
      expect(new Set(labels).size).toBe(labels.length)
      for (const t of thresholds) {
        const text = new Decimal(t).toString()
        expect(labels.join('|')).toContain(text)
        expect(edges.some(e => e.eq(t))).toBe(true)
      }
    }
  })
  it('throws for a range that is not one', () => {
    expect(() => barBuckets(5, 5, [])).toThrow(RangeError)
  })
})
