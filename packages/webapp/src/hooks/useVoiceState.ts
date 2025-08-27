'use client'

import { useState, useCallback } from 'react'
import { useTTS } from '@/hooks/useTTS'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import { useAudioAnimation } from '@/hooks/useAudioAnimation'

export interface VoiceState {
  isVoiceEnabled: boolean
  voice: string
  speechRate: number[]
  ttsMode: 'system' | 'edge'
  availableVoices: string[]
  voiceState: 'idle' | 'listening' | 'processing' | 'speaking'
  isSpeaking: boolean
  transcript: string
  realTimeAudioLevel: number
}

export interface VoiceStateActions {
  setIsVoiceEnabled: (enabled: boolean) => void
  setVoice: (voice: string) => void
  setSpeechRate: (rate: number[]) => void
  setTtsMode: (mode: 'system' | 'edge') => void
  setAvailableVoices: (voices: string[]) => void
  setVoiceState: (state: 'idle' | 'listening' | 'processing' | 'speaking') => void
  handleStartVoice: () => void
  handleStopVoice: () => void
  handleStopTTS: () => void
  speakText: (text: string) => Promise<void>
  testVoice: () => void
  startAudioLevelSimulation: () => void
  stopAudioLevelSimulation: () => void
}

interface UseVoiceStateProps {
  onTranscript?: (text: string) => void
}

export function useVoiceState({ onTranscript }: UseVoiceStateProps = {}): [VoiceState, VoiceStateActions] {
  // Voice/TTS State
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [voice, setVoice] = useState('Alex')
  const [speechRate, setSpeechRate] = useState([180])
  const [ttsMode, setTtsMode] = useState<'system' | 'edge'>('system')
  const [availableVoices, setAvailableVoices] = useState<string[]>([])
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle')

  // Animation hook
  const { 
    realTimeAudioLevel, 
    startAudioLevelSimulation, 
    stopAudioLevelSimulation 
  } = useAudioAnimation()

  // TTS hook
  const { 
    isSpeaking, 
    speakText, 
    stopTTS: stopTTSHook, 
    testVoice 
  } = useTTS({
    voice,
    speechRate: speechRate[0],
    ttsMode,
    onSpeakingChange: (speaking) => {
      if (speaking) {
        startAudioLevelSimulation()
      } else {
        stopAudioLevelSimulation()
      }
    },
    onStateChange: setVoiceState,
  })

  // Voice recognition hook
  const { transcript, startListening, stopListening } = useVoiceRecognition({
    onTranscript: onTranscript || (() => {}),
    onStateChange: setVoiceState,
  })

  // Voice control handlers
  const handleStartVoice = useCallback(() => {
    setIsVoiceEnabled(true)
    startListening()
  }, [startListening])

  const handleStopVoice = useCallback(() => {
    setIsVoiceEnabled(false)
    stopListening()
  }, [stopListening])

  const handleStopTTS = useCallback(() => {
    console.log('🛑 User stopped TTS - cleaning up states')
    stopTTSHook()
    stopAudioLevelSimulation()
    setVoiceState('idle')
  }, [stopTTSHook, stopAudioLevelSimulation])

  const state: VoiceState = {
    isVoiceEnabled,
    voice,
    speechRate,
    ttsMode,
    availableVoices,
    voiceState,
    isSpeaking,
    transcript,
    realTimeAudioLevel,
  }

  const actions: VoiceStateActions = {
    setIsVoiceEnabled,
    setVoice,
    setSpeechRate,
    setTtsMode,
    setAvailableVoices,
    setVoiceState,
    handleStartVoice,
    handleStopVoice,
    handleStopTTS,
    speakText,
    testVoice,
    startAudioLevelSimulation,
    stopAudioLevelSimulation,
  }

  return [state, actions]
}