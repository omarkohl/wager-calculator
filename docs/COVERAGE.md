# Test Coverage Configuration

This project includes comprehensive test coverage configuration with the following thresholds:

## Coverage Thresholds

### Global Requirements
- **Branches**: 80%
- **Functions**: 80% 
- **Lines**: 80%
- **Statements**: 80%

### Module-Specific Requirements
- **Calculation Logic** (`src/modules/**/*.ts`): 90% (as specified in project requirements)
- **Type Definitions** (`src/types/**/*.ts`): 85%
- **Utilities** (`src/utils/**/*.ts`): 85%

## Coverage Reports

Coverage reports are generated in multiple formats:
- **HTML**: `coverage/lcov-report/index.html` (visual report)
- **LCOV**: `coverage/lcov.info` (for CI integration)
- **Clover**: `coverage/clover.xml` (XML format)
- **JUnit**: `coverage/junit.xml` (test results for CI)

## Commands

- `npm run test:coverage` - Run tests with coverage
- `npm run test:coverage:watch` - Run tests with coverage in watch mode
- `npm run test:coverage:report` - Generate comprehensive coverage report

## CI Integration

Coverage is automatically checked in CI/CD pipeline:
- Coverage reports uploaded to Codecov
- Coverage artifacts stored for each build
- Pull requests include coverage comments
- Build fails if coverage thresholds are not met

## Mathematical Accuracy Focus

Special attention is given to calculation logic with 90% coverage requirements to ensure mathematical accuracy and reliability of betting calculations.
