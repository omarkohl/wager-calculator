import { decompressFromEncodedURIComponent } from 'lz-string'
import Decimal from 'decimal.js'
import type { Participant, Outcome, Prediction } from '../types/wager'
import { DEFAULT_OUTCOME_LABELS, DEFAULT_PARTICIPANT_NAMES } from './defaults'
import { autoDistribute } from './autoDistribute'

/**
 * Current state version for backwards compatibility
 */
export const STATE_VERSION = 2

/**
 * JSON-serializable state for v1 URL format (compressed JSON)
 */
interface JSONWagerState {
  v?: number
  claim: string
  details: string
  stakes: string
  participants: Array<{
    id: string
    name: string
    maxBet: string
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
    probability: string
    touched: boolean
  }>
  resolvedOutcomeId: string | null
}

/**
 * Internal state representation using Decimal for precision
 */
export interface WagerState {
  v: number
  claim: string
  details: string
  stakes: string
  participants: Array<{
    id: string
    name: string
    maxBet: Decimal
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
    probability: Decimal
    touched: boolean
  }>
  resolvedOutcomeId: string | null
}

/**
 * Default initial state
 */
export function getDefaultState(): WagerState {
  return {
    v: STATE_VERSION,
    claim: '',
    details: '',
    stakes: 'usd',
    participants: [
      {
        id: crypto.randomUUID(),
        name: DEFAULT_PARTICIPANT_NAMES[0],
        maxBet: new Decimal(0),
        touched: false,
      },
      {
        id: crypto.randomUUID(),
        name: DEFAULT_PARTICIPANT_NAMES[1],
        maxBet: new Decimal(0),
        touched: false,
      },
    ],
    outcomes: [
      { id: crypto.randomUUID(), label: DEFAULT_OUTCOME_LABELS[0], touched: false },
      { id: crypto.randomUUID(), label: DEFAULT_OUTCOME_LABELS[1], touched: false },
    ],
    predictions: [],
    resolvedOutcomeId: null,
  }
}

/**
 * Convert runtime state to WagerState format
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
    v: STATE_VERSION,
    claim,
    details,
    stakes,
    participants: participants.map(p => ({
      id: p.id,
      name: p.name,
      maxBet: p.maxBet,
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
      probability: p.probability,
      touched: p.touched,
    })),
    resolvedOutcomeId,
  }
}

/**
 * Convert WagerState to runtime state (now a simple passthrough since types match)
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
      maxBet: p.maxBet,
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
      probability: p.probability,
      touched: p.touched,
    })),
    resolvedOutcomeId: state.resolvedOutcomeId,
  }
}

/**
 * Escape a string for CSV encoding (replaces comma with \c)
 */
function escapeCSV(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/,/g, '\\c')
}

/**
 * Unescape a CSV-encoded string (replaces \c with comma)
 */
function unescapeCSV(str: string): string {
  return str.replace(/\\c/g, ',').replace(/\\\\/g, '\\')
}

/**
 * Encode state to URL hash using v2 plain text format
 */
function encodeStateToURLV2(state: WagerState): string {
  const params = new URLSearchParams()

  params.set('v', '2')
  if (state.claim) params.set('c', state.claim)
  if (state.details) params.set('d', state.details)
  if (state.stakes) params.set('s', state.stakes)

  // Participant names (CSV with escaping)
  if (state.participants.length > 0) {
    params.set('pn', state.participants.map(p => escapeCSV(p.touched ? p.name : '')).join(','))
    params.set('pb', state.participants.map(p => (p.touched ? p.maxBet.toString() : '')).join(','))
  }

  // Outcome labels (CSV with escaping)
  if (state.outcomes.length > 0) {
    params.set('ol', state.outcomes.map(o => escapeCSV(o.touched ? o.label : '')).join(','))
  }

  // Predictions (row-major order: p0o0, p0o1, ..., p1o0, p1o1, ...)
  if (state.predictions.length > 0) {
    const participantOutcomeArray = new Array<string>(
      state.participants.length * state.outcomes.length
    ).fill('')
    state.predictions.forEach(prediction => {
      const participantIndex = state.participants.findIndex(
        participant => participant.id === prediction.participantId
      )
      const outcomeIndex = state.outcomes.findIndex(outcome => outcome.id === prediction.outcomeId)
      participantOutcomeArray[participantIndex * state.outcomes.length + outcomeIndex] =
        prediction.touched ? prediction.probability.toString() : ''
    })
    params.set('pp', participantOutcomeArray.join(','))
  }

  // Resolved outcome (index)
  if (state.resolvedOutcomeId !== null) {
    const index = state.outcomes.findIndex(o => o.id === state.resolvedOutcomeId)
    if (index >= 0) {
      params.set('r', index.toString())
    }
  }

  return `#${params.toString()}`
}

/**
 * Encode state to URL hash (uses v2 plain text format)
 */
export function encodeStateToURL(state: WagerState): string {
  return encodeStateToURLV2(state)
}

/**
 * Decode state from URL hash using v2 plain text format
 */
function decodeStateFromURLV2(hash: string): WagerState | null {
  try {
    // Remove leading '#'
    const paramString = hash.substring(1)
    const params = new URLSearchParams(paramString)

    // Parse participants (with CSV unescaping)
    const participantNames = params.get('pn')?.split(',').map(unescapeCSV) || []
    const participantBetsRaw = params.get('pb')?.split(',') || []

    const participants = participantNames.map((name, index) => {
      const betStr = participantBetsRaw[index] || ''
      const nameIsEmpty = name === ''
      const betIsEmpty = betStr === ''
      return {
        id: crypto.randomUUID(),
        name: nameIsEmpty ? DEFAULT_PARTICIPANT_NAMES[index] || '' : name,
        maxBet: betIsEmpty ? new Decimal(0) : new Decimal(betStr),
        touched: !nameIsEmpty || !betIsEmpty,
      }
    })

    // Parse outcomes (with CSV unescaping)
    const outcomeLabels = params.get('ol')?.split(',').map(unescapeCSV) || []
    const outcomes = outcomeLabels.map((label, index) => ({
      id: crypto.randomUUID(),
      label: label === '' ? DEFAULT_OUTCOME_LABELS[index] || '' : label,
      touched: label !== '',
    }))

    // Parse predictions (row-major order)
    const predictionProbsRaw = params.get('pp')?.split(',') || []
    let predictions: WagerState['predictions'] = []

    for (let pIndex = 0; pIndex < participants.length; pIndex++) {
      for (let oIndex = 0; oIndex < outcomes.length; oIndex++) {
        const probIndex = pIndex * outcomes.length + oIndex
        const probStr = predictionProbsRaw[probIndex] || ''
        const isTouched = probStr !== ''
        predictions.push({
          participantId: participants[pIndex].id,
          outcomeId: outcomes[oIndex].id,
          probability: isTouched ? new Decimal(probStr) : new Decimal(0),
          touched: isTouched,
        })
      }
    }

    // Auto-distribute untouched predictions for each participant
    for (const participant of participants) {
      predictions = autoDistribute(predictions, participant.id)
    }

    // Parse resolved outcome
    const resolvedIndex = params.get('r')
    let resolvedOutcomeId: string | null = null
    if (resolvedIndex !== null && resolvedIndex !== '') {
      const index = parseInt(resolvedIndex, 10)
      if (index >= 0 && index < outcomes.length) {
        resolvedOutcomeId = outcomes[index].id
      }
    }

    return {
      v: 2,
      claim: params.get('c') || '',
      details: params.get('d') || '',
      stakes: params.get('s') || 'usd',
      participants,
      outcomes,
      predictions,
      resolvedOutcomeId,
    }
  } catch (error) {
    console.error('Failed to decode v2 state from URL:', error)
    return null
  }
}

/**
 * Decode state from URL hash using v1 compressed format
 */
function decodeStateFromURLV1(hash: string): WagerState | null {
  try {
    // Remove leading '#'
    const compressed = hash.substring(1)
    const json = decompressFromEncodedURIComponent(compressed)

    if (!json) {
      return null
    }

    const jsonState = JSON.parse(json) as JSONWagerState

    // Convert JSONWagerState (strings) to WagerState (Decimals)
    return {
      v: jsonState.v ?? 1,
      claim: jsonState.claim,
      details: jsonState.details,
      stakes: jsonState.stakes,
      participants: jsonState.participants.map(p => ({
        id: p.id,
        name: p.name,
        maxBet: new Decimal(p.maxBet),
        touched: p.touched,
      })),
      outcomes: jsonState.outcomes.map(o => ({
        id: o.id,
        label: o.label,
        touched: o.touched,
      })),
      predictions: jsonState.predictions.map(p => ({
        participantId: p.participantId,
        outcomeId: p.outcomeId,
        probability: new Decimal(p.probability),
        touched: p.touched,
      })),
      resolvedOutcomeId: jsonState.resolvedOutcomeId,
    }
  } catch (error) {
    console.error('Failed to decode v1 state from URL:', error)
    return null
  }
}

/**
 * Decode state from URL hash (handles both v1 and v2)
 */
export function decodeStateFromURL(hash: string): WagerState | null {
  try {
    if (!hash || hash.length <= 1) {
      return null
    }

    // Check if it's v2 format (starts with #v=2)
    if (hash.startsWith('#v=2')) {
      return decodeStateFromURLV2(hash)
    }

    // Otherwise try v1 (compressed JSON)
    return decodeStateFromURLV1(hash)
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
