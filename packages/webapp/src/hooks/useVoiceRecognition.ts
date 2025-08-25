'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface UseVoiceRecognitionProps {
  onTranscript: (transcript: string) => void
  onStateChange: (state: 'idle' | 'listening' | 'processing') => void
}

export function useVoiceRecognition({ onTranscript, onStateChange }: UseVoiceRecognitionProps) {
  const [recognition, setRecognition] = useState<any>(null)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const finalTranscriptBufferRef = useRef('')
  
  // Use refs to store stable callback references
  const onTranscriptRef = useRef(onTranscript)
  const onStateChangeRef = useRef(onStateChange)
  
  // Update refs when callbacks change
  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])
  
  useEffect(() => {
    onStateChangeRef.current = onStateChange
  }, [onStateChange])

  // Initialize recognition only once
  useEffect(() => {
    if (recognition || typeof window === 'undefined') return
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognitionInstance = new SpeechRecognition()
      
      recognitionInstance.continuous = true
      recognitionInstance.interimResults = true
      recognitionInstance.lang = 'en-US'
      
      recognitionInstance.onstart = () => {
        setIsListening(true)
        onStateChangeRef.current('listening')
        console.log('Speech recognition started')
      }
      
      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = ''
        
        // Process only new results to avoid duplication
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscriptBufferRef.current += transcript + ' '
          } else {
            interimTranscript = transcript
          }
        }
        
        // Update display: show final buffer + current interim
        const displayText = (finalTranscriptBufferRef.current + interimTranscript).trim()
        setTranscript(displayText)
      }
      
      recognitionInstance.onerror = (event: any) => {
        // "no-speech" is a common, non-critical error that happens when no speech is detected
        // Only log actual errors, not normal timeout events
        if (event.error !== 'no-speech') {
          console.error('Speech recognition error:', event.error)
        }
        setIsListening(false)
        onStateChangeRef.current('idle')
      }
      
      recognitionInstance.onend = () => {
        setIsListening(false)
        
        // Process final transcript
        const finalText = finalTranscriptBufferRef.current.trim()
        if (finalText) {
          console.log('Final transcript:', finalText)
          onTranscriptRef.current(finalText)
          onStateChangeRef.current('processing')
        } else {
          onStateChangeRef.current('idle')
        }
        
        // Clear for next session
        finalTranscriptBufferRef.current = ''
        setTranscript('')
      }
      
      setRecognition(recognitionInstance)
      console.log('Speech recognition initialized')
    } else {
      console.error('Speech recognition not supported')
    }
  }, [recognition])

  const startListening = useCallback(() => {
    if (!recognition) {
      console.error('Recognition not initialized')
      return false
    }
    
    // Clear transcript for new session
    setTranscript('')
    finalTranscriptBufferRef.current = ''
    
    try {
      recognition.start()
      return true
    } catch (error) {
      console.error('Failed to start recognition:', error)
      return false
    }
  }, [recognition])

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop()
    }
  }, [recognition, isListening])

  return {
    isListening,
    transcript,
    startListening,
    stopListening
  }
}