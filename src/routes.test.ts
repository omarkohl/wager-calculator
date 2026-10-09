import lzString from 'lz-string'
import { describe, expect, it } from 'vitest'
import { legacyRedirect, pathFor, routeFromPath } from './routes'
import { encodeWagerToHash } from './storage/urlHash'
import { createDefaultWager } from './domain/defaults'

describe('routeFromPath', () => {
  it('maps the known paths', () => {
    expect(routeFromPath('/', '/')).toBe('landing')
    expect(routeFromPath('/wager', '/')).toBe('wager')
    expect(routeFromPath('/elicit', '/')).toBe('elicit')
  })

  it('tolerates a trailing slash and an index.html', () => {
    expect(routeFromPath('/wager/', '/')).toBe('wager')
    expect(routeFromPath('/index.html', '/')).toBe('landing')
  })

  it('treats anything else as not found', () => {
    expect(routeFromPath('/nope', '/')).toBe('notFound')
    expect(routeFromPath('/wager/x', '/')).toBe('notFound')
  })

  it('works below a base path', () => {
    expect(routeFromPath('/app/', '/app/')).toBe('landing')
    expect(routeFromPath('/app', '/app/')).toBe('landing')
    expect(routeFromPath('/app/wager', '/app/')).toBe('wager')
    expect(routeFromPath('/wager', '/app/')).toBe('notFound')
  })
})

describe('pathFor', () => {
  it('prefixes the base', () => {
    expect(pathFor('landing', '/')).toBe('/')
    expect(pathFor('wager', '/')).toBe('/wager')
    expect(pathFor('wager', '/app/')).toBe('/app/wager')
    expect(pathFor('landing', '/app/')).toBe('/app/')
  })
})

describe('legacyRedirect', () => {
  it('sends a v2 wager hash at the landing path to the wager route', () => {
    const hash = encodeWagerToHash(createDefaultWager())
    expect(legacyRedirect('/', hash, '/')).toBe(`/wager${hash}`)
    expect(legacyRedirect('/app/', hash, '/app/')).toBe(`/app/wager${hash}`)
  })

  it('sends a faq hash to the wager route', () => {
    expect(legacyRedirect('/', '#faq=brier', '/')).toBe('/wager#faq=brier')
  })

  it('sends a legacy v1 hash to the wager route, and ignores unreadable hashes', () => {
    const v1 = {
      v: 1,
      claim: 'Old claim',
      details: '',
      stakes: 'eur',
      participants: [{ id: 'p1', name: 'Alice', maxBet: '100', touched: true }],
      outcomes: [{ id: 'o1', label: 'Yes', touched: true }],
      predictions: [{ participantId: 'p1', outcomeId: 'o1', probability: '1', touched: true }],
      resolvedOutcomeId: null,
    }
    const hash = `#${lzString.compressToEncodedURIComponent(JSON.stringify(v1))}`
    expect(legacyRedirect('/', hash, '/')).toBe(`/wager${hash}`)
    expect(legacyRedirect('/', '#w=garbage', '/')).toBeNull()
  })

  it('leaves other paths and empty hashes alone', () => {
    expect(legacyRedirect('/', '', '/')).toBeNull()
    expect(legacyRedirect('/', '#', '/')).toBeNull()
    expect(legacyRedirect('/elicit', '#v=2&c=x', '/')).toBeNull()
    expect(legacyRedirect('/wager', '#v=2&c=x', '/')).toBeNull()
  })
})
