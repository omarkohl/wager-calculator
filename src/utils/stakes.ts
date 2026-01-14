export interface StakeOption {
  id: string
  label: string
  symbol: string
  group: string
  name: string
  isDiscrete: boolean
  unitSingular?: string
  unitPlural?: string
}

export interface PayoutFormat {
  compact: string // "+2.70 🍪" or "+10.52 $"
  compactAmount: string // "+2.70" or "+10.52" (without symbol, for separate rendering)
  verbose: string // "+2.70 cookies" or "+10.52 $"
  settlement: string // "3 cookies" or "10.52 $" (no sign, for "A owes B X")
  symbol: string // "🍪" or "$" (for tooltip rendering)
  rawAmount: number
  roundedAmount: number
  wasRounded: boolean
}

export const NON_MONETARY_OPTIONS: StakeOption[] = [
  {
    id: 'cookies',
    label: 'Cookies',
    symbol: '🍪',
    group: 'Non-monetary',
    name: 'Cookies',
    isDiscrete: true,
    unitSingular: 'cookie',
    unitPlural: 'cookies',
  },
  {
    id: 'hugs',
    label: 'Hugs',
    symbol: '🤗',
    group: 'Non-monetary',
    name: 'Hugs',
    isDiscrete: true,
    unitSingular: 'hug',
    unitPlural: 'hugs',
  },
  {
    id: 'i-was-wrong',
    label: 'I was wrong',
    symbol: '🏳️',
    group: 'Non-monetary',
    name: 'Loser admits they were wrong',
    isDiscrete: true,
    unitSingular: "'I was wrong' admission",
    unitPlural: "'I was wrong' admissions",
  },
  {
    id: 'other',
    label: 'Other',
    symbol: '🃏',
    group: 'Non-monetary',
    name: 'Specify in details field',
    isDiscrete: false, // Don't round - could be any unit including unlisted currencies
    unitSingular: 'unit',
    unitPlural: 'units',
  },
]

export const CURRENCY_OPTIONS: StakeOption[] = [
  {
    id: 'aed',
    label: 'AED (د.إ)',
    symbol: 'د.إ',
    group: 'Currencies',
    name: 'UAE Dirham',
    isDiscrete: false,
  },
  {
    id: 'aud',
    label: 'AUD (A$)',
    symbol: 'A$',
    group: 'Currencies',
    name: 'Australian Dollar',
    isDiscrete: false,
  },
  {
    id: 'brl',
    label: 'BRL (R$)',
    symbol: 'R$',
    group: 'Currencies',
    name: 'Brazilian Real',
    isDiscrete: false,
  },
  {
    id: 'cad',
    label: 'CAD (C$)',
    symbol: 'C$',
    group: 'Currencies',
    name: 'Canadian Dollar',
    isDiscrete: false,
  },
  {
    id: 'chf',
    label: 'CHF (Fr)',
    symbol: 'Fr',
    group: 'Currencies',
    name: 'Swiss Franc',
    isDiscrete: false,
  },
  {
    id: 'clp',
    label: 'CLP (CLP$)',
    symbol: 'CLP$',
    group: 'Currencies',
    name: 'Chilean Peso',
    isDiscrete: false,
  },
  {
    id: 'cny',
    label: 'CNY (¥)',
    symbol: '¥',
    group: 'Currencies',
    name: 'Chinese Yuan',
    isDiscrete: false,
  },
  {
    id: 'czk',
    label: 'CZK (Kč)',
    symbol: 'Kč',
    group: 'Currencies',
    name: 'Czech Koruna',
    isDiscrete: false,
  },
  {
    id: 'dkk',
    label: 'DKK (kr)',
    symbol: 'kr',
    group: 'Currencies',
    name: 'Danish Krone',
    isDiscrete: false,
  },
  {
    id: 'eur',
    label: 'EUR (€)',
    symbol: '€',
    group: 'Currencies',
    name: 'Euro',
    isDiscrete: false,
  },
  {
    id: 'gbp',
    label: 'GBP (£)',
    symbol: '£',
    group: 'Currencies',
    name: 'British Pound',
    isDiscrete: false,
  },
  {
    id: 'hkd',
    label: 'HKD (HK$)',
    symbol: 'HK$',
    group: 'Currencies',
    name: 'Hong Kong Dollar',
    isDiscrete: false,
  },
  {
    id: 'huf',
    label: 'HUF (Ft)',
    symbol: 'Ft',
    group: 'Currencies',
    name: 'Hungarian Forint',
    isDiscrete: false,
  },
  {
    id: 'idr',
    label: 'IDR (Rp)',
    symbol: 'Rp',
    group: 'Currencies',
    name: 'Indonesian Rupiah',
    isDiscrete: false,
  },
  {
    id: 'ils',
    label: 'ILS (₪)',
    symbol: '₪',
    group: 'Currencies',
    name: 'Israeli Shekel',
    isDiscrete: false,
  },
  {
    id: 'inr',
    label: 'INR (₹)',
    symbol: '₹',
    group: 'Currencies',
    name: 'Indian Rupee',
    isDiscrete: false,
  },
  {
    id: 'jpy',
    label: 'JPY (¥)',
    symbol: '¥',
    group: 'Currencies',
    name: 'Japanese Yen',
    isDiscrete: false,
  },
  {
    id: 'krw',
    label: 'KRW (₩)',
    symbol: '₩',
    group: 'Currencies',
    name: 'South Korean Won',
    isDiscrete: false,
  },
  {
    id: 'mxn',
    label: 'MXN (MX$)',
    symbol: 'MX$',
    group: 'Currencies',
    name: 'Mexican Peso',
    isDiscrete: false,
  },
  {
    id: 'nok',
    label: 'NOK (kr)',
    symbol: 'kr',
    group: 'Currencies',
    name: 'Norwegian Krone',
    isDiscrete: false,
  },
  {
    id: 'nzd',
    label: 'NZD (NZ$)',
    symbol: 'NZ$',
    group: 'Currencies',
    name: 'New Zealand Dollar',
    isDiscrete: false,
  },
  {
    id: 'pln',
    label: 'PLN (zł)',
    symbol: 'zł',
    group: 'Currencies',
    name: 'Polish Zloty',
    isDiscrete: false,
  },
  {
    id: 'sar',
    label: 'SAR (﷼)',
    symbol: '﷼',
    group: 'Currencies',
    name: 'Saudi Riyal',
    isDiscrete: false,
  },
  {
    id: 'sek',
    label: 'SEK (kr)',
    symbol: 'kr',
    group: 'Currencies',
    name: 'Swedish Krona',
    isDiscrete: false,
  },
  {
    id: 'sgd',
    label: 'SGD (S$)',
    symbol: 'S$',
    group: 'Currencies',
    name: 'Singapore Dollar',
    isDiscrete: false,
  },
  {
    id: 'thb',
    label: 'THB (฿)',
    symbol: '฿',
    group: 'Currencies',
    name: 'Thai Baht',
    isDiscrete: false,
  },
  {
    id: 'try',
    label: 'TRY (₺)',
    symbol: '₺',
    group: 'Currencies',
    name: 'Turkish Lira',
    isDiscrete: false,
  },
  {
    id: 'twd',
    label: 'TWD (NT$)',
    symbol: 'NT$',
    group: 'Currencies',
    name: 'Taiwan Dollar',
    isDiscrete: false,
  },
  {
    id: 'usd',
    label: 'USD ($)',
    symbol: '$',
    group: 'Currencies',
    name: 'US Dollar',
    isDiscrete: false,
  },
  {
    id: 'zar',
    label: 'ZAR (R)',
    symbol: 'R',
    group: 'Currencies',
    name: 'South African Rand',
    isDiscrete: false,
  },
]

export const ALL_OPTIONS = [...NON_MONETARY_OPTIONS, ...CURRENCY_OPTIONS]

export function getStakeOption(stakesId: string): StakeOption | undefined {
  return ALL_OPTIONS.find(opt => opt.id === stakesId)
}

export function getStakesSymbol(stakesId: string): string {
  const option = getStakeOption(stakesId)
  return option?.symbol || stakesId
}

export function isDiscreteStake(stakesId: string): boolean {
  const option = getStakeOption(stakesId)
  return option?.isDiscrete ?? false
}

export function getStakeName(stakesId: string): string {
  const option = getStakeOption(stakesId)
  return option?.name || stakesId
}

export function formatPayout(amount: number, stakesId: string): PayoutFormat {
  const option = getStakeOption(stakesId)
  const isDiscrete = option?.isDiscrete ?? false

  // For settlements: round discrete stakes to integers with minimum 1
  let roundedAmount: number
  let wasRounded = false

  if (isDiscrete) {
    const rounded = Math.round(amount)
    if (amount > 0 && rounded === 0) {
      roundedAmount = 1
    } else if (amount < 0 && rounded === 0) {
      roundedAmount = -1
    } else {
      roundedAmount = rounded
    }
    wasRounded = roundedAmount !== amount
  } else {
    roundedAmount = Math.round(amount * 100) / 100
    wasRounded = false
  }

  const absRaw = Math.abs(amount)
  const absRounded = Math.abs(roundedAmount)
  const signRaw = amount > 0 ? '+' : amount < 0 ? '-' : ''

  let compact: string
  let compactAmount: string
  let verbose: string
  let settlement: string
  let symbol: string

  if (isDiscrete) {
    symbol = option?.symbol || stakesId
    const rawFormatted = absRaw.toFixed(2)
    const unitRounded = absRounded === 1 ? option?.unitSingular : option?.unitPlural
    const unitDisplay = unitRounded || stakesId

    // Compact amount without symbol (for separate rendering with tooltip)
    compactAmount = amount === 0 ? '0' : `${signRaw}${rawFormatted}`

    // Compact shows raw amount (for net payouts - precise calculation)
    compact = amount === 0 ? `0 ${symbol}` : `${signRaw}${rawFormatted} ${symbol}`

    // Verbose shows raw amount with unit name
    verbose = amount === 0 ? `0 ${unitDisplay}` : `${signRaw}${rawFormatted} ${unitDisplay}`

    // Settlement shows rounded amount (what people actually exchange)
    const roundingNote = wasRounded ? ` (from ${rawFormatted})` : ''
    settlement = `${absRounded} ${unitDisplay}${roundingNote}`
  } else {
    symbol = option?.symbol || ''
    const formatted = absRaw.toFixed(2)

    // Compact amount without symbol (for separate rendering with tooltip)
    compactAmount = amount === 0 ? '0.00' : `${signRaw}${formatted}`

    // Always place symbol after amount for consistency
    compact = amount === 0 ? `0.00 ${symbol}` : `${signRaw}${formatted} ${symbol}`
    verbose = compact
    settlement = `${formatted} ${symbol}`
  }

  return {
    compact,
    compactAmount,
    verbose,
    settlement,
    symbol,
    rawAmount: amount,
    roundedAmount,
    wasRounded,
  }
}
