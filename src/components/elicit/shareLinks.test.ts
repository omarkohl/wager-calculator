import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  continuousInviteLink,
  continuousResultLink,
  inviteLink,
  multiInviteLink,
  multiResultLink,
  resultLink,
} from './shareLinks'
import { decodeSharedMulti } from '../../storage/multiShare'
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

describe('invites for several outcomes and numbers', () => {
  it('carries the outcomes, in order, and nothing of the sender’s answers', () => {
    const link = multiInviteLink({
      claim: 'Who wins?',
      criteria: 'Final count',
      outcomes: {
        items: [
          { id: 'o1', label: 'Alice', tier: 'likely' },
          { id: 'o2', label: 'Bob', tier: 'very unlikely' },
        ],
        issued: 2,
      },
    })
    expect(decodeElicitationHash(hashOf(link))).toEqual({
      type: 'invite',
      claim: 'Who wins?',
      criteria: 'Final count',
      shape: { kind: 'categorical', outcomes: ['Alice', 'Bob'] },
    })
    expect(link).not.toContain('likely')
  })

  it('carries the range ends in their plain form, however they were typed', () => {
    const link = continuousInviteLink({
      claim: 'Noon temperature',
      criteria: '',
      unit: '',
      min: ' 0,5',
      max: '30.50',
      thresholds: [],
      edges: ['10'],
    })
    expect(decodeElicitationHash(hashOf(link))).toMatchObject({
      type: 'invite',
      shape: { kind: 'continuous', min: '0.5', max: '30.5' },
    })
  })

  it('carries the range and the edges', () => {
    const link = continuousInviteLink({
      claim: 'Noon temperature',
      criteria: '',
      unit: '°C',
      min: '-10',
      max: '30',
      thresholds: ['0'],
      edges: ['-5', '0', '10'],
    })
    expect(decodeElicitationHash(hashOf(link))).toMatchObject({
      type: 'invite',
      shape: { kind: 'continuous', min: '-10', max: '30', edges: ['-5', '0', '10'] },
    })
  })
})

describe('result links for several outcomes and numbers', () => {
  it('open the elicitation page of this site and decode to the same result', () => {
    const base = {
      kind: 'categorical',
      claim: 'Who wins?',
      criteria: '',
      seed: 'abc',
      outcomes: {
        items: [
          { id: 'o1', label: 'Alice', tier: 'likely' },
          { id: 'o2', label: 'Bob', tier: 'unlikely' },
        ],
        issued: 2,
      },
      view: 'tiers',
      percents: {},
      kept: false,
      answers: [],
      stopped: true,
      adjusted: {},
      merged: [],
    } as never
    const link = multiResultLink(base)
    expect(new URL(link).pathname).toBe('/elicit')
    expect(decodeSharedMulti(hashOf(link))?.type).toBe('result-multi')
    const cont = {
      kind: 'continuous',
      claim: 'Noon',
      criteria: '',
      seed: 'abc',
      unit: '',
      min: '0',
      max: '10',
      thresholds: [],
      edges: ['5'],
      percents: { b0: '40', b1: '60' },
      answers: [],
      stopped: true,
      adjusted: {},
    } as never
    expect(decodeSharedMulti(hashOf(continuousResultLink(cont)))?.type).toBe('result-continuous')
  })
})
