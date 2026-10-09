import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import { answerQuestion, nextFlowQuestion, questionsLeft, stopRun } from './runFlow'
import type { RunData } from '../../storage/elicitation'
import { armFor } from '../../domain/elicitation/thorough'

const quick = (extra: Partial<RunData> = {}): RunData =>
  ({
    claim: 'C',
    criteria: '',
    seed: 'flowseed',
    dropped: [],
    adjusted: null,
    mode: 'quick',
    answers: [],
    ...extra,
  }) as RunData
const thorough = (): RunData => ({ ...quick(), mode: 'thorough', answers: [] }) as RunData

function finish(run: RunData, choose: (w: Decimal) => 'claim' | 'wedge' | 'cant-separate') {
  let r = run
  for (let q = nextFlowQuestion(r); q; q = nextFlowQuestion(r))
    r = answerQuestion(r, q, choose(q.wedge))
  return r
}

describe('runFlow', () => {
  it('asks the opening question first, with an arm order drawn from the seed', () => {
    const q = nextFlowQuestion(quick())!
    expect(q.frame).toBe('claim')
    expect(q.armOrder).toBe(armFor('flowseed', 0))
  })

  it('records an answer and moves on', () => {
    const run = quick()
    const q = nextFlowQuestion(run)!
    const next = answerQuestion(run, q, 'claim')
    expect(next.answers).toHaveLength(1)
    expect(new Decimal(next.answers[0].wedge).eq(q.wedge)).toBe(true)
    expect(next.answers[0].choice).toBe('claim')
    expect(run.answers).toHaveLength(0)
    expect(nextFlowQuestion(next)!.wedge.eq(q.wedge)).toBe(false)
  })

  it('records thorough answers with the tags of their question, swapped arms on repeats', () => {
    const done = finish(thorough(), w =>
      w.lt(0.4) ? 'claim' : w.gt(0.6) ? 'wedge' : 'cant-separate'
    )
    expect(done.answers.length).toBeGreaterThan(12)
    const repeat = done.answers.find(a => 'kind' in a && a.kind === 'repeat')!
    const original = done.answers.find(
      a =>
        'kind' in a &&
        a.kind !== 'repeat' &&
        'frame' in a &&
        a.frame === 'claim' &&
        new Decimal(a.wedge).eq(repeat.wedge)
    )!
    expect(
      'armOrder' in repeat && 'armOrder' in original && repeat.armOrder !== original.armOrder
    ).toBe(true)
    expect(done.answers.filter(a => 'frame' in a && a.frame === 'negation')).toHaveLength(2)
  })

  it('ends when the algorithm is done, and when the user stops', () => {
    const done = finish(quick(), w => (w.lt(0.4) ? 'claim' : 'wedge'))
    expect(nextFlowQuestion(done)).toBeNull()
    const stopped = stopRun(answerQuestion(quick(), nextFlowQuestion(quick())!, 'claim'))
    expect(stopped.stopped).toBe(true)
    expect(nextFlowQuestion(stopped)).toBeNull()
    expect(stopped.answers).toHaveLength(1)
  })

  it('estimates the questions left in both modes, and not once the run is over', () => {
    const run = quick()
    expect(questionsLeft(run)!.count).toBeGreaterThan(0)
    expect(questionsLeft(run)!.longer).toBe(false)
    expect(questionsLeft(thorough())!.count).toBeGreaterThan(10)
    expect(questionsLeft(stopRun(run))).toBeNull()
    expect(questionsLeft(finish(run, w => (w.lt(0.4) ? 'claim' : 'wedge')))).toBeNull()
  })

  it('says when an answer made the run longer', () => {
    // a tail belief: every outward probe is answered "spinner", the search keeps going
    let r = quick()
    const flags: boolean[] = []
    for (let q = nextFlowQuestion(r); q && r.answers.length < 6; q = nextFlowQuestion(r)) {
      r = answerQuestion(r, q, 'wedge')
      flags.push(questionsLeft(r)?.longer ?? false)
    }
    expect(flags.some(Boolean)).toBe(true)
  })
})
