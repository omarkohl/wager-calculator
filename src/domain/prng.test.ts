import { describe, expect, it } from 'vitest'
import { createSeededPRNG } from './prng'

describe('createSeededPRNG', () => {
  it('is deterministic per seed', () => {
    const a = createSeededPRNG('seed')
    const b = createSeededPRNG('seed')
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('differs between seeds and stays in [0, 1)', () => {
    const a = createSeededPRNG('one')
    const b = createSeededPRNG('two')
    expect(a()).not.toBe(b())
    const c = createSeededPRNG('range')
    for (let i = 0; i < 1000; i++) {
      const x = c()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })

  it('keeps its exact output (the wager rounding depends on it)', () => {
    const prng = createSeededPRNG('Will it rain?')
    expect(prng()).toMatchInlineSnapshot(`0.8930276641124058`)
  })
})
