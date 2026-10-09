import { afterEach, describe, expect, it, vi } from 'vitest'
import { inviteLink, resultLink } from './shareLinks'
import { decodeElicitationHash, type RunData } from '../../storage/elicitation'

const run = {
  claim: 'It rains',
  criteria: 'Any rain',
  seed: 'abc123',
  dropped: [],
  adjusted: '55',
  mode: 'quick',
  answers: [],
} as RunData

const hashOf = (url: string) => new URL(url).hash

describe('share links', () => {
  it('point at the elicitation page of this site', () => {
    for (const url of [inviteLink(run), resultLink(run)]) {
      const parsed = new URL(url)
      expect(parsed.origin).toBe(window.location.origin)
      expect(parsed.pathname).toBe('/elicit')
    }
  })

  it('an invite carries the claim and criteria only', () => {
    const decoded = decodeElicitationHash(hashOf(inviteLink(run)))
    expect(decoded).toEqual({ type: 'invite', claim: 'It rains', criteria: 'Any rain' })
    expect(inviteLink(run)).not.toContain('abc123')
    expect(inviteLink(run)).not.toContain('adj')
  })

  it('a result carries everything needed to recompute it', () => {
    const decoded = decodeElicitationHash(hashOf(resultLink(run)))
    expect(decoded?.type).toBe('result')
    expect(decoded).toMatchObject({ run: { claim: 'It rains', seed: 'abc123', adjusted: '55' } })
  })

  it("keeps the site's base path when the site is not at the root", () => {
    vi.stubEnv('BASE_URL', '/app/')
    expect(new URL(inviteLink(run)).pathname).toBe('/app/elicit')
    expect(new URL(resultLink(run)).pathname).toBe('/app/elicit')
  })
})

afterEach(() => vi.unstubAllEnvs())
