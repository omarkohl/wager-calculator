# Contributing to Wager Calculator

Thank you for your interest in contributing to the Wager Calculator! This document provides guidelines and information for contributors.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Contribution Types](#contribution-types)
- [Submission Guidelines](#submission-guidelines)
- [Style Guidelines](#style-guidelines)
- [Testing Requirements](#testing-requirements)

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

## Contribution Types

### UI/UX Contributions
- Component improvements
- Accessibility enhancements
- Mobile experience optimizations
- Visual design improvements

**Requirements:**
- Mobile-first approach
- Accessibility compliance (WCAG AA)
- Cross-browser compatibility
- Touch-friendly interactions

### Documentation Contributions
- Code documentation improvements
- User guide enhancements
- API documentation
- Mathematical explanation improvements

### Testing Contributions
- Additional test cases
- E2E test scenarios
- Performance test improvements
- Cross-browser test coverage

## Submission Guidelines

### Before Submitting
- [ ] All tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Mathematical changes are verified
- [ ] Accessibility requirements met

### Pull Request Process
1. Use the provided PR template
2. Link related issues
3. Provide clear description of changes
4. Include screenshots for UI changes
5. Verify mathematical accuracy for calculation changes

### Issue Reporting
- Use appropriate issue templates
- Provide detailed reproduction steps
- Include mathematical details for calculation issues
- Add screenshots when helpful

## Style Guidelines

### TypeScript/JavaScript
- Use strict TypeScript configuration
- Follow ESLint and Prettier rules
- Use meaningful variable names
- Add JSDoc comments for public APIs

### CSS/SCSS
- Mobile-first responsive design
- Use CSS custom properties for theming
- Follow BEM naming convention
- Maintain accessibility standards

### Mathematical Code
- Include formula documentation
- Add numerical precision considerations
- Provide test cases with expected values
- Consider edge cases and error handling

## Testing Requirements

### Unit Tests
- 90%+ coverage for calculation modules
- Test edge cases and error conditions
- Use descriptive test names
- Include mathematical verification

### Integration Tests
- Test complete user workflows
- Verify UI component interactions
- Test form validation and error handling

### E2E Tests
- Test critical user paths
- Verify cross-browser functionality
- Test PWA features
- Include mobile testing scenarios

### Mathematical Testing
- Verify against known logarithmic scoring examples
- Test extreme probability values
- Compare with manual calculations
- Test for numerical stability

## Mathematical Accuracy Standards

### Verification Process
1. Manual calculation verification
2. Comparison with academic sources
3. Edge case validation
4. Precision and stability testing

### Documentation Requirements
- Source references for algorithms
- Step-by-step calculation explanations
- Edge case behavior documentation
- Performance characteristics

## Review Criteria

### Code Review Focus
- Mathematical correctness
- Code quality and maintainability
- Test coverage and quality
- Documentation completeness
- Performance impact
- Accessibility compliance

### Mathematical Review
- Algorithm accuracy
- Edge case handling
- Numerical stability
- Performance optimization
- Formula documentation

## Questions and Support

### Getting Help
- Create a discussion for questions
- Join our community chat (if available)
- Review existing documentation
- Check FAQ section

### Response Times
- Issue responses: 2-3 business days
- PR reviews: 3-5 business days
- Security issues: 2-3 business days

## Recognition

Contributors will be recognized in:
- Project README
- Release notes for significant contributions

Thank you for contributing to the Wager Calculator! Your contributions help make fair betting calculations accessible to everyone.
