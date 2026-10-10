import { beforeEach, describe, expect, it } from 'vitest'
import { RUN_STALE_AFTER_DAYS } from '../domain/elicitation/constants'
import { isStale, storedRunSavedAt } from './runAge'
import { saveRun, type RunData } from './elicitation'
import { saveMultiRun, type MultiRunData } from './multiRun'
import { saveContinuousRun, type ContinuousRunData } from './continuousRun'

const DAY = 24 * 60 * 60 * 1000

beforeEach(() => sessionStorage.clear())

describe('runAge', () => {
  it('has no age without a stored run', () => {
    expect(storedRunSavedAt('yes-no')).toBeNull()
    expect(storedRunSavedAt('categorical')).toBeNull()
  })

  it('stamps every kind of run when it is saved', () => {
    const before = Date.now()
    saveRun({
      claim: 'It rains',
      criteria: '',
      mode: 'quick',
      seed: 'abc',
      answers: [],
      dropped: [],
      adjusted: null,
    } as RunData)
    expect(storedRunSavedAt('yes-no')).toBeGreaterThanOrEqual(before)
    sessionStorage.clear()
    saveMultiRun({
      kind: 'categorical',
      claim: 'x',
      criteria: '',
      seed: 'abc',
      outcomes: { items: [], issued: 0 },
      declinedElse: false,
      phase: 'discover',
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
    } as MultiRunData)
    expect(storedRunSavedAt('categorical')).toBeGreaterThanOrEqual(before)
    sessionStorage.clear()
    saveContinuousRun({
      kind: 'continuous',
      claim: 'x',
      criteria: '',
      seed: 'abc',
      unit: '',
      min: '',
      max: '',
      thresholds: [],
      phase: 'range',
      edges: [],
      percents: {},
      view: 'bars',
      curve: [],
      answers: [],
      stopped: false,
      adjusted: {},
      locked: false,
    } as ContinuousRunData)
    expect(storedRunSavedAt('continuous')).toBeGreaterThanOrEqual(before)
  })

  it('reads the stamp of the kind asked for only', () => {
    sessionStorage.setItem('howsure.multi', JSON.stringify({ savedAt: 5 }))
    expect(storedRunSavedAt('yes-no')).toBeNull()
    expect(storedRunSavedAt('categorical')).toBe(5)
  })

  it('tolerates a run stored without a stamp, and junk', () => {
    sessionStorage.setItem('howsure.run', JSON.stringify({ ev: 1 }))
    expect(storedRunSavedAt('yes-no')).toBeNull()
    sessionStorage.setItem('howsure.run', 'nope')
    expect(storedRunSavedAt('yes-no')).toBeNull()
  })

  it('calls a run stale only after the threshold, and never one without a stamp', () => {
    const now = 100 * DAY
    expect(isStale(now - RUN_STALE_AFTER_DAYS * DAY + 1000, now)).toBe(false)
    expect(isStale(now - RUN_STALE_AFTER_DAYS * DAY - 1000, now)).toBe(true)
    expect(isStale(null, now)).toBe(false)
  })
})
