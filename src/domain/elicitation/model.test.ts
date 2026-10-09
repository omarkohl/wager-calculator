import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import {
  CLAIM_KINDS,
  EVERYTHING_ELSE_LABEL,
  TIERS,
  addOutcome,
  emptyOutcomeList,
  removeOutcome,
  describeProvenance,
  firstSketch,
  hasEnoughOutcomes,
  isEverythingElse,
  issueId,
  isAtCap,
  isTier,
  labelProblem,
  normalise1,
  provenanceFor,
  shouldOfferEverythingElse,
  tierProbability,
  type ElicitOutcome,
  type Tier,
} from './model'
import { MAX_OUTCOMES } from './constants'

const list = (...tiers: Tier[]): ElicitOutcome[] =>
  tiers.map((tier, i) => ({ id: `o${i + 1}`, label: `Outcome ${i + 1}`, tier }))

describe('the kinds and tiers', () => {
  it('has the three claim kinds and five tiers, least to most likely', () => {
    expect(CLAIM_KINDS).toEqual(['yes-no', 'categorical', 'continuous'])
    expect(TIERS).toEqual(['very unlikely', 'unlikely', 'plausible', 'likely', 'near-certain'])
    expect(isTier('likely')).toBe(true)
    expect(isTier('maybe')).toBe(false)
    expect(isTier(3)).toBe(false)
  })
})

describe('the outcome list', () => {
  const withLabels = (...labels: string[]) =>
    labels.reduce((l, label) => addOutcome(l, label, null), emptyOutcomeList())

  it('adds outcomes with stable ids, in order, with their tier', () => {
    let l = emptyOutcomeList()
    l = addOutcome(l, 'Rain', 'likely')
    l = addOutcome(l, ' Sunshine ', 'plausible')
    expect(l.items).toEqual([
      { id: 'o1', label: 'Rain', tier: 'likely' },
      { id: 'o2', label: 'Sunshine', tier: 'plausible' },
    ])
    expect(l.issued).toBe(2)
  })

  it('does not mutate the list it is given', () => {
    const before = emptyOutcomeList()
    addOutcome(before, 'Rain', null)
    expect(before).toEqual({ items: [], issued: 0 })
  })

  it('refuses empty and repeated labels, whatever the case or spacing', () => {
    const l = withLabels('Heavy rain')
    expect(labelProblem(l.items, '   ')).toBe('empty')
    expect(labelProblem(l.items, 'heavy  RAIN')).toBe('duplicate')
    expect(labelProblem(l.items, 'Light rain')).toBeNull()
    expect(() => addOutcome(l, 'heavy rain', null)).toThrow('Outcome label is duplicate')
    expect(() => addOutcome(l, '', null)).toThrow('Outcome label is empty')
  })

  it('stops at the cap of eight', () => {
    let l = emptyOutcomeList()
    for (let i = 0; i < MAX_OUTCOMES; i++) l = addOutcome(l, `Outcome ${i}`, 'plausible')
    expect(l.items).toHaveLength(8)
    expect(isAtCap(l.items)).toBe(true)
    expect(() => addOutcome(l, 'One more', 'plausible')).toThrow(
      new RangeError('At most 8 outcomes')
    )
    expect(isAtCap(removeOutcome(l, 'o1').items)).toBe(false)
  })

  it('needs two outcomes to ask anything', () => {
    expect(hasEnoughOutcomes(list())).toBe(false)
    expect(hasEnoughOutcomes(list('likely'))).toBe(false)
    expect(hasEnoughOutcomes(list('likely', 'unlikely'))).toBe(true)
  })

  it('never hands out an id again after outcomes were removed', () => {
    let l = withLabels('A', 'B', 'C')
    expect(l.items.map(o => o.id)).toEqual(['o1', 'o2', 'o3'])
    // B and C are removed (answers recorded under o2 and o3 stay about them)
    l = removeOutcome(removeOutcome(l, 'o3'), 'o2')
    expect(l.items.map(o => o.id)).toEqual(['o1'])
    l = addOutcome(l, 'D', null)
    expect(l.items.map(o => o.id)).toEqual(['o1', 'o4'])
    // removing the newest and adding again also moves on
    l = addOutcome(removeOutcome(l, 'o4'), 'E', null)
    expect(l.items[1].id).toBe('o5')
  })

  it('removes only the outcome named', () => {
    const l = removeOutcome(withLabels('A', 'B', 'C'), 'o2')
    expect(l.items.map(o => o.label)).toEqual(['A', 'C'])
    expect(removeOutcome(l, 'nope').items).toHaveLength(2)
  })

  it('treats composed and decomposed letters as the same label, and stores the composed form', () => {
    const composed = 'Caf\u00e9'
    const decomposed = 'Cafe\u0301'
    const l = withLabels(decomposed)
    expect(l.items[0].label).toBe(composed)
    expect(labelProblem(l.items, composed)).toBe('duplicate')
    expect(labelProblem(l.items, decomposed.toUpperCase())).toBe('duplicate')
  })

  it('stays safe for a list that came from outside with ids beyond its count', () => {
    const l = {
      items: [
        { id: 'o7', label: 'B', tier: null },
        { id: 'o1', label: 'A', tier: null },
      ],
      issued: 0,
    }
    const next = addOutcome(l, 'C', null)
    expect(new Set(next.items.map(o => o.id)).size).toBe(3)
    expect(next.items[2].id).toBe('o8')
  })
})

describe('"everything else"', () => {
  it('is offered after two outcomes in a row at very unlikely', () => {
    expect(shouldOfferEverythingElse(list('likely', 'very unlikely', 'very unlikely'))).toBe(true)
    expect(shouldOfferEverythingElse(list('very unlikely', 'very unlikely'))).toBe(true)
  })

  it('is not offered for one very unlikely, or when they are not in a row', () => {
    expect(shouldOfferEverythingElse(list('likely', 'very unlikely'))).toBe(false)
    expect(shouldOfferEverythingElse(list('very unlikely', 'likely', 'very unlikely'))).toBe(false)
    expect(shouldOfferEverythingElse(list('very unlikely'))).toBe(false)
    expect(shouldOfferEverythingElse(list('very unlikely', 'unlikely'))).toBe(false)
    expect(shouldOfferEverythingElse([])).toBe(false)
  })

  it('is not offered when it is in the list already, or there is no room', () => {
    const withIt = [...list('very unlikely', 'very unlikely')]
    withIt[1].label = EVERYTHING_ELSE_LABEL
    expect(shouldOfferEverythingElse(withIt)).toBe(false)
    expect(
      shouldOfferEverythingElse(list(...Array<Tier>(MAX_OUTCOMES).fill('very unlikely')))
    ).toBe(false)
    expect(
      shouldOfferEverythingElse(list(...Array<Tier>(MAX_OUTCOMES - 1).fill('very unlikely')))
    ).toBe(true)
  })
})

describe('the first sketch', () => {
  it('maps each tier to its chance: 2, 10, 30, 60 and 90%', () => {
    expect(TIERS.map(t => tierProbability(t).toNumber())).toEqual([0.02, 0.1, 0.3, 0.6, 0.9])
  })

  it("normalises the tiers' chances to sum to 1", () => {
    const sketch = firstSketch(list('likely', 'very unlikely'))
    expect(sketch.get('o1')!.toNumber()).toBeCloseTo(0.6 / 0.62, 12)
    expect(sketch.get('o2')!.toNumber()).toBeCloseTo(0.02 / 0.62, 12)
    const total = [...sketch.values()].reduce((s, v) => s.plus(v), new Decimal(0))
    expect(total.minus(1).abs().lt(1e-18)).toBe(true)
  })

  it('keeps the order of the tiers, and equal tiers equal', () => {
    const sketch = firstSketch(list('plausible', 'plausible', 'near-certain', 'unlikely'))
    expect(sketch.get('o1')!.eq(sketch.get('o2')!)).toBe(true)
    expect(sketch.get('o3')!.gt(sketch.get('o1')!)).toBe(true)
    expect(sketch.get('o4')!.lt(sketch.get('o1')!)).toBe(true)
  })

  it('all outcomes in one tier split evenly', () => {
    const sketch = firstSketch(list('likely', 'likely', 'likely', 'likely'))
    for (const v of sketch.values()) expect(v.toNumber()).toBeCloseTo(0.25, 12)
  })

  it('refuses an outcome that has no tier yet', () => {
    expect(() => firstSketch([{ id: 'o1', label: 'Rain', tier: null }])).toThrow(
      'Outcome "Rain" has no tier yet'
    )
  })

  it('refuses outcomes whose ids collide instead of dropping one', () => {
    const clash: ElicitOutcome[] = [
      { id: 'o1', label: 'A', tier: 'likely' },
      { id: 'o1', label: 'B', tier: 'unlikely' },
    ]
    expect(() => firstSketch(clash)).toThrow('Outcome ids must be unique')
  })

  it('normalises plain values too, and refuses nothing to normalise', () => {
    expect(normalise1([new Decimal(1), new Decimal(3)]).map(v => v.toNumber())).toEqual([
      0.25, 0.75,
    ])
    expect(() => normalise1([new Decimal(0), new Decimal(0)])).toThrow('Nothing to normalise')
    expect(() => normalise1([])).toThrow('Nothing to normalise')
    expect(() => normalise1([new Decimal(2), new Decimal(-1)])).toThrow('negative')
  })
})

describe('provenance', () => {
  it('is the first guess until a comparison involves the bucket', () => {
    expect(provenanceFor(0)).toEqual({ source: 'first-guess' })
    expect(describeProvenance(provenanceFor(0))).toBe('from your first guess')
  })

  it('counts comparisons, in the singular and the plural', () => {
    expect(describeProvenance(provenanceFor(1))).toBe('from 1 comparison')
    expect(describeProvenance(provenanceFor(4))).toBe('from 4 comparisons')
    expect(provenanceFor(4)).toEqual({ source: 'comparisons', count: 4 })
  })

  it('rejects counts that cannot be', () => {
    for (const n of [-1, 1.5, NaN]) expect(() => provenanceFor(n)).toThrow(RangeError)
  })
})

describe('isEverythingElse and issueId', () => {
  it('recognises "Everything else" whatever the case or spacing', () => {
    expect(isEverythingElse(EVERYTHING_ELSE_LABEL)).toBe(true)
    expect(isEverythingElse('  everything   ELSE ')).toBe(true)
    expect(isEverythingElse('Everything elsewhere')).toBe(false)
  })

  it('is not offered again when it is there under another spelling', () => {
    const l = list('very unlikely', 'very unlikely')
    l[1].label = 'everything  else'
    expect(shouldOfferEverythingElse(l)).toBe(false)
  })

  it('issues an id that counts as used from then on', () => {
    let l = emptyOutcomeList()
    l = addOutcome(addOutcome(l, 'A', null), 'B', null)
    const first = issueId(l)
    expect(first.id).toBe('o3')
    // the next one, from the updated list, is new again, also after a removal
    const second = issueId(removeOutcome(first.list, 'o1'))
    expect(second.id).toBe('o4')
    const added = addOutcome(second.list, 'C', null).items
    expect(added[added.length - 1].id).toBe('o5')
  })
})
