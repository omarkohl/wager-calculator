# Wager Calculator Application Specification

## Overview
A client-side Progressive Web App (PWA) that calculates fair betting odds for friendly wagers using logarithmic scoring rules. The application functions as a calculator without user accounts or data storage, focusing on binary and multi-categorical betting scenarios.

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
- **Participant Names**: 
  - Default: "Person A" and "Person B"
  - Editable text fields for custom names
- **Currency Selection**: Dropdown with common currencies (USD, EUR, GBP, CAD, etc.)

#### Binary Bet Inputs
- **Claim Statement**: Text describing the binary outcome
- **Person A Probability**: Slider (0-100%) + percentage input field
- **Person B Probability**: Slider (0-100%) + percentage input field
- **Person A Max Contribution**: Numerical input
- **Person B Max Contribution**: Numerical input

#### Multi-categorical Bet Inputs
- **Category Definition**: Up to 8 custom ranges/categories
  - Text field for category name/range (e.g., "0-5 people", "6-10 people")
  - Probability input for each participant per category
  - Add/Remove category buttons
- **Maximum Contributions**: Same as binary bets

#### Validation & Warnings
- **Probability Sum Check**: Warning if total probabilities ≠ 100%
- **Extreme Payout Warning**: Alert when logarithmic scoring could result in very large payouts (e.g., when probabilities < 5% or > 95%)
- **Input Validation**: Ensure all required fields are filled

### 3. Calculation Engine

#### Logarithmic Scoring Rule Implementation
- Calculate fair odds using logarithmic scoring: Score = log(probability of actual outcome)
- Determine optimal bet amounts within maximum contribution constraints
- Ensure positive expected value for both participants where mathematically possible

#### Mathematical Display
- **Default**: Hide mathematical formulas
- **On Request**: Expandable section showing:
  - Logarithmic scoring formula
  - Calculation steps
  - Expected value calculations for each participant

### 4. Output Display

#### Results Section
- **Clear Payout Structure**: 
  - Binary: "If YES, [Person A] pays [Person B] $X. If NO, [Person B] pays [Person A] $Y"
  - Multi-categorical: Similar format for each possible outcome
- **Bet Summary**: Include all input information:
  - Participant names
  - Bet title and details
  - Bet deadline (if specified)
  - Assigned probabilities
  - Maximum contributions
  - Currency used
  - Calculated fair odds

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
1. User selects binary bet type
2. Enters bet title and optional details
3. Optionally sets bet deadline
4. Inputs participant names (or uses defaults)
5. Selects currency
6. Sets probabilities via sliders or direct input
7. Enters maximum contributions
8. Views validation warnings if any
9. Sees calculated fair odds and payout structure
10. Shares results via text or screenshot

#### Multi-categorical Flow
1. User selects multi-categorical bet type
2. Enters bet title and optional details
3. Optionally sets bet deadline
4. Defines categories (up to 8)
5. Assigns probabilities for each participant per category
6. Enters maximum contributions
7. Views validation warnings
8. Sees calculated outcomes for all categories
9. Shares comprehensive bet terms

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
- Handle cases where fair betting isn't possible within contribution limits
- Provide clear explanations when calculations fail
- Suggest alternative parameters when needed

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
- Additional proper scoring rules (quadratic, linear)
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
- **Calculation Module**: Separate TypeScript module for all mathematical operations
- **UI Components**: Modular component structure for maintainability
- **State Management**: Simple state management for form inputs and calculations
- **PWA Shell**: Efficient caching strategy for offline functionality
- **Type Safety**: Comprehensive TypeScript interfaces for all data structures

## Development & Deployment Toolchain

### Development Environment
- **Package Manager**: npm or yarn
- **Build Tool**: Vite (TypeScript + PWA plugins)
- **Development Server**: Vite dev server with HMR
- **TypeScript Configuration**: Strict mode with comprehensive type checking

### Testing Strategy (Imperative)
- **Unit Tests**: Jest for mathematical calculation modules
- **Integration Tests**: Testing Library for component interactions
- **E2E Tests**: Playwright for full user workflow testing
- **Test Coverage**: Minimum 90% coverage for calculation logic
- **Test Types**:
  - Mathematical accuracy tests (logarithmic scoring calculations)
  - UI component behavior tests
  - Input validation tests
  - PWA functionality tests
  - Cross-browser compatibility tests

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
│   ├── modules/            # Calculation logic
│   ├── types/              # TypeScript interfaces
│   ├── utils/              # Utility functions
│   ├── styles/             # CSS/SCSS files
│   └── main.ts             # Application entry point
├── public/                 # Static assets
├── tests/                  # Test files
├── docs/                   # Documentation
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
