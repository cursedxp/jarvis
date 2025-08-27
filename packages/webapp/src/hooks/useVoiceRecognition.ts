'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface UseVoiceRecognitionProps {
  onTranscript: (transcript: string) => void
  onStateChange: (state: 'idle' | 'listening' | 'processing') => void
  autoStopEnabled?: boolean
}

interface SpeechRecognitionEvent {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

export function useVoiceRecognition({ onTranscript, onStateChange, autoStopEnabled = false }: UseVoiceRecognitionProps) {
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const finalTranscriptBufferRef = useRef('')
  const silenceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const _lastSpeechTimeRef = useRef(0)
  const _recognitionInstanceRef = useRef<SpeechRecognition | null>(null)
  
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
      const SpeechRecognitionConstructor = (window as unknown as { webkitSpeechRecognition?: new() => SpeechRecognition; SpeechRecognition?: new() => SpeechRecognition }).webkitSpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new() => SpeechRecognition; SpeechRecognition?: new() => SpeechRecognition }).SpeechRecognition
      if (!SpeechRecognitionConstructor) return;
      const recognitionInstance = new SpeechRecognitionConstructor()
      
      recognitionInstance.continuous = true // Always use continuous mode
      recognitionInstance.interimResults = true
      recognitionInstance.lang = 'en-US'
      
      recognitionInstance.onstart = () => {
        setIsListening(true)
        onStateChangeRef.current('listening')
        console.log('Speech recognition started')
      }
      
      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = ''
        let _hasNewSpeech = false
        
        // Process only new results to avoid duplication
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          
          if (event.results[i].isFinal) {
            finalTranscriptBufferRef.current += transcript + ' '
            _hasNewSpeech = true
          } else {
            interimTranscript = transcript
            if (transcript.trim()) _hasNewSpeech = true
          }
        }
        
        
        // Update display: show final buffer + current interim
        const displayText = (finalTranscriptBufferRef.current + interimTranscript).trim()
        setTranscript(displayText)
        
        // Faster auto-stop: trigger on any final result immediately
        if (autoStopEnabled && event.results[event.results.length - 1]?.isFinal && finalTranscriptBufferRef.current.trim()) {
          console.log('🔧 Got final speech result, auto-stopping in 300ms')
          setTimeout(() => {
            console.log('🔧 Auto-stopping now')
            recognitionInstance.stop()
          }, 300) // Much faster - 300ms instead of 1000ms
        }
      }
      
      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Filter out common, non-critical errors that are expected during normal operation
        const ignoredErrors = ['no-speech', 'aborted', 'audio-capture'];
        if (!ignoredErrors.includes(event.error)) {
          console.error('Speech recognition error:', event.error)
        } else {
          console.log('Speech recognition stopped:', event.error, '(normal operation)')
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
        
        // Clear any pending timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current)
          silenceTimeoutRef.current = undefined
        }
      }
      
      setRecognition(recognitionInstance)
      setIsInitialized(true)
      console.log('Speech recognition initialized')
    } else {
      console.error('Speech recognition not supported')
      setIsInitialized(true) // Still mark as "initialized" so UI doesn't wait forever
    }
  }, [recognition, autoStopEnabled])

  const startListening = useCallback(() => {
    if (!isInitialized || !recognition) {
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
  }, [isInitialized, recognition])

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop()
    }
    
    // Clear any pending timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = undefined
    }
  }, [recognition, isListening])

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isInitialized
  }
}