import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { answerMulti, nextMultiQuestion, type MultiAnswer, type MultiRun } from './multiRun'
import { estimateOf, MERGED_ID, mergeRows, multiResult, type ResultRow } from './multiResult'
import type { ElicitOutcome, Tier } from './model'

const list = (...entries: [string, Tier][]): ElicitOutcome[] =>
  entries.map(([id, tier]) => ({ id, label: id.toUpperCase(), tier }))

const weather = list(['rain', 'likely'], ['cloud', 'plausible'], ['snow', 'very unlikely'])
const truth: Record<string, number> = { rain: 0.6, cloud: 0.38, snow: 0.02 }

function play(run: MultiRun, p: Record<string, number>, steps = 40): MultiRun {
  for (let i = 0; i < steps; i++) {
    const q = nextMultiQuestion(run)
    if (!q) break
    const answer: MultiAnswer =
      q.kind === 'compare'
        ? {
            kind: 'compare',
            first: q.first,
            second: q.second,
            pick: p[q.first] > p[q.second] ? 'first' : 'second',
          }
        : {
            kind: 'lottery',
            targets: q.targets,
            wedge: q.wedge,
            choice: q.wedge.lt(q.targets.reduce((s, id) => s + p[id], 0)) ? 'claim' : 'wedge',
          }
    run = answerMulti(run, answer)
  }
  return run
}

describe('estimateOf', () => {
  it('is the log-odds midpoint of a band with two ends', () => {
    expect(estimateOf(new Decimal(0.01), new Decimal(0.1))!.toNumber()).toBeCloseTo(0.0324, 3)
  })
  it('is nothing for a one-sided band: no midpoint is made up', () => {
    expect(estimateOf(new Decimal(0), new Decimal(0.3))).toBeNull()
    expect(estimateOf(new Decimal(0.4), new Decimal(1))).toBeNull()
    expect(estimateOf(new Decimal(0), new Decimal(1))).toBeNull()
  })
})

describe('multiResult', () => {
  const finished = play({ outcomes: weather, seed: 'r1', answers: [] }, truth)

  it('has a band, an estimate inside it, and provenance per outcome', () => {
    const { rows } = multiResult(finished)
    expect(rows).toHaveLength(3)
    for (const r of rows) {
      if (r.estimate) expect(r.lo.lte(r.estimate) && r.estimate.lte(r.hi)).toBe(true)
    }
    expect(rows.find(r => r.id === 'rain')!.provenance.source).toBe('comparisons')
  })

  it('gives no single number for an outcome never asked about, whose band is open', () => {
    const { rows } = multiResult({ outcomes: weather, seed: 'r1', answers: [] })
    expect(rows.every(r => r.provenance.source === 'first-guess')).toBe(true)
    expect(rows.every(r => r.estimate === null)).toBe(true)
  })

  it('flags lower bounds that add up to more than 100%', () => {
    // each lottery says "above 60%": three of them cannot all hold
    let run: MultiRun = { outcomes: weather, seed: 'r2', answers: [] }
    for (const id of ['rain', 'cloud', 'snow']) {
      for (const w of [0.1, 0.3, 0.5, 0.6]) {
        run = answerMulti(run, { kind: 'lottery', targets: [id], wedge: w, choice: 'claim' })
      }
    }
    const { flags } = multiResult(run)
    expect(flags.some(f => /more than 100%/.test(f))).toBe(true)
  })

  it('says nothing is wrong when the answers fit, and offers insights', () => {
    const { flags, insights } = multiResult(finished)
    expect(flags).toEqual([])
    expect(insights.length).toBeGreaterThan(0)
  })

  it('names the group and its bound when a group answer does not fit its parts', () => {
    // A above 50%, B above 30%, but "A or B" below 60%
    let run: MultiRun = { outcomes: weather, seed: 'r3', answers: [] }
    for (const w of [0.1, 0.3, 0.5]) {
      run = answerMulti(run, { kind: 'lottery', targets: ['rain'], wedge: w, choice: 'claim' })
    }
    for (const w of [0.1, 0.3]) {
      run = answerMulti(run, { kind: 'lottery', targets: ['cloud'], wedge: w, choice: 'claim' })
    }
    for (const w of [0.7, 0.8]) {
      run = answerMulti(run, {
        kind: 'lottery',
        targets: ['rain', 'cloud'],
        wedge: w,
        choice: 'wedge',
      })
    }
    const { flags } = multiResult(run)
    const group = flags.filter(f => /“RAIN or CLOUD”/.test(f))
    expect(group.length).toBeGreaterThan(0)
    expect(group[0]).toMatch(/does not fit your answers about the outcomes on their own/)
    expect(new Set(flags).size).toBe(flags.length)
  })

  it('is deterministic: a run rebuilt from the seed and the answers gives the same result', () => {
    const rebuilt = multiResult({ outcomes: weather, seed: 'r1', answers: [...finished.answers] })
    expect(JSON.stringify(rebuilt)).toBe(JSON.stringify(multiResult(finished)))
  })
})

describe('mergeRows', () => {
  const row = (id: string, lo: number, hi: number, label = id.toUpperCase()): ResultRow => ({
    id,
    label,
    lo: new Decimal(lo),
    hi: new Decimal(hi),
    estimate: null,
    central: new Decimal((lo + hi) / 2),
    widened: false,
    provenance: { source: 'first-guess' },
  })

  it('keeps the merged band within what the other outcomes leave (three 0-60% bands, two merged)', () => {
    const merged = mergeRows([row('a', 0, 0.6), row('b', 0, 0.6), row('c', 0, 0.6)], ['a', 'b'])
    const el = merged.find(r => r.label === 'Everything else')!
    expect(el.lo.toNumber()).toBeCloseTo(0.4, 10)
    expect(el.hi.toNumber()).toBe(1)
    expect(el.id).toBe(MERGED_ID)
    expect(merged).toHaveLength(2)
  })

  it('caps the high end by what the others leave, and gives a midpoint for a two-sided band', () => {
    const merged = mergeRows(
      [row('a', 0.05, 0.1), row('b', 0.05, 0.1), row('c', 0.7, 0.8), row('d', 0.05, 0.1)],
      ['a', 'b']
    )
    const el = merged.find(r => r.label === 'Everything else')!
    // others: lows sum to 0.75, highs to 1.0; the merged part is at most 0.25 and at least 0.1
    expect(el.lo.toNumber()).toBeCloseTo(0.1, 10)
    expect(el.hi.toNumber()).toBeCloseTo(0.2, 10)
    expect(el.estimate!.gt(el.lo) && el.estimate!.lt(el.hi)).toBe(true)
    expect(el.central.gte(el.lo) && el.central.lte(el.hi)).toBe(true)
  })

  it('counts the answers behind the merged outcome once, and joins an existing "Everything else"', () => {
    const rows = [
      row('a', 0.05, 0.1),
      row('b', 0.05, 0.1),
      row('c', 0.7, 0.8),
      row('e', 0.01, 0.05, ' everything   ELSE '),
    ]
    const merged = mergeRows(rows, ['a', 'b'], ids => (ids.length === 3 ? 5 : 0))
    expect(merged).toHaveLength(2)
    const el = merged.find(r => r.id === 'e')!
    expect(el.label).toBe('Everything else')
    expect(el.provenance).toEqual({ source: 'comparisons', count: 5 })
  })

  it('does nothing with fewer than two', () => {
    const rows = [row('a', 0.05, 0.1), row('b', 0.2, 0.3)]
    expect(mergeRows(rows, ['a'])).toEqual(rows)
  })
})

describe('multiResult with a merge', () => {
  const run = play({ outcomes: weather, seed: 'r1', answers: [] }, truth)

  it('shows the merged outcome and names no merged-away outcome in the flags or insights', () => {
    const view = multiResult(run, ['cloud', 'snow'])
    expect(view.rows.map(r => r.label)).toEqual(['RAIN', 'Everything else'])
    const text = [...view.flags, ...view.insights.map(i => i.text)].join(' ')
    expect(text).not.toMatch(/CLOUD|SNOW/)
  })

  it('is the plain result when fewer than two are merged', () => {
    expect(multiResult(run, ['snow']).rows).toHaveLength(3)
  })
})
