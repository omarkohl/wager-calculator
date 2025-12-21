/**
 * Brier Scoring Calculation Engine
 *
 * Implements the original Brier scoring formula for multi-categorical outcomes:
 * BS = (1/N) × Σ(t=1 to N) Σ(i=1 to R) (f_ti - o_ti)²
 *
 * Where:
 * - R = number of possible categories
 * - N = number of instances (always 1 for single predictions)
 * - f_ti = predicted probability for category i in instance t
 * - o_ti = 1 if category i occurs in instance t, 0 otherwise
 */

/**
 * Calculate Brier score for a single prediction given the actual outcome
 * @param predictions Array of probabilities for each category (must sum to 1)
 * @param outcomeIndex Index of the category that actually occurred
 * @returns Brier score (lower is better, 0 = perfect prediction)
 */
export function calculateBrierScore(predictions: number[], outcomeIndex: number): number {
  // Validate inputs
  if (outcomeIndex < 0 || outcomeIndex >= predictions.length) {
    throw new Error('Invalid outcome index')
  }

  const sum = predictions.reduce((acc, prob) => acc + prob, 0)
  if (Math.abs(sum - 1) > 0.001) {
    throw new Error('Probabilities must sum to 1')
  }

  // Calculate Brier score: BS = Σ(f_i - o_i)²
  let brierScore = 0
  for (let i = 0; i < predictions.length; i++) {
    const predicted = predictions[i]!
    const actual = i === outcomeIndex ? 1 : 0
    brierScore += Math.pow(predicted - actual, 2)
  }

  return brierScore
}

/**
 * Calculate average Brier score of all other participants
 * @param brierScores Map of participant name to their Brier score
 * @param playerName The player to calculate average others for
 * @param allPlayerNames Array of all player names
 * @returns Average Brier score of other players
 */
export function calculateAverageBrierOthers(
  brierScores: Record<string, number>,
  playerName: string,
  allPlayerNames: string[]
): number {
  if (!(playerName in brierScores)) {
    throw new Error('Player not found in Brier scores')
  }

  const otherPlayerNames = allPlayerNames.filter(name => name !== playerName)
  if (otherPlayerNames.length === 0) {
    throw new Error('No other players found')
  }

  const otherScores = otherPlayerNames.map(name => {
    const score = brierScores[name]
    if (score === undefined) {
      throw new Error(`Brier score not found for player: ${name}`)
    }
    return score
  })
  return otherScores.reduce((sum: number, score: number) => sum + score, 0) / otherScores.length
}

/**
 * Calculate payouts for all participants based on Brier scores
 * @param brierScores Map of participant name to their Brier score
 * @param avgBrierOthers Map of participant name to average Brier score of others
 * @param amountInPlay Total amount at stake (minimum of all max contributions)
 * @returns Map of participant name to payout amount (positive = receive, negative = pay)
 */
export function calculatePayouts(
  brierScores: Record<string, number>,
  avgBrierOthers: Record<string, number>,
  amountInPlay: number
): Record<string, number> {
  const payouts: Record<string, number> = {}

  for (const [playerName, myBrier] of Object.entries(brierScores)) {
    const avgOthers = avgBrierOthers[playerName]
    if (avgOthers === undefined) {
      throw new Error(`Average Brier others not found for player: ${playerName}`)
    }

    // Payout = (amount_in_play) × (avg_others_brier - my_brier) / 2
    payouts[playerName] = (amountInPlay * (avgOthers - myBrier)) / 2
  }

  return payouts
}

/**
 * Generate settlement transactions to achieve net payouts
 * @param payouts Map of participant name to net payout (positive = receive, negative = pay)
 * @returns Array of settlement transactions
 */
export function calculateSettlements(
  payouts: Record<string, number>
): Array<{ from: string; to: string; amount: number }> {
  const settlements: Array<{ from: string; to: string; amount: number }> = []

  // Get participants who owe money (negative payouts) and who receive money (positive payouts)
  const debtors = Object.entries(payouts)
    .filter(([, payout]) => payout < -0.005) // Only meaningful debts
    .map(([name, payout]) => ({ name, amount: -payout }))
    .sort((a, b) => b.amount - a.amount) // Largest debts first

  const creditors = Object.entries(payouts)
    .filter(([, payout]) => payout > 0.005) // Only meaningful credits
    .map(([name, payout]) => ({ name, amount: payout }))
    .sort((a, b) => b.amount - a.amount) // Largest credits first

  // Simple settlement: each debtor pays creditors proportionally
  for (const debtor of debtors) {
    let remainingDebt = debtor.amount

    for (const creditor of creditors) {
      if (remainingDebt <= 0.005) break
      if (creditor.amount <= 0.005) continue

      const settlementAmount = Math.min(remainingDebt, creditor.amount)

      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(settlementAmount * 100) / 100, // Round to 2 decimal places
      })

      remainingDebt -= settlementAmount
      creditor.amount -= settlementAmount
    }
  }

  return settlements
}

/**
 * Process a complete scenario and generate all outcomes
 * @param scenario Scenario data with categories and players
 * @returns Complete scenario with calculated outcomes
 */
export function processScenario(scenario: {
  categories: string[]
  players: Record<string, { max_bet: number; predictions: number[] }>
}): {
  amount_in_play: number
  outcomes: Record<
    string,
    {
      brier_scores: Record<string, number>
      avg_brier_others: Record<string, number>
      payouts: Record<string, number>
      settlements: Array<{ from: string; to: string; amount: number }>
    }
  >
} {
  const playerIds = Object.keys(scenario.players).sort()

  // Calculate amount in play (minimum of max_bets)
  const amountInPlay = Math.min(
    ...playerIds.map(id => {
      const player = scenario.players[id]
      if (!player) throw new Error(`Player not found: ${id}`)
      return player.max_bet
    })
  )

  const outcomes: Record<
    string,
    {
      brier_scores: Record<string, number>
      avg_brier_others: Record<string, number>
      payouts: Record<string, number>
      settlements: Array<{ from: string; to: string; amount: number }>
    }
  > = {}

  // Generate outcomes for each category
  for (let outcomeIndex = 0; outcomeIndex < scenario.categories.length; outcomeIndex++) {
    const outcomeName = scenario.categories[outcomeIndex]
    if (!outcomeName) throw new Error(`Category not found at index: ${outcomeIndex}`)

    // Calculate Brier scores for each player
    const brierScores: Record<string, number> = {}
    for (const playerId of playerIds) {
      const player = scenario.players[playerId]
      if (!player) throw new Error(`Player not found: ${playerId}`)
      const predictions = player.predictions
      brierScores[playerId] = calculateBrierScore(predictions, outcomeIndex)
    }

    // Calculate average Brier scores of others
    const avgBrierOthers: Record<string, number> = {}
    for (const playerId of playerIds) {
      avgBrierOthers[playerId] = calculateAverageBrierOthers(brierScores, playerId, playerIds)
    }

    // Calculate payouts
    const payouts = calculatePayouts(brierScores, avgBrierOthers, amountInPlay)

    // Generate settlements
    const settlements = calculateSettlements(payouts)

    // Round values for output
    const roundedBrierScores = Object.fromEntries(
      Object.entries(brierScores).map(([id, score]) => [id, Math.round(score * 10000) / 10000])
    )

    const roundedAvgBrierOthers = Object.fromEntries(
      Object.entries(avgBrierOthers).map(([id, avg]) => [id, Math.round(avg * 10000) / 10000])
    )

    const roundedPayouts = Object.fromEntries(
      Object.entries(payouts).map(([id, payout]) => [id, Math.round(payout * 100) / 100])
    )

    outcomes[outcomeName] = {
      brier_scores: roundedBrierScores,
      avg_brier_others: roundedAvgBrierOthers,
      payouts: roundedPayouts,
      settlements,
    }
  }

  return {
    amount_in_play: amountInPlay,
    outcomes,
  }
}
