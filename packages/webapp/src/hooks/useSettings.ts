'use client'

import { useState, useEffect, useCallback } from 'react'

interface JarvisSettings {
  // Voice & Chat
  wakeWordEnabled: boolean
  
  // TTS Configuration
  ttsMode: 'system' | 'edge'
  voice: string
  speechRate: number
  
  // Microphone Settings
  microphoneGain: number // 1.0 = normal, 2.0 = 2x boost, etc.
  
  // Theme
  theme?: 'light' | 'dark' | 'system'
  
  // Other preferences
  autoVoiceDetection: boolean
  continuousListening: boolean
  realTimeVisualization: boolean
  voiceStateIndicators: boolean
}

const DEFAULT_SETTINGS: JarvisSettings = {
  wakeWordEnabled: true, // Enabled by default for better UX
  ttsMode: 'edge',
  voice: 'en-US-AriaNeural',
  speechRate: 180,
  microphoneGain: 2.0, // 2x boost by default for better pickup
  theme: 'system',
  autoVoiceDetection: true,
  continuousListening: true,
  realTimeVisualization: true,
  voiceStateIndicators: true
}

const STORAGE_KEY = 'jarvis-settings'

export function useSettings() {
  const [settings, setSettings] = useState<JarvisSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY)
      console.log('🔧 Loading settings from localStorage:', storedSettings)
      
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings)
        const finalSettings = { ...DEFAULT_SETTINGS, ...parsed }
        console.log('🔧 Final settings loaded:', finalSettings)
        setSettings(finalSettings)
      } else {
        console.log('🔧 No stored settings, using defaults:', DEFAULT_SETTINGS)
        setSettings(DEFAULT_SETTINGS)
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error)
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: Partial<JarvisSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    console.log('🔧 Saving settings:', newSettings, 'Updated settings:', updatedSettings)
    setSettings(updatedSettings)
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings))
      console.log('🔧 Settings saved to localStorage successfully')
      return true
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error)
      return false
    }
  }, [settings])

  // Update a specific setting
  const updateSetting = useCallback(<K extends keyof JarvisSettings>(
    key: K,
    value: JarvisSettings[K]
  ) => {
    console.log('🔧 updateSetting called:', key, '=', value)
    saveSettings({ [key]: value })
  }, [saveSettings])

  // Reset to default settings
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    try {
      localStorage.removeItem(STORAGE_KEY)
      return true
    } catch (error) {
      console.error('Failed to reset settings:', error)
      return false
    }
  }, [])

  return {
    settings,
    isLoading,
    saveSettings,
    updateSetting,
    resetSettings,
    DEFAULT_SETTINGS
  }
}