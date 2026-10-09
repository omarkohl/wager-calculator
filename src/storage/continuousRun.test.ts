import { beforeEach, describe, expect, it } from 'vitest'
import { barEdges } from '../domain/elicitation/bucketing'
import {
  barIds,
  bucketsOf,
  clearContinuousRun,
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
    ['edges that are not the range’s', (r: Record<string, unknown>) => (r.edges = ['1', '2'])],
    [
      'edges out of order',
      (r: Record<string, unknown>) => ((r.phase = 'range'), (r.edges = ['2', '1'])),
    ],
  ])('rejects %s', (_name, change) => {
    tamper(change)
    expect(loadContinuousRun()).toBeNull()
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
