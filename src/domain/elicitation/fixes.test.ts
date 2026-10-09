import { describe, expect, it } from 'vitest'
import { addOutcome, emptyOutcomeList, type OutcomeList } from './model'
import { LabelError, mergeOutcomes, mergedPercent, renameOutcome, renameOutcomes } from './fixes'

function list(): OutcomeList {
  let l = emptyOutcomeList()
  l = addOutcome(l, 'Rain', 'likely')
  l = addOutcome(l, 'Wet', 'plausible')
  l = addOutcome(l, 'Sun', 'unlikely')
  return l
}

describe('renameOutcome', () => {
  it('renames in place, keeping id, tier and position', () => {
    const out = renameOutcome(list(), 'o2', '  Wet   streets ')
    expect(out.items.map(o => [o.id, o.label, o.tier])).toEqual([
      ['o1', 'Rain', 'likely'],
      ['o2', 'Wet streets', 'plausible'],
      ['o3', 'Sun', 'unlikely'],
    ])
  })
  it('allows keeping the name, refuses an empty or taken one', () => {
    expect(renameOutcome(list(), 'o1', 'rain').items[0].label).toBe('rain')
    expect(() => renameOutcome(list(), 'o1', ' ')).toThrow()
    expect(() => renameOutcome(list(), 'o1', 'SUN')).toThrow()
  })
})

describe('renameOutcomes', () => {
  it('lets two outcomes swap names', () => {
    const out = renameOutcomes(list(), [
      { id: 'o1', label: 'Wet' },
      { id: 'o2', label: 'Rain' },
    ])
    expect(out.items.map(o => o.label)).toEqual(['Wet', 'Rain', 'Sun'])
  })
  it('refuses two outcomes ending up with one name, with the reason', () => {
    expect(() =>
      renameOutcomes(list(), [
        { id: 'o1', label: 'X' },
        { id: 'o2', label: 'x' },
      ])
    ).toThrow(LabelError)
    try {
      renameOutcomes(list(), [{ id: 'o1', label: '' }])
    } catch (e) {
      expect((e as LabelError).kind).toBe('empty')
    }
  })
})

describe('mergeOutcomes', () => {
  it('replaces the two with one, at the first one’s place, in the likelier tier, under a new id', () => {
    const { list: out, id } = mergeOutcomes(list(), 'o1', 'o2', 'Rain or wet')
    expect(out.items.map(o => [o.id, o.label, o.tier])).toEqual([
      [id, 'Rain or wet', 'likely'],
      ['o3', 'Sun', 'unlikely'],
    ])
    expect(id).toBe('o4')
    expect(out.issued).toBe(4)
  })
  it('may reuse one of the two names, and refuses a name another outcome has', () => {
    expect(mergeOutcomes(list(), 'o1', 'o2', 'Rain').list.items[0].label).toBe('Rain')
    expect(() => mergeOutcomes(list(), 'o1', 'o2', 'Sun')).toThrow()
  })
  it('has no tier when either had none (numbers view)', () => {
    let l = addOutcome(emptyOutcomeList(), 'A', null)
    l = addOutcome(l, 'B', null)
    expect(mergeOutcomes(l, 'o1', 'o2', 'AB').list.items[0].tier).toBeNull()
  })
})

describe('mergedPercent', () => {
  it('adds the two, to two decimals', () => {
    expect(mergedPercent('12,5', '30%')).toBe('42.5')
  })
  it('stays a usable percentage', () => {
    expect(mergedPercent('70', '60')).toBe('99.99')
    expect(mergedPercent('x', undefined)).toBe('0.01')
  })
})
