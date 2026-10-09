import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import {
  allPairs,
  nextComparison,
  orderAnswers,
  selectSpotChecks,
  spotCheckProblems,
  type ComparisonAnswer,
} from './comparisons'
import { makeCoherent } from './coherence'

const sketch = (entries: Record<string, number>) =>
  new Map(Object.entries(entries).map(([id, p]) => [id, new Decimal(p)]))
const ans = (first: string, second: string, pick: ComparisonAnswer['pick']): ComparisonAnswer => ({
  first,
  second,
  pick,
})
const unordered = (c: { first: string; second: string } | null) =>
  c ? [c.first, c.second].sort() : null

describe('orderAnswers', () => {
  it('turns a pick into "more likely than"', () => {
    expect(orderAnswers([ans('rain', 'snow', 'first')])).toEqual([
      { moreLikely: 'rain', lessLikely: 'snow' },
    ])
    expect(orderAnswers([ans('rain', 'snow', 'second')])).toEqual([
      { moreLikely: 'snow', lessLikely: 'rain' },
    ])
  })

  it('"about equally likely" adds no constraint', () => {
    expect(orderAnswers([ans('rain', 'snow', 'equal')])).toEqual([])
  })

  it('feeds the coherent bands: the order lifts and caps the right bounds', () => {
    const r = makeCoherent(
      [
        { id: 'rain', lo: new Decimal(0.1), hi: new Decimal(0.5), asked: true },
        { id: 'snow', lo: new Decimal(0.3), hi: new Decimal(0.6), asked: true },
        { id: 'sun', lo: new Decimal(0), hi: new Decimal(1), asked: false },
      ],
      orderAnswers([ans('snow', 'rain', 'second')]) // rain is picked second: rain > snow
    )
    expect(r.bands[0].lo.toNumber()).toBeCloseTo(0.3, 9)
    expect(r.bands[1].hi.toNumber()).toBeCloseTo(0.5, 9)
  })
})

describe('allPairs', () => {
  it('lists each unordered pair once', () => {
    expect(allPairs(['a', 'b', 'c'])).toEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ])
    expect(allPairs(['a'])).toEqual([])
  })
})

describe('nextComparison', () => {
  const ids = ['rain', 'snow', 'sun', 'fog']
  const est = sketch({ rain: 0.3, snow: 0.02, sun: 0.31, fog: 0.1 })
  const base = { ids, sketch: est, answers: [] as ComparisonAnswer[], seed: 's' }

  it('starts with the pair whose order is least clear: the nearest estimates', () => {
    expect(unordered(nextComparison(base))).toEqual(['rain', 'sun'])
  })

  it('does not ask a pair twice, in either direction', () => {
    const first = nextComparison(base)!
    const after = nextComparison({ ...base, answers: [ans(first.second, first.first, 'equal')] })!
    expect(unordered(after)).not.toEqual(unordered(first))
  })

  it('skips a pair whose order follows from earlier answers', () => {
    const everything = nextComparison({
      ids: ['a', 'b', 'c'],
      sketch: sketch({ a: 0.3, b: 0.31, c: 0.32 }),
      answers: [ans('a', 'b', 'first'), ans('b', 'c', 'first')],
      seed: 's',
    })
    // a > b > c implies a > c: nothing left to ask
    expect(everything).toBeNull()
  })

  it('still asks a pair that equal answers do not settle', () => {
    const next = nextComparison({
      ids: ['a', 'b', 'c'],
      sketch: sketch({ a: 0.3, b: 0.31, c: 0.32 }),
      answers: [ans('a', 'b', 'equal'), ans('b', 'c', 'equal')],
      seed: 's',
    })
    expect(unordered(next)).toEqual(['a', 'c'])
  })

  it('skips pairs whose bands are already clearly apart', () => {
    const bands = new Map([
      ['a', { lo: new Decimal(0.6), hi: new Decimal(0.7) }],
      ['b', { lo: new Decimal(0.1), hi: new Decimal(0.2) }],
      ['c', { lo: new Decimal(0.15), hi: new Decimal(0.3) }],
    ])
    const next = nextComparison({
      ids: ['a', 'b', 'c'],
      sketch: sketch({ a: 0.6, b: 0.15, c: 0.2 }),
      bands,
      answers: [],
      seed: 's',
    })
    // a is clear of both; only b vs c overlap
    expect(unordered(next)).toEqual(['b', 'c'])
  })

  it('is null when every pair is settled, and for fewer than two outcomes', () => {
    expect(
      nextComparison({ ids: ['a'], sketch: sketch({ a: 1 }), answers: [], seed: 's' })
    ).toBeNull()
    const answers = allPairs(ids).map(([a, b]) => ans(a, b, 'equal'))
    expect(nextComparison({ ...base, answers })).toBeNull()
  })

  it('asks each pair at most once over a whole run, and ends', () => {
    let answers: ComparisonAnswer[] = []
    const seen = new Set<string>()
    for (
      let q = nextComparison({ ...base, answers });
      q;
      q = nextComparison({ ...base, answers })
    ) {
      const key = [q.first, q.second].sort().join('|')
      expect(seen.has(key)).toBe(false)
      seen.add(key)
      answers = [...answers, ans(q.first, q.second, 'equal')]
    }
    expect(seen.size).toBe(allPairs(ids).length)
  })

  it('is deterministic, and the seed decides ties and which pair comes first on screen', () => {
    const tied = {
      ids: ['a', 'b', 'c', 'd'],
      sketch: sketch({ a: 0.25, b: 0.25, c: 0.25, d: 0.25 }),
      answers: [],
    }
    expect(nextComparison({ ...tied, seed: 'x' })).toEqual(nextComparison({ ...tied, seed: 'x' }))
    const outcomes = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const q = nextComparison({ ...tied, seed: `seed-${i}` })!
      outcomes.add(`${q.first}>${q.second}`)
    }
    expect(outcomes.size).toBeGreaterThan(4)
  })

  it('shows both orders of the pair across seeds', () => {
    const firsts = new Set<string>()
    for (let i = 0; i < 30; i++) {
      firsts.add(
        nextComparison({
          ids: ['a', 'b'],
          sketch: sketch({ a: 0.5, b: 0.5 }),
          answers: [],
          seed: `s${i}`,
        })!.first
      )
    }
    expect(firsts).toEqual(new Set(['a', 'b']))
  })
})

describe('with the most outcomes the wager allows', () => {
  const eight = Array.from({ length: 8 }, (_, i) => `o${i + 1}`)
  const est = sketch(Object.fromEntries(eight.map((id, i) => [id, 0.05 + i * 0.1])))

  it('has 28 pairs, and an all-"equal" run asks every one of them', () => {
    expect(allPairs(eight)).toHaveLength(28)
    let answers: ComparisonAnswer[] = []
    for (
      let q = nextComparison({ ids: eight, sketch: est, answers, seed: 's' });
      q;
      q = nextComparison({ ids: eight, sketch: est, answers, seed: 's' })
    ) {
      answers = [...answers, ans(q.first, q.second, 'equal')]
    }
    expect(answers).toHaveLength(28)
  })

  it('still takes only three pairs for the spot checks', () => {
    const checks = selectSpotChecks(eight, 'seed')
    expect(checks.filter(c => c.type === 'pair')).toHaveLength(3)
    expect(checks).toHaveLength(4)
  })
})

describe('a whole run with real picks', () => {
  it('skips the pairs that earlier picks imply, whichever side was shown first', () => {
    const ids = ['a', 'b', 'c', 'd']
    const truth: Record<string, number> = { a: 4, b: 3, c: 2, d: 1 } // a > b > c > d
    const est = sketch({ a: 0.3, b: 0.28, c: 0.26, d: 0.24 })
    let answers: ComparisonAnswer[] = []
    for (
      let q = nextComparison({ ids, sketch: est, answers, seed: 'mixed' });
      q;
      q = nextComparison({ ids, sketch: est, answers, seed: 'mixed' })
    ) {
      const pick = truth[q.first] > truth[q.second] ? 'first' : 'second'
      answers = [...answers, ans(q.first, q.second, pick)]
    }
    // a total order of four needs at most 3 comparisons for a chain, never all 6
    expect(answers.length).toBeLessThan(6)
    // every pair's order is known: asked, or implied by a chain of the picks
    const orders = orderAnswers(answers)
    expect(orders.every(o => truth[o.moreLikely] > truth[o.lessLikely])).toBe(true)
    expect(nextComparison({ ids, sketch: est, answers, seed: 'mixed' })).toBeNull()
  })
})

describe('bands that only touch', () => {
  it('still overlap at a single value, so the pair is not called clear', () => {
    const bands = new Map([
      ['a', { lo: new Decimal(0.3), hi: new Decimal(0.4) }],
      ['b', { lo: new Decimal(0.4), hi: new Decimal(0.5) }],
    ])
    const next = nextComparison({
      ids: ['a', 'b'],
      sketch: sketch({ a: 0.35, b: 0.45 }),
      bands,
      answers: [],
      seed: 's',
    })
    expect(unordered(next)).toEqual(['a', 'b'])
  })

  it('a gap, however small, is clear', () => {
    const bands = new Map([
      ['a', { lo: new Decimal(0.3), hi: new Decimal(0.4) }],
      ['b', { lo: new Decimal('0.4000001'), hi: new Decimal(0.5) }],
    ])
    expect(
      nextComparison({
        ids: ['a', 'b'],
        sketch: sketch({ a: 0.35, b: 0.45 }),
        bands,
        answers: [],
        seed: 's',
      })
    ).toBeNull()
  })
})

describe('a sketch that misses an outcome', () => {
  it('says which one, instead of a bare TypeError', () => {
    expect(() =>
      nextComparison({ ids: ['a', 'b'], sketch: sketch({ a: 0.5 }), answers: [], seed: 's' })
    ).toThrow('No estimate for outcome "b"')
  })
})

describe('selectSpotChecks', () => {
  const ids = ['a', 'b', 'c', 'd', 'e']

  it('picks three distinct pairs and one completeness check', () => {
    const checks = selectSpotChecks(ids, 'seed')
    const pairs = checks.filter(c => c.type === 'pair')
    expect(pairs).toHaveLength(3)
    expect(new Set(pairs.map(p => [p.first, p.second].sort().join('|'))).size).toBe(3)
    expect(checks.filter(c => c.type === 'completeness')).toHaveLength(1)
    expect(checks[checks.length - 1]).toEqual({ type: 'completeness' })
  })

  it('uses fewer pairs when fewer exist', () => {
    expect(selectSpotChecks(['a', 'b'], 's').filter(c => c.type === 'pair')).toHaveLength(1)
    expect(selectSpotChecks(['a', 'b', 'c'], 's').filter(c => c.type === 'pair')).toHaveLength(3)
    expect(selectSpotChecks(['a'], 's')).toEqual([{ type: 'completeness' }])
  })

  it('is deterministic per seed and varies between seeds', () => {
    expect(selectSpotChecks(ids, 'x')).toEqual(selectSpotChecks(ids, 'x'))
    const variants = new Set<string>()
    for (let i = 0; i < 20; i++) variants.add(JSON.stringify(selectSpotChecks(ids, `s${i}`)))
    expect(variants.size).toBeGreaterThan(5)
  })

  it('only names known outcomes', () => {
    for (const c of selectSpotChecks(ids, 'k')) {
      if (c.type === 'pair') {
        expect(ids).toContain(c.first)
        expect(ids).toContain(c.second)
        expect(c.first).not.toBe(c.second)
      }
    }
  })
})

describe('spotCheckProblems', () => {
  it('flags pairs that can both happen and a missing "none of these"', () => {
    expect(
      spotCheckProblems([
        { type: 'pair', first: 'a', second: 'b', bothCanHappen: false },
        { type: 'pair', first: 'a', second: 'c', bothCanHappen: true },
        { type: 'completeness', couldBeNone: true },
      ])
    ).toEqual([{ type: 'overlap', first: 'a', second: 'c' }, { type: 'incomplete' }])
  })

  it('finds nothing when the outcomes hold up', () => {
    expect(
      spotCheckProblems([
        { type: 'pair', first: 'a', second: 'b', bothCanHappen: false },
        { type: 'completeness', couldBeNone: false },
      ])
    ).toEqual([])
    expect(spotCheckProblems([])).toEqual([])
  })
})

describe('selectSpotChecks with a catch-all outcome', () => {
  it('leaves it out of the pairs and drops the completeness check', () => {
    const checks = selectSpotChecks(['o1', 'o2', 'o3', 'o4'], 'seed', 'o4')
    expect(checks.every(c => c.type === 'pair')).toBe(true)
    expect(checks).toHaveLength(3)
    expect(JSON.stringify(checks)).not.toContain('o4')
  })
  it('asks nothing when the only other outcome is the catch-all', () => {
    expect(selectSpotChecks(['o1', 'o2'], 'seed', 'o2')).toEqual([])
  })
  it('behaves as before when no catch-all is given or it is not in the list', () => {
    expect(selectSpotChecks(['o1', 'o2'], 's', 'o9')).toEqual(selectSpotChecks(['o1', 'o2'], 's'))
  })
})
