import { beforeEach, describe, expect, it } from 'vitest'
import { barEdges } from '../domain/elicitation/bucketing'
import { answerMulti, nextMultiQuestion, type MultiAnswer } from '../domain/elicitation/multiRun'
import { continuousToMultiRun } from './multiAnswers'
import {
  barIds,
  bucketsOf,
  clearContinuousRun,
  freezeDrawing,
  loadContinuousRun,
  rangeProblem,
  saveContinuousRun,
  type ContinuousRunData,
} from './continuousRun'

beforeEach(() => sessionStorage.clear())

function sample(patch: Partial<ContinuousRunData> = {}): ContinuousRunData {
  return {
    kind: 'continuous',
    claim: 'Noon temperature tomorrow',
    criteria: '',
    seed: 'abc-1',
    unit: '°C',
    min: '-10',
    max: '30',
    thresholds: ['0'],
    phase: 'bars',
    edges: barEdges(-10, 30, [0]).map(String),
    percents: { b0: '10', b1: '' },
    view: 'bars',
    curve: [],
    answers: [],
    stopped: false,
    adjusted: {},
    ...patch,
  }
}

const tamper = (change: (raw: Record<string, unknown>) => void) => {
  saveContinuousRun(sample())
  const raw = JSON.parse(sessionStorage.getItem('howsure.continuous')!)
  change(raw)
  sessionStorage.setItem('howsure.continuous', JSON.stringify(raw))
}

describe('continuous run storage', () => {
  it('round-trips a run in either phase, and clears', () => {
    saveContinuousRun(sample())
    expect(loadContinuousRun()).toEqual(sample())
    saveContinuousRun(sample({ phase: 'range', edges: [], percents: {}, min: '', max: 'x' }))
    expect(loadContinuousRun()?.phase).toBe('range')
    clearContinuousRun()
    expect(loadContinuousRun()).toBeNull()
    sessionStorage.setItem('howsure.continuous', 'nope')
    expect(loadContinuousRun()).toBeNull()
  })

  it.each([
    ['an unknown version', (r: Record<string, unknown>) => (r.ev = 9)],
    ['another kind', (r: Record<string, unknown>) => (r.kind = 'categorical')],
    ['a bad phase', (r: Record<string, unknown>) => (r.phase = 'x')],
    ['a range that is not one', (r: Record<string, unknown>) => (r.max = '-20')],
    ['a threshold that is not a number', (r: Record<string, unknown>) => (r.thresholds = ['x'])],
    ['a repeated threshold', (r: Record<string, unknown>) => (r.thresholds = ['0', '0'])],
    ['a threshold in an odd spelling', (r: Record<string, unknown>) => (r.thresholds = ['0,0'])],
    [
      'too many thresholds',
      (r: Record<string, unknown>) => (r.thresholds = ['1', '2', '3', '4', '5', '6', '7', '8']),
    ],
    ['a bar for no bucket', (r: Record<string, unknown>) => (r.percents = { b9: '1' })],
    ['a bar that is not text', (r: Record<string, unknown>) => (r.percents = { b0: 1 })],
    ['a unit that is too long', (r: Record<string, unknown>) => (r.unit = 'x'.repeat(50))],
    ['a curve of the wrong length', (r: Record<string, unknown>) => (r.curve = ['1', '2'])],
    [
      'a curve value that is not text',
      (r: Record<string, unknown>) => (r.curve = Array(9).fill(5)),
    ],
    ['an unknown view', (r: Record<string, unknown>) => (r.view = 'pie')],
    ['edges that are not the range’s', (r: Record<string, unknown>) => (r.edges = ['1', '2'])],
    [
      'edges out of order',
      (r: Record<string, unknown>) => ((r.phase = 'range'), (r.edges = ['2', '1'])),
    ],
  ])('rejects %s', (_name, change) => {
    tamper(change)
    expect(loadContinuousRun()).toBeNull()
  })

  it('round-trips a run drawn as a curve', () => {
    const run = sample({
      view: 'curve',
      curve: ['', '10', '40', '80', '100', '80', '40', '10', ''],
    })
    saveContinuousRun(run)
    expect(loadContinuousRun()).toEqual(run)
  })

  describe('questions', () => {
    /** A run in the `ask` phase on the buckets of the sample, answered by someone who knows. */
    function asked(count: number): ContinuousRunData {
      const edges = barEdges(-10, 30, [0]).map(String)
      const percents = Object.fromEntries(
        barIds(edges.length + 1).map((id, i) => [id, String(10 + i * 5)])
      )
      const run = sample({ phase: 'ask', edges, percents })
      let current = continuousToMultiRun(run)!
      for (let i = 0; i < count; i++) {
        const q = nextMultiQuestion(current)
        if (!q) break
        const answer: MultiAnswer =
          q.kind === 'compare'
            ? { kind: 'compare', first: q.first, second: q.second, pick: 'equal' }
            : { kind: 'lottery', targets: q.targets, wedge: q.wedge, choice: 'wedge' }
        current = answerMulti(current, answer)
      }
      return { ...run, answers: [...current.answers] }
    }

    it('round-trips the questions, with a stop', () => {
      const run = asked(6)
      expect(run.answers.length).toBeGreaterThan(2)
      saveContinuousRun(run)
      expect(loadContinuousRun()).toEqual(run)
      saveContinuousRun({ ...asked(2), stopped: true })
      expect(loadContinuousRun()?.stopped).toBe(true)
    })

    it('freezes and reloads a curve over a tiny range, whose edges would print in exponent form', () => {
      const base = sample({
        min: '0',
        max: '0.00000005',
        thresholds: [],
        unit: '',
        view: 'curve',
        curve: ['', '10', '40', '80', '100', '80', '40', '10', ''],
        phase: 'bars',
        edges: [],
        percents: {},
      })
      const frozen = freezeDrawing(base)!
      expect(frozen).not.toBeNull()
      expect(frozen.edges.every(e => !/e/i.test(e))).toBe(true)
      const run = { ...base, phase: 'ask' as const, ...frozen }
      saveContinuousRun(run)
      expect(loadContinuousRun()).toEqual(run)
    })

    it('freezes the bars as typed, blank as 0, and refuses empty or unusable bars', () => {
      const run = sample({ percents: { b0: '30', b2: '' } })
      const frozen = freezeDrawing(run)!
      expect(frozen.percents.b0).toBe('30')
      expect(frozen.percents.b1).toBe('0')
      expect(freezeDrawing(sample({ percents: {} }))).toBeNull()
      expect(freezeDrawing(sample({ percents: { b0: 'x' } }))).toBeNull()
    })

    it('loads a run stored before the questions existed', () => {
      saveContinuousRun(sample())
      const raw = JSON.parse(sessionStorage.getItem('howsure.continuous')!)
      delete raw.answers
      delete raw.stopped
      sessionStorage.setItem('howsure.continuous', JSON.stringify(raw))
      expect(loadContinuousRun()).toEqual(sample())
    })

    it.each([
      [
        'an answer that was not asked',
        (r: Record<string, unknown>) => (r.answers = [{ k: 'c', a: 'b0', b: 'b0', p: 'first' }]),
      ],
      [
        'a bar missing',
        (r: Record<string, unknown>) => delete (r.percents as Record<string, string>).b1,
      ],
      [
        'bars that are all empty',
        (r: Record<string, unknown>) =>
          (r.percents = Object.fromEntries(Object.keys(r.percents as object).map(k => [k, '0']))),
      ],
      ['an edge outside the range', (r: Record<string, unknown>) => (r.edges = ['500'])],
    ])('rejects %s', (_name, change) => {
      saveContinuousRun(asked(2))
      const raw = JSON.parse(sessionStorage.getItem('howsure.continuous')!)
      change(raw)
      sessionStorage.setItem('howsure.continuous', JSON.stringify(raw))
      expect(loadContinuousRun()).toBeNull()
    })

    it('keeps the own numbers, for known buckets only and only in the questions', () => {
      const run = { ...asked(2), adjusted: { b0: '20', b1: '30' } }
      saveContinuousRun(run)
      expect(loadContinuousRun()).toEqual(run)
      saveContinuousRun({ ...run, adjusted: { b99: '1' } })
      expect(loadContinuousRun()).toBeNull()
      saveContinuousRun({ ...sample(), adjusted: { b0: '1' } })
      expect(loadContinuousRun()).toBeNull()
    })

    it('rejects answers or a stop outside the questions', () => {
      saveContinuousRun({ ...sample(), answers: asked(2).answers })
      expect(loadContinuousRun()).toBeNull()
      saveContinuousRun({ ...sample(), stopped: true })
      expect(loadContinuousRun()).toBeNull()
    })
  })

  it('keeps the curve while the range is being changed', () => {
    const run = sample({
      phase: 'range',
      view: 'curve',
      curve: ['', '10', '40', '80', '100', '80', '40', '10', ''],
    })
    saveContinuousRun(run)
    expect(loadContinuousRun()).toEqual(run)
  })

  it('keeps the bars of the last drawing while the range is being changed', () => {
    const run = sample({ phase: 'range', min: '-10', max: '31' })
    saveContinuousRun(run)
    expect(loadContinuousRun()).toEqual(run)
  })

  it('knows what is wrong with a range, and cuts the buckets of a good one', () => {
    expect(rangeProblem(sample({ min: '' }))).toBe('min')
    expect(rangeProblem(sample({ max: 'x' }))).toBe('max')
    expect(rangeProblem(sample({ max: '-10' }))).toBe('order')
    expect(rangeProblem(sample())).toBeNull()
    const { labels } = bucketsOf(sample())
    expect(labels.length).toBeGreaterThanOrEqual(2)
    expect(barIds(3)).toEqual(['b0', 'b1', 'b2'])
  })
})
