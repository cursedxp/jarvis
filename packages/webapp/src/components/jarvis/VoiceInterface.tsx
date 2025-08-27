'use client'

import { AnimatedBlob } from './AnimatedBlob'
import { VoiceControls } from './VoiceControls'

interface VoiceInterfaceProps {
  // Voice state
  voiceState: 'idle' | 'listening' | 'processing' | 'speaking'
  isSpeaking: boolean
  isVoiceEnabled: boolean
  voiceTranscript: string
  realTimeAudioLevel: number
  voiceRecognitionInitialized: boolean
  wakeWordEnabled?: boolean
  isListeningForWakeWord?: boolean
  
  // Voice control handlers
  onStartVoice: () => void
  onStopVoice: () => void
  onStopTTS: () => void
  onToggleChatMode: () => void
}

export function VoiceInterface({
  voiceState,
  isSpeaking,
  isVoiceEnabled,
  voiceTranscript,
  realTimeAudioLevel,
  voiceRecognitionInitialized,
  wakeWordEnabled,
  isListeningForWakeWord,
  onStartVoice,
  onStopVoice,
  onStopTTS,
  onToggleChatMode,
}: VoiceInterfaceProps) {
  return (
    <>
      {/* Animated Blob */}
      <AnimatedBlob
        audioLevel={realTimeAudioLevel}
        voiceState={voiceState}
        isSpeaking={isSpeaking}
      />

      {/* Voice Controls */}
      <VoiceControls
        voiceState={voiceState}
        isSpeaking={isSpeaking}
        isVoiceEnabled={isVoiceEnabled}
        voiceTranscript={voiceTranscript}
        voiceRecognitionInitialized={voiceRecognitionInitialized}
        wakeWordEnabled={wakeWordEnabled}
        isListeningForWakeWord={isListeningForWakeWord}
        onStartVoice={onStartVoice}
        onStopVoice={onStopVoice}
        onStopTTS={onStopTTS}
        onToggleChatMode={onToggleChatMode}
      />
    </>
  )
}