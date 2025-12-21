# Contributing to Wager Calculator

Thank you for your interest in contributing to the Wager Calculator! This document provides guidelines and information for contributors.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and inclusive
- Focus on constructive feedback
- Prioritize user experience
- Help maintain a welcoming environment

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- Git for version control

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/omarkohl/wager-calculator.git`
3. Install dependencies: `npm install`
4. Start development server: `npm run dev`
5. Run tests: `npm test`

### Project Structure
```
src/
├── components/     # UI components
├── modules/        # Calculation logic
├── types/          # TypeScript interfaces
├── utils/          # Utility functions
└── styles/         # CSS/SCSS files
```

## Development Process

### Branching Strategy
Trunk-based development, meaning that `main` should always be deployable.

### Workflow
1. Create a feature branch from `main`
2. Make your changes with tests
3. Ensure all tests pass
4. Submit a pull request to `main`
5. Address review feedback
6. Merge after approval
