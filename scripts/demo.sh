#!/bin/bash

echo "🎮 Jarvis Interactive Demo"
echo "========================="
echo ""

# Function to make API calls and show results
demo_call() {
    local description="$1"
    local curl_command="$2"
    local jq_filter="$3"
    
    echo "🎯 $description"
    echo "Command: $curl_command"
    echo "Response:"
    eval "$curl_command" | jq "$jq_filter" 2>/dev/null || echo "  (Error or no response)"
    echo ""
    read -p "Press Enter to continue..." 
    echo ""
}

echo "Let's explore what Jarvis can do!"
echo ""
read -p "Press Enter to start the demo..."
echo ""

# Demo 1: Health Check
demo_call "Health Check" \
    "curl -s http://localhost:7777/health" \
    "."

# Demo 2: List Models
demo_call "Available Models" \
    "curl -s http://localhost:7777/models" \
    ".models[] | {name, performance, description}"

# Demo 3: Chat
demo_call "Chat with Jarvis" \
    "curl -s -X POST http://localhost:7777/command -H 'Content-Type: application/json' -d '{\"type\": \"chat\", \"payload\": {\"message\": \"What can you help me with as a coding assistant?\"}}'" \
    "{type, content: (.content | .[0:200] + \"...\")}"

# Demo 4: Switch to CodeLlama
demo_call "Switch to CodeLlama for coding tasks" \
    "curl -s -X POST http://localhost:7777/models/switch -H 'Content-Type: application/json' -d '{\"model\": \"codellama:7b\"}'" \
    "."

# Demo 5: Code Explanation
demo_call "Explain Complex Code (using CodeLlama)" \
    "curl -s -X POST http://localhost:7777/command -H 'Content-Type: application/json' -d '{\"type\": \"explain\", \"payload\": {\"code\": \"const memoize = (fn) => { const cache = new Map(); return (...args) => { const key = JSON.stringify(args); return cache.has(key) ? cache.get(key) : cache.set(key, fn(...args)).get(key); }; };\", \"language\": \"javascript\"}}'" \
    "{model, type, content: (.content | .[0:300] + \"...\")}"

# Demo 6: Auto-select for chat
demo_call "Auto-select fastest model for general chat" \
    "curl -s -X POST http://localhost:7777/models/auto-select -H 'Content-Type: application/json' -d '{\"taskType\": \"chat\"}'" \
    "."

# Demo 7: Refactor code
demo_call "Code Refactoring Suggestion" \
    "curl -s -X POST http://localhost:7777/command -H 'Content-Type: application/json' -d '{\"type\": \"refactor\", \"payload\": {\"code\": \"function calculate(a, b, c) { if (c == 1) { return a + b; } else if (c == 2) { return a - b; } else if (c == 3) { return a * b; } else { return a / b; } }\", \"language\": \"javascript\", \"goal\": \"make it more readable and maintainable\"}}'" \
    "{type, content: (.content | .[0:400] + \"...\")}"

echo "🎉 Demo Complete!"
echo ""
echo "What you just saw:"
echo "✅ Health monitoring and status checks"
echo "✅ Multi-model system with automatic selection"
echo "✅ Intelligent model switching based on task type"
echo "✅ Code explanation using specialized models"
echo "✅ Code refactoring suggestions"
echo "✅ Natural language chat capabilities"
echo ""
echo "🚀 Try building on this foundation:"
echo "  - Add more models (mistral, claude, gpt)"
echo "  - Implement real voice recognition"
echo "  - Create custom workflows"
echo "  - Add VS Code integration"
echo "  - Build a web interface"