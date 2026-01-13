export const NON_MONETARY_OPTIONS = [
  { id: 'cookies', label: 'Cookies', symbol: 'cookies', group: 'Non-monetary', name: 'Cookies' },
  { id: 'hugs', label: 'Hugs', symbol: 'hugs', group: 'Non-monetary', name: 'Hugs' },
  {
    id: 'i-was-wrong',
    label: 'I was wrong',
    symbol: 'i-was-wrong',
    group: 'Non-monetary',
    name: 'Loser admits they were wrong',
  },
  {
    id: 'other',
    label: 'Other',
    symbol: 'other',
    group: 'Non-monetary',
    name: 'Specify in details field',
  },
]

export const CURRENCY_OPTIONS = [
  { id: 'aed', label: 'AED (د.إ)', symbol: 'د.إ', group: 'Currencies', name: 'UAE Dirham' },
  { id: 'aud', label: 'AUD (A$)', symbol: 'A$', group: 'Currencies', name: 'Australian Dollar' },
  { id: 'brl', label: 'BRL (R$)', symbol: 'R$', group: 'Currencies', name: 'Brazilian Real' },
  { id: 'cad', label: 'CAD (C$)', symbol: 'C$', group: 'Currencies', name: 'Canadian Dollar' },
  { id: 'chf', label: 'CHF (Fr)', symbol: 'Fr', group: 'Currencies', name: 'Swiss Franc' },
  { id: 'clp', label: 'CLP (CLP$)', symbol: 'CLP$', group: 'Currencies', name: 'Chilean Peso' },
  { id: 'cny', label: 'CNY (¥)', symbol: '¥', group: 'Currencies', name: 'Chinese Yuan' },
  { id: 'czk', label: 'CZK (Kč)', symbol: 'Kč', group: 'Currencies', name: 'Czech Koruna' },
  { id: 'dkk', label: 'DKK (kr)', symbol: 'kr', group: 'Currencies', name: 'Danish Krone' },
  { id: 'eur', label: 'EUR (€)', symbol: '€', group: 'Currencies', name: 'Euro' },
  { id: 'gbp', label: 'GBP (£)', symbol: '£', group: 'Currencies', name: 'British Pound' },
  { id: 'hkd', label: 'HKD (HK$)', symbol: 'HK$', group: 'Currencies', name: 'Hong Kong Dollar' },
  { id: 'huf', label: 'HUF (Ft)', symbol: 'Ft', group: 'Currencies', name: 'Hungarian Forint' },
  { id: 'idr', label: 'IDR (Rp)', symbol: 'Rp', group: 'Currencies', name: 'Indonesian Rupiah' },
  { id: 'ils', label: 'ILS (₪)', symbol: '₪', group: 'Currencies', name: 'Israeli Shekel' },
  { id: 'inr', label: 'INR (₹)', symbol: '₹', group: 'Currencies', name: 'Indian Rupee' },
  { id: 'jpy', label: 'JPY (¥)', symbol: '¥', group: 'Currencies', name: 'Japanese Yen' },
  { id: 'krw', label: 'KRW (₩)', symbol: '₩', group: 'Currencies', name: 'South Korean Won' },
  { id: 'mxn', label: 'MXN (MX$)', symbol: 'MX$', group: 'Currencies', name: 'Mexican Peso' },
  { id: 'nok', label: 'NOK (kr)', symbol: 'kr', group: 'Currencies', name: 'Norwegian Krone' },
  { id: 'nzd', label: 'NZD (NZ$)', symbol: 'NZ$', group: 'Currencies', name: 'New Zealand Dollar' },
  { id: 'pln', label: 'PLN (zł)', symbol: 'zł', group: 'Currencies', name: 'Polish Zloty' },
  { id: 'sar', label: 'SAR (﷼)', symbol: '﷼', group: 'Currencies', name: 'Saudi Riyal' },
  { id: 'sek', label: 'SEK (kr)', symbol: 'kr', group: 'Currencies', name: 'Swedish Krona' },
  { id: 'sgd', label: 'SGD (S$)', symbol: 'S$', group: 'Currencies', name: 'Singapore Dollar' },
  { id: 'thb', label: 'THB (฿)', symbol: '฿', group: 'Currencies', name: 'Thai Baht' },
  { id: 'try', label: 'TRY (₺)', symbol: '₺', group: 'Currencies', name: 'Turkish Lira' },
  { id: 'twd', label: 'TWD (NT$)', symbol: 'NT$', group: 'Currencies', name: 'Taiwan Dollar' },
  { id: 'usd', label: 'USD ($)', symbol: '$', group: 'Currencies', name: 'US Dollar' },
  { id: 'zar', label: 'ZAR (R)', symbol: 'R', group: 'Currencies', name: 'South African Rand' },
]

export const ALL_OPTIONS = [...NON_MONETARY_OPTIONS, ...CURRENCY_OPTIONS]

export function getStakesSymbol(stakesId: string): string {
  const option = ALL_OPTIONS.find(opt => opt.id === stakesId)
  return option?.symbol || stakesId
}
