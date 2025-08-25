'use client'

import { useState, useRef, useCallback } from 'react'

interface UseTTSProps {
  voice: string
  speechRate: number
  ttsMode: 'system' | 'edge'
  onSpeakingChange: (isSpeaking: boolean) => void
  onStateChange: (state: 'idle' | 'speaking') => void
}

export function useTTS({ voice, speechRate, ttsMode, onSpeakingChange, onStateChange }: UseTTSProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const speakingRef = useRef(false)

  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        
        // Configure utterance based on current settings
        const voices = window.speechSynthesis.getVoices()
        const selectedVoice = voices.find(v => v.name === voice)
        if (selectedVoice) {
          utterance.voice = selectedVoice
        }
        
        utterance.rate = speechRate / 200  // Convert to 0.5-1.5 range
        utterance.pitch = 1
        utterance.volume = 1
        
        utterance.onstart = () => {
          console.log('🎤 System TTS started')
          const isSpeakingState = true
          setIsSpeaking(isSpeakingState)
          speakingRef.current = isSpeakingState
          onSpeakingChange(isSpeakingState)
          onStateChange('speaking')
        }
        
        utterance.onend = () => {
          console.log('🔚 System TTS ended')
          const isSpeakingState = false
          setIsSpeaking(isSpeakingState)
          speakingRef.current = isSpeakingState
          onSpeakingChange(isSpeakingState)
          onStateChange('idle')
          resolve()
        }
        
        utterance.onerror = (error) => {
          console.log('❌ System TTS error:', error)
          const isSpeakingState = false
          setIsSpeaking(isSpeakingState)
          speakingRef.current = isSpeakingState
          onSpeakingChange(isSpeakingState)
          onStateChange('idle')
          reject(error)
        }
        
        // CRITICAL FIX: Delay TTS start to ensure animation is ready
        setTimeout(() => {
          console.log('🚀 Starting TTS after animation setup delay')
          window.speechSynthesis.speak(utterance)
        }, 100) // Small delay to ensure animation frame is processed
        
      } else {
        console.error('Speech synthesis not supported')
        reject(new Error('Speech synthesis not supported'))
      }
    })
  }, [voice, speechRate, onSpeakingChange, onStateChange])

  const stopTTS = useCallback(() => {
    console.log('🛑 Stopping TTS - mode:', ttsMode)
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    
    // Clean up all states immediately
    const isSpeakingState = false
    setIsSpeaking(isSpeakingState)
    speakingRef.current = isSpeakingState
    onSpeakingChange(isSpeakingState)
    onStateChange('idle')
    
    if (ttsMode === 'edge') {
      fetch('http://localhost:7777/api/tts/stop', { method: 'POST' })
        .catch(error => console.error('Failed to stop Edge TTS:', error))
    }
  }, [ttsMode, onSpeakingChange, onStateChange])

  const testVoice = useCallback(() => {
    if (ttsMode === 'system') {
      const isSpeakingState = true
      setIsSpeaking(isSpeakingState)
      speakingRef.current = isSpeakingState
      onSpeakingChange(isSpeakingState)
      onStateChange('speaking')
      
      speakText("Hello, this is a test of your selected voice settings.")
        .catch(error => {
          console.error('Test TTS failed:', error)
          const errorState = false
          setIsSpeaking(errorState)
          speakingRef.current = errorState
          onSpeakingChange(errorState)
          onStateChange('idle')
        })
    } else {
      // For Edge TTS, we could add a test endpoint
      console.log('Testing Edge TTS voice:', voice)
    }
  }, [voice, ttsMode, speakText, onSpeakingChange, onStateChange])

  return {
    isSpeaking,
    speakText,
    stopTTS,
    testVoice,
    speakingRef
  }
}