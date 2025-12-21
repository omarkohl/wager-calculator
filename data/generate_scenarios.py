#!/usr/bin/env python3
"""
Generate complete scenario data from minimal input JSON.

This script takes a JSON file with basic scenario information (players, predictions, etc.)
and generates a complete JSON file with all outcomes, Brier scores, and payouts calculated
using exact arithmetic to minimize rounding errors.
"""

import argparse
import json
import sys
from fractions import Fraction
from typing import Any, Dict, List


def calculate_brier_score_exact(
    predictions: List[float], outcome_index: int
) -> Fraction:
    """Calculate Brier score using exact arithmetic."""
    score = Fraction(0)
    for i, pred in enumerate(predictions):
        actual = Fraction(1) if i == outcome_index else Fraction(0)
        pred_frac = Fraction(pred)
        score += (pred_frac - actual) ** 2
    return score


def calculate_avg_brier_others_exact(
    brier_scores: Dict[str, Fraction], player_id: str, player_ids: List[str]
) -> Fraction:
    """Calculate average Brier score of others using exact arithmetic."""
    others_scores = [
        brier_scores[other_id] for other_id in player_ids if other_id != player_id
    ]
    return sum(others_scores) / len(others_scores)


def generate_settlements(payouts: Dict[str, float]) -> List[Dict[str, Any]]:
    """Generate settlements from payouts (simplified: from negative to positive players)."""
    settlements = []

    # Get players who owe money (negative payouts) and who receive money (positive payouts)
    debtors = [(pid, -payout) for pid, payout in payouts.items() if payout < 0]
    creditors = [(pid, payout) for pid, payout in payouts.items() if payout > 0]

    # Sort by amount for deterministic ordering
    debtors.sort(key=lambda x: (-x[1], x[0]))  # Largest debts first, then alphabetical
    creditors.sort(
        key=lambda x: (-x[1], x[0])
    )  # Largest credits first, then alphabetical

    # Simple settlement: each debtor pays each creditor proportionally
    for debtor_id, debt_amount in debtors:
        remaining_debt = debt_amount
        for creditor_id, credit_amount in creditors:
            if remaining_debt <= 0:
                break
            settlement_amount = min(remaining_debt, credit_amount)
            if settlement_amount > 0.005:  # Only include meaningful settlements
                settlements.append(
                    {
                        "from": debtor_id,
                        "to": creditor_id,
                        "amount": round(settlement_amount, 2),
                    }
                )
                remaining_debt -= settlement_amount
                # Update creditor's remaining credit
                creditors = [
                    (cid, camt - settlement_amount if cid == creditor_id else camt)
                    for cid, camt in creditors
                ]

    return settlements


def process_scenario(scenario: Dict[str, Any]) -> Dict[str, Any]:
    """Process a single scenario and generate all outcomes."""
    print(f"Processing scenario: {scenario['description']}")

    # Extract basic information
    categories = scenario["categories"]
    players = scenario["players"]
    player_ids = sorted(players.keys())  # Sort for deterministic output

    # Calculate amount in play (minimum of max_bets)
    amount_in_play = min(p["max_bet"] for p in players.values())
    scenario["amount_in_play"] = amount_in_play

    # Initialize outcomes
    outcomes = {}

    # Generate outcomes for each category
    for outcome_index, outcome_name in enumerate(categories):
        print(f"  Processing outcome: {outcome_name}")

        # Calculate exact Brier scores
        exact_brier_scores = {}
        for player_id in player_ids:
            exact_brier = calculate_brier_score_exact(
                players[player_id]["predictions"], outcome_index
            )
            exact_brier_scores[player_id] = exact_brier

        # Calculate exact average Brier scores of others
        exact_avg_brier_others = {}
        for player_id in player_ids:
            exact_avg = calculate_avg_brier_others_exact(
                exact_brier_scores, player_id, player_ids
            )
            exact_avg_brier_others[player_id] = exact_avg

        # Calculate exact payouts
        amount_in_play_frac = Fraction(amount_in_play)
        exact_payouts = {}
        for player_id in player_ids:
            my_brier = exact_brier_scores[player_id]
            avg_others = exact_avg_brier_others[player_id]
            exact_payout = amount_in_play_frac * (avg_others - my_brier) / 2
            exact_payouts[player_id] = exact_payout

        # Round values for output, ensuring payouts sum to zero
        rounded_brier_scores = {
            pid: round(float(score), 4) for pid, score in exact_brier_scores.items()
        }

        rounded_avg_brier_others = {
            pid: round(float(avg), 4) for pid, avg in exact_avg_brier_others.items()
        }

        # Round payouts and adjust to ensure sum is exactly zero
        rounded_payouts = {
            pid: round(float(payout), 2) for pid, payout in exact_payouts.items()
        }

        # Adjust largest absolute payout to make sum exactly zero
        total = sum(rounded_payouts.values())
        if abs(total) > 1e-10:
            # Find player with largest absolute payout
            max_player = max(player_ids, key=lambda p: abs(rounded_payouts[p]))
            adjustment = -total
            rounded_payouts[max_player] = round(
                rounded_payouts[max_player] + adjustment, 2
            )
            print(
                f"    Adjusted {max_player} payout by {adjustment:.3f} to ensure zero sum"
            )

        # Generate settlements
        settlements = generate_settlements(rounded_payouts)

        # Create outcome data
        outcomes[outcome_name] = {
            "brier_scores": rounded_brier_scores,
            "avg_brier_others": rounded_avg_brier_others,
            "payouts": rounded_payouts,
            "settlements": settlements,
        }

    # Add outcomes to scenario
    scenario["outcomes"] = outcomes
    return scenario


def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Generate complete scenario data from minimal input JSON"
    )
    parser.add_argument("input_file", help="Input JSON file with minimal scenario data")
    parser.add_argument(
        "output_file", help="Output JSON file with complete scenario data"
    )
    parser.add_argument(
        "--indent", type=int, default=2, help="JSON indentation (default: 2)"
    )

    args = parser.parse_args()

    try:
        # Load input data
        with open(args.input_file, "r", encoding="utf-8") as f:
            scenarios = json.load(f)

        # Ensure scenarios is a list
        if not isinstance(scenarios, list):
            scenarios = [scenarios]

        # Process each scenario
        processed_scenarios = []
        for scenario in scenarios:
            processed_scenario = process_scenario(scenario.copy())
            processed_scenarios.append(processed_scenario)

        # Save output data with deterministic formatting
        with open(args.output_file, "w", encoding="utf-8") as f:
            json.dump(
                processed_scenarios,
                f,
                indent=args.indent,
                separators=(",", ": "),
                sort_keys=True,
                ensure_ascii=False,
            )

        print(f"\nGenerated complete scenario data in {args.output_file}")

    except FileNotFoundError as e:
        print(f"Error: File not found - {e}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in input file - {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
