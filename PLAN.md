# Wager Calculator Development Plan

## Overview
This plan breaks down the development of the Wager Calculator PWA into small, verifiable steps. Each step can be completed and tested independently to ensure correctness before proceeding.

## Phase 1: Project Setup & Infrastructure (Estimated: 2-3 hours)

### Step 1.1: Initialize Project Structure
- [ ] Create project directory structure as specified
- [ ] Initialize npm/yarn project with `package.json`
- [ ] Set up basic folder structure: `src/`, `public/`, `tests/`, `docs/`
- **Verification**: Directory structure matches specification, `package.json` exists

### Step 1.2: Configure Build Tools
- [ ] Install and configure Vite with TypeScript support
- [ ] Install PWA plugin for Vite (`vite-plugin-pwa`)
- [ ] Create `vite.config.ts` with basic configuration
- [ ] Set up development server
- **Verification**: `npm run dev` starts development server successfully

### Step 1.3: TypeScript Configuration
- [ ] Create `tsconfig.json` with strict configuration
- [ ] Set ES2020+ target as specified
- [ ] Configure path aliases for clean imports
- **Verification**: TypeScript compiler runs without errors

### Step 1.4: Code Quality Tools Setup
- [ ] Install and configure ESLint with TypeScript rules
- [ ] Install and configure Prettier
- [ ] Set up Husky and lint-staged for pre-commit hooks
- [ ] Create `.eslintrc.js`, `.prettierrc`, and related config files
- **Verification**: Linting and formatting work correctly

## Phase 2: Core Types & Data Structures (Estimated: 1-2 hours)

### Step 2.1: Define TypeScript Interfaces
- [ ] Create `src/types/index.ts` with core interfaces:
  - `BetType` enum (Binary, MultiCategorical)
  - `Currency` enum/type
  - `Participant` interface
  - `BinaryBet` interface
  - `MultiCategoricalBet` interface
  - `BetResult` interface
  - `CalculationResult` interface
- **Verification**: All types compile without errors, comprehensive coverage

### Step 2.2: Create Utility Types
- [ ] Add validation result types
- [ ] Add error handling types
- [ ] Add sharing/export types
- **Verification**: Type definitions are complete and well-documented

## Phase 3: Mathematical Calculation Engine (Estimated: 4-5 hours)

### Step 3.1: Basic Logarithmic Scoring Implementation
- [ ] Create `src/modules/calculation.ts`
- [ ] Implement basic logarithmic scoring function
- [ ] Add function to calculate score given probability and outcome
- **Verification**: Basic scoring calculation works with simple test cases

### Step 3.2: Binary Bet Calculations
- [ ] Implement fair odds calculation for binary bets
- [ ] Add optimal bet amount calculation within contribution limits
- [ ] Ensure positive expected value where possible
- **Verification**: Binary calculations produce mathematically correct results

### Step 3.3: Multi-categorical Bet Calculations
- [ ] Extend calculation engine for multiple categories
- [ ] Handle up to 8 categories as specified
- [ ] Calculate payouts for all possible outcomes
- **Verification**: Multi-categorical calculations are accurate

### Step 3.4: Edge Case Handling
- [ ] Handle division by zero scenarios
- [ ] Manage extreme probability values (< 5%, > 95%)
- [ ] Handle cases where fair betting isn't possible within limits
- **Verification**: All edge cases handled gracefully with appropriate error messages

### Step 3.5: Validation Logic
- [ ] Implement probability sum validation (should equal 100%)
- [ ] Add extreme payout warnings
- [ ] Create input validation functions
- **Verification**: All validation rules work correctly

## Phase 4: Testing Framework Setup (Estimated: 2-3 hours)

### Step 4.1: Unit Testing Setup
- [ ] Install and configure Jest
- [ ] Install Testing Library for component tests
- [ ] Create basic test configuration
- **Verification**: Test runner works, can run empty test suite

### Step 4.2: Mathematical Tests
- [ ] Write comprehensive tests for logarithmic scoring
- [ ] Test binary bet calculations with known inputs/outputs
- [ ] Test multi-categorical calculations
- [ ] Test edge cases and error handling
- **Verification**: All calculation tests pass, 90%+ coverage achieved

### Step 4.3: E2E Testing Setup
- [ ] Install and configure Playwright
- [ ] Create basic E2E test configuration
- [ ] Set up test environment for cross-browser testing
- **Verification**: E2E framework can run basic navigation tests

## Phase 5: Basic UI Components (Estimated: 6-8 hours)

### Step 5.1: Application Shell
- [ ] Create `src/main.ts` as application entry point
- [ ] Set up basic HTML structure in `index.html`
- [ ] Create main App component structure
- **Verification**: Basic app loads and displays in browser

### Step 5.2: Input Components
- [ ] Create text input component for bet title
- [ ] Create textarea component for details
- [ ] Create date/time picker for deadline
- [ ] Create currency dropdown component
- **Verification**: All input components render and accept user input

### Step 5.3: Participant Name Components
- [ ] Create editable name fields with defaults ("Person A", "Person B")
- [ ] Implement name validation and character limits
- **Verification**: Names can be edited and validated properly

### Step 5.4: Bet Type Toggle
- [ ] Create toggle/radio button for Binary vs Multi-categorical
- [ ] Implement state management for bet type changes
- **Verification**: Toggle works and shows appropriate input sections

## Phase 6: Binary Bet Interface (Estimated: 4-5 hours)

### Step 6.1: Probability Input Components
- [ ] Create dual slider/input components for probabilities
- [ ] Implement real-time synchronization between slider and text input
- [ ] Add percentage formatting and validation (0-100%)
- **Verification**: Probability inputs work smoothly, stay in sync

### Step 6.2: Contribution Input Components
- [ ] Create numerical input fields for max contributions
- [ ] Add currency formatting
- [ ] Implement validation for positive numbers
- **Verification**: Contribution inputs accept valid numbers only

### Step 6.3: Binary Bet Form Integration
- [ ] Integrate all binary bet components into main form
- [ ] Implement form state management
- [ ] Add real-time validation feedback
- **Verification**: Complete binary bet form works end-to-end

## Phase 7: Multi-categorical Bet Interface (Estimated: 5-6 hours)

### Step 7.1: Category Management
- [ ] Create add/remove category buttons
- [ ] Implement dynamic category list (up to 8 categories)
- [ ] Create category name/range input fields
- **Verification**: Categories can be added, removed, and named

### Step 7.2: Multi-categorical Probability Matrix
- [ ] Create probability input grid (participants × categories)
- [ ] Implement validation for probability sums per participant
- [ ] Add visual feedback for invalid probability distributions
- **Verification**: Probability matrix works for all category counts (1-8)

### Step 7.3: Multi-categorical Form Integration
- [ ] Integrate category components with main form
- [ ] Implement state management for dynamic categories
- [ ] Add comprehensive validation for multi-categorical bets
- **Verification**: Complete multi-categorical form works correctly

## Phase 8: Calculation Integration & Results Display (Estimated: 4-5 hours)

### Step 8.1: Real-time Calculation Integration
- [ ] Connect UI inputs to calculation engine
- [ ] Implement real-time calculation updates
- [ ] Handle calculation errors gracefully
- **Verification**: Calculations update automatically as inputs change

### Step 8.2: Results Display Components
- [ ] Create payout structure display for binary bets
- [ ] Create outcome display for multi-categorical bets
- [ ] Format monetary amounts according to selected currency
- **Verification**: Results display clearly and accurately

### Step 8.3: Bet Summary Component
- [ ] Display all input information in organized summary
- [ ] Include participant names, probabilities, contributions
- [ ] Show calculated fair odds prominently
- **Verification**: Summary includes all required information

### Step 8.4: Mathematical Details (Optional Display)
- [ ] Create expandable section for calculation details
- [ ] Show logarithmic scoring formula
- [ ] Display step-by-step calculations
- [ ] Show expected value calculations
- **Verification**: Mathematical details are accurate and helpful

## Phase 9: Validation & Warning System (Estimated: 2-3 hours)

### Step 9.1: Probability Validation UI
- [ ] Implement visual warnings for probability sum ≠ 100%
- [ ] Show clear error messages for invalid inputs
- [ ] Add helpful suggestions for fixing validation errors
- **Verification**: Validation warnings are clear and actionable

### Step 9.2: Extreme Payout Warnings
- [ ] Detect extreme probability values (< 5%, > 95%)
- [ ] Display warnings about potential large payouts
- [ ] Explain implications of extreme probabilities
- **Verification**: Warnings appear at appropriate thresholds

## Phase 10: Styling & Mobile-First Design (Estimated: 6-8 hours)

### Step 10.1: Base Styling System
- [ ] Create CSS custom properties for consistent theming
- [ ] Implement mobile-first responsive breakpoints
- [ ] Set up typography system with readable fonts
- **Verification**: Basic styling looks good on mobile and desktop

### Step 10.2: Component Styling
- [ ] Style all input components with touch-friendly sizing
- [ ] Implement consistent spacing and visual hierarchy
- [ ] Add hover and focus states for interactive elements
- **Verification**: All components are visually polished

### Step 10.3: Results Display Styling
- [ ] Style results section for clarity and professional appearance
- [ ] Ensure results are screenshot-friendly
- [ ] Implement print-friendly styles
- **Verification**: Results look professional and shareable

### Step 10.4: Accessibility Implementation
- [ ] Add proper ARIA labels and roles
- [ ] Ensure keyboard navigation works throughout
- [ ] Test with screen readers
- [ ] Verify color contrast meets WCAG standards
- **Verification**: App is fully accessible via keyboard and screen readers

## Phase 11: Sharing Features (Estimated: 3-4 hours)

### Step 11.1: Text Export Feature
- [ ] Implement plain text export of bet terms
- [ ] Format text for easy copy-paste sharing
- [ ] Include all relevant bet information
- **Verification**: Text export includes complete bet information

### Step 11.2: Screenshot Feature
- [ ] Implement HTML-to-image conversion for bet summary
- [ ] Add screenshot button with download functionality
- [ ] Optimize image quality and size
- **Verification**: Screenshots generate correctly and look professional

### Step 11.3: Web Share API Integration
- [ ] Implement native sharing on mobile devices
- [ ] Add fallback for desktop browsers
- [ ] Test sharing functionality across platforms
- **Verification**: Sharing works on all target devices

## Phase 12: PWA Implementation (Estimated: 3-4 hours)

### Step 12.1: Service Worker Setup
- [ ] Configure Vite PWA plugin for service worker generation
- [ ] Implement caching strategy for offline functionality
- [ ] Test offline functionality
- **Verification**: App works completely offline

### Step 12.2: Web App Manifest
- [ ] Create comprehensive web app manifest
- [ ] Add app icons in multiple sizes
- [ ] Configure install prompts and behavior
- **Verification**: App can be installed on mobile and desktop

### Step 12.3: PWA Optimization
- [ ] Optimize caching strategy for performance
- [ ] Implement update notifications
- [ ] Test PWA features across browsers
- **Verification**: PWA features work correctly on all target browsers

## Phase 13: Performance Optimization (Estimated: 2-3 hours)

### Step 13.1: Bundle Optimization
- [ ] Analyze bundle size and optimize imports
- [ ] Implement code splitting if beneficial
- [ ] Optimize asset loading and caching
- **Verification**: Bundle size is minimal, load times meet requirements

### Step 13.2: Runtime Performance
- [ ] Optimize calculation performance for real-time updates
- [ ] Ensure smooth slider interactions
- [ ] Test performance on lower-end devices
- **Verification**: App performs smoothly on all target devices

## Phase 14: Comprehensive Testing (Estimated: 4-5 hours)

### Step 14.1: Complete Unit Test Suite
- [ ] Achieve 90%+ test coverage for calculation logic
- [ ] Test all UI components thoroughly
- [ ] Test error handling and edge cases
- **Verification**: All tests pass, coverage requirements met

### Step 14.2: Integration Testing
- [ ] Test complete user workflows for binary bets
- [ ] Test complete user workflows for multi-categorical bets
- [ ] Test sharing and export features
- **Verification**: All user workflows work end-to-end

### Step 14.3: Cross-browser Testing
- [ ] Test on Chrome, Firefox, Safari, Edge (latest 2 versions)
- [ ] Test on mobile browsers (iOS Safari, Chrome Mobile)
- [ ] Verify PWA features work across browsers
- **Verification**: App works consistently across all target browsers

### Step 14.4: Performance Testing
- [ ] Verify load times meet requirements (< 3s on 3G)
- [ ] Test calculation performance with extreme inputs
- [ ] Verify smooth operation on mobile devices
- **Verification**: Performance requirements are met

## Phase 15: Documentation & Deployment (Estimated: 2-3 hours)

### Step 15.1: User Documentation
- [ ] Create user guide for binary bets
- [ ] Create user guide for multi-categorical bets
- [ ] Document sharing features
- **Verification**: Documentation is clear and complete

### Step 15.2: Developer Documentation
- [ ] Document calculation algorithms
- [ ] Create API documentation for calculation module
- [ ] Document component architecture
- **Verification**: Code is well-documented for future maintenance

### Step 15.3: Deployment Setup
- [ ] Configure deployment to static hosting (Netlify/Vercel)
- [ ] Set up HTTPS for PWA requirements
- [ ] Test production deployment
- **Verification**: App deploys successfully and works in production

### Step 15.4: CI/CD Pipeline
- [ ] Set up automated testing on pull requests
- [ ] Configure automated deployment
- [ ] Set up performance monitoring
- **Verification**: CI/CD pipeline works correctly

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

## Estimated Total Development Time: 55-75 hours

### Time Breakdown:
- **Infrastructure & Setup**: 7-10 hours
- **Core Logic & Testing**: 10-13 hours
- **UI Development**: 19-26 hours
- **PWA & Performance**: 5-7 hours
- **Testing & Documentation**: 6-8 hours
- **Deployment & CI/CD**: 2-3 hours
- **Buffer for iterations**: 6-8 hours

## Notes for Development

### Development Order Rationale
1. **Infrastructure First**: Solid foundation prevents rework
2. **Types Early**: TypeScript interfaces guide implementation
3. **Math Core**: Calculation engine is the app's heart
4. **Testing Parallel**: Catch issues early, maintain quality
5. **UI Iterative**: Build components incrementally
6. **PWA Last**: Add PWA features to working app
7. **Polish Final**: Optimization and testing at the end

### Key Verification Points
- After each phase, the app should be in a working state
- Tests should pass at each checkpoint
- Each feature should be individually testable
- Mathematical accuracy is non-negotiable
- User experience should be smooth throughout development

### Risk Mitigation
- **Mathematical Complexity**: Implement with extensive testing
- **Cross-browser Issues**: Test early and often
- **Performance**: Monitor throughout development
- **Accessibility**: Build in from the start, not retrofitted

This plan ensures a systematic, verifiable approach to building a production-ready Wager Calculator PWA that meets all specification requirements.
