'use client'

import { useEffect, useState } from 'react'

interface AnimatedBlobProps {
  audioLevel: number
  voiceState: 'idle' | 'listening' | 'processing' | 'speaking'
  isSpeaking: boolean
}

export function AnimatedBlob({ audioLevel, voiceState, isSpeaking: _isSpeaking }: AnimatedBlobProps) {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const baseScale = 1
    const audioScale = 1 + (audioLevel / 100) * 0.8
    setScale(baseScale * audioScale)
  }, [audioLevel])

  const getStateStyles = () => {
    switch (voiceState) {
      case 'listening':
        return {
          background: 'radial-gradient(circle, rgba(0,255,255,0.8) 0%, rgba(0,255,255,0.3) 50%, rgba(0,255,255,0.1) 100%)',
          boxShadow: '0 0 100px rgba(0,255,255,0.6), inset 0 0 50px rgba(0,255,255,0.3)',
          animation: 'pulse 2s infinite'
        }
      case 'processing':
        return {
          background: 'radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,215,0,0.3) 50%, rgba(255,215,0,0.1) 100%)',
          boxShadow: '0 0 100px rgba(255,215,0,0.6), inset 0 0 50px rgba(255,215,0,0.3)',
          animation: 'spin 2s linear infinite'
        }
      case 'speaking':
        return {
          background: 'radial-gradient(circle, rgba(255,107,53,0.9) 0%, rgba(255,107,53,0.4) 50%, rgba(255,107,53,0.1) 100%)',
          boxShadow: '0 0 120px rgba(255,107,53,0.7), inset 0 0 60px rgba(255,107,53,0.4)',
          animation: 'none'
        }
      default:
        return {
          background: 'radial-gradient(circle, rgba(100,100,100,0.3) 0%, rgba(100,100,100,0.1) 50%, transparent 100%)',
          boxShadow: '0 0 40px rgba(100,100,100,0.2), inset 0 0 20px rgba(100,100,100,0.1)',
          animation: 'none'
        }
    }
  }

  const stateStyles = getStateStyles()

  return (
    <div className="flex-1 flex items-center justify-center relative">
      {/* Main Animated Blob */}
      <div 
        className="w-96 h-96 rounded-full transition-all duration-300 ease-out relative"
        style={{
          ...stateStyles,
          transform: `scale(${scale})`,
        }}
      >
        {/* Inner glow effect */}
        <div 
          className="absolute inset-4 rounded-full opacity-60"
          style={{
            background: voiceState === 'speaking' ? 
              'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)' :
              'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            transform: `scale(${1 + (audioLevel / 200)})`,
            transition: 'transform 0.1s ease-out'
          }}
        />
        
        {/* Outer ring for listening state */}
        {voiceState === 'listening' && (
          <div className="absolute -inset-8 rounded-full border-2 border-cyan-400/30 animate-ping" />
        )}
      </div>

      {/* Status Indicator - Moved higher */}
      <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 text-center">
        <div className="text-white/80 text-sm font-medium mb-2">
          {voiceState === 'idle' && 'Ready'}
          {voiceState === 'listening' && 'Listening...'}
          {voiceState === 'processing' && 'Thinking...'}
          {/* Removed "Speaking..." text */}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}