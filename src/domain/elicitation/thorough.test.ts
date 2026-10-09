import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import { bandWidthLogit, logit } from './logOdds'
import {
  MAX_THOROUGH_QUESTIONS,
  nextThoroughQuestion,
  thoroughResult,
  type ThoroughAnswer,
  type ThoroughQuestion,
} from './thorough'

type Choice = ThoroughAnswer['choice']

/**
 * A coherent user whose belief in the claim is indifferent over [a, b]: for a
 * claim comparison the claim wins below it and the wedge above; for a negation
 * comparison the same belief reads as P(not-X) in [1 - b, 1 - a].
 */
function coherent(a: number, b: number) {
  return (q: ThoroughQuestion): Choice => {
    const [lo, hi] = q.frame === 'claim' ? [a, b] : [1 - b, 1 - a]
    return q.wedge.lt(lo) ? 'claim' : q.wedge.gt(hi) ? 'wedge' : 'cant-separate'
  }
}

function run(answerFor: (q: ThoroughQuestion) => Choice, seed: string) {
  const answers: ThoroughAnswer[] = []
  const questions: ThoroughQuestion[] = []
  for (let q = nextThoroughQuestion(answers, seed); q; q = nextThoroughQuestion(answers, seed)) {
    questions.push(q)
    answers.push({
      wedge: q.wedge,
      choice: answerFor(q),
      frame: q.frame,
      stair: q.stair,
      kind: q.kind,
      armOrder: q.armOrder,
    })
  }
  return { answers, questions, result: thoroughResult(answers) }
}

const wedges = (xs: readonly { wedge: Decimal.Value }[]) =>
  xs.map(x => new Decimal(x.wedge).toString())

describe('thorough mode run', () => {
  it('takes about 14-18 questions for a consistent respondent', () => {
    let total = 0
    let runs = 0
    for (const [a, b] of [
      [0.45, 0.55],
      [0.4, 0.6],
      [0.3, 0.7],
      [0.6, 0.65],
    ]) {
      for (let i = 0; i < 6; i++) {
        const n = run(coherent(a, b), `t-${i}`).answers.length
        expect(n).toBeGreaterThanOrEqual(12)
        expect(n).toBeLessThanOrEqual(20)
        total += n
        runs++
      }
    }
    expect(total / runs).toBeGreaterThanOrEqual(14)
    expect(total / runs).toBeLessThanOrEqual(18)
  })

  it('stays within 10-24 questions for wide and tail respondents (the tails run longest)', () => {
    for (const [a, b] of [
      [0.2, 0.8],
      [0.02, 0.03],
      [0.9, 0.95],
      [0.001, 0.002],
    ]) {
      for (const seed of ['w1', 'w2', 'w3']) {
        const n = run(coherent(a, b), seed).answers.length
        expect(n).toBeGreaterThanOrEqual(10)
        expect(n).toBeLessThanOrEqual(24)
      }
    }
  })

  it('is deterministic and varies with the seed', () => {
    const a = run(coherent(0.4, 0.6), 'same')
    const b = run(coherent(0.4, 0.6), 'same')
    expect(wedges(a.questions)).toEqual(wedges(b.questions))
    const others = new Set<string>()
    for (let i = 0; i < 8; i++)
      others.add(wedges(run(coherent(0.4, 0.6), `v-${i}`).questions).join())
    expect(others.size).toBeGreaterThan(4)
  })

  it('replays: the questions follow from the answers so far', () => {
    const { answers, questions } = run(coherent(0.35, 0.65), 'replay')
    for (let i = 0; i < answers.length; i++) {
      const q = nextThoroughQuestion(answers.slice(0, i), 'replay')!
      expect(q.wedge.eq(questions[i].wedge)).toBe(true)
      expect(q.kind).toBe(questions[i].kind)
    }
    expect(nextThoroughQuestion(answers, 'replay')).toBeNull()
  })

  it('finds a band no wider than the target plus what was unseparable for a sharp believer', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const { result } = run(coherent(0.49, 0.51), seed)
      expect(bandWidthLogit(result!.band)!.toNumber()).toBeLessThanOrEqual(0.75)
      expect(result!.band.lo!.toNumber()).toBeLessThanOrEqual(0.51)
      expect(result!.band.hi!.toNumber()).toBeGreaterThanOrEqual(0.49)
      expect(result!.subadditivity).toBeNull()
    }
  })

  it('is much tighter than quick mode would allow, and wide for ignorance', () => {
    const sharp = run(coherent(0.5, 0.5), 's').result!
    const vague = run(coherent(0.2, 0.8), 's').result!
    expect(bandWidthLogit(sharp.band)!.toNumber()).toBeLessThan(0.9)
    expect(bandWidthLogit(vague.band)!.toNumber()).toBeGreaterThan(2)
  })

  it('walks two staircases from opposite anchors, interleaved', () => {
    const { questions } = run(coherent(0.4, 0.6), 'stairs')
    const anchors = questions.filter(q => q.kind === 'anchor')
    expect(anchors.map(q => q.stair).sort()).toEqual(['high', 'low'])
    const low = anchors.find(q => q.stair === 'low')!.wedge.toNumber()
    const high = anchors.find(q => q.stair === 'high')!.wedge.toNumber()
    expect(low).toBeGreaterThanOrEqual(0.05)
    expect(low).toBeLessThanOrEqual(0.15)
    expect(high).toBeGreaterThanOrEqual(0.85)
    expect(high).toBeLessThanOrEqual(0.95)
    // not one staircase after the other, for at least some seeds
    const orders = new Set<string>()
    for (let i = 0; i < 10; i++) {
      orders.add(
        run(coherent(0.4, 0.6), `i-${i}`)
          .questions.filter(q => q.stair)
          .map(q => q.stair![0])
          .join('')
      )
    }
    expect(orders.size).toBeGreaterThan(3)
    expect([...orders].some(o => /lh|hl/.test(o) && !/^l+h+$|^h+l+$/.test(o))).toBe(true)
  })

  it('walks the staircases in the right direction', () => {
    const { questions } = run(coherent(0.4, 0.6), 'dir')
    const steps = (s: 'low' | 'high') =>
      questions
        .filter(q => q.stair === s && (q.kind === 'anchor' || q.kind === 'step'))
        .map(q => q.wedge.toNumber())
    const lows = steps('low')
    const highs = steps('high')
    expect(lows).toEqual([...lows].sort((x, y) => x - y))
    expect(highs).toEqual([...highs].sort((x, y) => y - x))
  })

  it('repeats answered comparisons with the arms swapped', () => {
    for (const seed of ['r1', 'r2', 'r3']) {
      const { answers } = run(coherent(0.4, 0.6), seed)
      const repeats = answers.filter(a => a.kind === 'repeat')
      expect(repeats).toHaveLength(2)
      for (const r of repeats) {
        const original = answers.find(
          a => a.kind !== 'repeat' && a.frame === 'claim' && new Decimal(a.wedge).eq(r.wedge)
        )!
        expect(original).toBeDefined()
        expect(r.armOrder).not.toBe(original.armOrder)
        expect(answers.indexOf(original)).toBeLessThan(answers.indexOf(r))
      }
      expect(new Set(wedges(repeats)).size).toBe(2)
    }
  })

  it('asks two negation probes, in the second half of the run, worded like any question', () => {
    for (const seed of ['n1', 'n2', 'n3', 'n4']) {
      const { answers } = run(coherent(0.4, 0.6), seed)
      const positions = answers.map((a, i) => (a.frame === 'negation' ? i : -1)).filter(i => i >= 0)
      expect(positions).toHaveLength(2)
      for (const p of positions) expect(p).toBeGreaterThanOrEqual(answers.length / 2)
    }
  })

  it('negation probes sit just outside the complement of the direct band', () => {
    const { answers } = run(coherent(0.4, 0.6), 'neg')
    const probes = answers
      .filter(a => a.frame === 'negation')
      .map(a => new Decimal(a.wedge).toNumber())
    // direct band is about 40-60%, so P(not-X) is about 40-60%: one probe below, one above
    expect(Math.min(...probes)).toBeLessThan(0.45)
    expect(Math.max(...probes)).toBeGreaterThan(0.55)
  })

  it('never exceeds the cap, whatever the answers', () => {
    const erratic = (q: ThoroughQuestion): Choice =>
      (['claim', 'wedge', 'cant-separate'] as const)[Math.round(q.wedge.times(1000).toNumber()) % 3]
    for (const seed of ['e1', 'e2', 'e3']) {
      expect(run(erratic, seed).answers.length).toBeLessThanOrEqual(MAX_THOROUGH_QUESTIONS)
    }
    expect(run(() => 'wedge', 'all-wedge').answers.length).toBeLessThanOrEqual(
      MAX_THOROUGH_QUESTIONS
    )
    expect(run(() => 'claim', 'all-claim').answers.length).toBeLessThanOrEqual(
      MAX_THOROUGH_QUESTIONS
    )
  })

  it('handles a belief in the tail below the low anchor', () => {
    const { result } = run(coherent(0.01, 0.02), 'tail')
    expect(result!.band.hi!.toNumber()).toBeLessThan(0.1)
    expect(result!.band.lo!.toNumber()).toBeLessThanOrEqual(0.02)
  })
})

describe('thoroughResult', () => {
  const answer = (
    wedge: number,
    choice: Choice,
    frame: 'claim' | 'negation' = 'claim'
  ): ThoroughAnswer => ({
    wedge,
    choice,
    frame,
    kind: frame === 'negation' ? 'negation' : 'step',
    armOrder: 'claim-first',
  })

  it('gives no result without answers', () => {
    expect(thoroughResult([])).toBeNull()
  })

  it('is just the direct band when there are no negation answers', () => {
    const r = thoroughResult([answer(0.4, 'claim'), answer(0.6, 'wedge')])!
    expect([r.band.lo!.toNumber(), r.band.hi!.toNumber()]).toEqual([0.4, 0.6])
    expect(r.negation).toBeNull()
    expect(r.subadditivity).toBeNull()
  })

  it('converts the not-X band with 1 - p and intersects it with the direct band when compatible', () => {
    // direct 40-60; not-X preferred over 30% and a 55% wedge beat not-X: P(not-X) in 30-55, so P(X) in 45-70
    const r = thoroughResult([
      answer(0.4, 'claim'),
      answer(0.6, 'wedge'),
      answer(0.3, 'claim', 'negation'),
      answer(0.55, 'wedge', 'negation'),
    ])!
    expect([r.negation!.lo!.toNumber(), r.negation!.hi!.toNumber()]).toEqual([0.45, 0.7])
    expect([r.band.lo!.toNumber(), r.band.hi!.toNumber()]).toEqual([0.45, 0.6])
    expect(r.subadditivity).toBeNull()
    expect(r.pointEstimate!.toNumber()).toBeCloseTo(
      1 / (1 + Math.exp(-(Math.log(0.45 / 0.55) + Math.log(0.6 / 0.4)) / 2)),
      10
    )
  })

  it('leaves the band unchanged when the negation answers are looser but coherent', () => {
    const r = thoroughResult([
      answer(0.4, 'claim'),
      answer(0.6, 'wedge'),
      answer(0.35, 'claim', 'negation'),
      answer(0.65, 'wedge', 'negation'),
    ])!
    expect([r.band.lo!.toNumber(), r.band.hi!.toNumber()]).toEqual([0.4, 0.6])
    expect(r.subadditivity).toBeNull()
  })

  it('flags subadditivity: P(X) = 60% and P(not-X) = 60% leave a gap, shown as extra width', () => {
    // direct: 55-65. not-X: preferred over 55%, beaten by 65%: P(not-X) in 55-65, so P(X) in 35-45
    const r = thoroughResult([
      answer(0.55, 'claim'),
      answer(0.65, 'wedge'),
      answer(0.55, 'claim', 'negation'),
      answer(0.65, 'wedge', 'negation'),
    ])!
    expect(r.subadditivity!.kind).toBe('sub')
    expect(r.subadditivity!.gapLogit.toNumber()).toBeCloseTo(
      logit(0.55).minus(logit(0.45)).toNumber(),
      10
    )
    expect([r.band.lo!.toNumber(), r.band.hi!.toNumber()]).toEqual([0.35, 0.65])
    // wider than either answer set alone
    expect(bandWidthLogit(r.band)!.toNumber()).toBeGreaterThan(
      bandWidthLogit(r.direct!.band)!.toNumber()
    )
  })

  it('flags the opposite incoherence, P(X) + P(not-X) < 1', () => {
    const r = thoroughResult([
      answer(0.2, 'claim'),
      answer(0.3, 'wedge'),
      answer(0.2, 'claim', 'negation'),
      answer(0.3, 'wedge', 'negation'),
    ])!
    expect(r.subadditivity!.kind).toBe('super')
  })

  it('keeps what a one-sided direct band and a one-sided negation band each know', () => {
    // P(X) > 40% and P(not-X) > 30% (so P(X) < 70%)
    const r = thoroughResult([answer(0.4, 'claim'), answer(0.3, 'claim', 'negation')])!
    expect([r.band.lo!.toNumber(), r.band.hi!.toNumber()]).toEqual([0.4, 0.7])
    expect(r.pointEstimate).not.toBeNull()
  })

  it('stays one-sided when nothing bounds the other side', () => {
    const r = thoroughResult([answer(0.4, 'claim'), answer(0.5, 'wedge', 'negation')])!
    // P(X) > 40%; P(not-X) < 50% means P(X) > 50%: tighter, still open above
    expect([r.band.lo!.toNumber(), r.band.hi]).toEqual([0.5, null])
    expect(r.pointEstimate).toBeNull()
  })

  it('spans the conflicting edges of one-sided bands', () => {
    // P(X) > 55% against P(X) < 45%
    const r = thoroughResult([answer(0.55, 'claim'), answer(0.55, 'claim', 'negation')])!
    expect([r.band.lo!.toNumber(), r.band.hi!.toNumber()]).toEqual([0.45, 0.55])
    expect(r.subadditivity!.kind).toBe('sub')
  })
})

describe('thorough runs and the negation probes', () => {
  it('leave the band of a coherent respondent exactly as the direct answers give it', () => {
    for (const [a, b] of [
      [0.5, 0.5],
      [0.45, 0.55],
      [0.3, 0.7],
    ]) {
      for (const seed of ['c1', 'c2', 'c3']) {
        const { result } = run(coherent(a, b), seed)
        expect(result!.subadditivity).toBeNull()
        expect(result!.band.lo!.eq(result!.direct!.band.lo!)).toBe(true)
        expect(result!.band.hi!.eq(result!.direct!.band.hi!)).toBe(true)
      }
    }
  })

  it('widen the band when the respondent contradicts herself about the negation', () => {
    // believes the claim at 40-60% but also not-X at 40-60%
    const incoherent = (q: ThoroughQuestion): Choice =>
      q.wedge.lt(0.4) ? 'claim' : q.wedge.gt(0.6) ? 'wedge' : 'cant-separate'
    const { result } = run(incoherent, 'inc')
    expect(result!.band.lo!.toNumber()).toBeLessThanOrEqual(0.4)
    expect(result!.band.hi!.toNumber()).toBeGreaterThanOrEqual(0.6)
    // symmetric: P(not-X) 40-60% reads as P(X) 40-60%, so this one is coherent after all
    expect(result!.subadditivity).toBeNull()

    const sub = (q: ThoroughQuestion): Choice => {
      const [lo, hi] = q.frame === 'claim' ? [0.6, 0.7] : [0.6, 0.7]
      return q.wedge.lt(lo) ? 'claim' : q.wedge.gt(hi) ? 'wedge' : 'cant-separate'
    }
    const r = run(sub, 'sub').result!
    expect(r.subadditivity!.kind).toBe('sub')
    expect(bandWidthLogit(r.band)!.toNumber()).toBeGreaterThan(
      bandWidthLogit(r.direct!.band)!.toNumber()
    )
  })

  it('never ask the same negation probe twice, and ask one only for a one-sided band', () => {
    for (const [name, answerFor] of [
      ['all wedge', () => 'wedge' as Choice],
      ['all claim', () => 'claim' as Choice],
      ['tail', coherent(0.001, 0.002)],
      ['top tail', coherent(0.998, 0.999)],
    ] as const) {
      const { answers } = run(answerFor, `dup-${name}`)
      const probes = wedges(answers.filter(a => a.frame === 'negation'))
      expect(new Set(probes).size, name).toBe(probes.length)
    }
    const { answers, result } = run(() => 'wedge', 'one-sided')
    expect(result!.direct!.band.lo).toBeNull()
    expect(answers.filter(a => a.frame === 'negation').length).toBeLessThanOrEqual(1)
  })

  it('wait for the staircases to narrow their edge before probing', () => {
    const { questions } = run(coherent(0.4, 0.6), 'late')
    const firstProbe = questions.findIndex(q => q.frame === 'negation')
    expect(firstProbe).toBeGreaterThanOrEqual(8)
    // every staircase question after it is a refinement of a narrow bracket
    for (const q of questions.slice(firstProbe)) {
      if (q.stair) expect(q.kind).toBe('refine')
    }
  })
})
