'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { VoiceState, ChatMode } from '@/types/jarvis.types'
import { PomodoroWidgetRef } from '@/components/jarvis/PomodoroWidget'

// Custom hooks
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import { useTTS } from '@/hooks/useTTS'
import { useAudioAnimation } from '@/hooks/useAudioAnimation'
import { useConversations } from '@/hooks/useConversations'
import { useSocketIO } from '@/hooks/useSocketIO'
import { useJarvisAPI } from '@/hooks/useJarvisAPI'
import { useSettings } from '@/hooks/useSettings'
import { useWakeWordDetection } from '@/hooks/useWakeWordDetection'
import { useMicrophoneGain } from '@/hooks/useMicrophoneGain'

interface UseJarvisCoreProps {
  onTaskTypeDetected: (taskType: string) => void
}

export function useJarvisCore({ onTaskTypeDetected }: UseJarvisCoreProps) {
  // Settings hook
  const { settings, updateSetting, isLoading: settingsLoading } = useSettings()
  
  // Core state
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [chatMode, setChatMode] = useState<ChatMode>('voice')
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [availableVoices, setAvailableVoices] = useState<string[]>([])
  const [isAwaitingPomodoroConfirmation, setIsAwaitingPomodoroConfirmation] = useState(false)
  
  // Refs
  const pomodoroWidgetRef = useRef<PomodoroWidgetRef>(null)
  const stopWakeWordListeningRef = useRef<(() => void) | null>(null)
  const forceRestartWakeWordRef = useRef<(() => void) | null>(null)
  const conversationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const startListeningRef = useRef<(() => boolean) | null>(null)
  const stopListeningRef = useRef<(() => void) | null>(null)

  // Microphone gain hook
  const { 
    setupMicrophoneGain, 
    updateGain: updateMicrophoneGain,
    cleanup: cleanupMicrophoneGain 
  } = useMicrophoneGain({ 
    gainLevel: settings.microphoneGain 
  })

  // Animation hook
  const { 
    realTimeAudioLevel, 
    startAudioLevelSimulation, 
    stopAudioLevelSimulation 
  } = useAudioAnimation()

  // Conversations hook
  const {
    activeConversation,
    loadConversations,
    getCurrentMessages,
    createNewConversation,
    clearChatHistory,
    addMessageToConversation
  } = useConversations()

  // Socket.IO callbacks
  const onAudioStarting = useCallback(() => {
    setVoiceState('speaking')
    startAudioLevelSimulation()
    // Pause wake word detection during TTS to prevent feedback
    console.log('🔧 TTS FEEDBACK PREVENTION: Pausing wake word detection during TTS')
    console.log('🔧 TTS FEEDBACK PREVENTION: stopWakeWordListeningRef available:', !!stopWakeWordListeningRef.current)
    if (stopWakeWordListeningRef.current) {
      stopWakeWordListeningRef.current()
      console.log('🔧 TTS FEEDBACK PREVENTION: Wake word detection paused')
    } else {
      console.log('🔧 TTS FEEDBACK PREVENTION: ERROR - No stopWakeWordListening function available!')
    }
  }, [startAudioLevelSimulation])

  const onAudioFinished = useCallback(() => {
    setVoiceState('idle')
    stopAudioLevelSimulation()
    
    // Start conversation mode - automatically listen for next message
    if (settings.wakeWordEnabled && settings.continuousListening) {
      console.log('🗣️ CONVERSATION MODE: Starting automatic listening after response')
      setTimeout(() => {
        console.log('🗣️ CONVERSATION MODE: Activating voice recognition for continued conversation')
        setIsVoiceEnabled(true)
        if (startListeningRef.current && startListeningRef.current()) {
          setVoiceState('listening')
          console.log('🗣️ CONVERSATION MODE: Ready for next message - no wake word needed')
          
          // Set timeout to return to wake word mode after 30 seconds of silence
          conversationTimeoutRef.current = setTimeout(() => {
            console.log('🗣️ CONVERSATION MODE: Timeout reached, returning to wake word mode')
            setIsVoiceEnabled(false)
            if (stopListeningRef.current) {
              stopListeningRef.current()
            }
            if (forceRestartWakeWordRef.current) {
              forceRestartWakeWordRef.current()
            }
          }, 15000) // 15 seconds timeout
        }
      }, 1500) // Give a moment for audio to fully finish
    } else if (settings.wakeWordEnabled) {
      // Resume wake word detection if continuous listening is disabled
      console.log('🔧 TTS FEEDBACK PREVENTION: TTS finished, resuming wake word detection in 1 second')
      setTimeout(() => {
        console.log('🔧 TTS FEEDBACK PREVENTION: Executing wake word restart now')
        if (forceRestartWakeWordRef.current) {
          forceRestartWakeWordRef.current()
          console.log('🔧 TTS FEEDBACK PREVENTION: Wake word detection restarted')
        }
      }, 1000)
    }
  }, [stopAudioLevelSimulation, settings.wakeWordEnabled, settings.continuousListening, setIsVoiceEnabled])

  const onAudioStopped = useCallback(() => {
    setVoiceState('idle')
    stopAudioLevelSimulation()
    // Resume wake word detection if audio was stopped
    if (settings.wakeWordEnabled) {
      console.log('🔧 TTS FEEDBACK PREVENTION: Audio stopped, resuming wake word detection in 1 second')
      setTimeout(() => {
        console.log('🔧 TTS FEEDBACK PREVENTION: Executing wake word restart after stop')
        if (forceRestartWakeWordRef.current) {
          forceRestartWakeWordRef.current()
          console.log('🔧 TTS FEEDBACK PREVENTION: Wake word detection restarted after stop')
        }
      }, 1000)
    }
  }, [stopAudioLevelSimulation, settings.wakeWordEnabled])

  // Socket.IO hook with pomodoro handlers
  const { socket, isConnected } = useSocketIO({
    onAudioStarting,
    onAudioFinished,
    onAudioStopped,
    onPomodoroCommand: (data) => {
      console.log('🍅 Received pomodoro command:', data.action)
      if (data.action === 'start') {
        pomodoroWidgetRef.current?.startTimer()
      } else if (data.action === 'stop') {
        pomodoroWidgetRef.current?.pauseTimer()
      } else if (data.action === 'reset') {
        pomodoroWidgetRef.current?.resetTimer()
      }
    },
    onPomodoroPhaseComplete: (data) => {
      console.log('🍅 Received pomodoro phase complete:', data)
      speakText(data.message)
      
      if (data.nextPhase === 'prompt') {
        setIsAwaitingPomodoroConfirmation(true)
      }
    },
    onPomodoroSync: (data) => {
      console.log('🍅 FRONTEND: Received pomodoro sync:', data)
      
      if (data.action === 'start_work' && data.duration) {
        pomodoroWidgetRef.current?.startTimer(data.duration)
      } else if (data.action === 'start_break' && data.duration) {
        console.log('🍅 FRONTEND: Starting break timer with', data.duration, 'minutes')
        pomodoroWidgetRef.current?.startBreakTimer(data.duration)
      } else if (data.action === 'reset_to_work') {
        console.log('🍅 FRONTEND: Resetting to 25-minute work mode')
        pomodoroWidgetRef.current?.resetToWorkMode()
      } else if (data.action === 'stop') {
        pomodoroWidgetRef.current?.resetTimer()
      }
    },
    onMusicStateUpdate: (data) => {
      console.log('🎵 Received music state update:', data)
    }
  })

  // API hook
  const {
    isLoading: apiLoading,
    sendMessage: apiSendMessage,
    loadAvailableVoices,
    changeTTSMode,
    changeVoice: apiChangeVoice,
    speakTextViaAPI
  } = useJarvisAPI({
    onMessageSent: (message, isVoice) => {
      addMessageToConversation('user', message)
      if (isVoice) {
        console.log('💭 User finished speaking, Jarvis processing')
        setVoiceState('processing')
      }
    },
    onResponseReceived: (content, model, taskType) => {
      addMessageToConversation('assistant', content, model, taskType)
    },
    onModelChanged: () => {},
    onTaskTypeDetected
  })

  // TTS hook
  const { 
    isSpeaking, 
    speakText, 
    stopTTS: stopTTSHook, 
    testVoice 
  } = useTTS({
    voice: settings.voice,
    speechRate: settings.speechRate,
    ttsMode: settings.ttsMode,
    onSpeakingChange: (speaking) => {
      if (speaking) {
        startAudioLevelSimulation()
      } else {
        stopAudioLevelSimulation()
      }
    },
    onStateChange: setVoiceState
  })

  // Voice recognition hook
  const { 
    transcript, 
    startListening, 
    stopListening,
    isInitialized: voiceRecognitionInitialized
  } = useVoiceRecognition({
    onTranscript: (text) => {
      // Clear conversation timeout since user spoke
      if (conversationTimeoutRef.current) {
        clearTimeout(conversationTimeoutRef.current)
        conversationTimeoutRef.current = null
        console.log('🗣️ CONVERSATION MODE: Timeout cleared - user is actively talking')
      }
      
      sendMessage(text, true)
      // In conversation mode, don't disable voice - let it continue listening after response
      if (settings.wakeWordEnabled && !settings.continuousListening) {
        setIsVoiceEnabled(false)
      }
      // If continuous listening is enabled, voice will auto-restart after TTS
    },
    onStateChange: (state) => {
      setVoiceState(state)
      // When voice processing is done, ensure wake word detection can restart
      if (state === 'idle' && settings.wakeWordEnabled) {
        console.log('🔧 Voice processing idle, wake word should restart')
        // Force wake word detection to restart by briefly disabling and re-enabling
        setTimeout(() => {
          console.log('🔧 Forcing wake word restart cycle')
          forceRestartWakeWord()
        }, 500)
      }
    },
    autoStopEnabled: settings.wakeWordEnabled
  })

  // Voice control handlers (moved here to access voiceRecognitionInitialized)
  const handleStartVoice = useCallback(() => {
    if (!voiceRecognitionInitialized) {
      console.warn('Voice recognition not yet initialized')
      return
    }
    setIsVoiceEnabled(true)
    startListening()
  }, [voiceRecognitionInitialized, startListening])

  const handleStopVoice = useCallback(() => {
    setIsVoiceEnabled(false)
    stopListening()
  }, [stopListening])

  // Toggle between chat and voice mode
  const handleToggleChatMode = useCallback(() => {
    setChatMode(prev => prev === 'voice' ? 'chat' : 'voice')
    if (chatMode === 'chat' && isVoiceEnabled) {
      handleStopVoice()
    }
  }, [chatMode, isVoiceEnabled, handleStopVoice])

  const handleStopTTS = useCallback(() => {
    console.log('🛑 User stopped TTS - cleaning up states')
    stopTTSHook()
    stopAudioLevelSimulation()
    setVoiceState('idle')
  }, [stopTTSHook, stopAudioLevelSimulation])

  // Chat message handler
  const handleChatMessage = useCallback(async (message: string) => {
    try {
      const response = await fetch('http://localhost:7777/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          payload: { message },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        addMessageToConversation('user', message)
        const assistantContent = data.content || 'No response'
        addMessageToConversation('assistant', assistantContent, data.model)
      } else {
        throw new Error(`API request failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to send chat message:', error)
      throw error
    }
  }, [addMessageToConversation])

  // Send message handler with pomodoro confirmation logic
  const sendMessage = useCallback(async (text: string, isVoiceInput: boolean = false) => {
    if (!text.trim()) return
    
    // Handle Pomodoro confirmation if waiting for response
    if (isAwaitingPomodoroConfirmation && isVoiceInput) {
      const lowerText = text.toLowerCase().trim()
      if (lowerText.includes('yes') || lowerText.includes('continue') || lowerText.includes('sure') || lowerText.includes('start')) {
        console.log('🍅 User confirmed to continue Pomodoro via voice')
        try {
          await apiSendMessage('continue pomodoro', false, getCurrentMessages())
          speakText('Starting your next Pomodoro session!')
        } catch (error) {
          console.error('Failed to continue Pomodoro:', error)
        }
        setIsAwaitingPomodoroConfirmation(false)
        return
      } else if (lowerText.includes('no') || lowerText.includes('stop') || lowerText.includes('cancel')) {
        console.log('🍅 User declined to continue Pomodoro via voice')
        speakText('Pomodoro session ended. Great work!')
        setIsAwaitingPomodoroConfirmation(false)
        return
      }
    }
    
    if (!activeConversation) {
      createNewConversation()
      setTimeout(() => sendMessage(text, isVoiceInput), 100)
      return
    }

    try {
      const result = await apiSendMessage(text, isVoiceInput, getCurrentMessages())
      
      // Handle TTS for voice inputs
      if (result && result.content && isVoiceInput) {
        console.log('🗣️ Speaking response:', { 
          mode: result.ttsMode, 
          content: result.content.slice(0, 50) + '...' 
        })
        
        if (result.ttsMode === 'system') {
          console.log('🤖 System TTS - starting animation and TTS together')
          setVoiceState('speaking')
          startAudioLevelSimulation()
          
          speakText(result.content).catch(error => {
            if (error && error.message !== 'Speech interrupted by user') {
              console.error('System TTS failed:', error)
            } else {
              console.log('🛑 System TTS interrupted by user')
            }
            setVoiceState('idle')
            stopAudioLevelSimulation()
          })
        } else {
          console.log('🔥 Edge TTS - using WebSocket for perfect sync')
          
          try {
            const ttsResult = await speakTextViaAPI(result.content)
            if (ttsResult.success) {
              console.log('✅ Edge TTS request completed successfully in', ttsResult.ttsDuration, 'ms')
            } else {
              console.error('❌ Edge TTS failed:', ttsResult.message)
              setVoiceState('idle')
              stopAudioLevelSimulation()
            }
          } catch (error) {
            console.error('🚫 Edge TTS request failed:', error)
            setVoiceState('idle')
            stopAudioLevelSimulation()
          }
        }
      } else {
        console.log('🔇 No voice output - cleaning up states')
        setVoiceState('idle')
        stopAudioLevelSimulation()
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setVoiceState('idle')
      stopAudioLevelSimulation()
    }
  }, [
    isAwaitingPomodoroConfirmation,
    activeConversation,
    createNewConversation,
    apiSendMessage,
    getCurrentMessages,
    speakText,
    speakTextViaAPI,
    setVoiceState,
    startAudioLevelSimulation,
    stopAudioLevelSimulation
  ])

  // Load available voices
  const loadAndSetAvailableVoices = useCallback(async () => {
    const voices = await loadAvailableVoices(settings.ttsMode)
    setAvailableVoices(voices)
    
    if (settings.ttsMode === 'edge' && voices.length > 0 && !voices.includes(settings.voice)) {
      updateSetting('voice', voices[0])
    }
  }, [settings.ttsMode, settings.voice, loadAvailableVoices, updateSetting])

  // Settings handlers
  const handleTTSModeChange = useCallback(async (mode: 'system' | 'edge') => {
    updateSetting('ttsMode', mode)
    await changeTTSMode(mode)
    // Load voices for the new TTS mode
    const voices = await loadAvailableVoices(mode)
    setAvailableVoices(voices)
    
    if (mode === 'edge' && voices.length > 0 && !voices.includes(settings.voice)) {
      updateSetting('voice', voices[0])
    }
  }, [updateSetting, changeTTSMode, loadAvailableVoices, settings.voice])

  const handleVoiceChange = useCallback(async (newVoice: string) => {
    updateSetting('voice', newVoice)
    await apiChangeVoice(newVoice, settings.ttsMode)
  }, [updateSetting, apiChangeVoice, settings.ttsMode])

  const saveSettings = useCallback(() => {
    // Settings are automatically saved by the useSettings hook
    console.log('Settings saved automatically')
  }, [])

  // Pomodoro handlers
  const handlePomodoroBreakStart = useCallback(() => {
    console.log('🍅 Break time started')
    speakText("Time for a 5-minute break!")
  }, [speakText])

  const handlePomodoroPromptContinue = useCallback(() => {
    console.log('🍅 Prompting to continue Pomodoro')
    speakText("Ready to continue your Pomodoro session? Say yes to continue or no to stop.")
    setIsAwaitingPomodoroConfirmation(true)
  }, [speakText])

  const handlePomodoroContinueYes = useCallback(() => {
    console.log('🍅 User chose to continue via UI')
    setIsAwaitingPomodoroConfirmation(false)
  }, [])

  const handlePomodoroContinueNo = useCallback(() => {
    console.log('🍅 User chose to stop via UI')
    setIsAwaitingPomodoroConfirmation(false)
  }, [])

  // Wake word detection hook (after all handlers are defined)
  const {
    isListening: isListeningForWakeWord,
    isSupported: isWakeWordSupported,
    startListening: startWakeWordListening,
    stopListening: stopWakeWordListening,
    forceRestart: forceRestartWakeWord
  } = useWakeWordDetection({
    enabled: settings.wakeWordEnabled,
    onWakeWordDetected: useCallback(() => {
      console.log('🎤 WAKE WORD CALLBACK: Wake word detected! Starting voice recognition...')
      console.log('🎤 WAKE WORD CALLBACK: Current voice state:', voiceState)
      console.log('🎤 WAKE WORD CALLBACK: Is voice enabled:', isVoiceEnabled)
      console.log('🎤 WAKE WORD CALLBACK: Callback triggered at:', new Date().toISOString())
      handleStartVoice()
    }, [handleStartVoice])
  })

  // Update refs after functions are initialized
  useEffect(() => {
    stopWakeWordListeningRef.current = stopWakeWordListening
    forceRestartWakeWordRef.current = forceRestartWakeWord
    startListeningRef.current = startListening
    stopListeningRef.current = stopListening
  }, [stopWakeWordListening, forceRestartWakeWord, startListening, stopListening])

  // Debug logging for wake word state (can be removed in production)
  // console.log('🔧 JARVIS CORE - Wake Word State:', { 
  //   enabled: settings.wakeWordEnabled, 
  //   listening: isListeningForWakeWord, 
  //   supported: isWakeWordSupported,
  //   settingsLoaded: !settingsLoading
  // })

  return {
    // State
    isVoiceEnabled,
    chatMode,
    voiceState,
    voice: settings.voice,
    speechRate: [settings.speechRate],
    ttsMode: settings.ttsMode,
    wakeWordEnabled: settings.wakeWordEnabled,
    autoVoiceDetection: settings.autoVoiceDetection,
    continuousListening: settings.continuousListening,
    microphoneGain: [settings.microphoneGain],
    isListeningForWakeWord,
    isWakeWordSupported,
    availableVoices,
    isAwaitingPomodoroConfirmation,
    isSpeaking,
    transcript,
    realTimeAudioLevel,
    apiLoading,
    voiceRecognitionInitialized,
    
    // Refs
    pomodoroWidgetRef,
    
    // Messages
    getCurrentMessages,
    clearChatHistory,
    
    // Handlers
    handleStartVoice,
    handleStopVoice,
    handleStopTTS,
    handleToggleChatMode,
    handleChatMessage,
    sendMessage,
    loadAndSetAvailableVoices,
    loadConversations,
    
    // Settings
    handleTTSModeChange: (mode: 'system' | 'edge') => updateSetting('ttsMode', mode),
    handleVoiceChange: (voice: string) => updateSetting('voice', voice),
    handleWakeWordEnabledChange: (enabled: boolean) => updateSetting('wakeWordEnabled', enabled),
    handleAutoVoiceDetectionChange: (enabled: boolean) => updateSetting('autoVoiceDetection', enabled),
    handleContinuousListeningChange: (enabled: boolean) => updateSetting('continuousListening', enabled),
    handleMicrophoneGainChange: (gain: number) => updateSetting('microphoneGain', gain),
    saveSettings: () => console.log('Settings saved automatically'),
    testVoice,
    setSpeechRate: (rate: number[]) => updateSetting('speechRate', rate[0]),
    setMicrophoneGain: (gain: number[]) => updateSetting('microphoneGain', gain[0]),
    
    // Pomodoro
    handlePomodoroBreakStart,
    handlePomodoroPromptContinue,
    handlePomodoroContinueYes,
    handlePomodoroContinueNo
  }
}