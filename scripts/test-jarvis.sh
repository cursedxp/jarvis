#!/bin/bash

echo "🧪 Jarvis Testing Suite"
echo "======================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    echo -e "${BLUE}Testing: $test_name${NC}"
    
    result=$(eval "$test_command" 2>/dev/null)
    
    if [[ -n "$expected_pattern" && "$result" =~ $expected_pattern ]] || [[ -z "$expected_pattern" && -n "$result" ]]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        echo "   Expected: $expected_pattern"
        echo "   Got: $result"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# Wait for services to be ready
echo "🔄 Waiting for services to start..."
sleep 3

# Test 1: Health Check
run_test "Health Check" \
    "curl -s http://localhost:7777/health | jq -r '.status'" \
    "healthy"

# Test 2: List Models
run_test "List Models" \
    "curl -s http://localhost:7777/models | jq -r '.models | length'" \
    "[1-9]"

# Test 3: Get Current Model
run_test "Get Current Model" \
    "curl -s http://localhost:7777/models/current | jq -r '.model'" \
    ".*"

# Test 4: Switch Model
run_test "Switch to CodeLlama" \
    "curl -s -X POST http://localhost:7777/models/switch -H 'Content-Type: application/json' -d '{\"model\": \"codellama:7b\"}' | jq -r '.success'" \
    "true"

# Test 5: Code Explanation
run_test "Code Explanation" \
    "curl -s -X POST http://localhost:7777/command -H 'Content-Type: application/json' -d '{\"type\": \"explain\", \"payload\": {\"code\": \"function add(a,b){return a+b}\", \"language\": \"javascript\"}}' | jq -r '.type'" \
    "explanation"

# Test 6: Chat Command
run_test "Chat Command" \
    "curl -s -X POST http://localhost:7777/command -H 'Content-Type: application/json' -d '{\"type\": \"chat\", \"payload\": {\"message\": \"Hello\"}}' | jq -r '.type'" \
    "chat"

# Test 7: Auto Model Selection
run_test "Auto Model Selection" \
    "curl -s -X POST http://localhost:7777/models/auto-select -H 'Content-Type: application/json' -d '{\"taskType\": \"code\"}' | jq -r '.switched'" \
    "true"

# Summary
echo "================================"
echo -e "${BLUE}Test Summary:${NC}"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}💥 Some tests failed${NC}"
    exit 1
fi