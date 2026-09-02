import Decimal from 'decimal.js'
import type { Wager } from '../types/wager'

export const DEFAULT_PARTICIPANT_NAMES = [
  'Artem',
  'Baani',
  'Chau',
  'Devi',
  'Elena',
  'Fatima',
  'Giovanni',
  'Hassan',
]

export const DEFAULT_OUTCOME_LABELS = [
  'Yes',
  'No',
  'Sunny',
  'Rainy',
  'Cloudy',
  'Windy',
  'Snowy',
  'Foggy',
]

export const DEFAULT_STAKES = 'usd'

/**
 * A blank wager: two placeholder participants, a Yes/No outcome pair and no
 * predictions yet (they are filled in once participants and outcomes exist).
 */
export function createDefaultWager(): Wager {
  return {
    claim: '',
    details: '',
    stakes: DEFAULT_STAKES,
    participants: DEFAULT_PARTICIPANT_NAMES.slice(0, 2).map(name => ({
      id: crypto.randomUUID(),
      name,
      maxBet: new Decimal(0),
      touched: false,
    })),
    outcomes: DEFAULT_OUTCOME_LABELS.slice(0, 2).map(label => ({
      id: crypto.randomUUID(),
      label,
      touched: false,
    })),
    predictions: [],
    resolvedOutcomeId: null,
  }
}
