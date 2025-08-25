#!/usr/bin/env bash

# Test script to verify Husky hooks exist and are executable
set -e

echo "🧪 Testing Husky hooks existence and permissions..."

hooks=("pre-commit" "commit-msg" "pre-push")

for hook in "${hooks[@]}"; do
    hook_path=".husky/$hook"
    
    if [ ! -f "$hook_path" ]; then
        echo "❌ Hook missing: $hook_path"
        exit 1
    fi
    
    if [ ! -x "$hook_path" ]; then
        echo "❌ Hook not executable: $hook_path"
        exit 1
    fi
    
    echo "✅ Hook exists and is executable: $hook_path"
done

# Test that hooks have proper shebang
echo "🔍 Checking hook shebangs..."
for hook in "${hooks[@]}"; do
    hook_path=".husky/$hook"
    first_line=$(head -n 1 "$hook_path")
    
    if [[ ! "$first_line" =~ ^#!/ ]]; then
        echo "❌ Hook missing proper shebang: $hook_path"
        exit 1
    fi
    
    echo "✅ Hook has proper shebang: $hook_path"
done

# Test that .husky/_/husky.sh exists
if [ ! -f ".husky/_/husky.sh" ]; then
    echo "❌ Husky core script missing: .husky/_/husky.sh"
    exit 1
fi

echo "✅ Husky core script exists: .husky/_/husky.sh"

echo "🎉 All hook existence tests passed!"