'use client'

import { useState } from 'react'

export interface JarvisState {
  // UI State
  settingsOpen: boolean
  showChatHistory: boolean
  showPlanningApp: boolean
  showKanbanApp: boolean
  showWidgets: boolean
  
  // Chat/Voice mode
  chatMode: 'voice' | 'chat'
  
  // Model State
  detectedTaskType: string
  
  // Pomodoro State
  isAwaitingPomodoroConfirmation: boolean
  
  // Spotify State
  spotifyConnected: boolean
}

export interface JarvisStateActions {
  setSettingsOpen: (open: boolean) => void
  setShowChatHistory: (show: boolean) => void
  setShowPlanningApp: (show: boolean) => void
  setShowKanbanApp: (show: boolean) => void
  setShowWidgets: (show: boolean) => void
  setChatMode: (mode: 'voice' | 'chat') => void
  setDetectedTaskType: (taskType: string) => void
  setIsAwaitingPomodoroConfirmation: (awaiting: boolean) => void
  setSpotifyConnected: (connected: boolean) => void
  toggleChatMode: () => void
}

export function useJarvisState(): [JarvisState, JarvisStateActions] {
  // UI State
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [showPlanningApp, setShowPlanningApp] = useState(false)
  const [showKanbanApp, setShowKanbanApp] = useState(false)
  const [showWidgets, setShowWidgets] = useState(true)
  
  // Chat/Voice mode
  const [chatMode, setChatMode] = useState<'voice' | 'chat'>('voice')
  
  // Model State
  const [detectedTaskType, setDetectedTaskType] = useState<string>('')
  
  // Pomodoro State
  const [isAwaitingPomodoroConfirmation, setIsAwaitingPomodoroConfirmation] = useState(false)
  
  // Spotify State
  const [spotifyConnected, setSpotifyConnected] = useState(false)

  const toggleChatMode = () => {
    setChatMode(prev => prev === 'voice' ? 'chat' : 'voice')
  }

  const state: JarvisState = {
    settingsOpen,
    showChatHistory,
    showPlanningApp,
    showKanbanApp,
    showWidgets,
    chatMode,
    detectedTaskType,
    isAwaitingPomodoroConfirmation,
    spotifyConnected,
  }

  const actions: JarvisStateActions = {
    setSettingsOpen,
    setShowChatHistory,
    setShowPlanningApp,
    setShowKanbanApp,
    setShowWidgets,
    setChatMode,
    setDetectedTaskType,
    setIsAwaitingPomodoroConfirmation,
    setSpotifyConnected,
    toggleChatMode,
  }

  return [state, actions]
}