#!/usr/bin/env python3
"""
Verify calculations in scenario data JSON file.
This script takes a JSON file with complete scenario information (players, predictions, outcomes,
Brier scores, payouts, settlements) and verifies that all calculations are correct using exact
arithmetic to minimize rounding errors.
"""

import argparse
import json
import sys
from fractions import Fraction


def calculate_brier_score(predictions, outcome_index):
    """Calculate Brier score for a single prediction set using exact arithmetic"""
    # Use Fraction for exact arithmetic to avoid floating point errors
    score = Fraction(0)
    for i, pred in enumerate(predictions):
        actual = Fraction(1) if i == outcome_index else Fraction(0)
        pred_frac = Fraction(pred)
        score += (pred_frac - actual) ** 2
    # Convert back to float rounded to 4 decimal places for comparison
    return round(float(score), 4)


def verify_scenario(scenario):
    """Verify all calculations in a scenario"""
    print(f"\nVerifying: {scenario['description']}")
    print("=" * 60)

    # Verify amount in play
    min_bet = min(p["max_bet"] for p in scenario["players"].values())
    assert scenario["amount_in_play"] == min_bet, "Amount in play mismatch"
    print(f"✓ Amount in play: ${scenario['amount_in_play']}")

    for outcome_name, outcome_data in scenario["outcomes"].items():
        print(f"\nOutcome: {outcome_name}")
        print("-" * 40)

        outcome_index = scenario["categories"].index(outcome_name)

        # Verify Brier scores
        for player_id, player_data in scenario["players"].items():
            calculated_brier = calculate_brier_score(
                player_data["predictions"], outcome_index
            )
            expected_brier = outcome_data["brier_scores"][player_id]

            assert (
                abs(calculated_brier - expected_brier) < 0.0001
            ), f"Brier score mismatch for {player_id}: expected {expected_brier}, got {calculated_brier}"
            print(f"  ✓ Player {player_id} Brier: {calculated_brier}")

        # Verify average Brier of others
        player_ids = list(scenario["players"].keys())
        for player_id in player_ids:
            others_briers = [
                outcome_data["brier_scores"][other_id]
                for other_id in player_ids
                if other_id != player_id
            ]
            # Use Fraction for exact average calculation
            others_fractions = [Fraction(b) for b in others_briers]
            calculated_avg_frac = sum(others_fractions) / len(others_fractions)
            calculated_avg = round(float(calculated_avg_frac), 4)
            expected_avg = outcome_data["avg_brier_others"][player_id]

            assert (
                abs(calculated_avg - expected_avg) < 0.0001
            ), f"Avg Brier mismatch for {player_id}: expected {expected_avg}, got {calculated_avg}"
            print(f"  ✓ Player {player_id} Avg Others: {calculated_avg}")

        # Calculate payouts using exact arithmetic and store in high precision
        calculated_payouts_exact = {}
        amount_in_play_frac = Fraction(scenario["amount_in_play"])

        for player_id in player_ids:
            my_brier = outcome_data["brier_scores"][player_id]
            avg_others = outcome_data["avg_brier_others"][player_id]

            # Use Fraction for exact payout calculation
            my_brier_frac = Fraction(my_brier)
            avg_others_frac = Fraction(avg_others)

            calculated_payout_frac = (
                amount_in_play_frac * (avg_others_frac - my_brier_frac) / 2
            )
            calculated_payouts_exact[player_id] = calculated_payout_frac

        # Verify individual payouts by converting to float only for comparison
        # Note: Individual payouts may have small adjustments to ensure sum equals zero
        total_calculated = sum(
            round(float(calculated_payouts_exact[pid]), 2) for pid in player_ids
        )
        total_expected = sum(outcome_data["payouts"].values())

        print(f"    Total calculated payouts: {total_calculated:.2f}")
        print(f"    Total expected payouts: {total_expected:.2f}")

        for player_id in player_ids:
            calculated_payout = round(float(calculated_payouts_exact[player_id]), 2)
            expected_payout = outcome_data["payouts"][player_id]

            print(
                f"    Calculated payout for {player_id}: {calculated_payout}, Expected: {expected_payout}"
            )

            # If the expected data has been adjusted to sum to zero, allow for reasonable differences
            # in individual payouts as long as the total is correct
            tolerance = 0.02 if abs(total_expected) < 0.005 else 0.005
            assert (
                abs(calculated_payout - expected_payout) < tolerance
            ), f"Payout mismatch for {player_id}: expected {expected_payout}, got {calculated_payout} (tolerance: {tolerance})"
            print(
                f"  ✓ Player {player_id} Payout: ${expected_payout:+.2f} (calculated: ${calculated_payout:+.2f})"
            )

        # Verify sum of payouts is zero using exact arithmetic
        total_payout_exact = sum(calculated_payouts_exact.values())
        total_payout_float = float(total_payout_exact)

        # Also verify the sum from the test data
        total_payout_test_data = sum(outcome_data["payouts"].values())

        # For exact calculations, we allow a slightly larger tolerance because we're using
        # rounded values from the JSON data as input, which introduces small errors
        assert (
            abs(total_payout_float) < 0.02
        ), f"Exact payouts don't sum close to zero: {total_payout_float} (exact: {total_payout_exact})"

        assert (
            abs(total_payout_test_data) < 0.005
        ), f"Test data payouts don't sum to zero: {total_payout_test_data}"

        print(f"  ✓ Exact total payout sum: {total_payout_float:.15f} (should be ≈0)")
        print(
            f"  ✓ Test data total payout sum: ${total_payout_test_data:.2f} (should be 0)"
        )

        # Verify settlements match payouts
        if "settlements" in outcome_data:
            verify_settlements(outcome_data["settlements"], outcome_data["payouts"])


def verify_settlements(settlements, payouts):
    """Verify that settlements match the payouts."""
    print("\n    Verifying settlements:")

    # Calculate net amounts from settlements for each player
    settlement_amounts = {}
    for settlement in settlements:
        from_player = settlement["from"]
        to_player = settlement["to"]
        amount = settlement["amount"]

        # Track outgoing amounts (negative) and incoming amounts (positive)
        if from_player not in settlement_amounts:
            settlement_amounts[from_player] = 0
        if to_player not in settlement_amounts:
            settlement_amounts[to_player] = 0

        settlement_amounts[from_player] -= amount
        settlement_amounts[to_player] += amount

    # Compare settlement amounts with payouts
    for player_id in payouts:
        expected_payout = payouts[player_id]
        settlement_amount = settlement_amounts.get(player_id, 0.0)

        # Allow small rounding differences
        assert (
            abs(settlement_amount - expected_payout) < 0.005
        ), f"Settlement amount mismatch for {player_id}: expected {expected_payout}, got {settlement_amount}"

        print(
            f"      ✓ Player {player_id}: payout ${expected_payout:+.2f}, settlement ${settlement_amount:+.2f}"
        )

    # Verify total settlement amount is zero
    total_settlement = sum(settlement_amounts.values())
    assert (
        abs(total_settlement) < 0.005
    ), f"Total settlement amount doesn't sum to zero: {total_settlement}"
    print(f"      ✓ Total settlement sum: ${total_settlement:.2f} (should be 0)")


# Load and verify all scenarios
def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Verify calculations in scenario data JSON file"
    )
    parser.add_argument(
        "json_file", help="JSON file containing scenario data to verify"
    )

    args = parser.parse_args()

    try:
        with open(args.json_file, "r", encoding="utf-8") as f:
            scenarios = json.load(f)

        # Ensure scenarios is a list
        if not isinstance(scenarios, list):
            scenarios = [scenarios]

        for scenario in scenarios:
            verify_scenario(scenario)

        print(f"\n{'='*60}")
        print("All verifications passed! ✅")

    except FileNotFoundError as e:
        print(f"Error: File not found - {e}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in file - {e}", file=sys.stderr)
        sys.exit(1)
    except AssertionError as e:
        print(f"Verification failed: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
