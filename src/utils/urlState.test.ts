import { describe, it, expect } from 'vitest'
import { compressToEncodedURIComponent } from 'lz-string'
import Decimal from 'decimal.js'
import {
  STATE_VERSION,
  serializeState,
  deserializeState,
  encodeStateToURL,
  decodeStateFromURL,
} from './urlState'

describe('urlState', () => {
  const sampleParticipants = [
    { id: 'p1', name: 'Alice', maxBet: new Decimal(100), touched: true },
    { id: 'p2', name: 'Bob', maxBet: new Decimal(50), touched: false },
  ]

  const sampleOutcomes = [
    { id: 'o1', label: 'Yes', touched: true },
    { id: 'o2', label: 'No', touched: false },
  ]

  const samplePredictions = [
    { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(0.6), touched: true },
    { participantId: 'p1', outcomeId: 'o2', probability: new Decimal(0.4), touched: true },
  ]

  describe('serializeState', () => {
    it('includes version number in serialized state', () => {
      const state = serializeState(
        'Test claim',
        'Test details',
        'usd',
        sampleParticipants,
        sampleOutcomes,
        samplePredictions,
        null
      )

      expect(state.v).toBe(STATE_VERSION)
      expect(state.v).toBe(1)
    })

    it('converts Decimal values to strings', () => {
      const state = serializeState(
        'Test',
        '',
        'usd',
        sampleParticipants,
        sampleOutcomes,
        samplePredictions,
        null
      )

      expect(state.participants[0].maxBet).toBe('100')
      expect(state.predictions[0].probability).toBe('0.6')
    })
  })

  describe('deserializeState', () => {
    it('converts string values back to Decimals', () => {
      const serialized = serializeState(
        'Test',
        '',
        'usd',
        sampleParticipants,
        sampleOutcomes,
        samplePredictions,
        null
      )

      const deserialized = deserializeState(serialized)

      expect(deserialized.participants[0].maxBet).toBeInstanceOf(Decimal)
      expect(deserialized.participants[0].maxBet.toNumber()).toBe(100)
      expect(deserialized.predictions[0].probability).toBeInstanceOf(Decimal)
      expect(deserialized.predictions[0].probability.toNumber()).toBe(0.6)
    })
  })

  describe('encodeStateToURL / decodeStateFromURL', () => {
    it('roundtrips state with version number', () => {
      const state = serializeState(
        'Test claim',
        'Test details',
        'eur',
        sampleParticipants,
        sampleOutcomes,
        samplePredictions,
        'o1'
      )

      const hash = encodeStateToURL(state)
      const decoded = decodeStateFromURL(hash)

      expect(decoded).not.toBeNull()
      expect(decoded!.v).toBe(1)
      expect(decoded!.claim).toBe('Test claim')
      expect(decoded!.stakes).toBe('eur')
      expect(decoded!.resolvedOutcomeId).toBe('o1')
    })

    it('handles old URLs without version number', () => {
      // Simulate an old URL state without version field
      const oldState = {
        claim: 'Old claim',
        details: '',
        stakes: 'usd',
        participants: [{ id: 'p1', name: 'Alice', maxBet: '100', touched: true }],
        outcomes: [{ id: 'o1', label: 'Yes', touched: false }],
        predictions: [],
        resolvedOutcomeId: null,
      }

      const json = JSON.stringify(oldState)
      const compressed = compressToEncodedURIComponent(json)
      const hash = `#${compressed}`

      const decoded = decodeStateFromURL(hash)

      expect(decoded).not.toBeNull()
      expect(decoded!.v).toBe(1) // Should default to v1
      expect(decoded!.claim).toBe('Old claim')
    })

    it('returns null for empty hash', () => {
      expect(decodeStateFromURL('')).toBeNull()
      expect(decodeStateFromURL('#')).toBeNull()
    })

    it('returns null for invalid hash', () => {
      expect(decodeStateFromURL('#invalid-data')).toBeNull()
    })
  })
})
