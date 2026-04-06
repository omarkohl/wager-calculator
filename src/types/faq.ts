export const FAQ_IDS = [
  'why-this-app',
  'why-bet',
  'not-gambling',
  'no-money',
  'brier-scoring',
  'same-predictions',
  'different-max-bets',
  'sum-100',
  'settlements',
  'multiple-outcomes',
  'continuous-values',
  'true-belief',
  'different-payouts',
  'same-ev-different-beliefs',
  'probability-meaning',
  'data-storage',
  'sharing',
  'calculation',
] as const

export type FaqId = (typeof FAQ_IDS)[number]
