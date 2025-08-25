'use client'

import { useState, useRef, useCallback } from 'react'

export function useAudioAnimation() {
  const [realTimeAudioLevel, setRealTimeAudioLevel] = useState(0)
  const speakingRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)

  const startAudioLevelSimulation = useCallback(() => {
    console.log('🎵 Starting audio level simulation')
    speakingRef.current = true // CRITICAL: This was missing before!
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    let baseLevel = 30
    let direction = 1
    let intensity = 0.8
    
    const simulate = () => {
      // Use ref instead of state for more reliable checking
      if (!speakingRef.current) {
        console.log('🔇 Stopping simulation - not speaking')
        setRealTimeAudioLevel(0)
        animationFrameRef.current = null
        return
      }
      
      // Create more natural fluctuation
      baseLevel += (Math.random() - 0.5) * 15 * direction
      baseLevel = Math.max(20, Math.min(85, baseLevel))
      
      // Change direction occasionally for variation
      if (Math.random() < 0.1) {
        direction *= -1
      }
      
      // Add some high-frequency variation
      const variation = Math.sin(Date.now() / 100) * 10
      const finalLevel = Math.max(10, baseLevel + variation * intensity)
      
      console.log('🎚️ Audio level:', finalLevel.toFixed(1))
      setRealTimeAudioLevel(finalLevel)
      
      // Vary intensity over time
      intensity += (Math.random() - 0.5) * 0.1
      intensity = Math.max(0.3, Math.min(1.2, intensity))
      
      animationFrameRef.current = requestAnimationFrame(simulate)
    }
    
    simulate()
  }, [])

  const stopAudioLevelSimulation = useCallback(() => {
    console.log('🛑 Stopping audio level simulation')
    speakingRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    // Reset to 0 immediately for clean transition
    setRealTimeAudioLevel(0)
  }, [])

  return {
    realTimeAudioLevel,
    startAudioLevelSimulation,
    stopAudioLevelSimulation,
    speakingRef
  }
}