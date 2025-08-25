#!/bin/bash

echo "🚀 Starting Jarvis Development Environment"
echo "========================================"

# Function to check if a process is running on a port
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Function to start a service in the background
start_service() {
    local service_name=$1
    local command=$2
    local port=$3
    
    echo "Starting $service_name..."
    
    if check_port $port; then
        echo "⚠️  Port $port is already in use. Skipping $service_name"
        return
    fi
    
    # Start the service in background
    eval "$command" &
    local pid=$!
    echo "✅ $service_name started (PID: $pid)"
    
    # Give it time to start
    sleep 2
    
    # Check if it's still running
    if ! kill -0 $pid 2>/dev/null; then
        echo "❌ $service_name failed to start"
    fi
}

# Check if Ollama is running
echo "🔍 Checking dependencies..."
if ! pgrep -x "ollama" > /dev/null; then
    echo "Starting Ollama..."
    ollama serve &
    sleep 3
fi

# Set environment variables
export USE_LOCAL_LLM=true
export OLLAMA_MODEL=llama3.2:3b

echo "🎯 Available models:"
ollama list 2>/dev/null || echo "  - Ollama not ready yet"

echo ""
echo "🚀 Starting Jarvis services..."

# Start Core Service
start_service "Core Service" "cd packages/core && npm run dev" 7777

# Start Voice Service (optional)
# start_service "Voice Service" "cd packages/voice && npm run dev" 7778

echo ""
echo "✅ Jarvis is running!"
echo ""
echo "🌐 Available endpoints:"
echo "  Core API: http://localhost:7777"
echo "  Health: http://localhost:7777/health"
echo "  Models: http://localhost:7777/models"
echo ""
echo "🧪 Test commands:"
echo "  ./test-models.sh                    # Test model switching"
echo "  curl http://localhost:7777/health   # Health check"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user to stop
wait