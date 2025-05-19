#!/bin/bash

# Run the event integration tests
echo "Running Discord Scheduled Events integration tests..."
bun test src/tests/eventIntegration.test.ts

# Check if the tests passed
if [ $? -eq 0 ]; then
  echo "✅ Tests passed!"
  echo "Please follow the manual testing checklist in TESTING_CHECKLIST.md to verify the implementation in a real Discord server."
else
  echo "❌ Tests failed!"
  echo "Please fix the issues before proceeding with manual testing."
fi
