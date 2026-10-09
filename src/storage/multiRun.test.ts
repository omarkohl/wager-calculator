import { beforeEach, describe, expect, it } from 'vitest'
import { addOutcome, emptyOutcomeList } from '../domain/elicitation/model'
import { clearMultiRun, loadMultiRun, saveMultiRun, type MultiRunData } from './multiRun'

beforeEach(() => sessionStorage.clear())

function sample(): MultiRunData {
  const outcomes = addOutcome(
    addOutcome(emptyOutcomeList(), 'Alice', 'likely'),
    'Bob',
    'very unlikely'
  )
  return {
    kind: 'categorical',
    claim: 'Who wins the vote?',
    criteria: '',
    seed: 'abc-1',
    outcomes,
    declinedElse: true,
    phase: 'sketch',
  }
}

describe('multi-outcome run storage', () => {
  it('round-trips a run', () => {
    saveMultiRun(sample())
    expect(loadMultiRun()).toEqual(sample())
  })

  it('returns null when nothing is stored, after clearing, and for junk', () => {
    expect(loadMultiRun()).toBeNull()
    saveMultiRun(sample())
    clearMultiRun()
    expect(loadMultiRun()).toBeNull()
    sessionStorage.setItem('howsure.multi', '{not json')
    expect(loadMultiRun()).toBeNull()
  })

  it.each([
    ['unknown version', (r: Record<string, unknown>) => (r.ev = 99)],
    [
      'unknown tier',
      (r: Record<string, unknown>) =>
        ((r.outcomes as { items: { tier: string }[] }).items[0].tier = 'huge'),
    ],
    [
      'duplicate ids',
      (r: Record<string, unknown>) =>
        ((r.outcomes as { items: { id: string }[] }).items[1].id = 'o1'),
    ],
    ['bad phase', (r: Record<string, unknown>) => (r.phase = 'x')],
    ['too long claim', (r: Record<string, unknown>) => (r.claim = 'x'.repeat(5000))],
    [
      'sketch with an untiered outcome',
      (r: Record<string, unknown>) =>
        ((r.outcomes as { items: { tier: null }[] }).items[0].tier = null),
    ],
    [
      'sketch with one outcome',
      (r: Record<string, unknown>) => ((r.outcomes as { items: unknown[] }).items.length = 1),
    ],
  ])('rejects %s', (_name, mutate) => {
    saveMultiRun(sample())
    const raw = JSON.parse(sessionStorage.getItem('howsure.multi')!)
    mutate(raw)
    sessionStorage.setItem('howsure.multi', JSON.stringify(raw))
    expect(loadMultiRun()).toBeNull()
  })
})
