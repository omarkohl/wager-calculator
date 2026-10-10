import Decimal from 'decimal.js'
import type { Choice } from '../domain/elicitation/bandRule'
import type { Pick as ComparePick } from '../domain/elicitation/comparisons'
import {
  MAX_MULTI_QUESTIONS,
  MAX_NUMBER_TEXT,
  MAX_OUTCOMES,
  MIN_OUTCOMES,
} from '../domain/elicitation/constants'
import { parseBar, parseNumber, parsePercent } from '../domain/elicitation/format'
import {
  labelProblem,
  TIERS,
  tidy,
  type ElicitOutcome,
  type Tier,
} from '../domain/elicitation/model'
import { nextMultiQuestion, type MultiAnswer } from '../domain/elicitation/multiRun'
import { continuousToMultiRun, decodeMultiAnswers, toMultiRun, withAnswers } from './multiAnswers'
import type { ContinuousRunData } from './continuousRun'
import { ELICIT_FORMAT_VERSION, MAX_TEXT_LENGTH } from './elicitation'
import type { MultiRunData } from './multiRun'

/**
 * The result links of a claim with several outcomes and of a number claim: the claim, the
 * outcomes (or the range with its edges), the starting numbers, the seed, the answers, and the
 * user's own numbers. Decoding replays the algorithm over the answers (each must be the answer to
 * the question it would have asked) and accepts only the one canonical spelling of a result.
 * The link says nothing the answers do not: bands, estimates and the trace are recomputed.
 */

export type SharedMulti =
  | { type: 'result-multi'; run: MultiRunData }
  | { type: 'result-continuous'; run: ContinuousRunData }

const SEED_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const TIER_CODES: Record<Tier, string> = {
  'very unlikely': 'v',
  unlikely: 'u',
  plausible: 'p',
  likely: 'l',
  'near-certain': 'n',
}
const TIER_BY_CODE = Object.fromEntries(TIERS.map(t => [TIER_CODES[t], t])) as Record<string, Tier>
const PICK_CODE: Record<ComparePick, string> = { first: 'f', second: 's', equal: 'e' }
const PICK_BY_CODE: Record<string, ComparePick> = { f: 'first', s: 'second', e: 'equal' }
const CHOICE_CODE: Record<Choice, string> = { claim: 'c', wedge: 'w', 'cant-separate': 'u' }
const CHOICE_BY_CODE: Record<string, Choice> = { c: 'claim', w: 'wedge', u: 'cant-separate' }

/** The number in an id ("o3" is 3, "b0" is 0). */
const num = (id: string) => id.slice(1)

function perMille(wedge: Decimal.Value): number {
  const x = new Decimal(wedge).times(1000)
  if (!x.isInteger() || x.lt(1) || x.gt(999)) throw new RangeError('Wedge is not on the grid')
  return x.toNumber()
}

// ----------------------------------------------------------------------------- answers

function encodeAnswerTokens(answers: readonly MultiAnswer[]): string {
  return answers
    .map(a =>
      a.kind === 'compare'
        ? `c${num(a.first)}-${num(a.second)}${PICK_CODE[a.pick]}`
        : `l${a.targets.map(num).join('+')}:${perMille(a.wedge)}${CHOICE_CODE[a.choice]}`
    )
    .join(',')
}

/** The answers in the form `decodeMultiAnswers` replays; null if a token is malformed. */
function parseAnswerTokens(text: string, prefix: 'o' | 'b'): unknown[] | null {
  if (text === '') return []
  const tokens = text.split(',')
  // a run never asks more than this many questions: more tokens are not an answer history
  if (tokens.length > MAX_MULTI_QUESTIONS) return null
  const out: unknown[] = []
  for (const token of tokens) {
    const compare = /^c(\d{1,4})-(\d{1,4})([fse])$/.exec(token)
    if (compare) {
      out.push({
        k: 'c',
        a: `${prefix}${compare[1]}`,
        b: `${prefix}${compare[2]}`,
        p: PICK_BY_CODE[compare[3]],
      })
      continue
    }
    const lottery = /^l(\d{1,4}(?:\+\d{1,4})*):(\d{1,3})([cwu])$/.exec(token)
    if (!lottery) return null
    out.push({
      k: 'l',
      t: lottery[1].split('+').map(n => `${prefix}${n}`),
      w: Number(lottery[2]),
      c: CHOICE_BY_CODE[lottery[3]],
    })
  }
  return out
}

/** `1:55,m:10`: the user's own numbers by outcome number ("m" is the merged outcome). */
function encodeAdjusted(adjusted: Record<string, string>, order: readonly string[]): string {
  const keys = [...order, 'merged'].filter(k => adjusted[k] !== undefined)
  return keys
    .flatMap(k => {
      const value = parsePercent(adjusted[k])
      return value === null ? [] : [`${k === 'merged' ? 'm' : num(k)}:${value}`]
    })
    .join(',')
}

function parseAdjusted(
  text: string,
  prefix: 'o' | 'b',
  known: ReadonlySet<string>
): Record<string, string> | null {
  const out: Record<string, string> = {}
  if (text === '') return out
  for (const part of text.split(',')) {
    const m = /^(\d{1,4}|m):([\d.]+)$/.exec(part)
    if (!m) return null
    const key = m[1] === 'm' ? 'merged' : `${prefix}${m[1]}`
    if (key !== 'merged' && !known.has(key)) return null
    if (key === 'merged' && prefix === 'b') return null
    if (parsePercent(m[2]) !== m[2] || key in out) return null
    out[key] = m[2]
  }
  return out
}

// ----------------------------------------------------------------- several outcomes

export function encodeMultiResultHash(run: MultiRunData): string {
  const params = new URLSearchParams({
    ev: String(ELICIT_FORMAT_VERSION),
    t: 'ro',
    c: run.claim,
  })
  if (run.criteria) params.set('cr', run.criteria)
  params.set('s', run.seed)
  const items = run.outcomes.items
  for (const o of items) params.append('o', o.label)
  params.set('oi', items.map(o => num(o.id)).join(','))
  // (typed text such as "12,5%" is shared in its plain form)
  if (run.view === 'numbers') {
    params.set('pc', items.map(o => parsePercent(run.percents[o.id] ?? '')).join(','))
  } else params.set('ti', items.map(o => TIER_CODES[o.tier!]).join(''))
  if (run.kept) params.set('k', '1')
  if (run.answers.length) params.set('a', encodeAnswerTokens(run.answers))
  const adj = encodeAdjusted(
    run.adjusted,
    items.map(o => o.id)
  )
  if (adj) params.set('adj', adj)
  if (run.merged.length) params.set('mg', run.merged.map(num).join(','))
  return `#${params.toString()}`
}

function decodeMultiResult(params: URLSearchParams): MultiRunData | null {
  const claim = params.get('c') ?? ''
  const criteria = params.get('cr') ?? ''
  const seed = params.get('s') ?? ''
  if (claim.trim() === '' || claim.length > MAX_TEXT_LENGTH || criteria.length > MAX_TEXT_LENGTH) {
    return null
  }
  if (!SEED_PATTERN.test(seed)) return null
  const labels = params.getAll('o')
  const idText = (params.get('oi') ?? '').split(',')
  if (labels.length < MIN_OUTCOMES || labels.length > MAX_OUTCOMES) return null
  if (idText.length !== labels.length) return null
  const idNums = idText.map(t => (/^[1-9]\d{0,3}$/.test(t) ? Number(t) : NaN))
  if (idNums.some(n => Number.isNaN(n) || n > 1000)) return null
  if (!idNums.every((n, i) => i === 0 || n > idNums[i - 1])) return null
  const view = params.has('pc') ? 'numbers' : 'tiers'
  const tiersText = params.get('ti') ?? ''
  const percentTexts = (params.get('pc') ?? '').split(',')
  const items: ElicitOutcome[] = []
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]
    if (label === '' || label !== tidy(label) || label.length > MAX_TEXT_LENGTH) return null
    if (labelProblem(items, label)) return null
    const tier = view === 'tiers' ? (TIER_BY_CODE[tiersText[i] ?? ''] ?? null) : null
    if (view === 'tiers' && tier === null) return null
    items.push({ id: `o${idNums[i]}`, label, tier })
  }
  if (view === 'tiers' && tiersText.length !== labels.length) return null
  if (view === 'tiers' && params.has('pc')) return null
  let percents: Record<string, string> = {}
  if (view === 'numbers') {
    if (percentTexts.length !== items.length) return null
    if (percentTexts.some(p => parsePercent(p) !== p)) return null
    percents = Object.fromEntries(items.map((o, i) => [o.id, percentTexts[i]]))
  }
  const outcomes = { items, issued: idNums[idNums.length - 1] }
  const base = toMultiRun({ outcomes, seed, view, percents })
  if (!base) return null
  const raw = parseAnswerTokens(params.get('a') ?? '', 'o')
  const answers = raw && decodeMultiAnswers(raw, base)
  if (!answers) return null
  const known = new Set(items.map(o => o.id))
  const adjusted = parseAdjusted(params.get('adj') ?? '', 'o', known)
  if (!adjusted) return null
  const mergedText = params.get('mg') ?? ''
  const merged = mergedText === '' ? [] : mergedText.split(',').map(n => `o${n}`)
  if (merged.length === 1 || new Set(merged).size !== merged.length) return null
  if (!merged.every(id => known.has(id))) return null
  if (params.has('k') && params.get('k') !== '1') return null
  const domain = withAnswers(base, answers)!
  return {
    kind: 'categorical',
    claim,
    criteria,
    seed,
    outcomes,
    declinedElse: true,
    phase: 'ask',
    view,
    percents,
    checks: [],
    kept: params.get('k') === '1',
    reviewing: false,
    replaced: null,
    answers,
    // the link does not say whether the run was stopped, but the algorithm does
    stopped: nextMultiQuestion(domain) !== null,
    adjusted,
    merged,
    locked: false,
  }
}

// --------------------------------------------------------------------- number claims

export function encodeContinuousResultHash(run: ContinuousRunData): string {
  const params = new URLSearchParams({
    ev: String(ELICIT_FORMAT_VERSION),
    t: 'rn',
    c: run.claim,
  })
  if (run.criteria) params.set('cr', run.criteria)
  params.set('s', run.seed)
  if (run.unit) params.set('u', run.unit)
  // (typed as "0,5" or "2.50", shared in the plain form the link is read back in)
  params.set('lo', parseNumber(run.min) ?? run.min)
  params.set('hi', parseNumber(run.max) ?? run.max)
  if (run.thresholds.length) params.set('th', run.thresholds.join(','))
  params.set('ed', run.edges.join(','))
  params.set(
    'pc',
    run.edges
      .map((_, i) => parseBar(run.percents[`b${i}`] ?? ''))
      .concat(parseBar(run.percents[`b${run.edges.length}`] ?? ''))
      .join(',')
  )
  if (run.answers.length) params.set('a', encodeAnswerTokens(run.answers))
  const adj = encodeAdjusted(
    run.adjusted,
    run.edges.map((_, i) => `b${i}`).concat(`b${run.edges.length}`)
  )
  if (adj) params.set('adj', adj)
  return `#${params.toString()}`
}

function decodeContinuousResult(params: URLSearchParams): ContinuousRunData | null {
  const claim = params.get('c') ?? ''
  const criteria = params.get('cr') ?? ''
  const seed = params.get('s') ?? ''
  const unit = params.get('u') ?? ''
  const min = params.get('lo') ?? ''
  const max = params.get('hi') ?? ''
  if (claim.trim() === '' || claim.length > MAX_TEXT_LENGTH || criteria.length > MAX_TEXT_LENGTH) {
    return null
  }
  if (!SEED_PATTERN.test(seed) || unit.length > 20) return null
  const plain = (n: string) => n.length <= MAX_NUMBER_TEXT && parseNumber(n) === n
  if (!plain(min) || !plain(max) || !new Decimal(min).lt(max)) return null
  const list = (name: string) => (params.get(name) ? params.get(name)!.split(',') : [])
  const thresholds = list('th')
  const edges = list('ed')
  if (!thresholds.every(plain) || thresholds.length > MAX_OUTCOMES - 1) return null
  if (new Set(thresholds).size !== thresholds.length) return null
  if (edges.length < 1 || edges.length > MAX_OUTCOMES - 1 || !edges.every(plain)) return null
  if (!edges.every((e, i) => i === 0 || new Decimal(e).gt(edges[i - 1]))) return null
  if (!edges.every(e => new Decimal(e).gt(min) && new Decimal(e).lt(max))) return null
  const pc = list('pc')
  if (pc.length !== edges.length + 1) return null
  const barOk = (p: string) =>
    /^\d{1,3}(\.\d{1,2})?$/.test(p) && new Decimal(p).lte(100) && new Decimal(p).toString() === p
  if (!pc.every(barOk) || !pc.some(p => new Decimal(p).gt(0))) return null
  const percents = Object.fromEntries(pc.map((p, i) => [`b${i}`, p]))
  const draft = { unit, min, max, thresholds, edges, percents, seed }
  const base = continuousToMultiRun(draft)
  if (!base) return null
  const raw = parseAnswerTokens(params.get('a') ?? '', 'b')
  const answers = raw && decodeMultiAnswers(raw, base)
  if (!answers) return null
  const adjusted = parseAdjusted(params.get('adj') ?? '', 'b', new Set(pc.map((_, i) => `b${i}`)))
  if (!adjusted) return null
  const domain = withAnswers(base, answers)!
  return {
    kind: 'continuous',
    claim,
    criteria,
    seed,
    unit,
    min,
    max,
    thresholds,
    phase: 'ask',
    edges,
    percents,
    view: 'bars',
    curve: [],
    answers,
    stopped: nextMultiQuestion(domain) !== null,
    adjusted,
    locked: false,
  }
}

// ------------------------------------------------------------------------- reading

/** A shared result of a claim with several outcomes or a number, or null. */
/** Longer than any honest result (the claim, the criteria and eight labels at their longest, with room). */
export const MAX_SHARE_HASH = 40000

export function decodeSharedMulti(hash: string): SharedMulti | null {
  if (!hash || hash.length <= 1 || hash.length > MAX_SHARE_HASH) return null
  const params = new URLSearchParams(hash.slice(1))
  if (params.get('ev') !== String(ELICIT_FORMAT_VERSION)) return null
  try {
    if (params.get('t') === 'ro') {
      const run = decodeMultiResult(params)
      return run && encodeMultiResultHash(run) === hash ? { type: 'result-multi', run } : null
    }
    if (params.get('t') === 'rn') {
      const run = decodeContinuousResult(params)
      return run && encodeContinuousResultHash(run) === hash
        ? { type: 'result-continuous', run }
        : null
    }
  } catch {
    // anything that throws on the way is not a result
  }
  return null
}
