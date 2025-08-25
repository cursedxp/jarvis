# 🔊 Adding Real Voice to Jarvis

## Current State
- ✅ **Text Chat**: Fully working
- 🚧 **Voice**: Simulated (no real audio)

## Option 1: Quick Text-to-Speech (macOS)

### Enable Basic Speaking
```bash
# Test macOS built-in TTS
say "Hello, I am Jarvis"

# Make Jarvis speak responses
curl -s -X POST http://localhost:7777/command \
  -H "Content-Type: application/json" \
  -d '{"type": "chat", "payload": {"message": "Tell me a joke"}}' | \
  jq -r '.content' | say
```

### Update TTS Manager (Quick Fix)
Edit `packages/voice/src/tts/tts-manager.ts`:

```typescript
import { exec } from 'child_process';

export class TTSManager {
  async speak(text: string): Promise<void> {
    console.log('Speaking:', text);
    
    // macOS: Use built-in 'say' command
    if (process.platform === 'darwin') {
      exec(`say "${text.replace(/"/g, '\\"')}"`, (error) => {
        if (error) console.error('TTS error:', error);
      });
    }
    
    return new Promise((resolve) => {
      // Estimate speaking time (rough)
      const speakingTime = text.length * 50; // ~50ms per character
      setTimeout(resolve, speakingTime);
    });
  }
}
```

## Option 2: Professional Voice Setup

### Install Real TTS
```bash
# Install Edge TTS (Microsoft's voices)
pip install edge-tts

# Test it
edge-tts --text "Hello, I am Jarvis" --write-media jarvis.wav
afplay jarvis.wav  # macOS playback
```

### Install Wake Word Detection
```bash
# Install Porcupine (real wake word detection)
npm install @picovoice/porcupine-node

# Get free API key from: https://picovoice.ai/
# Add to .env: PICOVOICE_ACCESS_KEY=your_key_here
```

### Install Real STT
```bash
# Option 1: Use OpenAI Whisper API (requires API key)
# Option 2: Use local Whisper
pip install openai-whisper

# Test local whisper
whisper test_audio.wav --model tiny
```

## Option 3: Full Voice Pipeline

### Update Voice Service
1. **Real Wake Word**: Replace simulation with Porcupine
2. **Real STT**: Use Whisper or OpenAI
3. **Real TTS**: Use Edge-TTS or ElevenLabs
4. **Audio I/O**: Handle microphone and speakers

### Test Voice Pipeline
```bash
# Start voice service with real audio
cd packages/voice
npm install @picovoice/porcupine-node
npm run dev

# In another terminal, test end-to-end:
# 1. Say "Hey Jarvis" (if wake word works)
# 2. Ask a question
# 3. Hear response
```

## Quick Demo: Make It Speak Now

### Method 1: Pipe API Response to TTS
```bash
# Make Jarvis explain code and speak it
curl -s -X POST http://localhost:7777/command \
  -H "Content-Type: application/json" \
  -d '{
    "type": "explain", 
    "payload": {
      "code": "const hello = () => console.log(\"Hi\")",
      "language": "javascript"
    }
  }' | jq -r '.content' | head -c 200 | say
```

### Method 2: Create Speaking Script
```bash
# Create speak-jarvis.sh
cat > speak-jarvis.sh << 'EOF'
#!/bin/bash
MESSAGE="$1"
curl -s -X POST http://localhost:7777/command \
  -H "Content-Type: application/json" \
  -d "{\"type\": \"chat\", \"payload\": {\"message\": \"$MESSAGE\"}}" | \
  jq -r '.content' | say
EOF

chmod +x speak-jarvis.sh

# Use it
./speak-jarvis.sh "What is recursion?"
```

## Advanced: Web Speech API

### Browser-Based Voice
Create a simple HTML page that uses Web Speech API:

```html
<!-- voice-demo.html -->
<button onclick="startListening()">🎤 Talk to Jarvis</button>
<div id="response"></div>

<script>
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
const synthesis = window.speechSynthesis;

function startListening() {
  recognition.start();
}

recognition.onresult = async (event) => {
  const speech = event.results[0][0].transcript;
  
  // Send to Jarvis
  const response = await fetch('http://localhost:7777/command', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      type: 'chat',
      payload: {message: speech}
    })
  });
  
  const data = await response.json();
  
  // Speak response
  const utterance = new SpeechSynthesisUtterance(data.content);
  synthesis.speak(utterance);
  
  document.getElementById('response').innerHTML = data.content;
};
</script>
```

## Summary

### Right Now (No Changes Needed)
- **Text chat works perfectly**
- **All AI features work**  
- **Model switching works**

### To Add Voice (Choose Your Level)
1. **Basic**: Use `say` command for TTS responses
2. **Intermediate**: Install Edge-TTS for better voices
3. **Advanced**: Full pipeline with wake word, STT, TTS
4. **Web**: Use browser's built-in speech APIs

**Want me to implement any of these options for you?**