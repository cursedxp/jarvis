'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface UseWakeWordDetectionProps {
  enabled: boolean
  onWakeWordDetected: () => void
  wakeWords?: string[]
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
  abort(): void;
}

export function useWakeWordDetection({ 
  enabled, 
  onWakeWordDetected,
  wakeWords = ['hey jarvis', 'jarvis']
}: UseWakeWordDetectionProps) {
  
  const [isListening, setIsListening] = useState(false)
  const [lastDetectionTime, setLastDetectionTime] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isListeningRef = useRef(false)
  const isProcessingRef = useRef(false)
  const restartTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const wakeWordsRef = useRef(wakeWords)
  
  // Update wake words ref when prop changes
  useEffect(() => {
    wakeWordsRef.current = wakeWords
  }, [wakeWords])
  
  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true)
    const supported = typeof window !== 'undefined' && 
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
    setIsSupported(supported)
    console.log('🔧 WAKE WORD MOUNTED - Support:', supported, 'enabled:', enabled)
  }, [enabled])
  
  // Cooldown period to prevent multiple rapid activations (1 second)
  const COOLDOWN_MS = 1000
  const RESTART_DELAY = 500
  
  // Stable callback ref
  const onWakeWordDetectedRef = useRef(onWakeWordDetected)
  useEffect(() => {
    onWakeWordDetectedRef.current = onWakeWordDetected
  }, [onWakeWordDetected])
  
  const startListening = useCallback(() => {
    console.log('🔧 startListening called:', { hasRecognition: !!recognitionRef.current, isCurrentlyListening: isListeningRef.current })
    
    if (!recognitionRef.current) {
      console.error('Wake word detection not initialized')
      return false
    }
    
    if (isListeningRef.current) {
      console.log('Already listening for wake word')
      return true
    }
    
    try {
      console.log('🔧 Starting speech recognition...')
      recognitionRef.current.start()
      return true
    } catch (error) {
      // Handle the "already started" error gracefully
      const err = error as Error & { name: string }
      if (err.name === 'InvalidStateError' && err.message && err.message.includes('already started')) {
        console.log('🔧 Recognition already started, updating state to match')
        setIsListening(true)
        isListeningRef.current = true
        return true
      }
      console.error('Failed to start wake word detection:', error)
      return false
    }
  }, [])

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
        setIsListening(false)
        isListeningRef.current = false
      } catch (error) {
        console.error('Error stopping wake word detection:', error)
      }
    }
  }, [])

  // Initialize speech recognition (only on client side)
  useEffect(() => {
    if (!isMounted || !isSupported || isInitialized) return
    
    console.log('🔧 WAKE WORD INITIALIZATION STARTING')
    console.log('🔧 WAKE WORD: Current recognitionRef:', !!recognitionRef.current)
    console.log('🔧 WAKE WORD: Multiple instances check - this should only appear once!')
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionConstructor = (window as typeof window & { webkitSpeechRecognition?: new() => SpeechRecognition; SpeechRecognition?: new() => SpeechRecognition }).webkitSpeechRecognition || 
                                          (window as typeof window & { webkitSpeechRecognition?: new() => SpeechRecognition; SpeechRecognition?: new() => SpeechRecognition }).SpeechRecognition
      
      if (!SpeechRecognitionConstructor) {
        return
      }
      
      const recognitionInstance = new SpeechRecognitionConstructor()
      
      // Configure for continuous wake word detection
      recognitionInstance.continuous = true
      recognitionInstance.interimResults = true
      recognitionInstance.lang = 'en-US'
      
      recognitionInstance.onstart = () => {
        setIsListening(true)
        isListeningRef.current = true
        console.log('✅ Wake word detection started successfully')
      }
      
      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        // Check if we're in cooldown period
        const now = Date.now()
        if (now - lastDetectionTime < COOLDOWN_MS) {
          return
        }
        
        // Process new results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.toLowerCase().trim()
          
          // Check for wake words
          const detected = wakeWordsRef.current.some(word => 
            transcript.includes(word.toLowerCase())
          )
          
          if (detected && !isProcessingRef.current) {
            console.log('🎤 WAKE WORD DETECTED:', transcript)
            console.log('🔧 WAKE WORD: Setting processing flag and triggering callback')
            console.log('🔧 WAKE WORD: Detection time:', new Date().toISOString())
            isProcessingRef.current = true
            setLastDetectionTime(now)
            
            // Stop listening temporarily
            recognitionInstance.stop()
            
            // Trigger callback
            onWakeWordDetectedRef.current()
            
            // Reset processing flag after cooldown
            setTimeout(() => {
              console.log('🔧 WAKE WORD: Clearing processing flag after cooldown at', new Date().toISOString())
              isProcessingRef.current = false
            }, COOLDOWN_MS)
          }
        }
      }
      
      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Ignore common, non-critical errors for continuous listening
        const ignoredErrors = ['no-speech', 'aborted', 'audio-capture'];
        if (ignoredErrors.includes(event.error)) {
          console.log('Wake word detection stopped:', event.error, '(normal operation)')
          return
        }
        
        console.error('Wake word detection error:', event.error)
        setIsListening(false)
        isListeningRef.current = false
        
        // Auto-restart on network errors if enabled
        if (enabled && event.error === 'network') {
          restartTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start()
              } catch (e) {
                console.error('Failed to restart after network error:', e)
              }
            }
          }, RESTART_DELAY)
        }
      }
      
      recognitionInstance.onend = () => {
        setIsListening(false)
        isListeningRef.current = false
        console.log('🔧 Wake word detection ended. Enabled:', enabled, 'Processing:', isProcessingRef.current)
        
        // Restart if still enabled and not processing
        if (enabled && !isProcessingRef.current) {
          console.log('🔧 Scheduling wake word restart in', RESTART_DELAY, 'ms')
          restartTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && !isListeningRef.current) {
              try {
                console.log('🔧 Restarting wake word detection now...')
                recognitionRef.current.start()
              } catch (e) {
                console.error('Failed to restart wake word detection:', e)
              }
            } else {
              console.log('🔧 Cannot restart - no recognition instance or already listening')
            }
          }, RESTART_DELAY)
        } else {
          console.log('🔧 Not restarting wake word - enabled:', enabled, 'processing:', isProcessingRef.current)
        }
      }
      
      recognitionRef.current = recognitionInstance
      setIsInitialized(true)
      console.log('Wake word detection initialized')
    } else {
      console.error('Speech recognition not supported in this browser')
    }
    
    // Cleanup
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (e) {
          // Ignore errors during cleanup
        }
        recognitionRef.current = null
      }
      setIsInitialized(false)
      setIsListening(false)
      isListeningRef.current = false
    }
  }, [isMounted, isSupported, enabled, isInitialized, lastDetectionTime])

  // Auto-start/stop based on enabled prop (only after initialization)
  useEffect(() => {
    if (!isInitialized) return
    
    console.log('🔧 Wake Word Auto-start effect:', { 
      enabled, 
      hasRecognition: !!recognitionRef.current,
      isCurrentlyListening: isListeningRef.current,
      isInitialized
    })
    
    if (enabled && recognitionRef.current && !isListeningRef.current) {
      console.log('🔧 Wake Word: Auto-starting because enabled=true')
      const started = startListening()
      console.log('🔧 Wake Word: Start result:', started)
    } else if (!enabled && recognitionRef.current) {
      console.log('🔧 Wake Word: Auto-stopping because enabled=false')
      stopListening()
    }
  }, [enabled, isInitialized, startListening, stopListening])

  // isSupported is now handled in the mounting useEffect above

  // Force restart function to clear processing state
  const forceRestart = useCallback(() => {
    console.log('🔧 Force restarting wake word detection')
    isProcessingRef.current = false
    
    if (recognitionRef.current) {
      // Stop first if already running
      if (isListeningRef.current) {
        try {
          recognitionRef.current.abort()
          console.log('🔧 Stopped existing recognition before restart')
        } catch (e) {
          console.log('🔧 Could not stop existing recognition:', (e as Error).message)
        }
      }
      
      // Wait a moment then start
      setTimeout(() => {
        if (recognitionRef.current && !isListeningRef.current) {
          try {
            recognitionRef.current.start()
            console.log('🔧 Wake word detection restarted successfully')
          } catch (e) {
            const error = e as Error
            if (error.name === 'InvalidStateError' && error.message.includes('already started')) {
              console.log('🔧 Wake word already running, no restart needed')
            } else {
              console.error('Failed to force restart wake word:', error)
            }
          }
        }
      }, 100) // Small delay to ensure state is clean
    }
  }, [])

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    forceRestart
  }
}