import { RUN_STALE_AFTER_DAYS } from '../domain/elicitation/constants'
import { CONTINUOUS_STORAGE_KEY } from './continuousRun'
import { RUN_STORAGE_KEY } from './elicitation'
import { MULTI_STORAGE_KEY } from './multiRun'

/**
 * How old the stored run is. Every save stamps the run with `savedAt` (milliseconds); runs
 * stored before that have none, and are never called stale.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export type RunKind = 'yes-no' | 'categorical' | 'continuous'

const KEYS: Record<RunKind, string> = {
  'yes-no': RUN_STORAGE_KEY,
  categorical: MULTI_STORAGE_KEY,
  continuous: CONTINUOUS_STORAGE_KEY,
}

/** When the stored run of this kind was last saved, or null if there is none or it has no stamp. */
export function storedRunSavedAt(kind: RunKind): number | null {
  try {
    const text = sessionStorage.getItem(KEYS[kind])
    if (!text) return null
    const savedAt = (JSON.parse(text) as { savedAt?: unknown } | null)?.savedAt
    return typeof savedAt === 'number' && Number.isFinite(savedAt) ? savedAt : null
  } catch {
    return null
  }
}

/** Whether a run saved at `savedAt` is older than the threshold at `now`. A missing stamp is not stale. */
export function isStale(
  savedAt: number | null,
  now: number = Date.now(),
  days: number = RUN_STALE_AFTER_DAYS
): boolean {
  return savedAt !== null && now - savedAt > days * DAY_MS
}
