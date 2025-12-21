/**
 * Utility function to scale probabilities to sum to 1.0
 * @param probabilities Array of probabilities that may not sum to 1
 * @returns Scaled probabilities that sum to 1.0
 */
export function scaleProbabilities(probabilities: number[]): number[] {
  const sum = probabilities.reduce((acc, prob) => acc + prob, 0)
  if (sum === 0) {
    throw new Error('Cannot scale probabilities that sum to zero')
  }
  return probabilities.map(prob => prob / sum)
}

/**
 * Utility function to scale probabilities to sum to 100%
 * @param probabilities Array of probabilities as percentages
 * @returns Scaled probabilities that sum to 100%
 */
export function scaleProbabilitiesPercent(probabilities: number[]): number[] {
  const sum = probabilities.reduce((acc, prob) => acc + prob, 0)
  if (sum === 0) {
    throw new Error('Cannot scale probabilities that sum to zero')
  }
  return probabilities.map(prob => (prob / sum) * 100)
}

/**
 * Check if probabilities are extreme (close to 0 or 100%)
 * @param probabilities Array of probabilities as percentages (0-100)
 * @param threshold Threshold for extreme values (default 5%)
 * @returns Array of warnings for extreme probabilities
 */
export function checkExtremePayouts(probabilities: number[], threshold: number = 5): string[] {
  const warnings: string[] = []

  probabilities.forEach((prob, index) => {
    if (prob < threshold) {
      warnings.push(
        `Category ${index + 1} has very low probability (${prob}%) - this may result in large payouts`
      )
    }
    if (prob > 100 - threshold) {
      warnings.push(
        `Category ${index + 1} has very high probability (${prob}%) - this may result in large payouts`
      )
    }
  })

  return warnings
}
