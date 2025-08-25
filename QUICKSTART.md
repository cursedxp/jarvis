# 🚀 Jarvis Quick Start Guide

## Prerequisites Check

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version (should be 9+)
npm --version

# Check if Ollama is installed
ollama --version
```

## 🎯 Running Jarvis

### Option 1: Quick Start (Recommended)
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Start all services
./scripts/start-dev.sh
```

### Option 2: Manual Start
```bash
# 1. Start Ollama (if not running)
ollama serve

# 2. Set environment variables
export USE_LOCAL_LLM=true
export OLLAMA_MODEL=llama3.2:3b

# 3. Start core service
cd packages/core
npm run dev
```

## 🧪 Testing Your Setup

### Quick Test
```bash
# Test if Jarvis is responding
curl http://localhost:7777/health

# Should return: {"status":"healthy","timestamp":"..."}
```

### Comprehensive Tests
```bash
# Run full test suite
./scripts/test-jarvis.sh
```

### Manual API Tests
```bash
# 1. List available models
curl -s http://localhost:7777/models | jq

# 2. Chat with Jarvis
curl -X POST http://localhost:7777/command \
  -H "Content-Type: application/json" \
  -d '{"type": "chat", "payload": {"message": "Hello Jarvis!"}}' | jq

# 3. Explain code
curl -X POST http://localhost:7777/command \
  -H "Content-Type: application/json" \
  -d '{
    "type": "explain", 
    "payload": {
      "code": "const factorial = n => n <= 1 ? 1 : n * factorial(n-1)", 
      "language": "javascript"
    }
  }' | jq

# 4. Switch models
curl -X POST http://localhost:7777/models/switch \
  -H "Content-Type: application/json" \
  -d '{"model": "codellama:7b"}' | jq
```

## 🖥️ Available Services

| Service | Port | Status | Description |
|---------|------|--------|-------------|
| Core API | 7777 | ✅ Running | Main Jarvis backend |
| Voice Service | 7778 | 🚧 Optional | Speech processing |
| Tray App | 7779 | 🚧 Optional | Desktop interface |

## 🎮 Interactive Testing

### Test Different Models
```bash
# Test model switching and performance
./test-models.sh
```

### Test VS Code Extension
1. Open VS Code in the project directory
2. Go to `packages/vscode-extension`
3. Press `F5` to launch debug instance
4. Select some code and right-click → "Jarvis: Explain Selection"

### Test Tray Application
```bash
# Start Electron tray app
cd packages/tray
npm run dev
```

## 🔍 Troubleshooting

### Common Issues

**1. "Connection refused" error**
```bash
# Check if core service is running
curl http://localhost:7777/health

# If not, restart with:
cd packages/core && npm run dev
```

**2. "No LLM adapters initialized"**
```bash
# Make sure environment variables are set
export USE_LOCAL_LLM=true
export OLLAMA_MODEL=llama3.2:3b

# Check if Ollama is running
ollama list
```

**3. Models not switching**
```bash
# Verify models are installed
ollama list

# Pull missing models
ollama pull codellama:7b
```

### Logs and Debugging
```bash
# Core service logs are shown in terminal where you ran:
cd packages/core && npm run dev

# Check Ollama logs
ollama logs

# Test Ollama directly
ollama run llama3.2:3b "Hello world"
```

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run typecheck
```

## 🎯 What You Can Do Now

1. **Chat with Jarvis**: Ask questions and get responses
2. **Explain Code**: Select code and get detailed explanations  
3. **Switch Models**: Try different models for different tasks
4. **Test Performance**: Compare model speeds and quality
5. **Build Extensions**: Add new commands and features

## 📚 Next Steps

- **Add Real Voice**: Implement actual STT/TTS instead of simulations
- **Enhance UI**: Improve the tray application interface
- **Add More Models**: Install additional Ollama models
- **Create Workflows**: Build automated coding workflows
- **Integrate IDEs**: Add support for other editors

---

**Need Help?** 
- Check the logs in your terminal
- Run `./scripts/test-jarvis.sh` to diagnose issues
- Ensure Ollama models are downloaded with `ollama list`