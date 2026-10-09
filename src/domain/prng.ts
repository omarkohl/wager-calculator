/**
 * Create a seeded pseudo-random number generator.
 * Simple LCG implementation for deterministic randomness. Its output is part of
 * the wager's rounding tiebreaks and of the elicitation's question sequence, so
 * it must not change.
 *
 * @param seed String seed
 * @returns Function that returns random number in [0, 1)
 */
export function createSeededPRNG(seed: string): () => number {
  // Convert seed string to number
  let state = 0
  for (let i = 0; i < seed.length; i++) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0
  }

  // Linear Congruential Generator
  return () => {
    state = (state * 1103515245 + 12345) >>> 0
    return (state % 2147483647) / 2147483647
  }
}
