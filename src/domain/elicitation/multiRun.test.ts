import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import {
  analyse,
  answerMulti,
  answersInvolving,
  nextMultiQuestion,
  targetBand,
  type MultiAnswer,
  type MultiQuestion,
  type MultiRun,
} from './multiRun'
import { MAX_MULTI_QUESTIONS } from './constants'
import type { ElicitOutcome, Tier } from './model'

const outcomes = (...entries: [string, Tier][]): ElicitOutcome[] =>
  entries.map(([id, tier]) => ({ id, label: id, tier }))

const weather = outcomes(
  ['rain', 'likely'],
  ['cloud', 'plausible'],
  ['fog', 'unlikely'],
  ['snow', 'very unlikely']
)
const truth: Record<string, number> = { rain: 0.55, cloud: 0.3, fog: 0.14, snow: 0.01 }

const run0 = (list: ElicitOutcome[] = weather, seed = 'multi'): MultiRun => ({
  outcomes: list,
  seed,
  answers: [],
})

/** A respondent who knows the truth: lotteries by the sum over the targets, comparisons by size. */
function answerFor(q: MultiQuestion, p: Record<string, number>): MultiAnswer {
  if (q.kind === 'compare') {
    const d = p[q.first] - p[q.second]
    return {
      kind: 'compare',
      first: q.first,
      second: q.second,
      pick: Math.abs(d) < 0.02 ? 'equal' : d > 0 ? 'first' : 'second',
    }
  }
  const chance = q.targets.reduce((s, id) => s + p[id], 0)
  return {
    kind: 'lottery',
    targets: q.targets,
    wedge: q.wedge,
    choice: q.wedge.lt(chance) ? 'claim' : 'wedge',
  }
}

function play(start: MultiRun, p: Record<string, number>) {
  let run = start
  const questions: MultiQuestion[] = []
  for (let q = nextMultiQuestion(run); q; q = nextMultiQuestion(run)) {
    questions.push(q)
    run = answerMulti(run, answerFor(q, p))
    if (questions.length > 100) throw new Error('did not stop')
  }
  return { run, questions }
}

describe('the first questions', () => {
  it('start with a lottery on the biggest bucket', () => {
    const q = nextMultiQuestion(run0())!
    expect(q.kind).toBe('lottery')
    expect(q.kind === 'lottery' && q.targets).toEqual(['rain'])
    // the yes/no opening: a whole percent in 35-65%
    const w = (q as Extract<MultiQuestion, { kind: 'lottery' }>).wedge.toNumber()
    expect(w).toBeGreaterThanOrEqual(0.35)
    expect(w).toBeLessThanOrEqual(0.65)
  })

  it('are deterministic from the seed and the answers', () => {
    expect(nextMultiQuestion(run0())).toEqual(nextMultiQuestion(run0()))
    const openings = new Set<string>()
    for (let i = 0; i < 12; i++) {
      const q = nextMultiQuestion(run0(weather, `seed-${i}`)) as Extract<
        MultiQuestion,
        { kind: 'lottery' }
      >
      openings.add(q.wedge.toString())
    }
    expect(openings.size).toBeGreaterThan(3)
  })

  it('give each target its own opening wedge', () => {
    // the first target is the biggest bucket; swap the tiers to make the other one first
    const wedgeOf = (list: ElicitOutcome[], seed: string) =>
      (
        nextMultiQuestion(run0(list, seed)) as Extract<MultiQuestion, { kind: 'lottery' }>
      ).wedge.toString()
    const aFirst = outcomes(['a', 'likely'], ['b', 'unlikely'])
    const bFirst = outcomes(['a', 'unlikely'], ['b', 'likely'])
    const differing = Array.from({ length: 20 }, (_, i) => `s${i}`).filter(
      seed => wedgeOf(aFirst, seed) !== wedgeOf(bFirst, seed)
    )
    expect(differing.length).toBeGreaterThan(10)
  })

  it('look at a near-even sketch first, since it may be "no idea"', () => {
    const even = outcomes(['a', 'plausible'], ['b', 'plausible'], ['c', 'plausible'])
    const q = nextMultiQuestion(run0(even))
    expect(q?.kind).toBe('lottery')
  })
})

describe('a whole run', () => {
  const { run, questions } = play(run0(), truth)

  it('ends, within the cap, with both kinds of question', () => {
    expect(questions.length).toBeGreaterThan(4)
    expect(questions.length).toBeLessThanOrEqual(MAX_MULTI_QUESTIONS)
    expect(nextMultiQuestion(run)).toBeNull()
    expect(new Set(questions.map(q => q.kind)).has('lottery')).toBe(true)
  })

  it('asks every bucket alone at least once, the tail bucket included (one tail check each)', () => {
    for (const o of weather) {
      expect(
        questions.some(q => q.kind === 'lottery' && q.targets.length === 1 && q.targets[0] === o.id)
      ).toBe(true)
    }
  })

  it('ends with coherent bands that hold the truth', () => {
    const { coherent } = analyse(run)
    const sumLo = coherent.bands.reduce((s, b) => s + b.lo.toNumber(), 0)
    const sumHi = coherent.bands.reduce((s, b) => s + b.hi.toNumber(), 0)
    expect(sumLo).toBeLessThanOrEqual(1 + 1e-9)
    expect(sumHi).toBeGreaterThanOrEqual(1 - 1e-9)
    for (const b of coherent.bands) {
      expect(truth[b.id]).toBeGreaterThanOrEqual(b.lo.toNumber() - 1e-9)
      expect(truth[b.id]).toBeLessThanOrEqual(b.hi.toNumber() + 1e-9)
    }
  })

  it('counts the answers that involve each outcome, for "from N comparisons"', () => {
    for (const o of weather) expect(answersInvolving(run, o.id)).toBeGreaterThan(0)
    expect(answersInvolving(run0(), 'rain')).toBe(0)
  })

  it('has a band for a bucket after its own lotteries', () => {
    expect(targetBand(run, ['rain'])).not.toBeNull()
    expect(targetBand(run0(), ['rain'])).toBeNull()
  })
})

describe('stopping', () => {
  it('stops an indifferent respondent with eight outcomes instead of asking everything', () => {
    const many = outcomes(
      ...(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const).map((id): [string, Tier] => [
        id,
        'plausible',
      ])
    )
    let run = run0(many)
    let n = 0
    for (let q = nextMultiQuestion(run); q; q = nextMultiQuestion(run)) {
      run = answerMulti(
        run,
        q.kind === 'compare'
          ? { kind: 'compare', first: q.first, second: q.second, pick: 'equal' }
          : { kind: 'lottery', targets: q.targets, wedge: q.wedge, choice: 'cant-separate' }
      )
      n++
      if (n > 200) throw new Error('did not stop')
    }
    expect(n).toBeLessThanOrEqual(MAX_MULTI_QUESTIONS)
    // 28 pairs, but three "about equally likely" in a row end the comparisons
    expect(run.answers.filter(a => a.kind === 'compare').length).toBeLessThanOrEqual(5)
  })

  it('has nothing to ask with fewer than two outcomes', () => {
    expect(nextMultiQuestion(run0(outcomes(['a', 'likely'])))).toBeNull()
  })

  it('stops at the cap whatever is left', () => {
    const answers: MultiAnswer[] = Array.from({ length: MAX_MULTI_QUESTIONS }, () => ({
      kind: 'compare' as const,
      first: 'rain',
      second: 'snow',
      pick: 'equal' as const,
    }))
    expect(nextMultiQuestion({ ...run0(), answers })).toBeNull()
  })
})

describe('group lotteries', () => {
  it('come only after every bucket has been asked alone, and name two buckets', () => {
    // every bucket was searched alone to the end and could not be separated from the spinner
    // anywhere: wide bands, so a group lottery is the thing worth asking
    const list = outcomes(['a', 'plausible'], ['b', 'plausible'], ['c', 'plausible'])
    let run = run0(list)
    for (const id of ['a', 'b', 'c']) {
      for (let i = 0; i < 40; i++) {
        const q = nextMultiQuestion(run)
        if (!q || q.kind !== 'lottery' || q.targets[0] !== id || q.targets.length !== 1) break
        run = answerMulti(run, {
          kind: 'lottery',
          targets: q.targets,
          wedge: q.wedge,
          choice: 'cant-separate',
        })
      }
    }
    for (const [x, y] of [
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ]) {
      run = answerMulti(run, { kind: 'compare', first: x, second: y, pick: 'equal' })
    }
    const q = nextMultiQuestion(run)!
    expect(q.kind).toBe('lottery')
    expect(q.kind === 'lottery' && q.targets).toHaveLength(2)
  })

  it('are not asked before every bucket has been asked alone', () => {
    const list = outcomes(['a', 'plausible'], ['b', 'plausible'], ['c', 'plausible'])
    for (let i = 0; i < 6; i++) {
      const q = nextMultiQuestion(run0(list, `g${i}`))!
      expect(q.kind === 'lottery' && q.targets).toHaveLength(1)
    }
  })

  it('narrow the buckets in the group through the sum', () => {
    const base = run0(outcomes(['a', 'plausible'], ['b', 'plausible'], ['c', 'plausible']))
    // the group a+b is below 20%: a and b cannot exceed 0.2 each
    const withGroup = answerMulti(base, {
      kind: 'lottery',
      targets: ['a', 'b'],
      wedge: 0.2,
      choice: 'wedge',
    })
    const { coherent } = analyse(withGroup)
    expect(coherent.bands[0].hi.toNumber()).toBeLessThanOrEqual(0.2 + 1e-9)
    expect(coherent.bands[1].hi.toNumber()).toBeLessThanOrEqual(0.2 + 1e-9)
    // and c takes the rest: at least 80%
    expect(coherent.bands[2].lo.toNumber()).toBeGreaterThanOrEqual(0.8 - 1e-9)
  })
})

describe('the answers feed the bands', () => {
  it("a comparison lifts the winner's lower bound and caps the loser", () => {
    const base = run0(outcomes(['a', 'plausible'], ['b', 'plausible'], ['c', 'plausible']))
    const run = answerMulti(
      answerMulti(
        answerMulti(base, { kind: 'lottery', targets: ['a'], wedge: 0.4, choice: 'wedge' }),
        { kind: 'lottery', targets: ['b'], wedge: 0.3, choice: 'claim' }
      ),
      { kind: 'compare', first: 'a', second: 'b', pick: 'second' }
    )
    const { coherent } = analyse(run)
    // a below 40%, b above 30%, b more likely than a
    expect(coherent.bands[1].lo.toNumber()).toBeGreaterThanOrEqual(0.3 - 1e-9)
    expect(coherent.bands[0].hi.toNumber()).toBeLessThanOrEqual(
      coherent.bands[1].hi.toNumber() + 1e-9
    )
    expect(coherent.droppedOrders).toEqual([])
  })
})

describe('subadditive group answers are absorbed, never forced', () => {
  it('a > 30%, b > 30% and a + b < 40% is flagged and keeps real width', () => {
    let run = run0(outcomes(['a', 'plausible'], ['b', 'plausible'], ['c', 'plausible']))
    run = answerMulti(run, { kind: 'lottery', targets: ['a'], wedge: 0.3, choice: 'claim' })
    run = answerMulti(run, { kind: 'lottery', targets: ['b'], wedge: 0.3, choice: 'claim' })
    run = answerMulti(run, { kind: 'lottery', targets: ['a', 'b'], wedge: 0.4, choice: 'wedge' })
    const { coherent, groupIncoherences } = analyse(run)
    expect(groupIncoherences).toHaveLength(1)
    expect(groupIncoherences[0].kind).toBe('lowers-exceed')
    expect(groupIncoherences[0].amount.toNumber()).toBeCloseTo(0.2, 9)
    for (const b of coherent.bands) expect(b.hi.minus(b.lo).toNumber()).toBeGreaterThan(0.05)
    // a and b were pulled below their 30%; the group's 40% still caps each
    expect(coherent.bands[0].lo.toNumber()).toBeLessThan(0.3)
    expect(coherent.bands[0].hi.toNumber()).toBeLessThanOrEqual(0.4 + 1e-9)
    // c takes at least what the group leaves
    expect(coherent.bands[2].lo.toNumber()).toBeGreaterThanOrEqual(0.6 - 1e-9)
    expect(coherent.bands[2].hi.toNumber()).toBeGreaterThan(coherent.bands[2].lo.toNumber() + 0.05)
  })

  it('a consistent group is not flagged', () => {
    let run = run0(outcomes(['a', 'plausible'], ['b', 'plausible'], ['c', 'plausible']))
    run = answerMulti(run, { kind: 'lottery', targets: ['a', 'b'], wedge: 0.4, choice: 'wedge' })
    expect(analyse(run).groupIncoherences).toEqual([])
  })
})

describe('questions whose answer the bands already give', () => {
  it('a second bucket is not asked about chances the first has ruled out', () => {
    // a is above 60%, so b is below 40%
    const list = outcomes(['a', 'likely'], ['b', 'plausible'])
    for (let i = 0; i < 20; i++) {
      let run = run0(list, `r${i}`)
      run = answerMulti(run, { kind: 'lottery', targets: ['a'], wedge: 0.6, choice: 'claim' })
      const q = nextMultiQuestion(run) as Extract<MultiQuestion, { kind: 'lottery' }>
      if (q.kind === 'lottery' && q.targets[0] === 'b') {
        expect(q.wedge.toNumber()).toBeLessThanOrEqual(0.4 + 1e-9)
      }
    }
  })

  it('a tail bucket does not need a long search once the others are known', () => {
    const { questions } = play(run0(), truth)
    const snow = questions.filter(
      q => q.kind === 'lottery' && q.targets.length === 1 && q.targets[0] === 'snow'
    )
    expect(snow.length).toBeGreaterThan(0)
    expect(snow.length).toBeLessThanOrEqual(6)
  })
})

describe('more outcomes, fewer outcomes', () => {
  it('a decisive respondent with eight outcomes has every bucket asked alone before the cap', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const tiers: Tier[] = [
      'likely',
      'plausible',
      'plausible',
      'unlikely',
      'unlikely',
      'unlikely',
      'very unlikely',
      'very unlikely',
    ]
    const eight = outcomes(...ids.map((id, i): [string, Tier] => [id, tiers[i]]))
    const p = { a: 0.35, b: 0.2, c: 0.15, d: 0.1, e: 0.08, f: 0.06, g: 0.04, h: 0.02 }
    const { run, questions } = play(run0(eight), p)
    expect(questions.length).toBeLessThanOrEqual(MAX_MULTI_QUESTIONS)
    for (const id of ids) {
      expect(
        run.answers.some(a => a.kind === 'lottery' && a.targets.length === 1 && a.targets[0] === id)
      ).toBe(true)
    }
  })

  it('two outcomes need only the first one to be known', () => {
    const { run, questions } = play(run0(outcomes(['a', 'likely'], ['b', 'unlikely'])), {
      a: 0.9,
      b: 0.1,
    })
    expect(questions.length).toBeGreaterThan(0)
    expect(questions.length).toBeLessThanOrEqual(MAX_MULTI_QUESTIONS)
    const { coherent } = analyse(run)
    expect(coherent.bands[0].lo.toNumber()).toBeLessThanOrEqual(0.9 + 1e-9)
    expect(coherent.bands[0].hi.toNumber()).toBeGreaterThanOrEqual(0.9 - 1e-9)
  })

  it('an outcome without a tier is an error that says so', () => {
    const untiered: ElicitOutcome[] = [
      { id: 'a', label: 'A', tier: 'likely' },
      { id: 'b', label: 'B', tier: null },
    ]
    expect(() => nextMultiQuestion(run0(untiered))).toThrow('Outcome "B" has no tier yet')
  })
})

describe('a run with its own sketch (numbers, bars, curve)', () => {
  const buckets: ElicitOutcome[] = ['b0', 'b1', 'b2'].map(id => ({ id, label: id, tier: null }))
  const sketch = new Map([
    ['b0', new Decimal(0.2)],
    ['b1', new Decimal(0.5)],
    ['b2', new Decimal(0.3)],
  ])

  it('works without tiers, starting from the numbers given', () => {
    const run: MultiRun = { outcomes: buckets, seed: 's', answers: [], sketch }
    expect(analyse(run).sketch.get('b1')?.toNumber()).toBe(0.5)
    expect(nextMultiQuestion(run)).not.toBeNull()
  })

  it('throws without tiers and without a sketch', () => {
    expect(() => analyse({ outcomes: buckets, seed: 's', answers: [] })).toThrow()
  })

  it('is deterministic: the same run asks the same question', () => {
    const run: MultiRun = { outcomes: buckets, seed: 's', answers: [], sketch }
    expect(JSON.stringify(nextMultiQuestion(run))).toBe(JSON.stringify(nextMultiQuestion(run)))
  })
})

describe('tail checks without tiers', () => {
  it('asks about an outcome typed at about 1%, which would otherwise be worth too little', () => {
    const buckets: ElicitOutcome[] = ['b0', 'b1', 'b2'].map(id => ({ id, label: id, tier: null }))
    const sketch = new Map([
      ['b0', new Decimal(0.01)],
      ['b1', new Decimal(0.5)],
      ['b2', new Decimal(0.49)],
    ])
    let run: MultiRun = { outcomes: buckets, seed: 'tail', answers: [], sketch }
    const seen = new Set<string>()
    for (let i = 0; i < 12; i++) {
      const q = nextMultiQuestion(run)
      if (!q) break
      if (q.kind === 'lottery') q.targets.forEach(t => seen.add(t))
      run = answerMulti(run, answerFor(q, { b0: 0.01, b1: 0.5, b2: 0.49 }))
    }
    expect(seen.has('b0')).toBe(true)
  })
})
