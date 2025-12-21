# 🎯 Wager Calculator

> Calculate fair betting odds for friendly wagers using Brier scoring. Put your money where your mouth is on confident predictions. As the saying goes: "Betting is a tax on bullshit".

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

**[🔗 Live Demo](https://your-demo-url.netlify.app)** _(Coming soon)_

## 📖 Quick Start

### For Users
1. Visit the live demo link above
2. Add participants (2-8 people)
3. Enter probability assessments for each participant
4. Set maximum contributions
5. Share the calculated payouts and settlements!

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
Brier Score = (1/N) × Σ(predicted_probability - actual_outcome)²
Payout = (amount_in_play) × (avg_others_brier - my_brier) / 2
```

This rewards accurate predictions and ensures zero-sum payouts across all participants.

### Example: 3-Person Binary Bet

**Scenario**: "Will it rain tomorrow?"
- Alice: 70% chance of rain, max bet $50
- Bob: 30% chance of rain, max bet $40  
- Carol: 50% chance of rain, max bet $60
- Amount in play: $40 (minimum of max bets)

**If it rains**: Alice wins, Bob and Carol pay based on their Brier scores relative to the group average.

## 🛠️ Tech Stack

- **TypeScript + Vite**: Modern build tooling
- **Jest + Playwright**: Comprehensive testing
- **PWA**: Service worker + manifest
- **Static hosting**: Netlify/Vercel

## 📊 Project Status

- [x] Project specification complete
- [x] Development plan created
- [ ] Core calculation engine (In Progress)
- [ ] UI components development
- [ ] PWA implementation
- [ ] Production deployment

## 🤝 Contributing

See [Contributing Guide](./.github/CONTRIBUTING.md) for details. We especially welcome:
- Mathematical accuracy improvements
- UI/UX enhancements
- Test coverage expansion
- Documentation improvements

## 📚 Documentation

- [📋 Development Plan](./PLAN.md) - Complete roadmap
- [🏗️ Architecture](./docs/ARCHITECTURE.md) _(Coming soon)_
- [🧮 Mathematics](./docs/MATH.md) _(Coming soon)_

## 🔒 Security & Privacy

- No data collection or storage
- Client-side calculations only
- See [Security Policy](./.github/SECURITY.md) for details

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on Brier scoring research and proper scoring rules
- Inspired by the need for fair multi-participant betting

---

**Fair betting calculations for everyone** ❤️
