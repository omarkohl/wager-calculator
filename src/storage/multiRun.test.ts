import { beforeEach, describe, expect, it } from 'vitest'
import { answerMulti, nextMultiQuestion, type MultiAnswer } from '../domain/elicitation/multiRun'
import { toMultiRun } from './multiAnswers'
import { selectSpotChecks, type SpotCheckAnswer } from '../domain/elicitation/comparisons'
import { addOutcome, emptyOutcomeList } from '../domain/elicitation/model'
import {
  clearMultiRun,
  loadMultiRun,
  saveMultiRun,
  spotChecksOf,
  type MultiRunData,
} from './multiRun'

beforeEach(() => sessionStorage.clear())

/** The answers that find nothing wrong (or, with `flaw`, the first check answered "yes"). */
function answersFor(ids: string[], seed: string, flaw = false): SpotCheckAnswer[] {
  return selectSpotChecks(ids, seed).map((q, i) =>
    q.type === 'pair'
      ? { type: 'pair', first: q.first, second: q.second, bothCanHappen: flaw && i === 0 }
      : { type: 'completeness', couldBeNone: false }
  )
}

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
    view: 'tiers',
    percents: {},
    checks: answersFor(['o1', 'o2'], 'abc-1'),
    kept: false,
    reviewing: false,
    replaced: null,
    answers: [],
    stopped: false,
    adjusted: {},
    merged: [],
    locked: false,
  }
}

function numbers(): MultiRunData {
  const outcomes = addOutcome(addOutcome(emptyOutcomeList(), 'Alice', null), 'Bob', null)
  return { ...sample(), outcomes, view: 'numbers', percents: { o1: '60', o2: '40' } }
}

describe('multi-outcome run storage', () => {
  it('round-trips a run', () => {
    saveMultiRun(sample())
    expect(loadMultiRun()).toEqual(sample())
  })

  it('round-trips a run in the numbers view', () => {
    saveMultiRun(numbers())
    expect(loadMultiRun()).toEqual(numbers())
  })

  it.each([
    ['a number missing', { o1: '60' }],
    ['a number for an unknown outcome', { o1: '60', o2: '40', o9: '1' }],
    ['a number that is not text', { o1: 60, o2: '40' }],
    ['a number that is far too long', { o1: '6'.repeat(40), o2: '40' }],
  ])('rejects a numbers run with %s', (_name, percents) => {
    saveMultiRun(numbers())
    const raw = JSON.parse(sessionStorage.getItem('howsure.multi')!)
    raw.percents = percents
    sessionStorage.setItem('howsure.multi', JSON.stringify(raw))
    expect(loadMultiRun()).toBeNull()
  })

  it('rejects numbers in the tiers view and a tier in the numbers view', () => {
    saveMultiRun({ ...sample(), percents: { o1: '60' } })
    expect(loadMultiRun()).toBeNull()
    saveMultiRun({ ...numbers(), outcomes: sample().outcomes })
    expect(loadMultiRun()).toBeNull()
  })

  describe('spot checks', () => {
    const IDS = ['o1', 'o2']
    const save = (patch: Partial<MultiRunData>) => saveMultiRun({ ...sample(), ...patch })

    it('round-trips a run being checked, and a flawed list the user kept', () => {
      const half = answersFor(IDS, 'abc-1').slice(0, 1)
      save({ phase: 'check', checks: half, reviewing: true })
      expect(loadMultiRun()?.checks).toEqual(half)
      const flawed = answersFor(IDS, 'abc-1', true)
      save({ checks: flawed, kept: true })
      expect(loadMultiRun()?.kept).toBe(true)
    })

    it('asks no completeness check of a list with "Everything else"', () => {
      const outcomes = addOutcome(
        addOutcome(addOutcome(emptyOutcomeList(), 'A', 'likely'), 'B', 'unlikely'),
        'Everything else',
        'unlikely'
      )
      const asked = spotChecksOf(outcomes, 'abc-1')
      expect(asked.some(c => c.type === 'completeness')).toBe(false)
      expect(JSON.stringify(asked)).not.toContain('o3')
      // answers to a completeness check cannot belong to this list
      save({ outcomes, checks: answersFor(['o1', 'o2'], 'abc-1') })
      expect(loadMultiRun()).toBeNull()
    })

    it.each([
      [
        'answers that are not those the seed asks',
        { phase: 'check', checks: [{ type: 'completeness', couldBeNone: false }] },
      ],
      [
        'more answers than checks',
        {
          phase: 'check',
          checks: [...answersFor(IDS, 'abc-1'), { type: 'completeness', couldBeNone: true }],
        },
      ],
      ['checks while collecting', { phase: 'discover' }],
      ['a sketch without finished checks', { checks: answersFor(IDS, 'abc-1').slice(0, 1) }],
      ['a flawed list in the sketch that was not kept', { checks: answersFor(IDS, 'abc-1', true) }],
      ['kept on a clean list', { kept: true }],
      ['a clean finished check that never moved on', { phase: 'check' }],
    ] as [string, Partial<MultiRunData>][])('rejects %s', (_name, patch) => {
      save(patch)
      expect(loadMultiRun()).toBeNull()
    })
  })

  it('keeps the outcome being replaced, and rejects a replaced that is not text', () => {
    saveMultiRun({ ...sample(), phase: 'discover', checks: [], reviewing: true, replaced: 'Wet' })
    expect(loadMultiRun()?.replaced).toBe('Wet')
    const raw = JSON.parse(sessionStorage.getItem('howsure.multi')!)
    raw.replaced = 7
    sessionStorage.setItem('howsure.multi', JSON.stringify(raw))
    expect(loadMultiRun()).toBeNull()
  })

  describe('questions', () => {
    /** A run in the `ask` phase, answered like a respondent who knows the chances. */
    function asked(count: number, view: 'tiers' | 'numbers' = 'tiers'): MultiRunData {
      const base = view === 'tiers' ? sample() : numbers()
      let outcomes = base.outcomes
      outcomes = addOutcome(outcomes, 'Carol', view === 'tiers' ? 'plausible' : null)
      const percents: Record<string, string> =
        view === 'tiers' ? {} : { o1: '50', o2: '30', o3: '20' }
      const ids = outcomes.items.map(o => o.id)
      const run: MultiRunData = {
        ...base,
        outcomes,
        view,
        percents,
        phase: 'ask',
        checks: answersFor(ids, base.seed),
        answers: [],
      }
      let current = toMultiRun(run)!
      const truth: Record<string, number> = { o1: 0.5, o2: 0.1, o3: 0.4 }
      for (let i = 0; i < count; i++) {
        const q = nextMultiQuestion(current)
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
                choice: q.wedge.lt(q.targets.reduce((t, id) => t + truth[id], 0))
                  ? 'claim'
                  : 'wedge',
              }
        current = answerMulti(current, answer)
      }
      return { ...run, answers: [...current.answers] }
    }

    it('round-trips the answers in either view, and a stop', () => {
      for (const view of ['tiers', 'numbers'] as const) {
        const run = asked(8, view)
        expect(run.answers.length).toBeGreaterThan(3)
        saveMultiRun(run)
        expect(loadMultiRun()).toEqual(run)
      }
      saveMultiRun({ ...asked(3), stopped: true })
      expect(loadMultiRun()?.stopped).toBe(true)
    })

    it.each([
      [
        'an answer to a question that was not asked',
        (a: Record<string, unknown>[]) => (a[0].w = 7 + Number(a[0].w ?? 0)),
      ],
      ['an unknown kind', (a: Record<string, unknown>[]) => (a[0].k = 'x')],
      ['a repeated answer', (a: Record<string, unknown>[]) => void a.push(a[0])],
      ['an answer that is no object', (a: Record<string, unknown>[]) => void a.push(5 as never)],
    ])('rejects %s', (_name, change) => {
      saveMultiRun(asked(3))
      const raw = JSON.parse(sessionStorage.getItem('howsure.multi')!)
      change(raw.answers)
      sessionStorage.setItem('howsure.multi', JSON.stringify(raw))
      expect(loadMultiRun()).toBeNull()
    })

    it('keeps the own numbers and the merge, and refuses them where they cannot be', () => {
      const run = { ...asked(3), adjusted: { o1: '55', merged: '10' }, merged: ['o2', 'o3'] }
      saveMultiRun(run)
      expect(loadMultiRun()).toEqual(run)
      for (const bad of [
        { ...run, adjusted: { o9: '5' } },
        { ...run, adjusted: { o1: 5 } },
        { ...run, merged: ['o2'] },
        { ...run, merged: ['o2', 'o2'] },
        { ...run, merged: ['o2', 'o9'] },
      ]) {
        saveMultiRun(bad as unknown as MultiRunData)
        expect(loadMultiRun()).toBeNull()
      }
      saveMultiRun({ ...sample(), merged: ['o1', 'o2'] })
      expect(loadMultiRun()).toBeNull()
      saveMultiRun({ ...sample(), adjusted: { o1: '5' } })
      expect(loadMultiRun()).toBeNull()
    })

    it('rejects answers outside the ask phase, a stop outside it, and unusable numbers', () => {
      saveMultiRun({ ...sample(), answers: asked(2).answers })
      expect(loadMultiRun()).toBeNull()
      saveMultiRun({ ...sample(), stopped: true })
      expect(loadMultiRun()).toBeNull()
      saveMultiRun({ ...asked(0, 'numbers'), percents: { o1: 'x', o2: '30', o3: '20' } })
      expect(loadMultiRun()).toBeNull()
    })
  })

  it('loads a run stored before the questions existed', () => {
    saveMultiRun(sample())
    const raw = JSON.parse(sessionStorage.getItem('howsure.multi')!)
    delete raw.answers
    delete raw.stopped
    sessionStorage.setItem('howsure.multi', JSON.stringify(raw))
    expect(loadMultiRun()).toEqual(sample())
  })

  describe('locked outcomes (from an invite)', () => {
    const lockedList = () => addOutcome(addOutcome(emptyOutcomeList(), 'Alice', null), 'Bob', null)
    const base = (patch: Partial<MultiRunData> = {}): MultiRunData => ({
      ...sample(),
      locked: true,
      phase: 'discover',
      outcomes: lockedList(),
      checks: [],
      ...patch,
    })

    it('keeps outcomes that are not rated yet, in either view', () => {
      saveMultiRun(base())
      expect(loadMultiRun()).toEqual(base())
      const numbers = base({ view: 'numbers', percents: { o1: '60' } })
      saveMultiRun(numbers)
      expect(loadMultiRun()).toEqual(numbers)
    })

    it('goes to the sketch without spot checks once rated', () => {
      const rated = addOutcome(addOutcome(emptyOutcomeList(), 'Alice', 'likely'), 'Bob', 'unlikely')
      const run = base({ phase: 'sketch', outcomes: rated })
      saveMultiRun(run)
      expect(loadMultiRun()).toEqual(run)
    })

    it('wants the outcomes of the invite to be there, also while rating', () => {
      saveMultiRun(base({ outcomes: addOutcome(emptyOutcomeList(), 'Alice', null) }))
      expect(loadMultiRun()).toBeNull()
    })

    it('refuses what an unlocked run would not do: unrated outcomes past the rating, spot checks', () => {
      saveMultiRun(base({ phase: 'sketch' }))
      expect(loadMultiRun()).toBeNull()
      saveMultiRun(base({ phase: 'check' }))
      expect(loadMultiRun()).toBeNull()
      saveMultiRun({ ...base(), kept: true })
      expect(loadMultiRun()).toBeNull()
      // and an unlocked run may not have unrated outcomes while collecting
      saveMultiRun({ ...base(), locked: false })
      expect(loadMultiRun()).toBeNull()
    })
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
