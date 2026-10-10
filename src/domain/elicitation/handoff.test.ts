import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import { buildHandoff, buildMultiHandoff, handoffProbability } from './handoff'
import { bandAbove, bandBetween } from './logOdds'
import { decodeWagerFromHash, encodeWagerToHash } from '../../storage/urlHash'

const base = {
  claim: 'The bridge opens on time',
  criteria: 'Open to traffic by noon',
  currency: 'eur',
  probability: new Decimal(0.5768),
  band: bandBetween(0.45, 0.62),
}

describe('handoffProbability', () => {
  it('prefers the adjusted value over the point estimate', () => {
    expect(handoffProbability(new Decimal(0.5), '61.5')!.toString()).toBe('0.615')
    expect(handoffProbability(new Decimal(0.5), null)!.toString()).toBe('0.5')
  })

  it('is null for a one-sided band nobody adjusted', () => {
    expect(handoffProbability(null, null)).toBeNull()
    expect(handoffProbability(null, '70')!.toString()).toBe('0.7')
  })
})

describe('buildHandoff', () => {
  it("carries the claim, the criteria as details and the gate's currency", () => {
    const { wager } = buildHandoff(base)
    expect(wager.claim).toBe('The bridge opens on time')
    expect(wager.details).toBe('Open to traffic by noon')
    expect(wager.stakes).toBe('eur')
    expect(wager.resolvedOutcomeId).toBeNull()
  })

  it('has Yes and No outcomes and a first participant whose values sum to exactly 100', () => {
    const { wager } = buildHandoff(base)
    expect(wager.outcomes.map(o => o.label)).toEqual(['Yes', 'No'])
    const mine = wager.predictions.filter(p => p.participantId === wager.participants[0].id)
    expect(mine.map(p => p.probability.toString())).toEqual(['57.68', '42.32'])
    expect(mine.every(p => p.touched)).toBe(true)
    expect(mine[0].probability.plus(mine[1].probability).equals(100)).toBe(true)
    // nobody else is predicted for: the wager calculator fills that in
    expect(wager.predictions).toHaveLength(2)
  })

  it('rounds to two decimals without drifting from 100', () => {
    for (const p of [0.001, 0.0333333, 0.1234567, 0.5, 0.999, 0.87654321]) {
      const { wager } = buildHandoff({ ...base, probability: new Decimal(p) })
      const total = wager.predictions.reduce((sum, x) => sum.plus(x.probability), new Decimal(0))
      expect(total.equals(100)).toBe(true)
      for (const x of wager.predictions)
        expect(x.probability.decimalPlaces()).toBeLessThanOrEqual(2)
    }
  })

  it('falls back to the default stakes for an unknown or missing currency', () => {
    expect(buildHandoff({ ...base, currency: null }).wager.stakes).toBe('usd')
    expect(buildHandoff({ ...base, currency: 'cookies' }).wager.stakes).toBe('usd')
  })

  it('names where the number came from', () => {
    expect(buildHandoff(base).provenance).toBe('45–62% from elicitation')
    expect(buildHandoff({ ...base, band: bandAbove(0.52) }).provenance).toBe(
      'above 52% from elicitation'
    )
  })

  it('survives the wager URL, so /wager opens it unchanged', () => {
    const { wager } = buildHandoff(base)
    const decoded = decodeWagerFromHash(encodeWagerToHash(wager))!
    expect(decoded.claim).toBe(wager.claim)
    expect(decoded.details).toBe(wager.details)
    expect(decoded.stakes).toBe('eur')
    const first = decoded.participants[0]
    const mine = decoded.predictions.filter(p => p.participantId === first.id)
    expect(mine.map(p => p.probability.toString())).toEqual(['57.68', '42.32'])
  })
})

describe('buildMultiHandoff', () => {
  const items = [
    { label: 'Rain', percent: '55.5' },
    { label: 'Cloud', percent: '30' },
    { label: 'Snow', percent: '14.5' },
  ]
  const params = { claim: 'The weather', criteria: 'At noon', currency: 'eur', items }

  it('makes a wager with these outcomes and the numbers in the first participant row', () => {
    const { wager, provenance } = buildMultiHandoff(params)
    expect(wager.claim).toBe('The weather')
    expect(wager.details).toBe('At noon')
    expect(wager.stakes).toBe('eur')
    expect(wager.outcomes.map(o => o.label)).toEqual(['Rain', 'Cloud', 'Snow'])
    expect(new Set(wager.outcomes.map(o => o.id)).size).toBe(3)
    const first = wager.participants[0]
    expect(wager.predictions.every(p => p.participantId === first.id && p.touched)).toBe(true)
    expect(wager.predictions.map(p => p.probability.toString())).toEqual(['55.5', '30', '14.5'])
    expect(provenance).toBe('your own numbers from elicitation')
  })

  it('keeps the range the answers gave for each outcome in the note', () => {
    const { provenance } = buildMultiHandoff({
      ...params,
      items: items.map((i, k) => ({ ...i, range: ['40–70%', 'above 20%', 'below 20%'][k] })),
    })
    expect(provenance).toBe(
      'your own numbers from elicitation; the ranges your answers gave: Rain 40–70%; Cloud above 20%; Snow below 20%'
    )
  })

  it('survives the share link of the wager', () => {
    const { wager } = buildMultiHandoff(params)
    const back = decodeWagerFromHash(encodeWagerToHash(wager))!
    expect(back.outcomes.map(o => o.label)).toEqual(['Rain', 'Cloud', 'Snow'])
    const first = back.participants[0]
    expect(
      back.predictions.filter(p => p.participantId === first.id).map(p => p.probability.toString())
    ).toEqual(['55.5', '30', '14.5'])
  })

  it('refuses numbers that do not add up to exactly 100, and anything that is no percentage', () => {
    expect(() =>
      buildMultiHandoff({
        ...params,
        items: [items[0], items[1], { label: 'Snow', percent: '14' }],
      })
    ).toThrow(RangeError)
    expect(() =>
      buildMultiHandoff({ ...params, items: [items[0], { label: 'Cloud', percent: 'x' }] })
    ).toThrow()
    expect(() =>
      buildMultiHandoff({ ...params, items: [{ label: 'A', percent: '100' }] })
    ).toThrow()
    // more than two decimals would be cut by the wager: refuse rather than round
    expect(() =>
      buildMultiHandoff({
        ...params,
        items: [
          { label: 'A', percent: '33.333' },
          { label: 'B', percent: '66.667' },
        ],
      })
    ).toThrow(RangeError)
  })

  it('falls back to the default currency for an unknown one', () => {
    expect(buildMultiHandoff({ ...params, currency: 'zzz' }).wager.stakes).not.toBe('zzz')
  })
})
