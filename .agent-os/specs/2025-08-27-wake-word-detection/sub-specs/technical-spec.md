# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-27-wake-word-detection/spec.md

## Technical Requirements

### Wake Word Detection Implementation

- **Detection Method**: Use Web Speech API's continuous recognition mode with keyword matching
- **Continuous Listening**: Implement browser-based continuous speech recognition that runs when wake word detection is enabled
- **Detection Logic**: Parse recognition results for "Hey Jarvis" or "Jarvis" keywords
- **Resource Management**: Ensure minimal CPU/memory usage during continuous listening
- **Browser Compatibility**: Support Chrome, Edge, Safari (with appropriate fallbacks)

### Settings Integration

- **Storage**: Use localStorage or IndexedDB to persist wake word detection preference
- **Settings UI**: Add a switch/toggle component to the existing SettingsDialog component
- **Default State**: Wake word detection should be disabled by default for privacy
- **Setting Schema**: Add `wakeWordEnabled: boolean` to user preferences

### UI/UX Specifications

- **Dynamic Button Display**: Voice chat button visibility controlled by wake word setting
- **Welcome Message Updates**:
  - When wake word enabled: "Say 'Hey Jarvis' or type below to get started"
  - When wake word disabled: "Choose voice chat or text chat to get started"
- **Visual Feedback**: Add listening indicator when wake word is detected
- **Audio Feedback**: Play subtle chime sound when wake word triggers

### State Management

- **React Hook**: Create or update `useWakeWordDetection` hook
- **State Variables**:
  - `isWakeWordEnabled`: Boolean from settings
  - `isListeningForWakeWord`: Boolean for active detection
  - `wakeWordDetected`: Boolean for detection state
- **Integration Points**: Connect with existing `useVoiceRecognition` hook

### Performance Criteria

- **Wake Word Response Time**: < 500ms from utterance to activation
- **CPU Usage**: < 5% during continuous listening
- **Memory Usage**: < 50MB additional memory for wake word detection
- **Battery Impact**: Minimal impact on laptop/mobile battery life


## Integration Requirements

### Existing Component Updates

- **SettingsDialog.tsx**: Add wake word detection toggle with label and description
- **VoiceInterface.tsx** or **VoiceControls.tsx**: Conditionally render voice button based on wake word setting
- **JarvisMainContainer.tsx**: Update welcome message logic
- **useVoiceRecognition.ts**: Integrate wake word detection trigger

### Event Flow

1. User enables wake word detection in settings
2. System initializes Web Speech API with continuous recognition
3. Continuous speech recognition begins
4. On detecting "Hey Jarvis" in transcript:
   - Play activation sound
   - Show visual feedback
   - Automatically start main voice recognition
   - Process user command
5. Return to listening for wake word after command completion

### Error Handling

- **Microphone Permission**: Gracefully handle denied microphone access
- **Browser Compatibility**: Provide fallback to manual activation if wake word not supported
- **Detection Failures**: Auto-retry initialization with exponential backoff
- **Resource Constraints**: Disable wake word if system resources are low