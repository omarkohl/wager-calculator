import { type Band, formatPercent } from './logOdds'

/**
 * A band as the user reads it: "45–62%", "about 50%" for a band with no width,
 * "above 52%" or "below 20%" when only one side is bounded.
 */
export function describeBand(band: Band): string {
  const { lo, hi } = band
  if (lo && hi) {
    const low = formatPercent(lo)
    const high = formatPercent(hi)
    return low === high ? `about ${high}` : `${low.replace('%', '')}–${high}`
  }
  if (lo) return `above ${formatPercent(lo)}`
  if (hi) return `below ${formatPercent(hi)}`
  return 'no range yet'
}
