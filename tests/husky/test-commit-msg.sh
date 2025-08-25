#!/usr/bin/env bash

# Test script for commit message validation
set -e

echo "🧪 Testing Husky commit message validation..."

# Test valid commit messages
valid_messages=(
    "feat: add new feature"
    "fix: resolve critical bug"
    "docs: update README"
    "style: format code"
    "refactor: improve performance"
    "test: add unit tests"
    "chore: update dependencies"
    "feat(core): add voice recognition"
    "fix(ui): resolve layout issue"
)

# Test invalid commit messages
invalid_messages=(
    "random commit message"
    "FIX: wrong case"
    "feat add feature without colon"
    "feat: "
    "feat: this commit message is way too long and exceeds the maximum character limit that we have set for commit messages in our project"
)

echo "✅ Testing valid commit messages..."
for msg in "${valid_messages[@]}"; do
    echo "Testing: '$msg'"
    echo "$msg" | .husky/commit-msg /dev/stdin || {
        echo "❌ Valid message rejected: '$msg'"
        exit 1
    }
done

echo "✅ Testing invalid commit messages..."
for msg in "${invalid_messages[@]}"; do
    echo "Testing: '$msg'"
    if echo "$msg" | .husky/commit-msg /dev/stdin 2>/dev/null; then
        echo "❌ Invalid message accepted: '$msg'"
        exit 1
    else
        echo "✅ Correctly rejected: '$msg'"
    fi
done

echo "🎉 All commit message tests passed!"