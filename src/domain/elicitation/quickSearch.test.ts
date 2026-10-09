import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import { computeBand, type WedgeAnswer } from './bandRule'
import { bandWidthLogit } from './logOdds'
import { approxQuestionsLeft, nextQuestion, openingWedge } from './quickSearch'

/** A user whose indifference band is [a, b]: below it the claim wins, above it the wedge wins. */
function respondent(a: number, b: number) {
  return (wedge: Decimal): WedgeAnswer['choice'] =>
    wedge.lt(a) ? 'claim' : wedge.gt(b) ? 'wedge' : 'cant-separate'
}

function run(answer: (w: Decimal) => WedgeAnswer['choice'], seed: string) {
  const answers: WedgeAnswer[] = []
  const estimates: number[] = [approxQuestionsLeft(answers, seed)]
  const kinds: string[] = []
  for (let q = nextQuestion(answers, seed); q; q = nextQuestion(answers, seed)) {
    kinds.push(q.kind)
    answers.push({ wedge: q.wedge, choice: answer(q.wedge) })
    estimates.push(approxQuestionsLeft(answers, seed))
  }
  return { answers, estimates, kinds, result: computeBand(answers) }
}

describe('opening wedge', () => {
  it('is a whole percent in 35-65% and depends on the seed only', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) {
      const w = openingWedge(`seed-${i}`)
      const pct = w.times(100).toNumber()
      expect(Number.isInteger(pct)).toBe(true)
      expect(pct).toBeGreaterThanOrEqual(35)
      expect(pct).toBeLessThanOrEqual(65)
      seen.add(pct)
    }
    expect(seen.size).toBeGreaterThan(15)
    expect(openingWedge('same').eq(openingWedge('same'))).toBe(true)
  })

  it('is the first question', () => {
    const q = nextQuestion([], 'abc')!
    expect(q.kind).toBe('opening')
    expect(q.wedge.eq(openingWedge('abc'))).toBe(true)
  })
})

describe('quick mode search', () => {
  it('is deterministic: same seed and answers, same questions', () => {
    const a = run(respondent(0.45, 0.55), 'x')
    const b = run(respondent(0.45, 0.55), 'x')
    expect(a.answers.map(x => x.wedge.toString())).toEqual(b.answers.map(x => x.wedge.toString()))
    expect(
      new Decimal(run(respondent(0.45, 0.55), 'y').answers[0].wedge).eq(openingWedge('y'))
    ).toBe(true)
  })

  it('takes about 4-6 questions for a typical respondent, more only for the tails and for ignorance', () => {
    let total = 0
    let runs = 0
    for (const [a, b] of [
      [0.45, 0.55],
      [0.4, 0.6],
      [0.3, 0.7],
      [0.6, 0.65],
    ]) {
      for (let i = 0; i < 10; i++) {
        total += run(respondent(a, b), `typical-${i}`).answers.length
        runs++
      }
    }
    expect(total / runs).toBeGreaterThanOrEqual(3)
    expect(total / runs).toBeLessThanOrEqual(6)
  })

  it('finds a narrow band for a confident coin flip', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const { result, answers } = run(respondent(0.48, 0.52), seed)
      expect(answers.length).toBeLessThanOrEqual(6)
      const width = bandWidthLogit(result!.band)!.toNumber()
      expect(width).toBeLessThanOrEqual(1.2)
      expect(result!.band.lo!.toNumber()).toBeLessThanOrEqual(0.52)
      expect(result!.band.hi!.toNumber()).toBeGreaterThanOrEqual(0.48)
      expect(result!.isHardContradiction).toBe(false)
    }
  })

  it('finds a wide band for total ignorance, however the run opens', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const { result, answers } = run(respondent(0.2, 0.8), seed)
      expect(answers.length).toBeLessThanOrEqual(12)
      const width = bandWidthLogit(result!.band)!.toNumber()
      expect(width).toBeGreaterThan(2)
    }
  })

  it('keeps probing outward past "can\'t separate" instead of ending the run', () => {
    const { answers, kinds } = run(respondent(0.3, 0.7), 'k')
    expect(kinds.filter(k => k === 'outward').length).toBeGreaterThanOrEqual(2)
    expect(answers.some(a => a.choice === 'claim')).toBe(true)
    expect(answers.some(a => a.choice === 'wedge')).toBe(true)
  })

  it('resolves a belief in the tails with real resolution there', () => {
    const { result, answers } = run(respondent(0.02, 0.03), 'tail')
    expect(answers.length).toBeLessThanOrEqual(11)
    expect(result!.band.lo!.toNumber()).toBeLessThanOrEqual(0.03)
    expect(result!.band.hi!.toNumber()).toBeGreaterThanOrEqual(0.02)
    expect(result!.band.hi!.toNumber()).toBeLessThan(0.1)
    expect(result!.band.lo!.toNumber()).toBeGreaterThan(0.004)
  })

  it('ends with a one-sided band at the grid floor and never asks a wedge twice', () => {
    const { result, answers } = run(() => 'wedge', 'floor')
    expect(result!.band.lo).toBeNull()
    expect(result!.band.hi!.toNumber()).toBe(0.001)
    const wedges = answers.map(a => a.wedge.toString())
    expect(new Set(wedges).size).toBe(wedges.length)

    const top = run(() => 'claim', 'ceiling')
    expect(top.result!.band.hi).toBeNull()
    expect(top.result!.band.lo!.toNumber()).toBe(0.999)
  })

  it('terminates with a valid band for an erratic respondent', () => {
    // answers depend on the wedge in no monotone way
    const erratic = (w: Decimal): WedgeAnswer['choice'] =>
      (['claim', 'wedge', 'cant-separate'] as const)[Math.round(w.times(1000).toNumber()) % 3]
    for (const seed of ['e1', 'e2', 'e3', 'e4']) {
      const { answers, result } = run(erratic, seed)
      expect(answers.length).toBeLessThanOrEqual(12)
      const wedges = answers.map(a => new Decimal(a.wedge).toString())
      expect(new Set(wedges).size).toBe(wedges.length)
      if (answers.some(a => a.choice !== 'cant-separate')) expect(result).not.toBeNull()
    }
  })

  it('stops a bounded run for any simple respondent', () => {
    for (const [a, b] of [
      [0.1, 0.12],
      [0.9, 0.95],
      [0.5, 0.5],
      [0.01, 0.9],
      [0.6, 0.65],
    ]) {
      for (const seed of ['p', 'q', 'r']) {
        expect(run(respondent(a, b), seed).answers.length).toBeLessThanOrEqual(12)
      }
    }
  })
})

describe('questions left', () => {
  const trace = (answer: (w: Decimal) => WedgeAnswer['choice'], seed: string) => {
    const answers: WedgeAnswer[] = []
    const steps: string[] = [`N=${approxQuestionsLeft(answers, seed)}`]
    for (let q = nextQuestion(answers, seed); q; q = nextQuestion(answers, seed)) {
      const choice = answer(q.wedge)
      answers.push({ wedge: q.wedge, choice })
      steps.push(
        `${q.wedge.toString()} ${q.kind} ${choice} N=${approxQuestionsLeft(answers, seed)}`
      )
    }
    return steps
  }

  it('follows a fixed example: a sharp believer around 50%', () => {
    expect(trace(respondent(0.45, 0.55), 'trace')).toEqual([
      'N=5',
      '0.49 opening cant-separate N=4',
      '0.64 outward wedge N=2',
      '0.35 outward claim N=1',
      '0.57 refine wedge N=0',
    ])
  })

  it('follows a fixed example: a wide, unsure respondent, whose N rises after outward probes', () => {
    expect(trace(respondent(0.3, 0.7), 'trace')).toEqual([
      'N=5',
      '0.49 opening cant-separate N=4',
      '0.64 outward cant-separate N=5',
      '0.35 outward cant-separate N=6',
      '0.76 outward wedge N=3',
      '0.23 outward claim N=1',
      '0.29 refine claim N=0',
    ])
  })

  it('stays within a small margin of the questions actually left for typical respondents', () => {
    for (const [a, b] of [
      [0.45, 0.55],
      [0.4, 0.6],
      [0.3, 0.7],
      [0.6, 0.65],
    ]) {
      for (const seed of ['m1', 'm2', 'm3', 'm4']) {
        const { answers, estimates } = run(respondent(a, b), seed)
        estimates.forEach((n, i) => {
          expect(Math.abs(n - (answers.length - i))).toBeLessThanOrEqual(3)
        })
      }
    }
  })

  it('is within 8 of the truth even for tails and ignorance, and always ends at zero', () => {
    for (const [a, b] of [
      [0.02, 0.03],
      [0.2, 0.8],
      [0.9, 0.95],
    ]) {
      const { answers, estimates } = run(respondent(a, b), 'wide')
      estimates.forEach((n, i) => {
        expect(Math.abs(n - (answers.length - i))).toBeLessThanOrEqual(8)
      })
      expect(estimates[estimates.length - 1]).toBe(0)
    }
  })

  it('never rises except right after an outward probe', () => {
    for (const [a, b] of [
      [0.45, 0.55],
      [0.2, 0.8],
      [0.02, 0.03],
      [0.3, 0.7],
    ]) {
      for (const seed of ['s1', 's2', 's3']) {
        const { answers, estimates } = run(respondent(a, b), seed)
        for (let i = 1; i < estimates.length; i++) {
          if (estimates[i] > estimates[i - 1]) {
            expect(nextQuestion(answers.slice(0, i - 1), seed)!.kind).toBe('outward')
          }
        }
      }
    }
  })
})
