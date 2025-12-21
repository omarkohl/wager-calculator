export const CURRENCY_OPTIONS = [
  { id: 'usd', label: 'USD ($)', symbol: '$', group: 'Currencies' },
  { id: 'eur', label: 'EUR (€)', symbol: '€', group: 'Currencies' },
  { id: 'gbp', label: 'GBP (£)', symbol: '£', group: 'Currencies' },
  { id: 'cad', label: 'CAD ($)', symbol: '$', group: 'Currencies' },
  { id: 'aud', label: 'AUD ($)', symbol: '$', group: 'Currencies' },
  { id: 'jpy', label: 'JPY (¥)', symbol: '¥', group: 'Currencies' },
  { id: 'chf', label: 'CHF (Fr)', symbol: 'Fr', group: 'Currencies' },
  { id: 'cny', label: 'CNY (¥)', symbol: '¥', group: 'Currencies' },
]

export const FUN_OPTIONS = [
  { id: 'cookies', label: 'Cookies', symbol: 'cookies', group: 'Fun' },
  { id: 'hugs', label: 'Hugs', symbol: 'hugs', group: 'Fun' },
  { id: 'i-was-wrong', label: 'I was wrong', symbol: 'i-was-wrong', group: 'Fun' },
]

export const OTHER_OPTION = { id: 'other', label: 'Other', symbol: 'other', group: 'Other' }

export const ALL_OPTIONS = [...CURRENCY_OPTIONS, ...FUN_OPTIONS, OTHER_OPTION]

export function getStakesSymbol(stakesId: string): string {
  const option = ALL_OPTIONS.find(opt => opt.id === stakesId)
  return option?.symbol || stakesId
}
