# Historical Calculations

**Nothing here is used by the app, the test suite or CI.** These files are the
record of how the expected Brier scores, payouts and settlements were originally
worked out and checked, kept because that derivation is worth being able to look
up — not because anything runs them.

The one link to live code is by hand: the numbers in the
`Integration test with test_output.json data` block of
`src/modules/brier.test.ts` were transcribed from `test_output.json`. Editing a
file here changes nothing on its own; that test would have to be updated to
match.

The Python is a second, independent implementation of the scoring rules using
exact `Fraction` arithmetic. That is the point of it — it was written to
disagree with the TypeScript if either got the maths wrong, which a shared
implementation could not do.

## Files

| File                    | What it is                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `test_input.json`       | One minimal scenario (players, stakes, predictions) — no results.                                                                      |
| `test_output.json`      | Generated from it: Brier scores, payouts and settlements for every outcome.                                                            |
| `full_test_input.json`  | The same shape, 7 scenarios covering 2–5 players and 2–5 outcomes.                                                                     |
| `full_test_output.json` | Generated from it. The broadest set of worked results.                                                                                 |
| `data_fixed.json`       | Older hand-maintained fixture: 4 scenarios, one resolved outcome each. Kept for `market_direction_3p`, which appears in no other file. |
| `calculations.ods`      | The spreadsheet the original numbers were worked out in.                                                                               |

Settlements are one valid set of transfers, not the only one — `data_fixed.json`
picks different transfers than the generator for the same payouts, and both
verify.

## Reproducing the results

Both scripts still run, and did as of the last check:

```sh
python3 generate_scenarios.py full_test_input.json full_test_output.json
bun x prettier --write full_test_output.json   # collapses short arrays
python3 verify.py full_test_output.json
```

`verify.py` recomputes every Brier score, average-of-others, payout and
settlement from the inputs and asserts they match the recorded values, that
payouts sum to zero, and that settlements net out to the payouts. It exits
non-zero on the first mismatch and accepts any `*_output.json` or
`data_fixed.json`.

Useful as a cross-check if the scoring rules are ever changed. It needs Python,
which is why it was never wired into `make test`.
