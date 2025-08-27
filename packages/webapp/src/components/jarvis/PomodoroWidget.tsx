'use client'

import { useState, forwardRef, useImperativeHandle } from 'react'
import { Button } from "@/components/ui/button"
import { Play, RotateCcw, CheckCircle, XCircle } from "lucide-react"
import { usePomodoro, PomodoroPhase } from '@/hooks/usePomodoro'

interface PomodoroWidgetProps {
  onBreakStart?: () => void
  onPromptContinue?: () => void
  onContinueYes?: () => void
  onContinueNo?: () => void
}

export interface PomodoroWidgetRef {
  continueSession: () => void
  dismissPrompt: () => void
  startTimer: (durationMinutes?: number) => void
  startBreakTimer: (durationMinutes?: number) => void
  resetToWorkMode: () => void
  pauseTimer: () => void
  resetTimer: () => void
}

export const PomodoroWidget = forwardRef<PomodoroWidgetRef, PomodoroWidgetProps>(
  function PomodoroWidget({ onBreakStart, onPromptContinue, onContinueYes, onContinueNo }, ref) {
  const [isHovered, setIsHovered] = useState(false)
  
  const {
    phase,
    isRunning,
    formattedTime,
    showContinuePrompt,
    startTimer,
    startBreakTimer,
    resetToWorkMode,
    pauseTimer,
    resetTimer,
    continueSession,
    dismissPrompt
  } = usePomodoro({
    onBreakStart,
    onPromptContinue
  })

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    continueSession,
    dismissPrompt,
    startTimer,
    startBreakTimer,
    resetToWorkMode,
    pauseTimer,
    resetTimer
  }), [continueSession, dismissPrompt, startTimer, startBreakTimer, resetToWorkMode, pauseTimer, resetTimer])

  // Get colors based on phase
  const getColors = (phase: PomodoroPhase) => {
    switch (phase) {
      case 'work':
        return {
          primary: 'stroke-cyan-400',
          secondary: 'stroke-cyan-500/20',
          text: 'text-cyan-400',
          bg: 'bg-cyan-500/10',
          border: 'border-cyan-500/30'
        }
      case 'break':
        return {
          primary: 'stroke-green-400',
          secondary: 'stroke-green-500/20',
          text: 'text-green-400',
          bg: 'bg-green-500/10',
          border: 'border-green-500/30'
        }
      default:
        return {
          primary: 'stroke-cyan-400',
          secondary: 'stroke-cyan-500/20',
          text: 'text-cyan-400',
          bg: 'bg-cyan-500/10',
          border: 'border-cyan-500/30'
        }
    }
  }

  const colors = getColors(phase)

  const handleClick = () => {
    if (phase === 'idle' || !isRunning) {
      startTimer()
    } else {
      pauseTimer()
    }
  }

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation()
    resetTimer()
  }

  return (
    <div 
      className="relative cursor-pointer select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Main square widget */}
      <div 
        className={`relative w-32 h-32 rounded-xl bg-card/80 backdrop-blur-sm 
                   transition-all duration-200 hover:scale-105 
                   flex items-center justify-center shadow-lg hover:shadow-xl`}
      >

        {/* Content */}
        <div className="flex flex-col items-center justify-center z-10 text-foreground">
          {phase === 'idle' ? (
            <div className="text-center">
              <Play className="w-8 h-8 text-foreground mb-2" />
              <div className="text-sm text-foreground opacity-80">
                Start Pomodoro
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-2xl font-mono text-foreground leading-tight mb-1">
                {formattedTime}
              </div>
              <div className="text-sm text-foreground opacity-60 uppercase tracking-wide">
                {phase}
              </div>
            </div>
          )}
        </div>

        {/* Control buttons (shown on hover) */}
        {isHovered && phase !== 'idle' && (
          <div className="absolute -top-2 -right-2 z-20">
            <Button
              onClick={handleReset}
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0 bg-card/20 text-foreground
                         hover:scale-110 transition-all duration-200"
              title="Reset Timer"
            >
              <RotateCcw className="w-3 h-3 text-foreground" />
            </Button>
          </div>
        )}

        {/* Running indicator */}
        {isRunning && (
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500/20 
                          rounded-full animate-pulse">
            <div className="w-full h-full bg-green-500 rounded-full animate-ping" />
          </div>
        )}
      </div>


      {/* Continue Prompt */}
      {showContinuePrompt && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 
                        bg-gray-900/95 backdrop-blur-sm border border-cyan-500/30 
                        rounded-xl p-3 shadow-xl z-50 min-w-max">
          <div className="text-xs text-cyan-400 mb-2 text-center">
            Continue Pomodoro?
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                continueSession()
                onContinueYes?.()
              }}
              variant="ghost"
              size="sm"
              className="text-green-400 hover:text-green-400 hover:bg-green-500/10 p-2 h-7"
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => {
                dismissPrompt()
                onContinueNo?.()
              }}
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-400 hover:bg-red-500/10 p-2 h-7"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})