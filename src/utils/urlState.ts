import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import Decimal from 'decimal.js'
import type { Participant, Outcome, Prediction } from '../types/wager'

/**
 * Serializable state that can be encoded in URL
 */
export interface WagerState {
  claim: string
  details: string
  stakes: string
  participants: Array<{
    id: string
    name: string
    maxBet: string // Decimal as string
    touched?: boolean
  }>
  outcomes: Array<{
    id: string
    label: string
    touched?: boolean
  }>
  predictions: Array<{
    participantId: string
    outcomeId: string
    probability: string // Decimal as string
    touched: boolean
  }>
  resolvedOutcomeId: string | null
}

/**
 * Default initial state
 */
export function getDefaultState(): WagerState {
  return {
    claim: '',
    details: '',
    stakes: 'usd',
    participants: [
      { id: crypto.randomUUID(), name: 'Artem', maxBet: '50', touched: false },
      { id: crypto.randomUUID(), name: 'Baani', maxBet: '50', touched: false },
    ],
    outcomes: [
      { id: crypto.randomUUID(), label: 'Yes', touched: false },
      { id: crypto.randomUUID(), label: 'No', touched: false },
    ],
    predictions: [],
    resolvedOutcomeId: null,
  }
}

/**
 * Convert runtime state to serializable format
 */
export function serializeState(
  claim: string,
  details: string,
  stakes: string,
  participants: Participant[],
  outcomes: Outcome[],
  predictions: Prediction[],
  resolvedOutcomeId: string | null
): WagerState {
  return {
    claim,
    details,
    stakes,
    participants: participants.map(p => ({
      id: p.id,
      name: p.name,
      maxBet: p.maxBet.toString(),
      touched: p.touched,
    })),
    outcomes: outcomes.map(o => ({
      id: o.id,
      label: o.label,
      touched: o.touched,
    })),
    predictions: predictions.map(p => ({
      participantId: p.participantId,
      outcomeId: p.outcomeId,
      probability: p.probability.toString(),
      touched: p.touched,
    })),
    resolvedOutcomeId,
  }
}

/**
 * Convert serializable format back to runtime state
 */
export function deserializeState(state: WagerState): {
  claim: string
  details: string
  stakes: string
  participants: Participant[]
  outcomes: Outcome[]
  predictions: Prediction[]
  resolvedOutcomeId: string | null
} {
  return {
    claim: state.claim,
    details: state.details,
    stakes: state.stakes,
    participants: state.participants.map(p => ({
      id: p.id,
      name: p.name,
      maxBet: new Decimal(p.maxBet),
      touched: p.touched,
    })),
    outcomes: state.outcomes.map(o => ({
      id: o.id,
      label: o.label,
      touched: o.touched,
    })),
    predictions: state.predictions.map(p => ({
      participantId: p.participantId,
      outcomeId: p.outcomeId,
      probability: new Decimal(p.probability),
      touched: p.touched,
    })),
    resolvedOutcomeId: state.resolvedOutcomeId,
  }
}

/**
 * Encode state to URL hash
 */
export function encodeStateToURL(state: WagerState): string {
  const json = JSON.stringify(state)
  const compressed = compressToEncodedURIComponent(json)
  return `#${compressed}`
}

/**
 * Decode state from URL hash
 */
export function decodeStateFromURL(hash: string): WagerState | null {
  try {
    if (!hash || hash.length <= 1) {
      return null
    }

    // Remove leading '#'
    const compressed = hash.substring(1)
    const json = decompressFromEncodedURIComponent(compressed)

    if (!json) {
      return null
    }

    const state = JSON.parse(json) as WagerState
    return state
  } catch (error) {
    console.error('Failed to decode state from URL:', error)
    return null
  }
}

/**
 * Get current URL with encoded state
 */
export function getShareableURL(state: WagerState): string {
  const baseURL = window.location.origin + window.location.pathname
  const hash = encodeStateToURL(state)
  return baseURL + hash
}
