import { describe, expect, it } from 'vitest'
import { normalizeBasePath } from './basePath'

describe('normalizeBasePath', () => {
  it('defaults to the domain root', () => {
    expect(normalizeBasePath(undefined)).toBe('/')
    expect(normalizeBasePath('')).toBe('/')
    expect(normalizeBasePath('  ')).toBe('/')
    expect(normalizeBasePath('/')).toBe('/')
  })

  it('adds the missing leading and trailing slash', () => {
    expect(normalizeBasePath('wager-calculator')).toBe('/wager-calculator/')
    expect(normalizeBasePath('/wager-calculator')).toBe('/wager-calculator/')
    expect(normalizeBasePath('/wager-calculator/')).toBe('/wager-calculator/')
  })

  it('collapses repeated slashes inside the path', () => {
    expect(normalizeBasePath('/a//b//')).toBe('/a/b/')
  })

  it('rejects a leading // (a host, not a path)', () => {
    expect(() => normalizeBasePath('//host/x')).toThrow()
  })

  it('rejects segments with characters outside [A-Za-z0-9._~-]', () => {
    expect(() => normalizeBasePath('/a b/')).toThrow()
    expect(() => normalizeBasePath('/a?x=1/')).toThrow()
    expect(() => normalizeBasePath('/a#b/')).toThrow()
    expect(() => normalizeBasePath('/a"b/')).toThrow()
  })

  it('rejects values that are not plain paths', () => {
    expect(() => normalizeBasePath('https://example.com/x/')).toThrow()
    expect(() => normalizeBasePath('./')).toThrow()
    expect(() => normalizeBasePath('/a/../b')).toThrow()
  })
})
