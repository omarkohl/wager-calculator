import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { answerMulti, nextMultiQuestion, type MultiAnswer, type MultiRun } from './multiRun'
import { estimateOf, multiResult } from './multiResult'
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
