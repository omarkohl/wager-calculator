# 🎯 Wager Calculator

> Calculate fair betting odds for friendly wagers using Brier scoring. Put your
> money where your mouth is. As the saying goes: "Betting is a tax on bullshit".

[![Build Status](https://github.com/omarkohl/wager-calculator/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/omarkohl/wager-calculator/actions)
[![Coverage Status](https://codecov.io/gh/omarkohl/wager-calculator/branch/main/graph/badge.svg)](https://codecov.io/gh/omarkohl/wager-calculator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

- **📱 PWA**: Install on any device, works offline
- **👥 2-8 Participants**: Support for multiple players per bet
- **🎲 Binary & Multi-categorical**: YES/NO or up to 8 custom categories
- **🧮 Brier Scoring**: Mathematically fair odds using proper scoring rules
- **💰 Multi-Currency**: USD, EUR, GBP, CAD and more
- **📊 Smart Validation**: Probability scaling and instant feedback
- **📤 Easy Sharing**: Screenshot, text export, native sharing
- **🔒 Privacy-First**: No data storage, completely client-side

## 🎮 Try It Live

**[🔗 Live Demo](https://example.com)** _(Coming soon)_

## 📖 Quick Start

### For Developers

```bash
# Clone the repository
git clone https://github.com/omarkohl/wager-calculator.git

# Navigate to project directory
cd wager-calculator

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 🧮 How It Works

The Wager Calculator uses **Brier scoring** to ensure fair betting:

```
Brier Score = (1/N) × Σ(t=1 to N) Σ(i=1 to R) (f_ti - o_ti)²
Payout = (amount_in_play) × (avg_others_brier - my_brier) / 2
```

This rewards accurate predictions and ensures zero-sum payouts across all participants.

### Example: 3-Person Binary Bet

**Scenario**: "Will it rain tomorrow?"
- Alice: 70% chance of rain, max bet $50
- Bob: 30% chance of rain, max bet $40
- Carol: 50% chance of rain, max bet $60
- Amount in play: $40 (minimum of max bets)

**Outcome: It rains (actual = 1)**

**Calculations:**
- Alice's Brier: (0.70 - 1)² + (0.30 - 0)² = 0.18
- Bob's Brier: (0.30 - 1)² + (0.70 - 0)² = 0.98
- Carol's Brier: (0.50 - 1)² + (0.50 - 0)² = 0.50

**Payouts:**
- Alice: $40 × ((0.98 + 0.50) / 2 - 0.18) / 2 = +$11.20
- Bob: $40 × ((0.18 + 0.50) / 2 - 0.98) / 2 = -$12.80
- Carol: $40 × ((0.18 + 0.98) / 2 - 0.50) / 2 = +$1.60

So Bob has to give $1.60 to Carol and $11.20 to Alice.

## 🛠️ Tech Stack

- **TypeScript + Vite**: Modern build tooling
- **Jest + Playwright**: Comprehensive testing
- **PWA**: Service worker + manifest

## 🤝 Contributing

See [Contributing Guide](./.github/CONTRIBUTING.md) for details. We especially welcome:
- Mathematical accuracy improvements
- UI/UX enhancements
- Test coverage expansion
- Documentation improvements

## 🔒 Security & Privacy

- No data collection or storage
- Client-side calculations only
- See [Security Policy](./.github/SECURITY.md) for details

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
