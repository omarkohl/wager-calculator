# Wager Calculator Application Specification

## Overview
A client-side Progressive Web App (PWA) that calculates fair betting odds for friendly wagers using Brier scoring rules. The application functions as a calculator without user accounts or data storage, focusing on binary and multi-categorical betting scenarios.

## Core Features

### 1. Bet Types

Bets can have up to 8 outcomes with the default being 2, Yes and No.

### 2. User Interface Components

#### Input Section
- **Claim**: Text field for the main claim/question
- **Details** (Optional): Multi-line text field for resolution criteria and additional context
- **Participants**: 
  - Default: 2 participants ("Artem" and "Baani")
  - Support for 2-8 participants with add/remove participant buttons
  - Editable text fields for custom names
  - Maximum Bet: Numerical input for each participant
- **Currency Selection**: Dropdown with common currencies (USD, EUR, GBP, CAD, etc.) plus other options like "I was wrong", "Cookies", "Hugs" or "Other" (specify in "Details").
- **Outcomes**: Add or remove outcomes
- **Predictions**: For each participant and outcome, specify their personal prediction (0-100%). When a participant enters predictions for some outcomes, the remaining probability is automatically distributed evenly across the outcomes they haven't yet assigned.
- **Resolution**: Dropdown or buttons to select which outcome occurred. Option to un-resolve and change the selected outcome. Display a summary showing who has to pay whom and how much.

#### Validation & Warnings
- **Probability Sum Check**: Warning if total probabilities ≠ 100%
  - Add a button to scale probabilities so they add up to 100%
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
- Calculate average Brier score of other participants for comparison
- Determine payouts based on performance relative to others: Payout = (amount_in_play) × (avg_others_brier - my_brier) / 2
- Amount in play is determined by the minimum of all participants' maximum contributions
- Ensure payouts sum to zero across all participants. Round to nearest cent/unit. Use PRNG seeded with the claim text for tiebreaking if rounding adjustment is needed.

#### Mathematical Display
- Provide a help/info section (e.g., collapsible panel or separate page) explaining the Brier scoring calculation with a worked example

### 4. Sharing Features
- **Visual Design**: Clean, professional layout suitable for screenshots
- **Share the URL**: All data should be contained and compressed in the URL anchor so that the URL can be shared. When opening such a URL the form must be populated with the data.
- **Text Export**: Plain text format for copy-paste sharing

### 5. Technical Requirements

#### Platform
- **Progressive Web App (PWA)**
- **Cross-platform**: Mobile-first responsive design, desktop compatible
- **Offline Capability**: Full functionality without internet connection
- **Installable**: Can be added to home screen/desktop

#### Technology Stack
- **Frontend**: HTML5, CSS3, TypeScript (ES2020+ target), React
- **Build System**: Vite for development and bundling
- **Testing**: Jest + Testing Library for unit/integration tests
- **PWA Features**: Service worker, web app manifest
- **Type Checking**: Strict TypeScript configuration
- **No Backend**: Entirely client-side application
- **No Data Storage**: No user accounts, history, or persistent data

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
- Manage scenarios where participants have identical probability assessments
- Handle edge cases in settlement calculations (very small amounts)
- Provide clear explanations when calculations produce warnings
- Ensure numerical precision in Brier score and payout calculations
- Handle rounding errors in payouts

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
- Implement data storage to keep track of past wagers

#### Scalability
- Modular design for easy feature additions
- Clean separation between calculation logic and UI

## Success Metrics
- **Usability**: Users can create and share bets within 2 minutes
- **Accuracy**: Mathematical calculations are precise and verifiable
- **Accessibility**: App works across all target devices and browsers
- **Adoption**: Friends can easily access and use the shared app without barriers

## Technical Architecture Notes
- **Calculation Module**: Separate TypeScript module for all mathematical operations using Brier scoring
- **Exact Arithmetic**: Use high-precision arithmetic to minimize rounding errors in calculations
- **UI Components**: Modular component structure for maintainability
- **State Management**: Simple state management for form inputs and calculations
- **PWA Shell**: Efficient caching strategy for offline functionality
- **Type Safety**: Comprehensive TypeScript interfaces for all data structures

### Brier Scoring Implementation Details
The application uses Brier scoring, a proper scoring rule that rewards accuracy in probability predictions:

#### Formula (Original Brier Definition)
- **Brier Score**: BS = (1/N) × Σ(t=1 to N) Σ(i=1 to R) (f_ti - o_ti)²
  - N = number of instances (for single wagers, N=1, so the formula simplifies but we maintain the general form)
  - R = number of possible outcomes (e.g., R=2 for Yes/No, R=3 for Cold/Normal/Warm)
  - f_ti = predicted probability for outcome i in instance t (as decimal, e.g., 0.7 for 70%)
  - o_ti = 1 if outcome i occurs in instance t, 0 otherwise
  - Lower scores are better (0 = perfect prediction, 2 = worst possible)

#### Payout Calculation
- **Amount in Play**: Minimum of all participants' maximum contributions
- **Individual Payout**: (Amount in Play) × (Average Others' Brier Score - My Brier Score) / 2
- **Settlement**: Simplified payments between participants to achieve net payouts

#### Key Properties
- **Proper Scoring**: Participants maximize expected payout by reporting true beliefs
- **Zero Sum**: Total payouts across all participants always equal zero
- **Fair**: Expected payout is zero when probabilities match true frequencies
- **Multi-categorical**: Handles both binary (R=2) and multi-categorical (R>2)
  outcomes seamlessly. In the backend, binary should just be a special case of multi-categorical.

## Development & Deployment Toolchain

### Development Environment
- **Package Manager**: npm or yarn
- **Build Tool**: Vite (TypeScript + PWA plugins)
- **Development Server**: Vite dev server with HMR
- **TypeScript Configuration**: Strict mode with comprehensive type checking

### Testing Strategy (Imperative)
- **Unit Tests**: Jest for mathematical calculation modules (Brier scoring, settlement calculations)
- **Integration Tests**: Testing Library for component interactions
- **E2E Tests**: Playwright for full user workflow testing
- **Test Coverage**: Minimum 90% coverage for calculation logic
- **Test Types**:
  - Mathematical accuracy tests (Brier scoring calculations, exact arithmetic)
  - Payout and settlement calculation tests
  - UI component behavior tests
  - Input validation tests
  - PWA functionality tests
  - Cross-browser compatibility tests
- **Test Data**: Use exact scenarios from data generation scripts to verify calculations

### Code Quality Tools
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier for consistent code style
- **Type Checking**: TypeScript compiler with strict configuration
- **Pre-commit Hooks**: Husky + lint-staged for automated quality checks

### Build Process
- **Development Build**: Fast compilation with source maps
- **Production Build**: Optimized bundle with tree-shaking
- **PWA Generation**: Automatic service worker and manifest generation
- **Bundle Analysis**: Bundle size optimization and analysis

### Deployment Options
- **Static Hosting**: Netlify, Vercel, or GitHub Pages
- **CDN**: Automatic global distribution
- **HTTPS**: Required for PWA features
- **Continuous Deployment**: Automated deployment on git push

### Recommended Project Structure
```
wager-calculator/
├── src/
│   ├── components/          # UI components
│   ├── modules/            # Calculation logic (Brier scoring, settlements)
│   ├── types/              # TypeScript interfaces
│   ├── utils/              # Utility functions
│   ├── styles/             # CSS/SCSS files
│   └── main.ts             # Application entry point
├── public/                 # Static assets
├── tests/                  # Test files
├── docs/                   # Documentation
├── data/                   # Test scenarios and generation scripts
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── jest.config.js          # Jest configuration
├── playwright.config.ts    # E2E test configuration
└── package.json            # Dependencies and scripts
```

### CI/CD Pipeline
- **Pull Request Checks**: Automated testing, linting, and type checking
- **Automated Testing**: Run full test suite on multiple browsers/devices
- **Build Verification**: Ensure production build succeeds
- **Deployment**: Automatic deployment to staging/production environments
- **Performance Monitoring**: Bundle size and performance regression detection
