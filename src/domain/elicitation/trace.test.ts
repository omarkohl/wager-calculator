import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import { buildTrace } from './trace'
import { nextQuestion } from './quickSearch'
import type { WedgeAnswer } from './bandRule'
import { nextThoroughQuestion, type ThoroughAnswer, type ThoroughQuestion } from './thorough'

const claim = (wedge: number): WedgeAnswer => ({ wedge, choice: 'claim' })
const wedge = (w: number): WedgeAnswer => ({ wedge: w, choice: 'wedge' })
const unsure = (w: number): WedgeAnswer => ({ wedge: w, choice: 'cant-separate' })
const hand = (
  w: number,
  choice: ThoroughAnswer['choice'],
  frame: 'claim' | 'negation'
): ThoroughAnswer => ({
  wedge: w,
  choice,
  frame,
  kind: frame === 'negation' ? 'negation' : 'step',
  armOrder: 'claim-first',
})
const n = (d: Decimal | null | undefined) => d?.toNumber()

describe('buildTrace', () => {
  it('lists each question with its answer and what it implied, in words', () => {
    const t = buildTrace({
      mode: 'quick',
      seed: 's',
      answers: [claim(0.5), wedge(0.65), unsure(0.58)],
    })
    expect(t.steps.map(s => s.index)).toEqual([0, 1, 2])
    expect(t.steps[0]).toMatchObject({
      question: 'the claim or a spinner that wins 50% of the time',
      answer: 'Preferred the claim',
      implication: 'You think the claim is more likely than 50%.',
    })
    expect(t.steps[1]).toMatchObject({
      answer: 'Preferred the 65% spinner',
      implication: 'You think the claim is less likely than 65%.',
    })
    expect(t.steps[2]).toMatchObject({
      answer: 'Could not separate them',
      implication: 'You could not tell the claim and a 58% spinner apart.',
      outsideRange: false,
    })
  })

  it('words a negation probe as being about the claim being false', () => {
    const t = buildTrace({
      mode: 'thorough',
      seed: 's',
      answers: [hand(0.3, 'claim', 'negation'), hand(0.55, 'wedge', 'negation')],
    })
    expect(t.steps[0].question).toBe('the claim being false or a spinner that wins 30% of the time')
    expect(t.steps[0].implication).toBe(
      'You think the claim is false with more than 30%, so true with less than 70%.'
    )
    expect(t.steps[1].implication).toBe(
      'You think the claim is false with less than 55%, so true with more than 45%.'
    )
  })

  it('shows how the band stood after each answer', () => {
    const t = buildTrace({
      mode: 'quick',
      seed: 's',
      answers: [claim(0.5), wedge(0.65), unsure(0.58)],
    })
    expect(t.steps[0].bandAfter).toMatchObject({ hi: null })
    expect(n(t.steps[0].bandAfter!.lo)).toBe(0.5)
    expect([n(t.steps[1].bandAfter!.lo), n(t.steps[1].bandAfter!.hi)]).toEqual([0.5, 0.65])
    expect([n(t.result!.band.lo), n(t.result!.band.hi)]).toEqual([0.5, 0.65])
    expect(t.result!.pointEstimate!.toNumber()).toBeCloseTo(0.5768, 3)
  })

  it('has no band before the first edge and no result without one', () => {
    const t = buildTrace({ mode: 'quick', seed: 's', answers: [unsure(0.5)] })
    expect(t.steps[0].bandAfter).toBeNull()
    expect(t.result).toBeNull()
    expect(buildTrace({ mode: 'quick', seed: 's', answers: [] }).result).toBeNull()
  })

  it('names the contradicting pairs with their size, largest first', () => {
    // claim over 70 and 40 over the claim: 1.25 logits, hard; claim over 60 and 45 over: 0.6, absorbed
    const t = buildTrace({
      mode: 'quick',
      seed: 's',
      answers: [claim(0.7), wedge(0.4), claim(0.6), wedge(0.45)],
    })
    expect(t.contradictions.map(c => [c.claimIndex, c.wedgeIndex])).toEqual([
      [0, 1],
      [0, 3],
      [2, 1],
      [2, 3],
    ])
    const first = t.contradictions[0]
    expect([first.claimIndex, first.wedgeIndex]).toEqual([0, 1])
    expect(first.sizeLogit.toNumber()).toBeCloseTo(1.25, 2)
    expect(first.isHard).toBe(true)
    const mild = t.contradictions.find(c => c.claimIndex === 2 && c.wedgeIndex === 3)!
    expect(mild.sizeLogit.toNumber()).toBeCloseTo(0.6, 1)
    expect(mild.isHard).toBe(false)
    expect(t.result!.isHardContradiction).toBe(true)
  })

  it('has no contradictions for consistent answers', () => {
    const t = buildTrace({
      mode: 'quick',
      seed: 's',
      answers: [claim(0.4), wedge(0.6), unsure(0.5)],
    })
    expect(t.contradictions).toEqual([])
    expect(t.result!.contradictionLogit).toBeNull()
  })

  it('recomputes the result without answers dropped as misclicks', () => {
    const answers = [claim(0.7), wedge(0.4), claim(0.3), wedge(0.6)]
    const all = buildTrace({ mode: 'quick', seed: 's', answers })
    expect(all.result!.isHardContradiction).toBe(true)

    const dropped = buildTrace({ mode: 'quick', seed: 's', answers, dropped: [0] })
    expect(dropped.steps[0].dropped).toBe(true)
    expect(dropped.steps[1].dropped).toBe(false)
    expect(dropped.contradictions).toEqual([])
    expect([n(dropped.result!.band.lo), n(dropped.result!.band.hi)]).toEqual([0.3, 0.4])
    expect(dropped.result!.isHardContradiction).toBe(false)
    // the trace still shows every recorded step, the dropped one marked
    expect(dropped.steps).toHaveLength(4)
    // the band after the dropped step is whatever it was before (nothing yet)
    expect(dropped.steps[0].bandAfter).toBeNull()
  })

  it('has no result once everything is dropped', () => {
    const t = buildTrace({ mode: 'quick', seed: 's', answers: [claim(0.5)], dropped: [0] })
    expect(t.result).toBeNull()
  })

  it('reports whether the algorithm would ask more after the kept answers', () => {
    // a full quick run
    const answers: WedgeAnswer[] = []
    for (let q = nextQuestion(answers, 'full'); q; q = nextQuestion(answers, 'full')) {
      answers.push({
        wedge: q.wedge,
        choice: q.wedge.lt(0.45) ? 'claim' : q.wedge.gt(0.55) ? 'wedge' : 'cant-separate',
      })
    }
    expect(buildTrace({ mode: 'quick', seed: 'full', answers }).wouldAskMore).toBe(false)
    expect(
      buildTrace({ mode: 'quick', seed: 'full', answers: answers.slice(0, 1) }).wouldAskMore
    ).toBe(true)
  })
})

describe('buildTrace for a thorough run', () => {
  const coherent = (q: ThoroughQuestion) => {
    const [lo, hi] = q.frame === 'claim' ? [0.4, 0.6] : [0.4, 0.6] // symmetric, so its complement is the same
    return q.wedge.lt(lo) ? 'claim' : q.wedge.gt(hi) ? 'wedge' : ('cant-separate' as const)
  }
  const fullRun = (seed: string, choose = coherent) => {
    const answers: ThoroughAnswer[] = []
    for (let q = nextThoroughQuestion(answers, seed); q; q = nextThoroughQuestion(answers, seed)) {
      answers.push({
        wedge: q.wedge,
        choice: choose(q),
        frame: q.frame,
        stair: q.stair,
        kind: q.kind,
        armOrder: q.armOrder,
      })
    }
    return answers
  }

  it('traces a whole run, flags no incoherence, and ends where the algorithm ends', () => {
    const answers = fullRun('trace')
    const t = buildTrace({ mode: 'thorough', seed: 'trace', answers })
    expect(t.steps).toHaveLength(answers.length)
    expect(t.contradictions).toEqual([])
    expect(t.repeatDisagreements).toEqual([])
    expect(t.result!.subadditivity).toBeNull()
    expect(t.wouldAskMore).toBe(false)
    expect(t.steps.filter(s => s.frame === 'negation')).toHaveLength(2)
    expect(t.steps.some(s => s.kind === 'repeat')).toBe(true)
  })

  it('shows a subadditivity gap from the negation probes', () => {
    const sub = (q: ThoroughQuestion) =>
      q.wedge.lt(0.6) ? 'claim' : q.wedge.gt(0.7) ? 'wedge' : ('cant-separate' as const)
    const t = buildTrace({ mode: 'thorough', seed: 'sub', answers: fullRun('sub', sub) })
    expect(t.result!.subadditivity!.kind).toBe('sub')
  })

  it('lists a repeat that disagrees with its original', () => {
    const answers = fullRun('rep')
    const repeatAt = answers.findIndex(a => a.kind === 'repeat')
    const original = answers.findIndex(
      (a, i) =>
        i < repeatAt &&
        a.kind !== 'repeat' &&
        a.frame === 'claim' &&
        new Decimal(a.wedge).eq(answers[repeatAt].wedge)
    )
    const flipped = answers.map((a, i) =>
      i === repeatAt
        ? { ...a, choice: a.choice === 'claim' ? ('wedge' as const) : ('claim' as const) }
        : a
    )
    const t = buildTrace({ mode: 'thorough', seed: 'rep', answers: flipped })
    expect(t.repeatDisagreements).toContainEqual({ originalIndex: original, repeatIndex: repeatAt })
  })

  it('answers wouldAskMore like the algorithm does for stored-shape answers', () => {
    const answers = fullRun('stored')
    for (const cut of [0, 3, 8, answers.length - 1, answers.length]) {
      // a JSON round trip, as a stored run comes back
      const stored: ThoroughAnswer[] = JSON.parse(JSON.stringify(answers.slice(0, cut)))
      const t = buildTrace({ mode: 'thorough', seed: 'stored', answers: stored })
      expect(t.wouldAskMore).toBe(nextThoroughQuestion(answers.slice(0, cut), 'stored') !== null)
    }
  })

  it('recomputes a thorough run without a dropped answer, and shows the arm order', () => {
    const answers = fullRun('drop')
    const stepIndex = answers.findIndex(a => a.kind === 'step')
    const t = buildTrace({ mode: 'thorough', seed: 'drop', answers, dropped: [stepIndex] })
    expect(t.steps[stepIndex].dropped).toBe(true)
    expect(t.steps.filter(s => s.dropped)).toHaveLength(1)
    expect(t.steps.every((s, i) => s.armOrder === answers[i].armOrder)).toBe(true)
    expect(t.result).not.toBeNull()
  })

  it('drops the subadditivity flag along with the negation probes that caused it', () => {
    const sub = (q: ThoroughQuestion) =>
      q.wedge.lt(0.6) ? 'claim' : q.wedge.gt(0.7) ? 'wedge' : ('cant-separate' as const)
    const answers = fullRun('subdrop', sub)
    const probes = answers.map((a, i) => (a.frame === 'negation' ? i : -1)).filter(i => i >= 0)
    expect(
      buildTrace({ mode: 'thorough', seed: 'subdrop', answers }).result!.subadditivity
    ).not.toBeNull()
    const t = buildTrace({ mode: 'thorough', seed: 'subdrop', answers, dropped: probes })
    expect(t.result!.subadditivity).toBeNull()
  })

  it('uses the complement for a negation respondent whose belief is not symmetric', () => {
    const asym = (q: ThoroughQuestion) => {
      const [lo, hi] = q.frame === 'claim' ? [0.2, 0.3] : [0.7, 0.8]
      return q.wedge.lt(lo) ? 'claim' : q.wedge.gt(hi) ? 'wedge' : ('cant-separate' as const)
    }
    const t = buildTrace({ mode: 'thorough', seed: 'asym', answers: fullRun('asym', asym) })
    expect(t.result!.subadditivity).toBeNull()
    expect(t.contradictions).toEqual([])
  })
})

describe('buildTrace details', () => {
  it('points out a "could not separate" outside the range the other answers bracket', () => {
    const t = buildTrace({
      mode: 'quick',
      seed: 's',
      answers: [claim(0.4), wedge(0.6), unsure(0.5), unsure(0.8)],
    })
    expect(t.steps.map(s => s.outsideRange)).toEqual([false, false, false, true])
    expect(t.steps[3].implication).not.toMatch(/inside/)
  })

  it('does not call anything outside when the answers contradict each other', () => {
    const t = buildTrace({
      mode: 'quick',
      seed: 's',
      answers: [claim(0.7), wedge(0.4), unsure(0.9)],
    })
    expect(t.steps.every(s => !s.outsideRange)).toBe(true)
  })

  it('uses one definition of a hard contradiction for the pairs and the result', () => {
    for (const answers of [
      [claim(0.7), wedge(0.4)],
      [claim(0.6), wedge(0.45)],
      [claim(0.2), wedge(0.8)],
      [claim(0.11), wedge(0.01), claim(0.5), wedge(0.3)],
    ]) {
      const t = buildTrace({ mode: 'quick', seed: 's', answers })
      const largest = t.contradictions[0]
      expect(largest ? largest.isHard : false).toBe(t.result!.isHardContradiction)
      expect(n(largest?.sizeLogit) ?? null).toEqual(n(t.result!.contradictionLogit) ?? null)
    }
  })

  it('ignores dropped indexes that are not valid', () => {
    const answers = [claim(0.4), wedge(0.6)]
    const base = buildTrace({ mode: 'quick', seed: 's', answers })
    const t = buildTrace({ mode: 'quick', seed: 's', answers, dropped: [-1, 2, 0.5, 99, NaN] })
    expect(t.steps.some(s => s.dropped)).toBe(false)
    expect(t.result).toEqual(base.result)
  })
})

describe('buildTrace adjustment', () => {
  const answers = [claim(0.4), wedge(0.6)]

  it('keeps what the answers implied beside what the user set, with the gap', () => {
    const t = buildTrace({ mode: 'quick', seed: 's', answers, adjusted: '75' })
    expect(t.adjustment).not.toBeNull()
    expect(n(t.adjustment!.adjusted)).toBe(0.75)
    expect([n(t.adjustment!.implied.lo), n(t.adjustment!.implied.hi)]).toEqual([0.4, 0.6])
    expect(t.adjustment!.impliedPointEstimate!.toNumber()).toBeCloseTo(0.5, 10)
    expect(t.adjustment!.gap).toBe('above')
    expect(buildTrace({ mode: 'quick', seed: 's', answers, adjusted: '45' }).adjustment!.gap).toBe(
      'inside'
    )
    expect(buildTrace({ mode: 'quick', seed: 's', answers, adjusted: '10' }).adjustment!.gap).toBe(
      'below'
    )
  })

  it('has none when nothing was set, when it is invalid, or when there is no band', () => {
    expect(buildTrace({ mode: 'quick', seed: 's', answers }).adjustment).toBeNull()
    expect(buildTrace({ mode: 'quick', seed: 's', answers, adjusted: null }).adjustment).toBeNull()
    expect(buildTrace({ mode: 'quick', seed: 's', answers, adjusted: 'abc' }).adjustment).toBeNull()
    expect(
      buildTrace({ mode: 'quick', seed: 's', answers: [unsure(0.5)], adjusted: '50' }).adjustment
    ).toBeNull()
  })

  it('compares against the band of the kept answers', () => {
    const all = [claim(0.4), wedge(0.6), claim(0.7)]
    const t = buildTrace({ mode: 'quick', seed: 's', answers: all, dropped: [2], adjusted: '75' })
    expect(t.adjustment!.gap).toBe('above')
  })

  it('a one-sided band gives a gap only on the side it bounds', () => {
    const t = buildTrace({ mode: 'quick', seed: 's', answers: [claim(0.5)], adjusted: '90' })
    expect(t.adjustment!.impliedPointEstimate).toBeNull()
    expect(t.adjustment!.gap).toBe('inside')
  })
})
