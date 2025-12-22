# 🎯 Wager Calculator

> Calculate fair betting odds for friendly wagers using Brier scoring. Put your
> money where your mouth is. As the saying goes: "Betting is a tax on bullshit".

[![CI](https://github.com/omarkohl/wager-calculator/workflows/CI/badge.svg)](https://github.com/omarkohl/wager-calculator/actions)
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

**[🔗 Live Demo](https://w.ratfr.de)**

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

### Deployment

When deploying, you can configure the following environment variables:

#### `VITE_SITE_URL`

The public URL where your app is deployed. Used for Open Graph and Twitter Card meta tags.

**GitHub Actions Setup:**

1. Go to your repository **Settings** → **Secrets and variables** → **Actions**
2. Click the **Variables** tab
3. Click **New repository variable**
4. Name: `SITE_URL`
5. Value: `https://yourdomain.com` (your deployment URL)
6. Click **Add variable**

The workflow will automatically use `${{ vars.SITE_URL }}` during builds.

**Local Build Example:**

```bash
VITE_SITE_URL=https://yourdomain.com npm run build
```

If not set, meta tags will have empty URLs (local development is unaffected).

#### `VITE_GITHUB_REPO_URL`

The GitHub repository URL. Automatically set in CI to display repository information.

**Example:**

```bash
VITE_GITHUB_REPO_URL=https://github.com/yourusername/wager-calculator npm run build
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

See [Contributing Guide](./docs/dev/CONTRIBUTING.md) for details. We especially welcome:

- Mathematical accuracy improvements
- UI/UX enhancements
- Test coverage expansion
- Documentation improvements

## 🔒 Security & Privacy

- No data collection or storage
- Client-side calculations only
- See [Security Policy](./docs/dev/SECURITY.md) for details

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Attribution

Icon by [Freepik](https://www.freepik.com/icon/handshake_1006657)
