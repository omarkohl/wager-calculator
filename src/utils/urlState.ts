import { decompressFromEncodedURIComponent } from 'lz-string'
import Decimal from 'decimal.js'
import type { Wager } from '../types/wager'
import { DEFAULT_OUTCOME_LABELS, DEFAULT_PARTICIPANT_NAMES, DEFAULT_STAKES } from './defaults'
import { autoDistribute } from './predictions'

/**
 * URL hash formats, newest first:
 *
 * - v2: plain `URLSearchParams` (`#v=2&c=...`). Participants, outcomes and
 *   predictions are positional CSV lists; ids are regenerated on decode.
 * - v1: lz-string compressed JSON. Only decoded, never produced any more.
 */
const URL_FORMAT_VERSION = 2

/**
 * Shape of the JSON inside a v1 hash. Decimals were stored as strings.
 */
interface JSONWagerV1 {
  v?: number
  claim: string
  details: string
  stakes: string
  participants: Array<{ id: string; name: string; maxBet: string; touched?: boolean }>
  outcomes: Array<{ id: string; label: string; touched?: boolean }>
  predictions: Array<{
    participantId: string
    outcomeId: string
    probability: string
    touched: boolean
  }>
  resolvedOutcomeId: string | null
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
 * Encode a wager as a URL hash (v2 format). Untouched fields are left empty
 * so that defaults are re-applied on decode.
 */
export function encodeWagerToHash(wager: Wager): string {
  const params = new URLSearchParams()

  params.set('v', String(URL_FORMAT_VERSION))
  if (wager.claim) params.set('c', wager.claim)
  if (wager.details) params.set('d', wager.details)
  if (wager.stakes) params.set('s', wager.stakes)

  // Participant names and max bets (CSV with escaping)
  if (wager.participants.length > 0) {
    params.set('pn', wager.participants.map(p => escapeCSV(p.touched ? p.name : '')).join(','))
    params.set('pb', wager.participants.map(p => (p.touched ? p.maxBet.toString() : '')).join(','))
  }

  // Outcome labels (CSV with escaping)
  if (wager.outcomes.length > 0) {
    params.set('ol', wager.outcomes.map(o => escapeCSV(o.touched ? o.label : '')).join(','))
  }

  // Predictions (row-major order: p0o0, p0o1, ..., p1o0, p1o1, ...)
  if (wager.predictions.length > 0) {
    const cells = new Array<string>(wager.participants.length * wager.outcomes.length).fill('')
    wager.predictions.forEach(prediction => {
      const participantIndex = wager.participants.findIndex(p => p.id === prediction.participantId)
      const outcomeIndex = wager.outcomes.findIndex(o => o.id === prediction.outcomeId)
      cells[participantIndex * wager.outcomes.length + outcomeIndex] = prediction.touched
        ? prediction.probability.toString()
        : ''
    })
    params.set('pp', cells.join(','))
  }

  // Resolved outcome (index)
  if (wager.resolvedOutcomeId !== null) {
    const index = wager.outcomes.findIndex(o => o.id === wager.resolvedOutcomeId)
    if (index >= 0) {
      params.set('r', index.toString())
    }
  }

  return `#${params.toString()}`
}

function decodeV2(hash: string): Wager | null {
  try {
    const params = new URLSearchParams(hash.substring(1))

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
    let predictions: Wager['predictions'] = []

    for (let pIndex = 0; pIndex < participants.length; pIndex++) {
      for (let oIndex = 0; oIndex < outcomes.length; oIndex++) {
        const probStr = predictionProbsRaw[pIndex * outcomes.length + oIndex] || ''
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
      claim: params.get('c') || '',
      details: params.get('d') || '',
      stakes: params.get('s') || DEFAULT_STAKES,
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

function decodeV1(hash: string): Wager | null {
  try {
    const json = decompressFromEncodedURIComponent(hash.substring(1))
    if (!json) {
      return null
    }

    const parsed = JSON.parse(json) as JSONWagerV1

    return {
      claim: parsed.claim,
      details: parsed.details,
      stakes: parsed.stakes,
      participants: parsed.participants.map(p => ({
        id: p.id,
        name: p.name,
        maxBet: new Decimal(p.maxBet),
        touched: p.touched,
      })),
      outcomes: parsed.outcomes.map(o => ({
        id: o.id,
        label: o.label,
        touched: o.touched,
      })),
      predictions: parsed.predictions.map(p => ({
        participantId: p.participantId,
        outcomeId: p.outcomeId,
        probability: new Decimal(p.probability),
        touched: p.touched,
      })),
      resolvedOutcomeId: parsed.resolvedOutcomeId,
    }
  } catch (error) {
    console.error('Failed to decode v1 state from URL:', error)
    return null
  }
}

/**
 * Decode a wager from a URL hash of any supported format.
 * Returns null when the hash is empty or unreadable.
 */
export function decodeWagerFromHash(hash: string): Wager | null {
  if (!hash || hash.length <= 1) {
    return null
  }
  return hash.startsWith('#v=2') ? decodeV2(hash) : decodeV1(hash)
}

/**
 * Absolute URL of the current page with the wager encoded in the hash
 */
export function getShareableURL(wager: Wager): string {
  return window.location.origin + window.location.pathname + encodeWagerToHash(wager)
}

/**
 * Extract the faq parameter from the URL hash (if present)
 * Returns null if not present or invalid
 */
export function getFaqIdFromURL(hash: string): string | null {
  if (!hash || hash.length <= 1) {
    return null
  }

  try {
    const params = new URLSearchParams(hash.substring(1))
    return params.get('faq')
  } catch {
    return null
  }
}

/**
 * Remove the faq parameter from the URL hash
 * Returns the cleaned hash
 */
export function removeFaqFromURL(hash: string): string {
  if (!hash || hash.length <= 1) {
    return hash
  }

  try {
    const params = new URLSearchParams(hash.substring(1))
    params.delete('faq')
    const newParams = params.toString()
    return newParams ? `#${newParams}` : ''
  } catch {
    return hash
  }
}
