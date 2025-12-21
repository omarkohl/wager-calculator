# Wager Calculator Application Specification

## Overview

A client-side Progressive Web App (PWA) that calculates fair betting odds for friendly wagers using Brier scoring rules. The application functions as a calculator without user accounts or data storage, focusing on binary and multi-categorical betting scenarios.

## Core Features

### 1. Bet Types

Bets can have up to 8 outcomes with the default being 2, Yes and No.

### 2. User Interface Components

#### Input Section

- **Claim**: Inline-editable text field for the main claim/question (appears as static text until clicked or focused)
- **Details** (Optional): Inline-editable multi-line text field for resolution criteria and additional context
- **Participants**:
  - Default: 2 participants with placeholder names ("Artem" and "Baani") that are cleared on first input
  - Support for 2-8 participants with add/remove participant buttons
  - Inline-editable text fields for custom names (seamless view/edit experience)
  - Maximum Bet: Numerical input for each participant
- **Stakes Selection**: Searchable Headless UI Combobox for selecting what participants are betting. Grouped options:
  - Common currencies first (USD, EUR, GBP, CAD, AUD, JPY, CHF, CNY) sorted by global usage frequency
  - Fun/non-monetary options: "Cookies", "Hugs", "I was wrong"
  - "Other" option (user documents details in the Details field)
- **Outcomes**: Add or remove outcomes with inline-editable labels
- **Predictions**: For each participant and outcome, specify their personal prediction (0-100%, supporting two decimal places).
  - Slider adjusts in whole percentage points (1% increments)
  - Text input allows two decimal places (e.g., 33.33%)
  - Auto-distribute on blur: when total probability is under 100% and user blurs a field, remaining probability is distributed evenly across outcomes they haven't yet touched
- **Resolution**: Headless UI Listbox/RadioGroup to select which outcome occurred. Option to un-resolve and change the selected outcome. Display a summary showing who has to pay whom and how much. If all participants have identical predictions, explain that payouts are zero.

#### Validation & Warnings

- **Probability Sum Check**: Warning if total probabilities ≠ 100% for any participant
  - Offer button to normalize/scale probabilities to sum to 100%
  - Show this warning even when sum < 100% (e.g., 40% + 30% + 20% = 90%)
- **Input Validation**: Ensure all required fields are filled

### 3. Calculation Engine

#### Brier Scoring Rule Implementation

- Calculate fair odds using Brier's original scoring formula for multi-categorical outcomes
- For each participant, calculate their Brier score using: BS = (1/N) × Σ(t=1 to N) Σ(i=1 to R) (f_ti - o_ti)²
  - Where N = number of instances (for this application, N=1 since we have a single wager)
  - R = number of possible outcomes (e.g., R=2 for Yes/No, R=3 for Cold/Normal/Warm)
  - f_ti = predicted probability for outcome i in instance t (as a decimal, e.g., 0.7 for 70%)
  - o_ti = 1 if outcome i occurs in instance t, 0 otherwise
  - Lower scores are better (0 = perfect prediction, 2 = worst possible)
- Calculate average Brier score of all other participants for comparison
- Determine payouts: Payout = (amount_in_play) × (avg_others_brier - my_brier) / 2
  - Division by 2 ensures maximum payout cannot exceed the max bet (since worst Brier score is 2)
- Amount in play is determined by the minimum of all participants' maximum contributions
- Ensure payouts sum to zero across all participants. Round to nearest cent/unit. Use PRNG seeded with the claim text for tiebreaking if rounding adjustment is needed.
- Settlement: Simplify payments between participants to minimize number of transactions while achieving net payouts. For small participant counts (≤8), brute force enumeration of transaction sets is acceptable.

#### Mathematical Display

- Provide a help/info section using Headless UI Disclosure component (collapsible panel) explaining the Brier scoring calculation with a worked example

### 4. Sharing Features

- **Visual Design**: Clean, professional layout suitable for screenshots
- **Share the URL**: All data encoded as JSON, compressed with lz-string, and base64-encoded in URL hash/anchor. When opening such a URL, the form is populated with the decoded data.

### 5. Technical Requirements

#### Platform

- **Progressive Web App (PWA)**
- **Cross-platform**: Mobile-first responsive design, desktop compatible
- **Offline Capability**: Full functionality without internet connection
- **Installable**: Can be added to home screen/desktop

#### Technology Stack

- **Frontend**: React 18+ with TypeScript (ES2020+ target)
- **UI Components**: Headless UI for accessible primitives (dialogs, dropdowns, transitions)
- **Styling**: Tailwind CSS for utility-first responsive design
- **Build System**: Vite with React plugin for development and bundling
- **Testing**: Vitest + React Testing Library for unit/integration tests
- **PWA Features**: Service worker, web app manifest via vite-plugin-pwa
- **Type Checking**: Strict TypeScript configuration
- **Arithmetic**: decimal.js for high-precision decimal arithmetic to avoid floating-point errors
- **URL Encoding**: lz-string for JSON compression in shareable URLs
- **No Backend**: Entirely client-side application
- **No Data Storage**: No user accounts, history, or persistent client-side data (future: optional encrypted server-side storage)

#### Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Mobile Browsers**: iOS Safari, Chrome Mobile, Samsung Internet

### 6. Design Principles

#### Mobile-First Design

- Touch-friendly interface elements
- Optimized for portrait and landscape orientations
- Thumb-friendly button sizes and spacing

#### Accessibility

- High contrast color scheme
- Screen reader compatible
- Keyboard navigation support
- Clear, readable typography

#### Visual Design

- Clean, minimal interface
- Clear visual hierarchy
- Professional appearance suitable for sharing
- Consistent color scheme and typography

### 7. Error Handling & Edge Cases

#### Input Validation

- Handle invalid probability inputs gracefully

#### Mathematical Edge Cases

- Handle scenarios where participants have identical probability assessments (all payouts = 0)
- Handle edge cases in settlement calculations (very small amounts)
- Provide clear explanations when calculations produce warnings or edge cases occur
- Use decimal.js to ensure numerical precision in Brier score and payout calculations
- Handle rounding errors in payouts with deterministic PRNG-based tiebreaking

### 8. Performance Requirements

#### Load Time

- Initial page load < 5 seconds on 3G connection
- Instant calculations and UI updates
- Smooth slider interactions

#### Offline Functionality

- Full feature set available without internet
- Service worker caching for instant re-launches

### 9. Future Considerations

#### Potential Enhancements

- Additional proper scoring rules (logarithmic, quadratic)
- Import/export of bet configurations
- Integration with calendar apps for bet deadlines
- Multi-language support
- Native mobile app
- Optional encrypted server-side storage to track past wagers

#### Scalability

- Modular design for easy feature additions
- Clean separation between calculation logic and UI

## Success Metrics

- **Usability**: Users can create and share bets within 2 minutes
- **Accuracy**: Mathematical calculations are precise and verifiable
- **Accessibility**: App works across all target devices and browsers
- **Adoption**: Friends can easily access and use the shared app without barriers

## Technical Architecture

- **Calculation Module**: Separate TypeScript module for all Brier scoring operations using decimal.js
- **UI Components**: Modular React component structure
- **State Management**: Simple state management for form inputs and calculations
- **Type Safety**: Comprehensive TypeScript interfaces for all data structures
- **URL State**: JSON → lz-string compression → base64 → URL hash for sharing
- **Settlement Algorithm**: Brute force transaction minimization (acceptable for ≤8 participants)

### Key Brier Scoring Properties

- **Proper Scoring**: Participants maximize expected payout by reporting true beliefs
- **Zero Sum**: Total payouts across all participants always equal zero
- **Fair**: Expected payout is zero when probabilities match true frequencies
- **Unified Implementation**: Binary outcomes (R=2) handled as special case of multi-categorical (R>2)

## Development & Deployment Toolchain

### Development Environment

- **Package Manager**: npm or yarn
- **Build Tool**: Vite with React and PWA plugins
- **Development Server**: Vite dev server with HMR and Fast Refresh
- **TypeScript Configuration**: Strict mode with comprehensive type checking and JSX support

### Testing Strategy

- **Unit Tests**: Vitest for mathematical calculation modules (Brier scoring, settlement calculations)
- **Component Tests**: Vitest + React Testing Library for React component interactions and behavior
- **E2E Tests**: Playwright for full user workflow testing
- **Test Coverage**: Minimum 90% branch coverage for calculation logic
- **Test Types**:
  - Mathematical accuracy tests (Brier scoring calculations, decimal.js arithmetic)
  - Payout and settlement calculation tests (including edge cases)
  - React component behavior and interaction tests
  - Input validation tests
  - PWA functionality tests
  - Cross-browser compatibility tests
- **Test Data**: Use exact scenarios from data generation scripts to verify calculations

### Code Quality Tools

- **Linting**: ESLint with TypeScript and React rules
- **Formatting**: Prettier with Tailwind CSS plugin for class sorting
- **Type Checking**: TypeScript compiler with strict configuration
- **Pre-commit Hooks**: Husky + lint-staged for automated quality checks

### Build Process

- **Development Build**: Fast compilation with source maps
- **Production Build**: Optimized bundle with tree-shaking
- **PWA Generation**: Automatic service worker and manifest generation
- **Bundle Analysis**: Bundle size optimization and analysis

### Deployment Options

- **Static Hosting**: GitHub Pages, Netlify, Vercel, or Cloudflare Pages
- **Build Output**: Static files in `dist/` directory after `npm run build`
- **Base Path Configuration**: Vite `base` option set to `'./'` for relative paths (GitHub Pages compatibility)
- **CDN**: Automatic global distribution via hosting provider
- **HTTPS**: Required for PWA features (all providers support HTTPS by default)
- **Continuous Deployment**: Automated deployment on git push via GitHub Actions or provider integrations
- **GitHub Pages Deployment**:
  - Build command: `npm run build`
  - Publish directory: `dist`
  - Service worker requires HTTPS (automatically provided by GitHub Pages)
  - PWA installability works on GitHub Pages with proper manifest and HTTPS

### Recommended Project Structure

```
wager-calculator/
├── src/
│   ├── components/          # React UI components
│   ├── modules/            # Calculation logic (Brier scoring, settlements)
│   ├── types/              # TypeScript interfaces
│   ├── utils/              # Utility functions
│   ├── hooks/              # Custom React hooks
│   ├── App.tsx             # Root React component
│   ├── main.tsx            # Application entry point
│   └── index.css           # Tailwind CSS imports and global styles
├── public/                 # Static assets (favicon, manifest icons, robots.txt)
├── tests/
│   ├── unit/               # Unit tests for modules and utilities
│   ├── components/         # Component tests
│   ├── e2e/                # Playwright E2E tests
│   └── setup.ts            # Test environment setup
├── dist/                   # Production build output (generated, git-ignored)
├── docs/                   # Documentation
├── data/                   # Test scenarios and generation scripts
├── vite.config.ts          # Vite configuration with React plugin
├── vitest.config.ts        # Vitest configuration (extends Vite config)
├── tsconfig.json           # TypeScript configuration with JSX
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration for Tailwind
├── playwright.config.ts    # E2E test configuration
└── package.json            # Dependencies and scripts
```

### CI/CD Pipeline

- **Pull Request Checks**: Automated testing, linting, and type checking
- **Automated Testing**: Run full test suite on multiple browsers/devices
- **Build Verification**: Ensure production build succeeds
- **Deployment**: Automatic deployment to staging/production environments
- **Performance Monitoring**: Bundle size and performance regression detection
