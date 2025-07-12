# Wager Calculator Development Plan

## Overview
This plan breaks down the development of the Wager Calculator PWA into small, verifiable steps using Test-Driven Development (TDD). Each step can be completed and tested independently to ensure correctness before proceeding.

## Phase 1: Project Setup & Infrastructure (Estimated: 3-4 hours)

### Step 1.1: Initialize Project Structure
- [x] Create project directory structure as specified
- [x] Initialize npm/yarn project with `package.json`
- [x] Set up basic folder structure: `src/`, `public/`, `tests/`, `docs/`
- [x] Initialize git repository with proper `.gitignore`
- **Verification**: Directory structure matches specification, `package.json` exists ✅

### Step 1.2: GitHub Repository Setup
- [ ] Create GitHub repository (public/private as preferred)
- [ ] Set up repository description and topics
- [ ] Add LICENSE file (MIT recommended for open source)
- [ ] Configure repository settings and branch protection
- **Verification**: Repository is properly configured and accessible

### Step 1.3: GitHub Templates & Automation
- [x] Create `.github/` directory structure
- [x] Add issue templates for bug reports and feature requests
- [x] Create pull request template
- [x] Set up GitHub Actions workflow for CI/CD
- [x] Add security policy and contributing guidelines
- **Verification**: All GitHub templates are functional and professional

### Step 1.4: Configure Build Tools
- [ ] Install and configure Vite with TypeScript support
- [ ] Install PWA plugin for Vite (`vite-plugin-pwa`)
- [ ] Create `vite.config.ts` with basic configuration
- [ ] Set up development server
- **Verification**: `npm run dev` starts development server successfully

### Step 1.5: TypeScript Configuration
- [ ] Create `tsconfig.json` with strict configuration
- [ ] Set ES2020+ target as specified
- [ ] Configure path aliases for clean imports
- **Verification**: TypeScript compiler runs without errors

### Step 1.6: Code Quality Tools Setup
- [ ] Install and configure ESLint with TypeScript rules
- [ ] Install and configure Prettier
- [ ] Set up Husky and lint-staged for pre-commit hooks
- [ ] Create `.eslintrc.js`, `.prettierrc`, and related config files
- **Verification**: Linting and formatting work correctly

## Phase 2: Testing Framework Setup (TDD Foundation) (Estimated: 2-3 hours)

### Step 2.1: Unit Testing Setup
- [ ] Install and configure Jest
- [ ] Install Testing Library for component tests
- [ ] Create basic test configuration with TypeScript support
- [ ] Set up test scripts in package.json
- [ ] Create example failing test to verify setup
- **Verification**: Test runner works, can run empty test suite

### Step 2.2: E2E Testing Setup
- [ ] Install and configure Playwright
- [ ] Create basic E2E test configuration
- [ ] Set up test environment for cross-browser testing
- [ ] Create example E2E test
- **Verification**: E2E framework can run basic navigation tests

### Step 2.3: Test Coverage and CI Integration
- [ ] Configure test coverage reporting
- [ ] Set up test coverage thresholds (90% for calculation logic)
- [ ] Integrate tests into GitHub Actions workflow
- [ ] Set up automated test reporting
- **Verification**: Coverage reports generate correctly, CI runs tests

## Phase 3: Core Types & Data Structures (TDD) (Estimated: 1-2 hours)

### Step 3.1: Define TypeScript Interfaces (TDD)
- [ ] Write tests for type validation utilities first
- [ ] Create `src/types/index.ts` with core interfaces:
  - `BetType` enum (Binary, MultiCategorical)
  - `Currency` enum/type
  - `Participant` interface
  - `BinaryBet` interface
  - `MultiCategoricalBet` interface
  - `BetResult` interface
  - `CalculationResult` interface
- [ ] Run tests to ensure type safety
- **Verification**: All types compile without errors, comprehensive coverage

### Step 3.2: Create Utility Types (TDD)
- [ ] Write tests for validation result types
- [ ] Add error handling types
- [ ] Add sharing/export types
- [ ] Create type guard functions with tests
- **Verification**: Type definitions are complete and well-documented

## Phase 4: Mathematical Calculation Engine (TDD) (Estimated: 4-5 hours)

### Step 4.1: Basic Logarithmic Scoring Implementation (TDD)
- [ ] Write failing tests for logarithmic scoring function
- [ ] Create `src/modules/calculation.ts`
- [ ] Implement basic logarithmic scoring function to pass tests
- [ ] Add function to calculate score given probability and outcome
- [ ] Refactor and add edge case tests
- **Verification**: Basic scoring calculation works with simple test cases, 90%+ coverage

### Step 4.2: Binary Bet Calculations (TDD)
- [ ] Write comprehensive tests for binary bet scenarios
- [ ] Write tests for edge cases (extreme probabilities)
- [ ] Implement fair odds calculation for binary bets
- [ ] Add optimal bet amount calculation within contribution limits
- [ ] Ensure positive expected value where possible
- [ ] Refactor based on test feedback
- **Verification**: Binary calculations produce mathematically correct results

### Step 4.3: Multi-categorical Bet Calculations (TDD)
- [ ] Write tests for 2-8 category scenarios
- [ ] Write tests for probability distribution validation
- [ ] Extend calculation engine for multiple categories
- [ ] Handle up to 8 categories as specified
- [ ] Calculate payouts for all possible outcomes
- [ ] Add comprehensive edge case tests
- **Verification**: Multi-categorical calculations are accurate

### Step 4.4: Edge Case Handling (TDD)
- [ ] Write tests for division by zero scenarios
- [ ] Write tests for extreme probability values (< 5%, > 95%)
- [ ] Write tests for impossible betting scenarios
- [ ] Implement error handling to pass tests
- [ ] Handle cases where fair betting isn't possible within limits
- **Verification**: All edge cases handled gracefully with appropriate error messages

### Step 4.5: Validation Logic (TDD)
- [ ] Write tests for probability sum validation
- [ ] Write tests for extreme payout warnings
- [ ] Write tests for input validation functions
- [ ] Implement probability sum validation (should equal 100%)
- [ ] Add extreme payout warnings
- [ ] Create input validation functions
- **Verification**: All validation rules work correctly

## Phase 5: Basic UI Components (TDD) (Estimated: 6-8 hours)

### Step 5.1: Application Shell (TDD)
- [ ] Write tests for main app component
- [ ] Create `src/main.ts` as application entry point
- [ ] Set up basic HTML structure in `index.html`
- [ ] Create main App component structure
- [ ] Test component rendering and basic functionality
- **Verification**: Basic app loads and displays in browser

### Step 5.2: Input Components (TDD)
- [ ] Write tests for each input component
- [ ] Create text input component for bet title
- [ ] Create textarea component for details
- [ ] Create date/time picker for deadline
- [ ] Create currency dropdown component
- [ ] Test component interactions and validation
- **Verification**: All input components render and accept user input

### Step 5.3: Participant Name Components (TDD)
- [ ] Write tests for name field validation
- [ ] Create editable name fields with defaults ("Person A", "Person B")
- [ ] Implement name validation and character limits
- [ ] Test edge cases and error handling
- **Verification**: Names can be edited and validated properly

### Step 5.4: Bet Type Toggle (TDD)
- [ ] Write tests for bet type switching
- [ ] Create toggle/radio button for Binary vs Multi-categorical
- [ ] Implement state management for bet type changes
- [ ] Test state transitions and UI updates
- **Verification**: Toggle works and shows appropriate input sections

## Phase 6: Binary Bet Interface (TDD) (Estimated: 4-5 hours)

### Step 6.1: Probability Input Components (TDD)
- [ ] Write tests for slider/input synchronization
- [ ] Create dual slider/input components for probabilities
- [ ] Implement real-time synchronization between slider and text input
- [ ] Add percentage formatting and validation (0-100%)
- [ ] Test edge cases and user interactions
- **Verification**: Probability inputs work smoothly, stay in sync

### Step 6.2: Contribution Input Components (TDD)
- [ ] Write tests for currency input validation
- [ ] Create numerical input fields for max contributions
- [ ] Add currency formatting
- [ ] Implement validation for positive numbers
- [ ] Test various input scenarios
- **Verification**: Contribution inputs accept valid numbers only

### Step 6.3: Binary Bet Form Integration (TDD)
- [ ] Write integration tests for complete binary form
- [ ] Integrate all binary bet components into main form
- [ ] Implement form state management
- [ ] Add real-time validation feedback
- [ ] Test complete user workflows
- **Verification**: Complete binary bet form works end-to-end

## Phase 7: Multi-categorical Bet Interface (TDD) (Estimated: 5-6 hours)

### Step 7.1: Category Management (TDD)
- [ ] Write tests for dynamic category operations
- [ ] Create add/remove category buttons
- [ ] Implement dynamic category list (up to 8 categories)
- [ ] Create category name/range input fields
- [ ] Test category limit enforcement
- **Verification**: Categories can be added, removed, and named

### Step 7.2: Multi-categorical Probability Matrix (TDD)
- [ ] Write tests for probability matrix validation
- [ ] Create probability input grid (participants × categories)
- [ ] Implement validation for probability sums per participant
- [ ] Add visual feedback for invalid probability distributions
- [ ] Test matrix operations with 1-8 categories
- **Verification**: Probability matrix works for all category counts (1-8)

### Step 7.3: Multi-categorical Form Integration (TDD)
- [ ] Write comprehensive integration tests
- [ ] Integrate category components with main form
- [ ] Implement state management for dynamic categories
- [ ] Add comprehensive validation for multi-categorical bets
- [ ] Test complete multi-categorical workflows
- **Verification**: Complete multi-categorical form works correctly

## Phase 8: Calculation Integration & Results Display (TDD) (Estimated: 4-5 hours)

### Step 8.1: Real-time Calculation Integration (TDD)
- [ ] Write tests for calculation triggers and updates
- [ ] Connect UI inputs to calculation engine
- [ ] Implement real-time calculation updates
- [ ] Handle calculation errors gracefully
- [ ] Test performance with rapid input changes
- **Verification**: Calculations update automatically as inputs change

### Step 8.2: Results Display Components (TDD)
- [ ] Write tests for result formatting and display
- [ ] Create payout structure display for binary bets
- [ ] Create outcome display for multi-categorical bets
- [ ] Format monetary amounts according to selected currency
- [ ] Test with various currencies and amounts
- **Verification**: Results display clearly and accurately

### Step 8.3: Bet Summary Component (TDD)
- [ ] Write tests for summary completeness
- [ ] Display all input information in organized summary
- [ ] Include participant names, probabilities, contributions
- [ ] Show calculated fair odds prominently
- [ ] Test summary with various bet configurations
- **Verification**: Summary includes all required information

### Step 8.4: Mathematical Details (TDD)
- [ ] Write tests for mathematical display accuracy
- [ ] Create expandable section for calculation details
- [ ] Show logarithmic scoring formula
- [ ] Display step-by-step calculations
- [ ] Show expected value calculations
- [ ] Test mathematical accuracy against manual calculations
- **Verification**: Mathematical details are accurate and helpful

## Phase 9: Validation & Warning System (TDD) (Estimated: 2-3 hours)

### Step 9.1: Probability Validation UI (TDD)
- [ ] Write tests for validation message display
- [ ] Implement visual warnings for probability sum ≠ 100%
- [ ] Show clear error messages for invalid inputs
- [ ] Add helpful suggestions for fixing validation errors
- [ ] Test validation with various invalid inputs
- **Verification**: Validation warnings are clear and actionable

### Step 9.2: Extreme Payout Warnings (TDD)
- [ ] Write tests for extreme value detection
- [ ] Detect extreme probability values (< 5%, > 95%)
- [ ] Display warnings about potential large payouts
- [ ] Explain implications of extreme probabilities
- [ ] Test warning thresholds and messaging
- **Verification**: Warnings appear at appropriate thresholds

## Phase 10: Styling & Mobile-First Design (Estimated: 6-8 hours)

### Step 10.1: Base Styling System
- [ ] Create CSS custom properties for consistent theming
- [ ] Implement mobile-first responsive breakpoints
- [ ] Set up typography system with readable fonts
- [ ] Test responsive design across devices
- **Verification**: Basic styling looks good on mobile and desktop

### Step 10.2: Component Styling
- [ ] Style all input components with touch-friendly sizing
- [ ] Implement consistent spacing and visual hierarchy
- [ ] Add hover and focus states for interactive elements
- [ ] Test touch interactions on mobile devices
- **Verification**: All components are visually polished

### Step 10.3: Results Display Styling
- [ ] Style results section for clarity and professional appearance
- [ ] Ensure results are screenshot-friendly
- [ ] Implement print-friendly styles
- [ ] Test visual layout with various content lengths
- **Verification**: Results look professional and shareable

### Step 10.4: Accessibility Implementation
- [ ] Add proper ARIA labels and roles
- [ ] Ensure keyboard navigation works throughout
- [ ] Test with screen readers
- [ ] Verify color contrast meets WCAG standards
- [ ] Test with accessibility tools
- **Verification**: App is fully accessible via keyboard and screen readers

## Phase 11: Sharing Features (TDD) (Estimated: 3-4 hours)

### Step 11.1: Text Export Feature (TDD)
- [ ] Write tests for text export format
- [ ] Implement plain text export of bet terms
- [ ] Format text for easy copy-paste sharing
- [ ] Include all relevant bet information
- [ ] Test export with various bet configurations
- **Verification**: Text export includes complete bet information

### Step 11.2: Screenshot Feature (TDD)
- [ ] Write tests for image generation
- [ ] Implement HTML-to-image conversion for bet summary
- [ ] Add screenshot button with download functionality
- [ ] Optimize image quality and size
- [ ] Test screenshot generation across browsers
- **Verification**: Screenshots generate correctly and look professional

### Step 11.3: Web Share API Integration (TDD)
- [ ] Write tests for sharing functionality
- [ ] Implement native sharing on mobile devices
- [ ] Add fallback for desktop browsers
- [ ] Test sharing functionality across platforms
- [ ] Handle sharing errors gracefully
- **Verification**: Sharing works on all target devices

## Phase 12: PWA Implementation (Estimated: 3-4 hours)

### Step 12.1: Service Worker Setup
- [ ] Configure Vite PWA plugin for service worker generation
- [ ] Implement caching strategy for offline functionality
- [ ] Test offline functionality
- [ ] Test service worker updates
- **Verification**: App works completely offline

### Step 12.2: Web App Manifest
- [ ] Create comprehensive web app manifest
- [ ] Add app icons in multiple sizes
- [ ] Configure install prompts and behavior
- [ ] Test installation on various devices
- **Verification**: App can be installed on mobile and desktop

### Step 12.3: PWA Optimization
- [ ] Optimize caching strategy for performance
- [ ] Implement update notifications
- [ ] Test PWA features across browsers
- [ ] Test offline-to-online transitions
- **Verification**: PWA features work correctly on all target browsers

## Phase 13: Performance Optimization (Estimated: 2-3 hours)

### Step 13.1: Bundle Optimization
- [ ] Analyze bundle size and optimize imports
- [ ] Implement code splitting if beneficial
- [ ] Optimize asset loading and caching
- [ ] Run performance benchmarks
- **Verification**: Bundle size is minimal, load times meet requirements

### Step 13.2: Runtime Performance
- [ ] Optimize calculation performance for real-time updates
- [ ] Ensure smooth slider interactions
- [ ] Test performance on lower-end devices
- [ ] Profile and optimize critical paths
- **Verification**: App performs smoothly on all target devices

## Phase 14: Comprehensive Testing (Estimated: 4-5 hours)

### Step 14.1: Complete Unit Test Suite
- [ ] Achieve 90%+ test coverage for calculation logic
- [ ] Test all UI components thoroughly
- [ ] Test error handling and edge cases
- [ ] Review and improve test quality
- **Verification**: All tests pass, coverage requirements met

### Step 14.2: Integration Testing
- [ ] Test complete user workflows for binary bets
- [ ] Test complete user workflows for multi-categorical bets
- [ ] Test sharing and export features
- [ ] Test PWA functionality end-to-end
- **Verification**: All user workflows work end-to-end

### Step 14.3: Cross-browser Testing
- [ ] Test on Chrome, Firefox, Safari, Edge (latest 2 versions)
- [ ] Test on mobile browsers (iOS Safari, Chrome Mobile)
- [ ] Verify PWA features work across browsers
- [ ] Test responsive design across devices
- **Verification**: App works consistently across all target browsers

### Step 14.4: Performance Testing
- [ ] Verify load times meet requirements (< 3s on 3G)
- [ ] Test calculation performance with extreme inputs
- [ ] Verify smooth operation on mobile devices
- [ ] Run automated performance tests
- **Verification**: Performance requirements are met

## Phase 15: Documentation & Deployment (Estimated: 3-4 hours)

### Step 15.1: Core Documentation
- [x] Create comprehensive README.md with project overview
- [ ] Update README with live demo link
- [ ] Add installation and development instructions
- [ ] Include usage examples and screenshots
- **Verification**: README is informative and professionally formatted

### Step 15.2: Technical Documentation
- [ ] Create ARCHITECTURE.md explaining system design
- [ ] Document API interfaces in docs/API.md
- [ ] Create DEPLOYMENT.md with hosting instructions
- [ ] Add mathematical formulas documentation
- **Verification**: Technical docs are comprehensive and accurate

### Step 15.3: User Documentation
- [ ] Create user guide for binary bets
- [ ] Create user guide for multi-categorical bets
- [ ] Document sharing features
- [ ] Add troubleshooting section and FAQ
- **Verification**: User documentation is clear and helpful

### Step 15.4: Deployment Setup
- [ ] Configure deployment to static hosting (Netlify/Vercel)
- [ ] Set up HTTPS for PWA requirements
- [ ] Test production deployment
- [ ] Set up automated deployment from main branch
- **Verification**: App deploys successfully and works in production

### Step 15.5: CI/CD Pipeline
- [ ] Verify automated testing on pull requests
- [ ] Configure automated deployment
- [ ] Set up performance monitoring
- [ ] Test complete CI/CD workflow
- **Verification**: CI/CD pipeline works correctly

## Phase 16: Security & Maintenance Setup (Estimated: 2-3 hours)

### Step 16.1: Security Configuration
- [ ] Set up Content Security Policy (CSP) headers
- [ ] Configure secure headers for production deployment
- [ ] Implement input sanitization for all user inputs
- [ ] Add dependency vulnerability scanning
- **Verification**: Security audit passes, no critical vulnerabilities

### Step 16.2: Monitoring & Analytics
- [ ] Set up basic error tracking (Sentry or similar)
- [ ] Implement performance monitoring
- [ ] Add bundle size monitoring
- [ ] Configure uptime monitoring for production
- **Verification**: Monitoring systems are functional

### Step 16.3: Maintenance Automation
- [ ] Set up automated dependency updates (Dependabot)
- [ ] Configure security advisories
- [ ] Create maintenance schedules and checklists
- [ ] Document maintenance procedures
- **Verification**: Automated systems are working correctly

## Success Criteria Verification

### Usability Test
- [ ] Users can create and share bets within 2 minutes
- [ ] Test with actual users to verify workflow efficiency
- **Verification**: Timed user testing meets requirements

### Accuracy Test
- [ ] Mathematical calculations verified against manual calculations
- [ ] Edge cases produce expected results
- [ ] No mathematical errors in any scenario
- **Verification**: All calculations are mathematically sound

### Accessibility Test
- [ ] App works with keyboard navigation only
- [ ] Screen reader compatibility verified
- [ ] Color contrast meets WCAG AA standards
- **Verification**: Full accessibility compliance achieved

### Cross-platform Test
- [ ] App works on all target devices and browsers
- [ ] PWA features function correctly everywhere
- [ ] Performance is acceptable on all platforms
- **Verification**: Universal compatibility confirmed

## Estimated Total Development Time: 65-85 hours

### Time Breakdown:
- **Infrastructure & Setup**: 3-4 hours
- **Testing Framework Setup**: 2-3 hours  
- **Core Logic & Testing (TDD)**: 12-15 hours
- **UI Development (TDD)**: 22-28 hours
- **PWA & Performance**: 5-7 hours
- **Comprehensive Testing**: 4-5 hours
- **Documentation & Deployment**: 3-4 hours
- **Security & Maintenance Setup**: 2-3 hours
- **Buffer for TDD iterations**: 12-16 hours

## TDD Development Notes

### TDD Workflow for Each Feature:
1. **Red**: Write failing tests that define the desired behavior
2. **Green**: Write minimal code to make tests pass
3. **Refactor**: Improve code quality while keeping tests green
4. **Repeat**: Add more tests for edge cases and additional functionality

### Testing Priorities:
1. **Mathematical accuracy**: Highest priority - 90%+ coverage required
2. **User workflows**: Critical paths must have integration tests
3. **Edge cases**: All error conditions and boundary cases
4. **Cross-browser compatibility**: E2E tests on all target browsers
5. **Performance**: Automated performance regression tests

### Key TDD Benefits for This Project:
- **Mathematical confidence**: Tests ensure calculation accuracy
- **Regression prevention**: Changes don't break existing functionality
- **Documentation**: Tests serve as living specification
- **Refactoring safety**: Can improve code structure confidently
- **Edge case coverage**: Systematic approach to error handling

## Additional Features to Consider (Future Phases)

### Internationalization
- [ ] i18n framework setup for multi-language support
- [ ] Currency formatting for different locales
- [ ] Date/time formatting for different regions
- [ ] Text direction support (RTL languages)

### Enhanced Accessibility Features
- [ ] High contrast mode toggle
- [ ] Font size adjustment controls
- [ ] Voice-over optimization for mobile
- [ ] Keyboard shortcut implementation

### Advanced Mathematical Features
- [ ] Alternative scoring rules (quadratic, Brier score)
- [ ] Confidence intervals for calculations
- [ ] Monte Carlo simulation options
- [ ] Risk assessment indicators

### Enhanced Sharing & Export
- [ ] QR code generation for bet terms
- [ ] Calendar integration for bet deadlines
- [ ] Email templates for bet sharing
- [ ] Print-optimized layouts

This plan ensures a systematic, test-driven approach to building a production-ready Wager Calculator PWA that meets all specification requirements while maintaining high code quality and mathematical accuracy.
