'use client'

import { useState, useCallback } from 'react'

export function useWindowManager() {
  // UI State for windows and widgets
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [showPlanningApp, setShowPlanningApp] = useState(false)
  const [showKanbanApp, setShowKanbanApp] = useState(false)
  const [showWidgets, setShowWidgets] = useState(true)
  
  // Window Management
  const [windowZIndices, setWindowZIndices] = useState({ planning: 40, kanban: 41 })
  const [nextZIndex, setNextZIndex] = useState(42)

  const bringWindowToFront = useCallback((windowId: 'planning' | 'kanban') => {
    setWindowZIndices(prev => ({
      ...prev,
      [windowId]: nextZIndex
    }))
    setNextZIndex(prev => prev + 1)
  }, [nextZIndex])

  // Window toggle handlers
  const togglePlanningApp = useCallback(() => {
    console.log('🗓️ Planning app toggle clicked')
    setShowPlanningApp(prev => {
      console.log('🗓️ Planning app state changing from', prev, 'to', !prev)
      return !prev
    })
  }, [])

  const toggleKanbanApp = useCallback(() => {
    console.log('📋 Kanban app toggle clicked')
    setShowKanbanApp(prev => {
      console.log('📋 Kanban app state changing from', prev, 'to', !prev)
      return !prev
    })
  }, [])

  const toggleChatHistory = useCallback(() => {
    setShowChatHistory(prev => !prev)
  }, [])

  const toggleSettings = useCallback(() => {
    setSettingsOpen(prev => !prev)
  }, [])

  const toggleWidgets = useCallback(() => {
    setShowWidgets(prev => !prev)
  }, [])

  // Close handlers
  const closePlanningApp = useCallback(() => {
    setShowPlanningApp(false)
  }, [])

  const closeKanbanApp = useCallback(() => {
    setShowKanbanApp(false)
  }, [])

  const closeChatHistory = useCallback(() => {
    setShowChatHistory(false)
  }, [])

  const openSettings = useCallback(() => {
    setSettingsOpen(true)
  }, [])

  return {
    // State
    settingsOpen,
    showChatHistory,
    showPlanningApp,
    showKanbanApp,
    showWidgets,
    windowZIndices,
    
    // Setters
    setSettingsOpen,
    setShowWidgets,
    
    // Window management
    bringWindowToFront,
    
    // Toggle handlers
    togglePlanningApp,
    toggleKanbanApp,
    toggleChatHistory,
    toggleSettings,
    toggleWidgets,
    
    // Close handlers
    closePlanningApp,
    closeKanbanApp,
    closeChatHistory,
    openSettings
  }
}