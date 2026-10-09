import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import { computeBand, isHardContradiction, type WedgeAnswer } from './bandRule'

const claim = (w: Decimal.Value): WedgeAnswer => ({ wedge: w, choice: 'claim' })
const wedge = (w: Decimal.Value): WedgeAnswer => ({ wedge: w, choice: 'wedge' })
const unsure = (w: Decimal.Value): WedgeAnswer => ({ wedge: w, choice: 'cant-separate' })
const n = (d: Decimal | null) => d?.toNumber()

describe('computeBand', () => {
  it('gives no result without an edge: no answers, or only "can\'t separate"', () => {
    expect(computeBand([])).toBeNull()
    expect(computeBand([unsure(0.5), unsure(0.65)])).toBeNull()
  })

  it('spans H to S when the answers agree (H < S)', () => {
    const r = computeBand([claim(0.4), claim(0.5), wedge(0.7), wedge(0.6), unsure(0.55)])!
    expect(n(r.highest)).toBe(0.5)
    expect(n(r.lowest)).toBe(0.6)
    expect([n(r.band.lo), n(r.band.hi)]).toEqual([0.5, 0.6])
    expect(r.contradictionLogit).toBeNull()
    expect(r.isHardContradiction).toBe(false)
    expect(r.pointEstimate!.toNumber()).toBeCloseTo(0.55, 2)
  })

  it('still spans the two when H > S: claim beat 60, 45 beat the claim -> 45-60%', () => {
    const r = computeBand([claim(0.6), wedge(0.45)])!
    expect([n(r.band.lo), n(r.band.hi)]).toEqual([0.45, 0.6])
    expect(n(r.highest)).toBe(0.6)
    expect(n(r.lowest)).toBe(0.45)
  })

  it('sizes a contradiction in logits and absorbs a mild one: 60 vs 45 is about 0.6', () => {
    const r = computeBand([claim(0.6), wedge(0.45)])!
    expect(r.contradictionLogit!.toNumber()).toBeCloseTo(0.6, 1)
    expect(r.isHardContradiction).toBe(false)
  })

  it('flags a hard contradiction: claim over 70 and 40 over the claim is 1.25 logits', () => {
    const r = computeBand([claim(0.7), wedge(0.4)])!
    expect(r.contradictionLogit!.toNumber()).toBeCloseTo(1.25, 2)
    expect(r.isHardContradiction).toBe(true)
  })

  it('measures the line in logits so it holds at the tails: 1% vs 11% is 2.5', () => {
    const r = computeBand([claim(0.11), wedge(0.01)])!
    expect(r.contradictionLogit!.toNumber()).toBeCloseTo(2.5, 1)
    expect(r.isHardContradiction).toBe(true)
  })

  it('does not flag a wide but consistent band (honest ignorance)', () => {
    const r = computeBand([claim(0.1), wedge(0.9)])!
    expect(r.contradictionLogit).toBeNull()
    expect(r.isHardContradiction).toBe(false)
  })

  it('takes exactly 1 logit as not hard, anything above as hard', () => {
    expect(isHardContradiction(new Decimal(1))).toBe(false)
    expect(isHardContradiction(new Decimal('1.0000000001'))).toBe(true)
    expect(isHardContradiction(0.99)).toBe(false)
  })

  it('is one-sided "above H" when only the claim ever won, with no point estimate', () => {
    const r = computeBand([claim(0.52), claim(0.4), unsure(0.65)])!
    expect([n(r.band.lo), r.band.hi]).toEqual([0.52, null])
    expect(r.pointEstimate).toBeNull()
    expect(r.contradictionLogit).toBeNull()
  })

  it('is one-sided "below S" when only wedges ever won', () => {
    const r = computeBand([wedge(0.3), wedge(0.2)])!
    expect([r.band.lo, n(r.band.hi)]).toEqual([null, 0.2])
    expect(r.pointEstimate).toBeNull()
  })

  it('has a zero-width band when H equals S', () => {
    const r = computeBand([claim(0.5), wedge(0.5)])!
    expect(n(r.band.lo)).toBe(0.5)
    expect(n(r.band.hi)).toBe(0.5)
    expect(r.contradictionLogit).toBeNull()
    expect(r.pointEstimate!.toNumber()).toBeCloseTo(0.5, 12)
  })

  it('takes the extreme answers regardless of order: all contradictions widen the band', () => {
    const r = computeBand([claim(0.3), wedge(0.5), claim(0.6), wedge(0.45)])!
    expect([n(r.band.lo), n(r.band.hi)]).toEqual([0.45, 0.6])
  })

  it('puts the point estimate of a contradicting band at its log-odds midpoint', () => {
    // claim beat 60, 45 beat the claim: the band is 45-60%
    const r = computeBand([claim(0.6), wedge(0.45)])!
    const expected = 1 / (1 + Math.exp(-(Math.log(0.6 / 0.4) + Math.log(0.45 / 0.55)) / 2))
    expect(r.pointEstimate!.toNumber()).toBeCloseTo(expected, 10)
  })
})
