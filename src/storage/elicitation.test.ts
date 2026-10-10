import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Decimal from 'decimal.js'
import { nextQuestion } from '../domain/elicitation/quickSearch'
import { nextThoroughQuestion, type ThoroughAnswer } from '../domain/elicitation/thorough'
import type { WedgeAnswer } from '../domain/elicitation/bandRule'
import { MAX_NUMBER_TEXT } from '../domain/elicitation/constants'
import {
  clearRun,
  decodeElicitationHash,
  encodeAnswers,
  encodeInviteHash,
  encodeResultHash,
  generateSeed,
  getSavedElicitStake,
  loadRun,
  saveElicitStake,
  saveRun,
  type RunData,
} from './elicitation'

function quickRun(seed = 'abc123', extra: Partial<RunData> = {}): RunData {
  const answers: WedgeAnswer[] = []
  for (let q = nextQuestion(answers, seed); q; q = nextQuestion(answers, seed)) {
    answers.push({
      wedge: q.wedge,
      choice: q.wedge.lt(0.42) ? 'claim' : q.wedge.gt(0.58) ? 'wedge' : 'cant-separate',
    })
  }
  return {
    claim: 'It rains tomorrow, in Berlin',
    criteria: 'Any rain, 00:00-24:00',
    mode: 'quick',
    seed,
    answers,
    dropped: [],
    adjusted: null,
    ...extra,
  } as RunData
}

function thoroughRun(seed = 'tt-1', extra: Partial<RunData> = {}): RunData {
  const answers: ThoroughAnswer[] = []
  for (let q = nextThoroughQuestion(answers, seed); q; q = nextThoroughQuestion(answers, seed)) {
    answers.push({
      wedge: q.wedge,
      choice: q.wedge.lt(0.4) ? 'claim' : q.wedge.gt(0.6) ? 'wedge' : 'cant-separate',
      frame: q.frame,
      stair: q.stair,
      kind: q.kind,
      armOrder: q.armOrder,
    })
  }
  return {
    claim: 'We ship by Friday',
    criteria: '',
    mode: 'thorough',
    seed,
    answers,
    dropped: [],
    adjusted: null,
    ...extra,
  } as RunData
}

const same = (a: RunData, b: RunData) => {
  expect(b.claim).toBe(a.claim)
  expect(b.criteria).toBe(a.criteria)
  expect(b.mode).toBe(a.mode)
  expect(b.seed).toBe(a.seed)
  expect(b.dropped).toEqual(a.dropped)
  expect(b.adjusted).toBe(a.adjusted)
  expect(b.answers).toHaveLength(a.answers.length)
  a.answers.forEach((x, i) => {
    const y = b.answers[i]
    expect(new Decimal(y.wedge).eq(x.wedge)).toBe(true)
    expect({ ...y, wedge: 0 }).toEqual({ ...x, wedge: 0 })
  })
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})
afterEach(() => vi.restoreAllMocks())

describe('result URLs', () => {
  it('round-trips a quick run', () => {
    const run = quickRun()
    expect(run.answers.length).toBeGreaterThan(2)
    const decoded = decodeElicitationHash(encodeResultHash(run))
    expect(decoded?.type).toBe('result')
    same(run, (decoded as { run: RunData }).run)
  })

  it('round-trips a thorough run with dropped answers and an adjusted value', () => {
    const run = thoroughRun('tt-2', { dropped: [1, 4], adjusted: '47.5' })
    const decoded = decodeElicitationHash(encodeResultHash(run))
    same(run, (decoded as { run: RunData }).run)
  })

  it('round-trips awkward claim text', () => {
    const run = quickRun('x', {
      claim: 'Is "a, b & c" = 100%? Ünïcödé #1',
      criteria: 'line\nbreak',
    })
    same(run, (decodeElicitationHash(encodeResultHash(run)) as { run: RunData }).run)
  })

  it('round-trips a partial run (the user stopped early)', () => {
    const full = quickRun('p-1')
    const run = { ...full, answers: full.answers.slice(0, 2) } as RunData
    same(run, (decodeElicitationHash(encodeResultHash(run)) as { run: RunData }).run)
  })

  it('carries a version, and the answers only in compact form', () => {
    const hash = encodeResultHash(quickRun())
    expect(hash).toMatch(/^#ev=1&t=r&/)
    expect(new URLSearchParams(hash.slice(1)).get('a')).toMatch(/^\d{1,3}:[cwu](,\d{1,3}:[cwu])*$/)
  })

  it('rejects malformed, unknown-version and inconsistent input', () => {
    const run = quickRun()
    const good = encodeResultHash(run)
    const params = (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(good.slice(1))
      mutate(p)
      return `#${p.toString()}`
    }
    const bad = [
      '',
      '#',
      '#garbage',
      '#v=2&c=wager',
      params(p => p.set('ev', '2')),
      params(p => p.delete('ev')),
      params(p => p.set('t', 'x')),
      params(p => p.set('c', '  ')),
      params(p => p.delete('c')),
      params(p => p.set('m', 'z')),
      params(p => p.delete('s')),
      params(p => p.set('s', 'bad seed!')),
      params(p => p.set('a', 'nonsense')),
      params(p => p.set('a', '0:c')),
      params(p => p.set('a', '1000:c')),
      params(p => p.set('a', '500:x')),
      params(p => p.set('d', '99')),
      params(p => p.set('d', '0,0')),
      params(p => p.set('d', '-1')),
      params(p => p.set('adj', '120')),
      params(p => p.set('adj', 'abc')),
      params(p => p.set('adj', '0')),
      params(p => p.set('a', new Array(60).fill('500:c').join(','))),
      // a different seed makes the recorded questions impossible
      params(p => p.set('s', 'other-seed')),
      // an answer for a question the algorithm would not have asked
      params(p => p.set('a', '123:c,456:w')),
    ]
    for (const hash of bad) expect(decodeElicitationHash(hash), hash).toBeNull()
    // sanity: the unmodified one decodes
    expect(decodeElicitationHash(good)).not.toBeNull()
  })

  it("stores only wedge and choice and rebuilds a thorough run's tags from the algorithm", () => {
    const run = thoroughRun('tt-3')
    const a = new URLSearchParams(encodeResultHash(run).slice(1)).get('a')!
    expect(a).toMatch(/^\d{1,3}:[cwu](,\d{1,3}:[cwu])*$/)
    const decoded = (decodeElicitationHash(encodeResultHash(run)) as { run: RunData }).run
    const kinds = (decoded.answers as ThoroughAnswer[]).map(x => x.kind)
    expect(kinds).toContain('repeat')
    expect(kinds).toContain('negation')
  })

  it('rejects a thorough result whose answers the algorithm would not have asked', () => {
    const run = thoroughRun('tt-5')
    const p = new URLSearchParams(encodeResultHash(run).slice(1))
    const tokens = p.get('a')!.split(',')
    tokens[3] = tokens[3].replace(/^\d+/, w => String(Number(w) === 123 ? 124 : 123))
    p.set('a', tokens.join(','))
    expect(decodeElicitationHash(`#${p.toString()}`)).toBeNull()
  })

  it('has exactly one URL per result: non-canonical spellings are rejected', () => {
    const run = thoroughRun('canon', { dropped: [1, 3], adjusted: '47.5' })
    const good = encodeResultHash(run)
    expect(decodeElicitationHash(good)).not.toBeNull()
    const variants = (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(good.slice(1))
      mutate(p)
      return `#${p.toString()}`
    }
    const first = new URLSearchParams(good.slice(1)).get('a')!.split(',')[0]
    for (const hash of [
      variants(p => p.set('d', '3,1')),
      variants(p => p.set('d', '1,1,3')),
      variants(p => p.set('d', '01,3')),
      variants(p => p.set('adj', '47.50')),
      variants(p => p.set('adj', '047.5')),
      variants(p => p.set('adj', '47.5000')),
      variants(p => p.set('a', p.get('a')!.replace(first, `0${first}`))),
      // parameter order
      `#${[...new URLSearchParams(good.slice(1))]
        .reverse()
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&')}`,
      // an extra parameter
      `${good}&x=1`,
    ]) {
      expect(decodeElicitationHash(hash), hash).toBeNull()
    }
  })

  it('caps the length of claim and criteria', () => {
    const long = 'x'.repeat(2001)
    const ok = 'x'.repeat(2000)
    expect(decodeElicitationHash(encodeResultHash(quickRun('len', { claim: ok })))).not.toBeNull()
    expect(decodeElicitationHash(encodeResultHash(quickRun('len', { claim: long })))).toBeNull()
    expect(decodeElicitationHash(encodeResultHash(quickRun('len', { criteria: long })))).toBeNull()
    expect(decodeElicitationHash(encodeInviteHash({ claim: long, criteria: '' }))).toBeNull()
    expect(decodeElicitationHash(encodeInviteHash({ claim: 'ok', criteria: long }))).toBeNull()
    expect(decodeElicitationHash(encodeInviteHash({ claim: ok, criteria: ok }))).not.toBeNull()
  })

  it('refuses to encode a wedge off the grid', () => {
    const run = quickRun()
    const off = {
      ...run,
      answers: [{ wedge: new Decimal('0.1234'), choice: 'claim' as const }],
    } as RunData
    expect(() => encodeAnswers(off)).toThrow(RangeError)
  })
})

describe('invite URLs', () => {
  it('carry the claim and the criteria and nothing else', () => {
    const hash = encodeInviteHash({
      claim: 'Pineapple belongs on pizza',
      criteria: 'Ask five people',
    })
    expect(hash).toMatch(/^#ev=1&t=i&/)
    const params = new URLSearchParams(hash.slice(1))
    expect([...params.keys()].sort()).toEqual(['c', 'cr', 'ev', 't'])
    expect(decodeElicitationHash(hash)).toEqual({
      type: 'invite',
      claim: 'Pineapple belongs on pizza',
      criteria: 'Ask five people',
    })
  })

  it('decode to a plain invite even if answer parameters were added', () => {
    const hash = `${encodeInviteHash({ claim: 'X', criteria: '' })}&a=500:c&s=abc&m=q&adj=40`
    expect(decodeElicitationHash(hash)).toEqual({ type: 'invite', claim: 'X', criteria: '' })
  })

  it('leave out empty criteria, and need a claim', () => {
    const hash = encodeInviteHash({ claim: 'X', criteria: '' })
    expect(new URLSearchParams(hash.slice(1)).has('cr')).toBe(false)
    expect(decodeElicitationHash(hash)).toEqual({ type: 'invite', claim: 'X', criteria: '' })
    expect(decodeElicitationHash('#ev=1&t=i')).toBeNull()
    expect(decodeElicitationHash('#ev=3&t=i&c=X')).toBeNull()
  })
})

describe('the run in sessionStorage', () => {
  it('survives a reload (save, then load)', () => {
    const run = thoroughRun('tt-4', { dropped: [2], adjusted: '60' })
    saveRun(run)
    same(run, loadRun()!)
    expect(localStorage.length).toBe(0)
  })

  it('remembers that the user stopped, in the tab only', () => {
    const run = quickRun('stop-1')
    saveRun({ ...run, stopped: true })
    expect(loadRun()!.stopped).toBe(true)
    saveRun(run)
    expect(loadRun()!.stopped).toBeUndefined()
    expect(encodeResultHash({ ...run, stopped: true })).toBe(encodeResultHash(run))
  })

  it('is gone after clearRun, and absent at first', () => {
    expect(loadRun()).toBeNull()
    saveRun(quickRun())
    clearRun()
    expect(loadRun()).toBeNull()
  })

  it('is ignored when corrupt, of another version, or inconsistent', () => {
    saveRun(quickRun())
    const key = sessionStorage.key(0)!
    const stored = JSON.parse(sessionStorage.getItem(key)!)
    for (const mutated of [
      { ...stored, ev: 2 },
      { ...stored, seed: 'changed' },
      { ...stored, answers: 'zzz' },
      { ...stored, mode: 'x' },
      { ...stored, claim: '' },
      { ...stored, dropped: '99' },
      { ...stored, claim: 'x'.repeat(2001) },
      { ...stored, dropped: '1,0' },
    ]) {
      sessionStorage.setItem(key, JSON.stringify(mutated))
      expect(loadRun()).toBeNull()
    }
    for (const text of ['not json', 'null', '42', '[]']) {
      sessionStorage.setItem(key, text)
      expect(loadRun()).toBeNull()
    }
  })

  it('surfaces a programming error (an off-grid wedge) instead of swallowing it', () => {
    const run = quickRun()
    const off = {
      ...run,
      answers: [{ wedge: new Decimal('0.1234'), choice: 'claim' as const }],
    } as RunData
    expect(() => saveRun(off)).toThrow(RangeError)
  })

  it('copes with storage that throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => saveRun(quickRun())).not.toThrow()
    expect(loadRun()).toBeNull()
    expect(() => clearRun()).not.toThrow()
  })
})

describe('the remembered stake', () => {
  it('remembers amount and currency under its own key', () => {
    expect(getSavedElicitStake()).toBeNull()
    saveElicitStake({ amount: '25', currency: 'eur' })
    expect(getSavedElicitStake()).toEqual({ amount: '25', currency: 'eur' })
    expect(localStorage.getItem('wager-calculator.stakes')).toBeNull()
  })

  it('ignores invalid values, stored or given', () => {
    saveElicitStake({ amount: '0', currency: 'eur' })
    saveElicitStake({ amount: '-5', currency: 'eur' })
    saveElicitStake({ amount: '10', currency: 'cookies' })
    saveElicitStake({ amount: '10.123', currency: 'eur' })
    saveElicitStake({ amount: '0.00', currency: 'eur' })
    saveElicitStake({ amount: '', currency: 'eur' })
    expect(getSavedElicitStake()).toBeNull()
    for (const text of [
      'x',
      '{}',
      '{"amount":5,"currency":"eur"}',
      '{"amount":"5","currency":"zzz"}',
    ]) {
      localStorage.setItem('howsure.stake', text)
      expect(getSavedElicitStake()).toBeNull()
    }
  })

  it('copes with storage that throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => saveElicitStake({ amount: '5', currency: 'usd' })).not.toThrow()
    expect(getSavedElicitStake()).toBeNull()
  })
})

describe('generateSeed', () => {
  it('is fresh per call and fits the seed format', () => {
    const seeds = new Set(Array.from({ length: 50 }, generateSeed))
    expect(seeds.size).toBe(50)
    for (const s of seeds) expect(s).toMatch(/^[A-Za-z0-9_-]{1,64}$/)
  })

  it('falls back to Math.random when crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined)
    const seeds = new Set(Array.from({ length: 20 }, generateSeed))
    vi.unstubAllGlobals()
    expect(seeds.size).toBe(20)
    for (const s of seeds) expect(s).toMatch(/^[A-Za-z0-9]{16}$/)
  })

  it('uses every drawn byte: seeds are 16 characters', () => {
    expect(generateSeed()).toHaveLength(16)
  })

  it('makes a seed the algorithms accept', () => {
    const seed = generateSeed()
    const run = quickRun(seed)
    same(run, (decodeElicitationHash(encodeResultHash(run)) as { run: RunData }).run)
  })
})

describe('invites with outcomes or edges', () => {
  const categorical = {
    claim: 'Who wins?',
    criteria: 'By the final count',
    shape: { kind: 'categorical' as const, outcomes: ['Alice', 'Bob & Co', 'Everything else'] },
  }
  const continuous = {
    claim: 'Noon temperature tomorrow',
    criteria: '',
    shape: {
      kind: 'continuous' as const,
      unit: '°C',
      min: '-10',
      max: '30',
      thresholds: ['0'],
      edges: ['-5', '0', '10'],
    },
  }

  it('round-trips an invite with outcomes, labels and order intact', () => {
    const hash = encodeInviteHash(categorical)
    expect(decodeElicitationHash(hash)).toEqual({ type: 'invite', ...categorical })
  })

  it('round-trips an invite with a range and its edges', () => {
    expect(decodeElicitationHash(encodeInviteHash(continuous))).toEqual({
      type: 'invite',
      ...continuous,
    })
    const noThreshold = {
      ...continuous,
      shape: { ...continuous.shape, unit: '', thresholds: [] },
    }
    expect(decodeElicitationHash(encodeInviteHash(noThreshold))).toEqual({
      type: 'invite',
      ...noThreshold,
    })
  })

  it('still reads a plain invite, and leaves the plain one without a shape', () => {
    const plain = decodeElicitationHash(encodeInviteHash({ claim: 'It rains', criteria: '' }))
    expect(plain).toEqual({ type: 'invite', claim: 'It rains', criteria: '' })
  })

  it.each([
    ['one outcome', (h: string) => h.replace(/&o=Bob[^&]*/, '').replace(/&o=Every[^&]*/, '')],
    ['a repeated outcome', (h: string) => h.replace('o=Bob+%26+Co', 'o=Alice')],
    ['an untidy label', (h: string) => h.replace('o=Alice', 'o=%20Alice')],
    ['an unknown shape', (h: string) => h.replace('k=o', 'k=z')],
    ['a parameter in another order', (h: string) => h + '&x=1'],
  ])('rejects a categorical invite with %s', (_name, change) => {
    expect(decodeElicitationHash(change(encodeInviteHash(categorical)))).toBeNull()
  })

  it.each([
    ['edges that are not ascending', (h: string) => h.replace('ed=-5%2C0%2C10', 'ed=0%2C-5%2C10')],
    ['an edge outside the range', (h: string) => h.replace('%2C10', '%2C99')],
    ['a range that is not one', (h: string) => h.replace('hi=30', 'hi=-20')],
    ['no edges', (h: string) => h.replace(/&ed=[^&]*/, '')],
    ['a number in exponent form', (h: string) => h.replace('lo=-10', 'lo=-1e1')],
    ['a repeated threshold', (h: string) => h.replace('th=0', 'th=0%2C0')],
  ])('rejects a continuous invite with %s', (_name, change) => {
    expect(decodeElicitationHash(change(encodeInviteHash(continuous)))).toBeNull()
  })

  it('rejects numbers longer than the longest a number may be', () => {
    const long = `1${'0'.repeat(MAX_NUMBER_TEXT)}`
    for (const shape of [
      { ...continuous.shape, max: long },
      { ...continuous.shape, thresholds: [long] },
      { ...continuous.shape, max: long, edges: [long.slice(0, -1)] },
    ]) {
      expect(decodeElicitationHash(encodeInviteHash({ ...continuous, shape }))).toBeNull()
    }
  })

  it('rejects more than eight outcomes', () => {
    const many = {
      ...categorical,
      shape: {
        kind: 'categorical' as const,
        outcomes: Array.from({ length: 9 }, (_, i) => `O${i}`),
      },
    }
    expect(decodeElicitationHash(encodeInviteHash(many))).toBeNull()
  })
})
