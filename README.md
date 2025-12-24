<p align="center">
  <img src="public/icon-192.png" width="96" height="96" alt="Logo">
</p>

<h1 align="center">Wager Calculator</h1>

<p align="center">Calculate fair betting odds for friendly wagers using Brier scoring.</p>

[![CI](https://github.com/omarkohl/wager-calculator/workflows/CI/badge.svg)](https://github.com/omarkohl/wager-calculator/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Use It

**[w.ratfr.de](https://w.ratfr.de)** — works on any device, no installation needed. See the FAQ in the app for detailed explanations.

<a href="docs/screenshot.png"><img src="docs/screenshot.png" width="50%" alt="Screenshot"></a>

## What It Does

- 2-8 participants, binary or multi-outcome bets (up to 8 outcomes)
- Fair payouts via Brier scoring (a proper scoring rule that rewards honest predictions)
- Multiple stake types: money (USD, EUR, etc.) or fun stakes (cookies, hugs)
- Share wagers via URL — all data stays in your browser, nothing stored on servers
- PWA: installable, works offline

## How Brier Scoring Works

Each participant's prediction accuracy is measured with a Brier score (lower = better). Payouts are based on how your score compares to others.

**Example:** Alice, Bob, and Carol bet $40 on whether it rains tomorrow. Tomorrow comes and it does rain.
- Alice: 70% rain → Brier score 0.18
- Bob: 30% rain → Brier score 0.98
- Carol: 50% rain → Brier score 0.50

Alice predicted best, Bob worst. Result: Alice wins $11.20, Carol wins $1.60, Bob pays $12.80.

The key property: reporting your true belief always maximizes your expected payout.

---

## Development

See [docs/dev/DEVELOPMENT.md](docs/dev/DEVELOPMENT.md) for setup and deployment.

## Contributing

See [docs/dev/CONTRIBUTING.md](docs/dev/CONTRIBUTING.md).

## Security & Privacy

All calculations are client-side. No data collection. See [docs/dev/SECURITY.md](docs/dev/SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).

## Attribution

Icon by [Freepik](https://www.freepik.com/icon/handshake_1006657).
