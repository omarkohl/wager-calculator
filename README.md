# 🎯 Wager Calculator

> A client-side Progressive Web App for calculating fair betting odds using logarithmic scoring rules

[![Build Status](https://github.com/omarkohl/wager-calculator/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/omarkohl/wager-calculator/actions)
[![Coverage Status](https://codecov.io/gh/omarkohl/wager-calculator/branch/main/graph/badge.svg)](https://codecov.io/gh/omarkohl/wager-calculator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

- **📱 Mobile-First PWA**: Install on any device, works offline
- **🎲 Binary & Multi-categorical Bets**: Simple YES/NO or up to 8 custom categories
- **🧮 Logarithmic Scoring**: Mathematically fair odds calculation
- **💰 Multi-Currency Support**: USD, EUR, GBP, CAD and more
- **📊 Real-time Validation**: Instant feedback on probability distributions
- **📤 Easy Sharing**: Screenshot, text export, and native sharing
- **♿ Fully Accessible**: WCAG AA compliant, keyboard navigation
- **🔒 Privacy-First**: No data storage, completely client-side

## 🎮 Try It Live

**[🔗 Live Demo](https://your-demo-url.netlify.app)** _(Coming soon)_

## 📖 Quick Start

### For Users
1. Visit the live demo link above
2. Choose between Binary or Multi-categorical bet
3. Enter participant names and probabilities
4. Set maximum contributions
5. Share the calculated fair odds!

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

The Wager Calculator uses **logarithmic scoring rules** to ensure fair betting odds:

```
Score = log(probability of actual outcome)
```

This creates incentives for honest probability reporting while ensuring positive expected value for both participants when mathematically possible.

### Example: Binary Bet

**Scenario**: "Will it rain tomorrow?"
- Person A believes: 70% chance of rain
- Person B believes: 30% chance of rain
- Both contribute: $100 maximum

**Fair Odds**: The calculator determines optimal bet amounts within contribution limits to ensure mathematical fairness.

## 🛠️ Technology Stack

- **Frontend**: TypeScript, HTML5, CSS3
- **Build Tool**: Vite
- **Testing**: Jest + Testing Library + Playwright
- **PWA**: Service Worker + Web App Manifest
- **Deployment**: Netlify/Vercel (static hosting)

## 📊 Project Status

- [x] Project specification complete
- [x] Development plan created
- [ ] Core calculation engine (In Progress)
- [ ] UI components development
- [ ] PWA implementation
- [ ] Production deployment

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./.github/CONTRIBUTING.md) for details.

### Development Process
1. Read the [Development Plan](./PLAN.md)
2. Check [open issues](https://github.com/omarkohl/wager-calculator/issues)
3. Follow our [coding standards](./.github/CONTRIBUTING.md#style-guidelines)
4. Submit PRs with comprehensive tests

### Mathematical Contributions
Special attention is given to:
- Calculation accuracy and verification
- Edge case handling
- Performance optimization
- Algorithm documentation

## 📚 Documentation

- [📋 Development Plan](./PLAN.md) - Complete development roadmap
- [🏗️ Architecture Guide](./docs/ARCHITECTURE.md) _(Coming soon)_
- [🧮 Mathematical Documentation](./docs/MATH.md) _(Coming soon)_
- [🚀 Deployment Guide](./docs/DEPLOYMENT.md) _(Coming soon)_

## 🔒 Security

- No user data collection or storage
- Client-side only calculations
- See our [Security Policy](./.github/SECURITY.md) for vulnerability reporting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Project Goals

- **Usability**: Users can create and share bets within 2 minutes
- **Accuracy**: Mathematical calculations are precise and verifiable  
- **Accessibility**: Works across all target devices and browsers
- **Adoption**: Friends can easily access and use shared calculations

## 🙏 Acknowledgments

- Logarithmic scoring rule implementation based on academic research
- Inspired by the need for fair betting among friends
- Built with modern web standards and accessibility in mind

https://www.lesswrong.com/posts/aiz4FCKTgFBtKiWsE/even-odds

---

**Made with ❤️ for fair betting calculations**
