interface PomodoroSession {
  id: string
  phase: 'work' | 'break' | 'idle'
  duration: number // in minutes
  startTime: Date
  endTime: Date
  isActive: boolean
}

interface PomodoroServiceCallbacks {
  onWorkComplete?: () => void
  onBreakComplete?: () => void
  onSessionEnd?: () => void
  onTick?: (timeRemaining: number) => void
}

export class PomodoroService {
  private currentSession: PomodoroSession | null = null
  private timer: NodeJS.Timeout | null = null
  private callbacks: PomodoroServiceCallbacks = {}
  private io: any = null

  constructor(io?: any) {
    this.io = io
  }

  setCallbacks(callbacks: PomodoroServiceCallbacks) {
    this.callbacks = callbacks
  }

  startWorkSession(durationMinutes: number = 25): PomodoroSession {
    this.clearCurrentSession()

    const now = new Date()
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000)

    this.currentSession = {
      id: `pomodoro-${Date.now()}`,
      phase: 'work',
      duration: durationMinutes,
      startTime: now,
      endTime: endTime,
      isActive: true
    }

    this.startTimer()
    console.log(`🍅 POMODORO SERVICE: Started ${durationMinutes}-minute work session`)
    
    // Emit Socket.IO event to sync frontend widget
    if (this.io) {
      console.log(`🍅 POMODORO SERVICE: Emitting pomodoro_sync - start_work (${durationMinutes}min)`)
      this.io.emit('pomodoro_sync', {
        action: 'start_work',
        duration: durationMinutes,
        phase: 'work',
        timestamp: new Date()
      })
    } else {
      console.log(`🍅 POMODORO SERVICE: No Socket.IO instance available for sync`)
    }
    
    return this.currentSession
  }

  startBreakSession(durationMinutes: number = 5): PomodoroSession {
    this.clearCurrentSession()

    const now = new Date()
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000)

    this.currentSession = {
      id: `break-${Date.now()}`,
      phase: 'break', 
      duration: durationMinutes,
      startTime: now,
      endTime: endTime,
      isActive: true
    }

    this.startTimer()
    console.log(`🍅 POMODORO SERVICE: Started ${durationMinutes}-minute break session`)
    
    // Emit Socket.IO event to sync frontend widget  
    if (this.io) {
      this.io.emit('pomodoro_sync', {
        action: 'start_break',
        duration: durationMinutes,
        phase: 'break',
        timestamp: new Date()
      })
    }
    
    return this.currentSession
  }

  stopSession(): void {
    if (this.currentSession) {
      console.log(`🍅 POMODORO SERVICE: Stopped ${this.currentSession.phase} session`)
      
      // Emit Socket.IO event to sync frontend widget
      if (this.io) {
        console.log(`🍅 POMODORO SERVICE: Emitting pomodoro_sync - stop`)
        this.io.emit('pomodoro_sync', {
          action: 'stop',
          phase: 'idle',
          timestamp: new Date()
        })
      } else {
        console.log(`🍅 POMODORO SERVICE: No Socket.IO instance available for sync`)
      }
      
      this.clearCurrentSession()
    }
  }

  getCurrentSession(): PomodoroSession | null {
    return this.currentSession
  }

  getTimeRemaining(): number {
    if (!this.currentSession || !this.currentSession.isActive) {
      return 0
    }

    const now = new Date()
    const remainingMs = this.currentSession.endTime.getTime() - now.getTime()
    return Math.max(0, Math.floor(remainingMs / 1000)) // return seconds
  }

  private startTimer(): void {
    this.clearTimer()

    // Update every second
    this.timer = setInterval(() => {
      if (!this.currentSession || !this.currentSession.isActive) {
        this.clearTimer()
        return
      }

      const timeRemaining = this.getTimeRemaining()
      
      // Notify callbacks of tick
      if (this.callbacks.onTick) {
        this.callbacks.onTick(timeRemaining)
      }

      // Check if session is complete
      if (timeRemaining <= 0) {
        this.handleSessionComplete()
      }
    }, 1000)
  }

  private handleSessionComplete(): void {
    if (!this.currentSession) return

    const completedPhase = this.currentSession.phase
    console.log(`🍅 POMODORO SERVICE: ${completedPhase} session completed`)

    // Mark session as complete
    this.currentSession.isActive = false
    this.clearTimer()

    if (completedPhase === 'work') {
      // Work session complete - start break
      console.log('🍅 POMODORO SERVICE: Work complete, starting break')
      
      // Emit Socket.IO event for frontend announcement
      if (this.io) {
        this.io.emit('pomodoro_phase_complete', {
          phase: 'work',
          nextPhase: 'break',
          message: 'Time for a 5-minute break!',
          timestamp: new Date()
        })
      }

      // Notify callback
      if (this.callbacks.onWorkComplete) {
        this.callbacks.onWorkComplete()
      }

      // Automatically start 5-minute break
      setTimeout(() => {
        this.startBreakSession(5)
      }, 1000) // Small delay for announcement

    } else if (completedPhase === 'break') {
      // Break session complete - ask to continue
      console.log('🍅 POMODORO SERVICE: Break complete, prompting to continue')
      
      // Emit Socket.IO event for frontend prompt
      if (this.io) {
        this.io.emit('pomodoro_phase_complete', {
          phase: 'break', 
          nextPhase: 'prompt',
          message: 'Break time is over! Ready to start another Pomodoro session?',
          timestamp: new Date()
        })
      }

      // Notify callback
      if (this.callbacks.onBreakComplete) {
        this.callbacks.onBreakComplete()
      }
    }

    // Clear current session
    this.currentSession = null
  }

  private clearCurrentSession(): void {
    this.clearTimer()
    this.currentSession = null
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  // Public method to continue with new work session after break
  continueToNextSession(durationMinutes: number = 25): PomodoroSession {
    console.log('🍅 POMODORO SERVICE: Continuing to next work session')
    return this.startWorkSession(durationMinutes)
  }

  // Method to parse duration from natural language
  static parseDuration(input: string): number {
    const lowerInput = input.toLowerCase().trim()
    
    // Extract number from input
    const numberMatch = lowerInput.match(/(\d+)/)
    if (numberMatch) {
      const number = parseInt(numberMatch[1])
      
      // Default to minutes if no unit specified
      if (lowerInput.includes('hour') || lowerInput.includes('hr')) {
        return number * 60
      }
      
      // Default to minutes
      return number
    }
    
    // Default fallback
    return 25
  }
}

export const pomodoroService = new PomodoroService()