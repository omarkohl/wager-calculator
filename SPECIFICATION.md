# Wager Calculator Application Specification

## Overview
A client-side Progressive Web App (PWA) that calculates fair betting odds for friendly wagers using Brier scoring rules. The application functions as a calculator without user accounts or data storage, focusing on binary and multi-categorical betting scenarios.

## Core Features

### 1. Bet Types
- **Binary Bets**: Simple YES/NO outcomes (primary use case)
- **Multi-categorical Bets**: Up to 8 custom-defined categories with disjoint ranges

### 2. User Interface Components

#### Input Section
- **Bet Title**: Text field for the main claim/question
- **Details** (Optional): Multi-line text field for resolution criteria and additional context
- **Deadline** (Optional): Date/time picker for bet resolution deadline
- **Bet Type**: Toggle between Binary and Multi-categorical
- **Participants**: 
  - Default: 2 participants ("Person A" and "Person B")
  - Support for 2-8 participants with add/remove participant buttons
  - Editable text fields for custom names
  - Maximum Bet: Numerical input for each participant
- **Currency Selection**: Dropdown with common currencies (USD, EUR, GBP, CAD, etc.)

#### Binary Bet Inputs
- **Claim Statement**: Text describing the binary outcome
- **Probability Inputs**: For each participant (2-8):
  - Slider (0-100%) + percentage input field for YES outcome probability
  - NO probability automatically calculated as (100% - YES probability)

#### Multi-categorical Bet Inputs
- **Category Definition**: Up to 8 custom ranges/categories
  - Text field for category name/range (e.g., "0-5 people", "6-10 people")
  - Probability input for each participant (2-8) per category
  - Add/Remove category buttons

#### Validation & Warnings
- **Probability Sum Check**: Warning if total probabilities ≠ 100%
  - Add a button to scale probabilities so they add up to 100%
- **Input Validation**: Ensure all required fields are filled

### 3. Calculation Engine

#### Brier Scoring Rule Implementation
- Calculate fair odds using the original Brier scoring formula for multi-categorical outcomes
- For each outcome, calculate individual Brier scores for each participant using: BS = (1/N) × Σ(t=1 to N) Σ(i=1 to R) (f_ti - o_ti)²
  - Where R = number of possible categories, N = number of instances (always 1 for single predictions)
  - f_ti = predicted probability for category i, o_ti = 1 if category i occurs, 0 otherwise
- Calculate average Brier score of other participants for comparison
- Determine payouts based on performance relative to others: Payout = (amount_in_play) × (avg_others_brier - my_brier) / 2
- Amount in play is determined by the minimum of all participants' maximum contributions
- Ensure payouts sum to zero across all participants

#### Mathematical Display
- **Default**: Hide mathematical formulas
- **On Request**: Expandable section showing:
  - Brier scoring formula and calculation steps
  - Individual Brier scores for each participant
  - Average Brier scores of others
  - Payout calculations for each possible outcome
  - Settlement structure between participants

### 4. Output Display

#### Results Section
- **Clear Payout Structure**:
  - Binary: "If YES, [Participant names] pay/receive [amounts]. If NO, [Participant names] pay/receive [amounts]"
  - Multi-categorical: Similar format showing all possible outcomes and corresponding payouts for all participants
- **Settlement Details**: Show simplified payment structure (who pays whom and how much) for each possible outcome
- **Bet Summary**: Include relevant input information:
  - All participant names and their probability assessments
  - Bet title and details
  - Bet deadline (if specified)
  - Maximum amount in play
  - Amount in play (minimum of all max contributions)

#### Sharing Features
- **Visual Design**: Clean, professional layout suitable for screenshots
- **Text Export**: Plain text format for copy-paste sharing
- **Built-in Sharing**: Web Share API for native sharing on mobile devices
- **Screenshot Button**: Generate and save image of bet terms

### 5. Technical Requirements

#### Platform
- **Progressive Web App (PWA)**
- **Cross-platform**: Mobile-first responsive design, desktop compatible
- **Offline Capability**: Full functionality without internet connection
- **Installable**: Can be added to home screen/desktop

#### Technology Stack
- **Frontend**: HTML5, CSS3, TypeScript (ES2020+ target)
- **Build System**: Vite for development and bundling
- **Testing**: Jest + Testing Library for unit/integration tests
- **PWA Features**: Service worker, web app manifest
- **Type Checking**: Strict TypeScript configuration
- **No Backend**: Entirely client-side application
- **No Data Storage**: No user accounts, history, or persistent data

#### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Mobile Browsers**: iOS Safari, Chrome Mobile, Samsung Internet

### 6. User Experience Flow

#### Binary Bet Flow
1. Adds participants (defaults to 2, can add up to 8 total)
2. Inputs participant names (or uses defaults)
3. Enters maximum contributions for each participant
4. Selects currency
5. User selects binary bet type
6. Enters bet title and optional details
7. Optionally sets bet deadline
8. Sets probabilities for YES outcome via sliders or direct input for each participant
9. Views validation warnings if any
10. Sees calculated fair odds and payout structure for all participants
11. Shares results via text or screenshot

#### Multi-categorical Flow
1. Adds participants (defaults to 2, can add up to 8 total)
2. Inputs participant names (or uses defaults)
3. Enters maximum contributions for each participant
4. Selects currency
5. User selects multi-categorical bet type
6. Enters bet title and optional details
7. Optionally sets bet deadline
8. Sets probabilities per participant and category
9. Views validation warnings if any
10. Sees calculated fair odds and payout structure for all participants
11. Shares results via text or screenshot

### 7. Design Principles

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

### 8. Error Handling & Edge Cases

#### Input Validation
- Handle invalid probability inputs gracefully
- Prevent division by zero scenarios
- Manage extreme probability values

#### Mathematical Edge Cases
- Handle cases where Brier scoring produces payouts close to the maximum
- Manage scenarios where participants have identical probability assessments
- Handle edge cases in settlement calculations (very small amounts)
- Provide clear explanations when calculations produce warnings
- Ensure numerical precision in Brier score and payout calculations
- Handle rounding errors in payouts

### 9. Performance Requirements

#### Load Time
- Initial page load < 3 seconds on 3G connection
- Instant calculations and UI updates
- Smooth slider interactions

#### Offline Functionality
- Full feature set available without internet
- Service worker caching for instant re-launches

### 10. Future Considerations

#### Potential Enhancements
- Additional proper scoring rules (logarithmic, quadratic)
- Import/export of bet configurations
- Integration with calendar apps for bet deadlines
- Multi-language support

#### Scalability
- Architecture should support additional bet types
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

#### Formula (Original Brier Definition for Multi-categorical Outcomes)
- **Brier Score**: BS = (1/N) × Σ(t=1 to N) Σ(i=1 to R) (f_ti - o_ti)²
  - R = number of possible categories (e.g., R=2 for Rain/No Rain, R=3 for Cold/Normal/Warm)
  - N = number of instances (for single predictions, N=1)
  - f_ti = predicted probability for category i in instance t
  - o_ti = 1 if category i occurs in instance t, 0 otherwise
  - Lower scores are better (0 = perfect prediction)

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
