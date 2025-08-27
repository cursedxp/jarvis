'use client'

import React from 'react'
import { SettingsDialog } from './SettingsDialog'
import { VoiceState } from '@/types/jarvis.types'

interface HeaderSectionProps {
  // Model indicator props
  detectedTaskType: string
  
  // Settings dialog props
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  ttsMode: 'system' | 'edge'
  onTTSModeChange: (mode: 'system' | 'edge') => void
  voice: string
  onVoiceChange: (voice: string) => void
  speechRate: number[]
  onSpeechRateChange: (rate: number[]) => void
  availableVoices: string[]
  onTestVoice: () => void
  onSaveSettings: () => void
  isSpeaking: boolean
  voiceState: VoiceState
  wakeWordEnabled: boolean
  onWakeWordEnabledChange: (enabled: boolean) => void
  autoVoiceDetection: boolean
  onAutoVoiceDetectionChange: (enabled: boolean) => void
  continuousListening: boolean
  onContinuousListeningChange: (enabled: boolean) => void
  microphoneGain: number[]
  onMicrophoneGainChange: (gain: number[]) => void
}

export const HeaderSection = React.memo<HeaderSectionProps>(function HeaderSection({
  detectedTaskType,
  settingsOpen,
  setSettingsOpen,
  ttsMode,
  onTTSModeChange,
  voice,
  onVoiceChange,
  speechRate,
  onSpeechRateChange,
  availableVoices,
  onTestVoice,
  onSaveSettings,
  isSpeaking,
  voiceState,
  wakeWordEnabled,
  onWakeWordEnabledChange,
  autoVoiceDetection,
  onAutoVoiceDetectionChange,
  continuousListening,
  onContinuousListeningChange,
  microphoneGain,
  onMicrophoneGainChange,
}) {
  return (
    <>
      {/* Model Indicator - Top Left */}
      <div className="absolute top-6 left-6 z-30 flex items-center gap-2">
        {detectedTaskType && (
          <div className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-xl">
            {detectedTaskType.toUpperCase()} MODE
          </div>
        )}
      </div>

      {/* Settings Dialog - Top Right */}
      <div className="absolute top-6 right-6 z-30">
        <SettingsDialog
          isOpen={settingsOpen}
          onOpenChange={setSettingsOpen}
          ttsMode={ttsMode}
          onTTSModeChange={onTTSModeChange}
          voice={voice}
          onVoiceChange={onVoiceChange}
          speechRate={speechRate}
          onSpeechRateChange={onSpeechRateChange}
          availableVoices={availableVoices}
          onTestVoice={onTestVoice}
          onSaveSettings={onSaveSettings}
          isSpeaking={isSpeaking}
          voiceState={voiceState}
          wakeWordEnabled={wakeWordEnabled}
          onWakeWordEnabledChange={onWakeWordEnabledChange}
          autoVoiceDetection={autoVoiceDetection}
          onAutoVoiceDetectionChange={onAutoVoiceDetectionChange}
          continuousListening={continuousListening}
          onContinuousListeningChange={onContinuousListeningChange}
          microphoneGain={microphoneGain}
          onMicrophoneGainChange={onMicrophoneGainChange}
        />
      </div>
    </>
  )
})