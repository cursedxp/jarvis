#!/usr/bin/env bash

# Master test runner for all Husky tests
set -e

echo "🚀 Running all Husky tests..."

# Make test scripts executable
chmod +x tests/husky/*.sh

# Track test results
passed=0
failed=0
tests=()

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_script="$2"
    
    echo ""
    echo "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "="
    echo "🧪 Running: $test_name"
    echo "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "=" "="
    
    if ./"$test_script"; then
        echo "✅ PASSED: $test_name"
        ((passed++))
        tests+=("✅ $test_name")
    else
        echo "❌ FAILED: $test_name"
        ((failed++))
        tests+=("❌ $test_name")
    fi
}

# Run all tests
run_test "Hook Existence and Permissions" "tests/husky/test-hooks-exist.sh"
run_test "Commit Message Validation" "tests/husky/test-commit-msg.sh"
run_test "Lint-staged Configuration" "tests/husky/test-lint-staged.sh"

# Print summary
echo ""
echo "🎯 TEST SUMMARY"
echo "==============="
for test in "${tests[@]}"; do
    echo "$test"
done
echo ""
echo "📊 Results: $passed passed, $failed failed"

if [ $failed -eq 0 ]; then
    echo "🎉 All Husky tests passed successfully!"
    exit 0
else
    echo "💥 Some tests failed. Please check the output above."
    exit 1
fi