'use client'

import { useEffect, useRef } from 'react'

interface UseMicrophoneGainProps {
  gainLevel: number // 1.0 = normal, 2.0 = 2x boost, etc.
}

export function useMicrophoneGain({ gainLevel }: UseMicrophoneGainProps) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const setupMicrophoneGain = async (): Promise<MediaStream | null> => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      })
      
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Create gain node
      const gainNode = audioContext.createGain()
      gainNode.gain.setValueAtTime(gainLevel, audioContext.currentTime)
      
      // Create source from microphone
      const source = audioContext.createMediaStreamSource(stream)
      
      // Create destination for output
      const destination = audioContext.createMediaStreamDestination()
      
      // Connect: source -> gain -> destination
      source.connect(gainNode)
      gainNode.connect(destination)
      
      // Store references
      audioContextRef.current = audioContext
      gainNodeRef.current = gainNode
      sourceRef.current = source
      streamRef.current = stream
      
      console.log('🎤 Microphone gain setup complete:', { 
        gainLevel, 
        contextState: audioContext.state,
        streamActive: stream.active
      })
      
      // Return the processed stream
      return destination.stream
      
    } catch (error) {
      console.error('Failed to setup microphone gain:', error)
      // Fallback to regular microphone without gain
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        console.log('🎤 Using fallback microphone without gain boost')
        return fallbackStream
      } catch (fallbackError) {
        console.error('Failed to get fallback microphone:', fallbackError)
        return null
      }
    }
  }

  const updateGain = (newGainLevel: number) => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(newGainLevel, audioContextRef.current.currentTime)
      console.log('🎤 Updated microphone gain to:', newGainLevel)
    }
  }

  const cleanup = () => {
    if (sourceRef.current) {
      sourceRef.current.disconnect()
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect()
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    
    audioContextRef.current = null
    gainNodeRef.current = null
    sourceRef.current = null
    streamRef.current = null
  }

  // Update gain when gainLevel changes
  useEffect(() => {
    updateGain(gainLevel)
  }, [gainLevel])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [])

  return {
    setupMicrophoneGain,
    updateGain,
    cleanup,
    isSetup: !!audioContextRef.current
  }
}