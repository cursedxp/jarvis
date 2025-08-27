'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export type PomodoroPhase = 'idle' | 'work' | 'break' | 'paused'

interface UsePomodoroProps {
  onPhaseComplete?: (phase: PomodoroPhase) => void
  onBreakStart?: () => void
  onWorkStart?: () => void
  onPromptContinue?: () => void
}

export function usePomodoro({
  onPhaseComplete,
  onBreakStart,
  onWorkStart,
  onPromptContinue
}: UsePomodoroProps = {}) {
  const [phase, setPhase] = useState<PomodoroPhase>('idle')
  const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false)
  const [totalTime, setTotalTime] = useState(25 * 60)
  const [showContinuePrompt, setShowContinuePrompt] = useState(false)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const phaseRef = useRef<PomodoroPhase>('idle')

  // Update phase ref when phase changes
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('pomodoro-state')
    if (savedState) {
      try {
        const { phase: savedPhase, timeLeft: savedTime, totalTime: savedTotal } = JSON.parse(savedState)
        if (savedPhase !== 'idle' && savedTime > 0) {
          setPhase(savedPhase)
          setTimeLeft(savedTime)
          setTotalTime(savedTotal)
          // Don't auto-resume timer, user needs to click to continue
        }
      } catch (error) {
        console.error('Failed to load pomodoro state:', error)
      }
    }
  }, [])

  // Save state to localStorage
  const saveState = useCallback(() => {
    const state = {
      phase: phaseRef.current,
      timeLeft,
      totalTime,
      timestamp: Date.now()
    }
    localStorage.setItem('pomodoro-state', JSON.stringify(state))
  }, [timeLeft, totalTime])

  // Timer tick function
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1
          if (newTime <= 0) {
            // Phase complete
            const currentPhase = phaseRef.current
            onPhaseComplete?.(currentPhase)
            
            if (currentPhase === 'work') {
              // Start break phase
              setPhase('break')
              setTimeLeft(5 * 60) // 5 minutes
              setTotalTime(5 * 60)
              setIsRunning(true) // Continue running into break
              onBreakStart?.()
            } else if (currentPhase === 'break') {
              // Break complete, show continue prompt
              setPhase('idle')
              setTimeLeft(25 * 60)
              setTotalTime(25 * 60)
              setIsRunning(false)
              setShowContinuePrompt(true)
              onPromptContinue?.()
            }
            return newTime
          }
          return newTime
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft, onPhaseComplete, onBreakStart, onPromptContinue])

  // Save state when relevant values change
  useEffect(() => {
    if (phase !== 'idle') {
      saveState()
    }
  }, [phase, timeLeft, saveState])

  // Start/resume timer with optional duration
  const startTimer = useCallback((durationMinutes?: number) => {
    const duration = durationMinutes ? durationMinutes * 60 : 25 * 60
    console.log(`🍅 WIDGET: Starting work timer with ${durationMinutes || 25} minutes (${duration} seconds), current phase: ${phase}`)
    
    // Always reset to work phase and set new duration (regardless of current phase)
    setPhase('work')
    setTimeLeft(duration)
    setTotalTime(duration)
    setIsRunning(true)
    setShowContinuePrompt(false)
  }, [])

  // Start break timer with specified duration
  const startBreakTimer = useCallback((durationMinutes?: number) => {
    const duration = durationMinutes ? durationMinutes * 60 : 5 * 60
    console.log(`🍅 WIDGET: Starting break timer with ${durationMinutes || 5} minutes (${duration} seconds), current phase: ${phase}`)
    
    // Set to break phase and set new duration
    setPhase('break')
    setTimeLeft(duration)
    setTotalTime(duration)
    setIsRunning(true)
    setShowContinuePrompt(false)
  }, [])

  // Reset to work mode (25-minute ready state)
  const resetToWorkMode = useCallback(() => {
    console.log(`🍅 WIDGET: Resetting to 25-minute work mode (idle state)`)
    
    // Reset to idle state with 25-minute work timer ready
    setPhase('idle')
    setTimeLeft(25 * 60)
    setTotalTime(25 * 60)
    setIsRunning(false)
    setShowContinuePrompt(false)
  }, [])

  // Pause timer
  const pauseTimer = useCallback(() => {
    setIsRunning(false)
  }, [])

  // Reset timer
  const resetTimer = useCallback(() => {
    setPhase('idle')
    setTimeLeft(25 * 60)
    setTotalTime(25 * 60)
    setIsRunning(false)
    setShowContinuePrompt(false)
    localStorage.removeItem('pomodoro-state')
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Continue with new pomodoro session
  const continueSession = useCallback(() => {
    setShowContinuePrompt(false)
    setPhase('work')
    setTimeLeft(25 * 60)
    setTotalTime(25 * 60)
    setIsRunning(true)
    onWorkStart?.()
  }, [onWorkStart])

  // Dismiss continue prompt
  const dismissPrompt = useCallback(() => {
    setShowContinuePrompt(false)
    resetTimer()
  }, [resetTimer])

  // Format time for display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Calculate progress percentage
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0

  return {
    phase,
    timeLeft,
    totalTime,
    isRunning,
    progress,
    showContinuePrompt,
    formattedTime: formatTime(timeLeft),
    startTimer,
    startBreakTimer,
    resetToWorkMode,
    pauseTimer,
    resetTimer,
    continueSession,
    dismissPrompt
  }
}