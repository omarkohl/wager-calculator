import { describe, expect, it } from 'vitest'
import { addOutcome, emptyOutcomeList, type Tier } from '../domain/elicitation/model'
import { answerMulti, nextMultiQuestion, type MultiAnswer } from '../domain/elicitation/multiRun'
import {
  decodeSharedMulti,
  encodeContinuousResultHash,
  encodeMultiResultHash,
  MAX_SHARE_HASH,
} from './multiShare'
import { continuousToMultiRun, toMultiRun, withAnswers } from './multiAnswers'
import type { ContinuousRunData } from './continuousRun'
import type { MultiRunData } from './multiRun'

/** Answers like someone who knows the chances `truth`, for at most `steps` questions. */
function play(base: ReturnType<typeof toMultiRun>, truth: Record<string, number>, steps: number) {
  let run = base!
  for (let i = 0; i < steps; i++) {
    const q = nextMultiQuestion(run)
    if (!q) break
    const answer: MultiAnswer =
      q.kind === 'compare'
        ? {
            kind: 'compare',
            first: q.first,
            second: q.second,
            pick: truth[q.first] > truth[q.second] ? 'first' : 'second',
          }
        : {
            kind: 'lottery',
            targets: q.targets,
            wedge: q.wedge,
            choice: q.wedge.lt(q.targets.reduce((s, id) => s + truth[id], 0)) ? 'claim' : 'wedge',
          }
    run = answerMulti(run, answer)
  }
  return run.answers.slice()
}

function categorical(patch: Partial<MultiRunData> = {}): MultiRunData {
  let outcomes = emptyOutcomeList()
  for (const [label, tier] of [
    ['Alice', 'likely'],
    ['Bob & Co', 'plausible'],
    ['Carol', 'very unlikely'],
  ] as [string, Tier][]) {
    outcomes = addOutcome(outcomes, label, tier)
  }
  const run: MultiRunData = {
    kind: 'categorical',
    claim: 'Who wins the vote?',
    criteria: 'By the final count',
    seed: 'share-1',
    outcomes,
    declinedElse: true,
    phase: 'ask',
    view: 'tiers',
    percents: {},
    checks: [],
    kept: false,
    reviewing: false,
    replaced: null,
    answers: [],
    stopped: false,
    adjusted: {},
    merged: [],
    locked: false,
    ...patch,
  }
  const answers = play(toMultiRun(run), { o1: 0.6, o2: 0.3, o3: 0.1 }, 9)
  return { ...run, answers, stopped: true, ...patch }
}

function continuous(patch: Partial<ContinuousRunData> = {}): ContinuousRunData {
  const run: ContinuousRunData = {
    kind: 'continuous',
    claim: 'Noon temperature tomorrow',
    criteria: '',
    seed: 'share-2',
    unit: '°C',
    min: '-10',
    max: '30',
    thresholds: ['0'],
    phase: 'ask',
    edges: ['-5', '0', '10'],
    percents: { b0: '10', b1: '20', b2: '40', b3: '30' },
    view: 'bars',
    curve: [],
    answers: [],
    stopped: false,
    adjusted: {},
    locked: false,
    ...patch,
  }
  const answers = play(continuousToMultiRun(run), { b0: 0.1, b1: 0.2, b2: 0.4, b3: 0.3 }, 8)
  return { ...run, answers, stopped: true, ...patch }
}

const finish = (run: MultiRunData) => {
  const base = withAnswers(toMultiRun(run), run.answers)!
  return { ...run, stopped: nextMultiQuestion(base) !== null }
}

describe('result links for several outcomes', () => {
  it('round-trips tiers, answers, own numbers, a merge and the kept notice', () => {
    const run = finish(
      categorical({
        kept: true,
        adjusted: { o1: '55.5', o2: '30', merged: '14.5' },
        merged: ['o2', 'o3'],
      })
    )
    expect(run.answers.length).toBeGreaterThan(2)
    const back = decodeSharedMulti(encodeMultiResultHash(run))
    expect(back).toEqual({ type: 'result-multi', run })
  })

  it('round-trips the numbers view and ids with gaps (outcomes removed along the way)', () => {
    let outcomes = emptyOutcomeList()
    for (const label of ['A', 'B', 'C', 'D']) outcomes = addOutcome(outcomes, label, null)
    outcomes = { ...outcomes, items: outcomes.items.filter(o => o.id !== 'o2'), issued: 4 }
    const run = finish(
      categorical({
        outcomes,
        view: 'numbers',
        percents: { o1: '50', o3: '30', o4: '12,5%' },
      })
    )
    const back = decodeSharedMulti(encodeMultiResultHash(run))
    expect(back?.type).toBe('result-multi')
    const decoded = back!.run as MultiRunData
    expect(decoded.outcomes.items.map(o => o.id)).toEqual(['o1', 'o3', 'o4'])
    // typed text shared in its plain form
    expect(decoded.percents.o4).toBe('12.5')
    expect(decoded.answers).toEqual(run.answers)
  })

  it('says a run that can still ask is a stopped one', () => {
    const run = categorical()
    const early = { ...run, answers: run.answers.slice(0, 2) }
    const back = decodeSharedMulti(encodeMultiResultHash(early))
    expect((back!.run as MultiRunData).stopped).toBe(true)
  })

  it('carries nothing but what the answers say: no bands, no tiers in the numbers view', () => {
    const hash = encodeMultiResultHash(categorical())
    expect(hash).not.toMatch(/band|estimate/)
  })

  it.each([
    ['an answer the algorithm would not have asked', (h: string) => h.replace('a=', 'a=c8-9f%2C')],
    ['an answer token that is no answer', (h: string) => h.replace(/a=/, 'a=zz,')],
    ['a repeated outcome', (h: string) => h.replace('o=Carol', 'o=Alice')],
    ['ids that do not ascend', (h: string) => h.replace('oi=1%2C2%2C3', 'oi=3%2C2%2C1')],
    ['a tier that does not exist', (h: string) => h.replace(/ti=[a-z]+/, 'ti=xyz')],
    ['a wrong number of tiers', (h: string) => h.replace(/ti=[a-z]+/, 'ti=lp')],
    ['an unknown seed character', (h: string) => h.replace('s=share-1', 's=share+1')],
    ['another parameter', (h: string) => h + '&x=1'],
    ['an own number for an unknown outcome', (h: string) => h + '&adj=9%3A5'],
  ])('rejects %s', (_name, change) => {
    const hash = encodeMultiResultHash(categorical())
    const changed = change(hash)
    expect(changed).not.toBe(hash)
    expect(decodeSharedMulti(changed)).toBeNull()
  })

  it('rejects more answers than a run ever asks, and a link of absurd length', () => {
    const run = categorical()
    const hash = encodeMultiResultHash(run)
    const many = Array.from({ length: 41 }, () => 'c1-2e').join('%2C')
    expect(decodeSharedMulti(hash.replace(/a=[^&]*/, `a=${many}`))).toBeNull()
    expect(decodeSharedMulti(`${hash}&x=${'a'.repeat(MAX_SHARE_HASH)}`)).toBeNull()
  })

  it('rejects a link of another format version or kind', () => {
    const hash = encodeMultiResultHash(categorical())
    expect(decodeSharedMulti(hash.replace('ev=1', 'ev=2'))).toBeNull()
    expect(decodeSharedMulti(hash.replace('t=ro', 't=zz'))).toBeNull()
    expect(decodeSharedMulti('')).toBeNull()
  })
})

describe('result links for number claims', () => {
  it('round-trips the range, the edges, the numbers, the answers and the own numbers', () => {
    const run = continuous({ adjusted: { b0: '12', b1: '18', b2: '40', b3: '30' } })
    expect(run.answers.length).toBeGreaterThan(2)
    const back = decodeSharedMulti(encodeContinuousResultHash(run))
    expect(back).toEqual({
      type: 'result-continuous',
      run: { ...run, stopped: back && (back.run as ContinuousRunData).stopped },
    })
  })

  it('shares range ends typed with a comma, spaces or trailing zeros in their plain form', () => {
    const run = continuous()
    const back = decodeSharedMulti(
      encodeContinuousResultHash({ ...run, min: ' -10,0', max: '30.50' })
    )
    expect(back?.type).toBe('result-continuous')
    const decoded = back!.run as ContinuousRunData
    expect([decoded.min, decoded.max]).toEqual(['-10', '30.5'])
    expect(decoded.answers).toEqual(run.answers)
  })

  it('shares the plain form of numbers typed with a comma or a percent sign', () => {
    const run = continuous({ percents: { b0: '10', b1: '20', b2: '40', b3: '30%' } })
    const back = decodeSharedMulti(encodeContinuousResultHash(run))
    expect((back!.run as ContinuousRunData).percents.b3).toBe('30')
  })

  it.each([
    ['edges that are not ascending', (h: string) => h.replace('ed=-5%2C0%2C10', 'ed=0%2C-5%2C10')],
    ['an edge outside the range', (h: string) => h.replace('%2C10&', '%2C99&')],
    ['a missing bar', (h: string) => h.replace(/pc=[^&]*/, 'pc=10%2C20%2C40')],
    ['bars that are all empty', (h: string) => h.replace(/pc=[^&]*/, 'pc=0%2C0%2C0%2C0')],
    ['a bar above 100', (h: string) => h.replace(/pc=[^&]*/, 'pc=10%2C20%2C40%2C300')],
    ['an answer for a bucket that is not there', (h: string) => h + '&a=c1-9f'],
    ['a range that is not one', (h: string) => h.replace('hi=30', 'hi=-20')],
  ])('rejects %s', (_name, change) => {
    const hash = encodeContinuousResultHash(continuous())
    const changed = change(hash)
    expect(changed).not.toBe(hash)
    expect(decodeSharedMulti(changed)).toBeNull()
  })
})
