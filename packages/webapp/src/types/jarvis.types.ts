// Core Types for Jarvis Application
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'
export type ChatMode = 'voice' | 'chat'
export type TTSMode = 'system' | 'edge'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  model?: string
}

export interface WindowIndices {
  planning: number
  kanban: number
}

export interface JarvisAppState {
  // UI State
  settingsOpen: boolean
  showChatHistory: boolean
  showPlanningApp: boolean
  showKanbanApp: boolean
  showWidgets: boolean
  
  // Voice & Chat
  chatMode: ChatMode
  isVoiceEnabled: boolean
  voiceState: VoiceState
  wakeWordEnabled: boolean
  
  // Voice/TTS Configuration
  voice: string
  speechRate: number[]
  ttsMode: TTSMode
  availableVoices: string[]
  
  // System State
  spotifyConnected: boolean
  detectedTaskType: string
  isAwaitingPomodoroConfirmation: boolean
  
  // Window Management
  windowZIndices: WindowIndices
  nextZIndex: number
  
  // Loading States
  isLoading: boolean
  apiLoading: boolean
}

export interface AudioState {
  realTimeAudioLevel: number
  isSpeaking: boolean
  transcript: string
}

export interface ConversationState {
  messages: Message[]
  activeConversation: string | null
}

// Action Types
export interface JarvisActions {
  // UI Actions
  setSettingsOpen: (open: boolean) => void
  setShowChatHistory: (show: boolean) => void
  setShowPlanningApp: (show: boolean) => void
  setShowKanbanApp: (show: boolean) => void
  setShowWidgets: (show: boolean) => void
  
  // Voice & Chat Actions
  setChatMode: (mode: ChatMode) => void
  setIsVoiceEnabled: (enabled: boolean) => void
  setVoiceState: (state: VoiceState) => void
  setWakeWordEnabled: (enabled: boolean) => void
  
  // Voice/TTS Actions
  setVoice: (voice: string) => void
  setSpeechRate: (rate: number[]) => void
  setTtsMode: (mode: TTSMode) => void
  setAvailableVoices: (voices: string[]) => void
  
  // System Actions
  setSpotifyConnected: (connected: boolean) => void
  setDetectedTaskType: (taskType: string) => void
  setIsAwaitingPomodoroConfirmation: (awaiting: boolean) => void
  
  // Window Actions
  bringWindowToFront: (windowId: keyof WindowIndices) => void
  
  // Complex Actions
  toggleChatMode: () => void
  handleChatMessage: (message: string) => Promise<void>
  
  // Loading Actions
  setIsLoading: (loading: boolean) => void
  setApiLoading: (loading: boolean) => void
}

export interface ErrorState {
  hasError: boolean
  error: Error | null
  errorInfo: string | null
}

export interface PerformanceMetrics {
  renderCount: number
  lastRenderTime: number
  componentMountTime: number
}

// Event Types
export interface SocketEvent {
  type: string
  data: any
}

export interface PomodoroEvent {
  action: 'start' | 'stop' | 'reset' | 'start_work' | 'start_break'
  duration?: number
  message?: string
  nextPhase?: string
}

export interface MusicEvent {
  type: string
  data: Record<string, unknown>
}

// Component Props Types
export interface ComponentWithLoading {
  isLoading?: boolean
}

export interface ComponentWithError {
  error?: Error | null
  onErrorRetry?: () => void
}

// Advanced Hook Types
export interface UseOptimizedStateOptions {
  debounce?: number
  throttle?: number
  storage?: 'localStorage' | 'sessionStorage' | null
}

export interface UsePerformanceMonitor {
  trackRenders?: boolean
  trackMemory?: boolean
  onPerformanceIssue?: (metrics: PerformanceMetrics) => void
}