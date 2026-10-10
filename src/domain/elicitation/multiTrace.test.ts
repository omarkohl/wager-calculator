import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { multiTrace } from './multiTrace'
import type { MultiRun } from './multiRun'
import type { ElicitOutcome } from './model'

const outcomes: ElicitOutcome[] = [
  { id: 'rain', label: 'Rain', tier: 'likely' },
  { id: 'cloud', label: 'Cloud', tier: 'plausible' },
  { id: 'snow', label: 'Snow', tier: 'very unlikely' },
]

const run = (answers: MultiRun['answers']): MultiRun => ({ outcomes, seed: 't', answers })

describe('multiTrace', () => {
  it('starts from the first sketch', () => {
    const t = multiTrace(run([]))
    expect(t.steps).toEqual([])
    expect(t.start.map(s => s.label)).toEqual(['Rain', 'Cloud', 'Snow'])
    expect(t.start.every(s => /%$/.test(s.chance))).toBe(true)
  })

  it('writes a comparison, with its answer and what it implies', () => {
    const t = multiTrace(
      run([
        { kind: 'compare', first: 'rain', second: 'cloud', pick: 'first' },
        { kind: 'compare', first: 'cloud', second: 'snow', pick: 'second' },
        { kind: 'compare', first: 'rain', second: 'snow', pick: 'equal' },
      ])
    )
    expect(t.steps[0]).toMatchObject({
      question: 'Which is more likely: “Rain” or “Cloud”?',
      answer: '“Rain”',
      implication: 'You think “Rain” is more likely than “Cloud”.',
      rangeAfter: null,
    })
    expect(t.steps[1].implication).toBe('You think “Snow” is more likely than “Cloud”.')
    expect(t.steps[2].answer).toBe('About equally likely')
    expect(t.steps[2].implication).toMatch(/no order .* was recorded/)
  })

  it('writes a lottery on one outcome and on a group, with the range after it', () => {
    const t = multiTrace(
      run([
        { kind: 'lottery', targets: ['rain'], wedge: new Decimal(0.4), choice: 'claim' },
        { kind: 'lottery', targets: ['rain'], wedge: new Decimal(0.7), choice: 'wedge' },
        {
          kind: 'lottery',
          targets: ['cloud', 'snow'],
          wedge: new Decimal(0.5),
          choice: 'cant-separate',
        },
      ])
    )
    expect(t.steps[0]).toMatchObject({
      question: '“Rain” or a spinner that wins 40% of the time?',
      answer: 'Preferred “Rain”',
      implication: 'You think “Rain” is more likely than 40%.',
    })
    expect(t.steps[0].rangeAfter).toBe('The range your answers on “Rain” alone give: above 40%.')
    expect(t.steps[1]).toMatchObject({
      answer: 'Preferred the 70% spinner',
      implication: 'You think “Rain” is less likely than 70%.',
    })
    expect(t.steps[1].rangeAfter).toBe('The range your answers on “Rain” alone give: 40–70%.')
    expect(t.steps[2].question).toBe(
      'the result being one of “Cloud”, “Snow” or a spinner that wins 50% of the time?'
    )
    expect(t.steps[2].implication).toBe(
      'You could not tell the result being one of “Cloud”, “Snow” and a 50% spinner apart.'
    )
  })

  it('speaks of a ball draw in the tails', () => {
    const t = multiTrace(
      run([{ kind: 'lottery', targets: ['snow'], wedge: new Decimal(0.03), choice: 'wedge' }])
    )
    expect(t.steps[0].question).toBe('“Snow” or a ball draw that wins 3% of the time?')
    expect(t.steps[0].answer).toBe('Preferred the 3% ball draw')
  })

  it('keeps what the answers implied beside the numbers the user set', () => {
    const r = run([
      { kind: 'lottery', targets: ['rain'], wedge: new Decimal(0.4), choice: 'claim' },
      { kind: 'lottery', targets: ['rain'], wedge: new Decimal(0.7), choice: 'wedge' },
    ])
    const t = multiTrace(r, { rain: '80', cloud: '20', snow: 'x' })
    const rain = t.adjustments.find(a => a.label === 'Rain')!
    expect(rain).toMatchObject({ adjusted: '80', implied: '40–70%' })
    expect(rain.gap).toBe('You set this above what your answers implied.')
    // an unusable value is not reported, and an outcome the user left alone is not either
    expect(t.adjustments.find(a => a.label === 'Snow')).toBeUndefined()
    expect(multiTrace(r).adjustments).toEqual([])
  })
})
