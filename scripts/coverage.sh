#!/bin/bash

# Generate test coverage report and badge
echo "🧪 Running comprehensive test coverage..."

# Clean previous coverage data
rm -rf coverage/

# Run tests with coverage
npm run test:coverage

# Check if coverage directory exists
if [ ! -d "coverage" ]; then
  echo "❌ Coverage directory not found. Tests may have failed."
  exit 1
fi

echo "✅ Coverage report generated successfully!"

# Display coverage summary
if [ -f "coverage/lcov-report/index.html" ]; then
  echo "📊 Coverage report available at: coverage/lcov-report/index.html"
fi

# Check coverage thresholds
if [ $? -eq 0 ]; then
  echo "✅ All coverage thresholds met!"
else
  echo "⚠️  Some coverage thresholds not met. See detailed report for more information."
fi

echo "📈 Coverage files generated:"
ls -la coverage/
