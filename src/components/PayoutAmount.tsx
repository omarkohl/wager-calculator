import { formatPayout, getStakeName } from '../domain/stakes'

interface PayoutAmountProps {
  amount: number
  stakes: string
  /** Colour gains green and losses red */
  signed?: boolean
}

/**
 * A payout with its stakes symbol, the symbol carrying the full stakes name
 * as a tooltip
 */
export default function PayoutAmount({ amount, stakes, signed = false }: PayoutAmountProps) {
  const formatted = formatPayout(amount, stakes)
  const colour = !signed
    ? ''
    : formatted.roundedAmount > 0
      ? 'font-medium text-green-600'
      : formatted.roundedAmount < 0
        ? 'font-medium text-red-600'
        : ''

  return (
    <span className={`tabular-nums ${colour}`}>
      {formatted.compactAmount} <span title={getStakeName(stakes)}>{formatted.symbol}</span>
    </span>
  )
}
