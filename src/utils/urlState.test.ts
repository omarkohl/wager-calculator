import { describe, it, expect } from 'vitest'
import { compressToEncodedURIComponent } from 'lz-string'
import Decimal from 'decimal.js'
import type { Wager } from '../types/wager'
import { encodeWagerToHash, decodeWagerFromHash } from './urlState'

const EMPTY_WAGER: Wager = {
  claim: '',
  details: '',
  stakes: 'usd',
  participants: [],
  outcomes: [],
  predictions: [],
  resolvedOutcomeId: null,
}

function makeWager(overrides: Partial<Wager>): Wager {
  return { ...EMPTY_WAGER, ...overrides }
}

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

  describe('encodeWagerToHash / decodeWagerFromHash', () => {
    it('roundtrips a wager', () => {
      const wager = makeWager({
        claim: 'Test claim',
        details: 'Test details',
        stakes: 'eur',
        participants: sampleParticipants,
        outcomes: sampleOutcomes,
        predictions: samplePredictions,
        resolvedOutcomeId: 'o1',
      })

      const hash = encodeWagerToHash(wager)
      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      expect(decoded!.claim).toBe('Test claim')
      expect(decoded!.stakes).toBe('eur')
      // v2 generates new IDs, so just check it's not null for resolved outcome
      expect(decoded!.resolvedOutcomeId).not.toBeNull()
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

      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      expect(decoded!.claim).toBe('Old claim')
    })

    it('decodes v1 compressed format with full data', () => {
      // Simulate a complete v1 URL state with all fields
      const v1State = {
        v: 1,
        claim: 'Will it rain?',
        details: 'Weather prediction',
        stakes: 'eur',
        participants: [
          { id: 'p1', name: 'Alice', maxBet: '100.50', touched: true },
          { id: 'p2', name: 'Bob', maxBet: '75.25', touched: true },
        ],
        outcomes: [
          { id: 'o1', label: 'Yes', touched: true },
          { id: 'o2', label: 'No', touched: true },
        ],
        predictions: [
          { participantId: 'p1', outcomeId: 'o1', probability: '0.6', touched: true },
          { participantId: 'p1', outcomeId: 'o2', probability: '0.4', touched: true },
          { participantId: 'p2', outcomeId: 'o1', probability: '0.3', touched: true },
          { participantId: 'p2', outcomeId: 'o2', probability: '0.7', touched: true },
        ],
        resolvedOutcomeId: 'o1',
      }

      const json = JSON.stringify(v1State)
      const compressed = compressToEncodedURIComponent(json)
      const hash = `#${compressed}`

      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      expect(decoded!.claim).toBe('Will it rain?')
      expect(decoded!.details).toBe('Weather prediction')
      expect(decoded!.stakes).toBe('eur')

      // Verify participants with Decimal conversion
      expect(decoded!.participants).toHaveLength(2)
      expect(decoded!.participants[0].name).toBe('Alice')
      expect(decoded!.participants[0].maxBet).toBeInstanceOf(Decimal)
      expect(decoded!.participants[0].maxBet.toNumber()).toBe(100.5)
      expect(decoded!.participants[1].maxBet.toNumber()).toBe(75.25)

      // Verify outcomes
      expect(decoded!.outcomes).toHaveLength(2)
      expect(decoded!.outcomes[0].label).toBe('Yes')
      expect(decoded!.outcomes[1].label).toBe('No')

      // Verify predictions with Decimal conversion
      expect(decoded!.predictions).toHaveLength(4)
      expect(decoded!.predictions[0].probability).toBeInstanceOf(Decimal)
      expect(decoded!.predictions[0].probability.toNumber()).toBe(0.6)
      expect(decoded!.predictions[1].probability.toNumber()).toBe(0.4)
      expect(decoded!.predictions[2].probability.toNumber()).toBe(0.3)
      expect(decoded!.predictions[3].probability.toNumber()).toBe(0.7)

      // Verify resolved outcome ID is preserved
      expect(decoded!.resolvedOutcomeId).toBe('o1')
    })

    it('returns null for empty hash', () => {
      expect(decodeWagerFromHash('')).toBeNull()
      expect(decodeWagerFromHash('#')).toBeNull()
    })

    it('returns null for invalid hash', () => {
      expect(decodeWagerFromHash('#invalid-data')).toBeNull()
    })
  })

  describe('v2 URL format', () => {
    it('encodes basic state to plain text params', () => {
      const wager = makeWager({
        claim: 'Will it rain?',
        details: 'Resolves YES if rain',
        participants: sampleParticipants,
        outcomes: sampleOutcomes,
        predictions: samplePredictions,
      })

      const hash = encodeWagerToHash(wager)

      // v2 should start with #v=2
      expect(hash).toMatch(/^#v=2&/)
      // Should be much shorter than v1
      expect(hash.length).toBeLessThan(300)
      // Should contain readable params
      expect(hash).toContain('c=Will')
      expect(hash).toContain('pn=Alice')
    })

    it('roundtrips v2 state perfectly', () => {
      // Use all-touched data for this test
      const touchedParticipants = [
        { id: 'p1', name: 'Alice', maxBet: new Decimal(100), touched: true },
        { id: 'p2', name: 'Bob', maxBet: new Decimal(50), touched: true },
      ]
      const touchedOutcomes = [
        { id: 'o1', label: 'Yes', touched: true },
        { id: 'o2', label: 'No', touched: true },
      ]
      const touchedPredictions = [
        { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(0.6), touched: true },
        { participantId: 'p1', outcomeId: 'o2', probability: new Decimal(0.4), touched: true },
        { participantId: 'p2', outcomeId: 'o1', probability: new Decimal(0.3), touched: true },
        { participantId: 'p2', outcomeId: 'o2', probability: new Decimal(0.7), touched: true },
      ]

      const wager = makeWager({
        claim: 'Test claim',
        details: 'Test details',
        stakes: 'eur',
        participants: touchedParticipants,
        outcomes: touchedOutcomes,
        predictions: touchedPredictions,
        resolvedOutcomeId: 'o1',
      })

      const hash = encodeWagerToHash(wager)
      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      expect(decoded!.claim).toBe('Test claim')
      expect(decoded!.details).toBe('Test details')
      expect(decoded!.stakes).toBe('eur')
      expect(decoded!.participants).toHaveLength(2)
      expect(decoded!.participants[0].name).toBe('Alice')
      expect(decoded!.participants[0].maxBet.toNumber()).toBe(100)
      expect(decoded!.participants[1].name).toBe('Bob')
      expect(decoded!.participants[1].maxBet.toNumber()).toBe(50)
      expect(decoded!.outcomes).toHaveLength(2)
      expect(decoded!.outcomes[0].label).toBe('Yes')
      expect(decoded!.outcomes[1].label).toBe('No')
      expect(decoded!.predictions).toHaveLength(4)
      expect(decoded!.predictions[0].probability.toNumber()).toBe(0.6)
      expect(decoded!.predictions[1].probability.toNumber()).toBe(0.4)
      // v2 uses indexes, so the first outcome should be the resolved one
      expect(decoded!.resolvedOutcomeId).toBe(decoded!.outcomes[0].id)
    })

    it('handles empty strings and special characters', () => {
      const participants = [
        { id: 'p1', name: 'Alice & Bob', maxBet: new Decimal(100), touched: true },
      ]
      const outcomes = [{ id: 'o1', label: 'Yes/No?', touched: true }]

      const wager = makeWager({ claim: 'Test?', participants: participants, outcomes: outcomes })

      const hash = encodeWagerToHash(wager)
      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      expect(decoded!.participants[0].name).toBe('Alice & Bob')
      expect(decoded!.outcomes[0].label).toBe('Yes/No?')
      expect(decoded!.details).toBe('')
    })

    it('handles all participants predicting all outcomes', () => {
      const predictions = [
        { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(0.6), touched: true },
        { participantId: 'p1', outcomeId: 'o2', probability: new Decimal(0.4), touched: true },
        { participantId: 'p2', outcomeId: 'o1', probability: new Decimal(0.3), touched: true },
        { participantId: 'p2', outcomeId: 'o2', probability: new Decimal(0.7), touched: true },
      ]

      const wager = makeWager({
        claim: 'Test',
        participants: sampleParticipants,
        outcomes: sampleOutcomes,
        predictions: predictions,
      })

      const hash = encodeWagerToHash(wager)
      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      expect(decoded!.predictions).toHaveLength(4)
      // Check row-major order: p0o0, p0o1, p1o0, p1o1
      // v2 generates new IDs, so check by index position
      expect(decoded!.predictions[0].participantId).toBe(decoded!.participants[0].id)
      expect(decoded!.predictions[0].outcomeId).toBe(decoded!.outcomes[0].id)
      expect(decoded!.predictions[0].probability.toNumber()).toBe(0.6)
      expect(decoded!.predictions[1].participantId).toBe(decoded!.participants[0].id)
      expect(decoded!.predictions[1].outcomeId).toBe(decoded!.outcomes[1].id)
      expect(decoded!.predictions[2].participantId).toBe(decoded!.participants[1].id)
      expect(decoded!.predictions[2].outcomeId).toBe(decoded!.outcomes[0].id)
      expect(decoded!.predictions[3].participantId).toBe(decoded!.participants[1].id)
      expect(decoded!.predictions[3].outcomeId).toBe(decoded!.outcomes[1].id)
    })

    it('preserves touched state through encode/decode', () => {
      const wager = makeWager({
        claim: 'Test',
        participants: sampleParticipants,
        outcomes: sampleOutcomes,
        predictions: samplePredictions,
      })

      const hash = encodeWagerToHash(wager)
      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      // First participant was touched, second was not
      expect(decoded!.participants[0].touched).toBe(true)
      expect(decoded!.participants[1].touched).toBe(false)
      // First outcome was touched, second was not
      expect(decoded!.outcomes[0].touched).toBe(true)
      expect(decoded!.outcomes[1].touched).toBe(false)
      // Touched predictions stay touched
      expect(decoded!.predictions[0].touched).toBe(true)
      expect(decoded!.predictions[1].touched).toBe(true)
      // Untouched predictions (those not in original) are untouched
      expect(decoded!.predictions[2].touched).toBe(false)
      expect(decoded!.predictions[3].touched).toBe(false)
    })

    it('auto-distributes untouched predictions on decode', () => {
      // Participant 1: 60% on outcome 1, 40% on outcome 2 (all touched)
      // Participant 2: all untouched -> should auto-distribute to 50% each
      const predictions = [
        { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(60), touched: true },
        { participantId: 'p1', outcomeId: 'o2', probability: new Decimal(40), touched: true },
        // p2 predictions are missing (untouched)
      ]

      const wager = makeWager({
        claim: 'Test',
        participants: sampleParticipants,
        outcomes: sampleOutcomes,
        predictions: predictions,
      })

      const hash = encodeWagerToHash(wager)
      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      // Participant 1's predictions are preserved
      expect(decoded!.predictions[0].probability.toNumber()).toBe(60)
      expect(decoded!.predictions[0].touched).toBe(true)
      expect(decoded!.predictions[1].probability.toNumber()).toBe(40)
      expect(decoded!.predictions[1].touched).toBe(true)
      // Participant 2's predictions are auto-distributed (100% / 2 outcomes = 50% each)
      expect(decoded!.predictions[2].probability.toNumber()).toBe(50)
      expect(decoded!.predictions[2].touched).toBe(false)
      expect(decoded!.predictions[3].probability.toNumber()).toBe(50)
      expect(decoded!.predictions[3].touched).toBe(false)
    })

    it('auto-distributes remaining probability when some predictions are touched', () => {
      // Participant with 70% on outcome 1 (touched), outcome 2 should get 30%
      const participants = [{ id: 'p1', name: 'Alice', maxBet: new Decimal(100), touched: true }]
      const outcomes = [
        { id: 'o1', label: 'Yes', touched: true },
        { id: 'o2', label: 'No', touched: true },
        { id: 'o3', label: 'Maybe', touched: true },
      ]
      const predictions = [
        { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(70), touched: true },
        // o2 and o3 are untouched, should split remaining 30%
      ]

      const wager = makeWager({
        claim: 'Test',
        participants: participants,
        outcomes: outcomes,
        predictions: predictions,
      })

      const hash = encodeWagerToHash(wager)
      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      expect(decoded!.predictions[0].probability.toNumber()).toBe(70)
      expect(decoded!.predictions[0].touched).toBe(true)
      // Remaining 30% split between 2 untouched outcomes = 15% each
      expect(decoded!.predictions[1].probability.toNumber()).toBe(15)
      expect(decoded!.predictions[1].touched).toBe(false)
      expect(decoded!.predictions[2].probability.toNumber()).toBe(15)
      expect(decoded!.predictions[2].touched).toBe(false)
    })

    it('handles resolved outcome by index', () => {
      const wager = makeWager({
        claim: 'Test',
        participants: sampleParticipants,
        outcomes: sampleOutcomes,
        predictions: samplePredictions,
        resolvedOutcomeId: 'o2',
      })

      const hash = encodeWagerToHash(wager)
      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      // o2 is the second outcome (index 1), v2 generates new IDs
      expect(decoded!.resolvedOutcomeId).toBe(decoded!.outcomes[1].id)
    })

    it('handles no resolved outcome', () => {
      const wager = makeWager({
        claim: 'Test',
        participants: sampleParticipants,
        outcomes: sampleOutcomes,
        predictions: samplePredictions,
      })

      const hash = encodeWagerToHash(wager)
      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      expect(decoded!.resolvedOutcomeId).toBeNull()
    })

    it('is much shorter than v1 compressed format', () => {
      const wager = makeWager({
        claim: 'Will it rain tomorrow?',
        details: 'Resolves YES if any rain between 6am-6pm',
        participants: [
          { id: 'p1', name: 'Alice', maxBet: new Decimal(100), touched: true },
          { id: 'p2', name: 'Bob', maxBet: new Decimal(50), touched: false },
        ],
        outcomes: [
          { id: 'o1', label: 'Yes', touched: true },
          { id: 'o2', label: 'No', touched: false },
        ],
        predictions: [
          { participantId: 'p1', outcomeId: 'o1', probability: new Decimal(0.6), touched: true },
          { participantId: 'p1', outcomeId: 'o2', probability: new Decimal(0.4), touched: true },
          { participantId: 'p2', outcomeId: 'o1', probability: new Decimal(0.3), touched: true },
          { participantId: 'p2', outcomeId: 'o2', probability: new Decimal(0.7), touched: true },
        ],
      })

      const v2Hash = encodeWagerToHash(wager)

      // v2 should be significantly shorter (target < 300 chars vs ~500+ for v1)
      expect(v2Hash.length).toBeLessThan(300)
    })

    it('escapes commas in participant names', () => {
      const participants = [
        { id: 'p1', name: 'Alice, Bob', maxBet: new Decimal(100), touched: true },
        { id: 'p2', name: 'Carol', maxBet: new Decimal(50), touched: true },
      ]
      const outcomes = [{ id: 'o1', label: 'Yes', touched: true }]

      const wager = makeWager({ claim: 'Test', participants: participants, outcomes: outcomes })

      const hash = encodeWagerToHash(wager)
      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      expect(decoded!.participants).toHaveLength(2)
      expect(decoded!.participants[0].name).toBe('Alice, Bob')
      expect(decoded!.participants[1].name).toBe('Carol')
    })

    it('escapes commas in outcome labels', () => {
      const participants = [{ id: 'p1', name: 'Alice', maxBet: new Decimal(100), touched: true }]
      const outcomes = [
        { id: 'o1', label: 'Yes, definitely', touched: true },
        { id: 'o2', label: 'No, never', touched: true },
      ]

      const wager = makeWager({ claim: 'Test', participants: participants, outcomes: outcomes })

      const hash = encodeWagerToHash(wager)
      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      expect(decoded!.outcomes).toHaveLength(2)
      expect(decoded!.outcomes[0].label).toBe('Yes, definitely')
      expect(decoded!.outcomes[1].label).toBe('No, never')
    })

    it('handles backslashes in names and labels', () => {
      const participants = [
        { id: 'p1', name: 'Alice\\Bob', maxBet: new Decimal(100), touched: true },
      ]
      const outcomes = [{ id: 'o1', label: 'Yes\\No', touched: true }]

      const wager = makeWager({ claim: 'Test', participants: participants, outcomes: outcomes })

      const hash = encodeWagerToHash(wager)
      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      expect(decoded!.participants[0].name).toBe('Alice\\Bob')
      expect(decoded!.outcomes[0].label).toBe('Yes\\No')
    })

    it('handles combination of backslashes and commas', () => {
      const participants = [
        { id: 'p1', name: 'Alice\\, Bob', maxBet: new Decimal(100), touched: true },
      ]
      const outcomes = [{ id: 'o1', label: 'Yes\\, No', touched: true }]

      const wager = makeWager({ claim: 'Test', participants: participants, outcomes: outcomes })

      const hash = encodeWagerToHash(wager)
      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      expect(decoded!.participants[0].name).toBe('Alice\\, Bob')
      expect(decoded!.outcomes[0].label).toBe('Yes\\, No')
    })

    it('preserves full decimal precision through roundtrip', () => {
      const participants = [
        { id: 'p1', name: 'Alice', maxBet: new Decimal('123.456789'), touched: true },
        { id: 'p2', name: 'Bob', maxBet: new Decimal('0.123456789'), touched: true },
      ]
      const outcomes = [
        { id: 'o1', label: 'Yes', touched: true },
        { id: 'o2', label: 'No', touched: true },
      ]
      const predictions = [
        {
          participantId: 'p1',
          outcomeId: 'o1',
          probability: new Decimal('0.333333333'),
          touched: true,
        },
        {
          participantId: 'p1',
          outcomeId: 'o2',
          probability: new Decimal('0.666666667'),
          touched: true,
        },
      ]

      const wager = makeWager({
        claim: 'Test',
        participants: participants,
        outcomes: outcomes,
        predictions: predictions,
      })

      const hash = encodeWagerToHash(wager)
      const decoded = decodeWagerFromHash(hash)

      expect(decoded).not.toBeNull()
      // Full precision is preserved
      expect(decoded!.participants[0].maxBet.toString()).toBe('123.456789')
      expect(decoded!.participants[1].maxBet.toString()).toBe('0.123456789')
      expect(decoded!.predictions[0].probability.toString()).toBe('0.333333333')
      expect(decoded!.predictions[1].probability.toString()).toBe('0.666666667')
    })

    it('removes trailing zeros from decimals in URL', () => {
      const participants = [
        { id: 'p1', name: 'Alice', maxBet: new Decimal('100.0000'), touched: true },
        { id: 'p2', name: 'Bob', maxBet: new Decimal('50.5000'), touched: true },
      ]
      const outcomes = [{ id: 'o1', label: 'Yes', touched: true }]
      const predictions = [
        { participantId: 'p1', outcomeId: 'o1', probability: new Decimal('0.5000'), touched: true },
      ]

      const wager = makeWager({
        claim: 'Test',
        participants: participants,
        outcomes: outcomes,
        predictions: predictions,
      })

      const hash = encodeWagerToHash(wager)

      // Decimal.toString() removes trailing zeros
      expect(hash).toContain('pb=100%2C50.5')
      expect(hash).toContain('pp=0.5')
    })
  })
})
