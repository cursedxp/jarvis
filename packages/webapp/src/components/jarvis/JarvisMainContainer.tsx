'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Maximize, Minimize } from 'lucide-react'

// Custom components
import { AnimatedBlob } from './AnimatedBlob'
import { VoiceControls } from './VoiceControls'
import { ChatHistory } from './ChatHistory'
import { ChatView } from './ChatView'
import { HeaderSection } from './HeaderSection'
import { AppButtonsPanel } from './AppButtonsPanel'
import { WidgetContainer } from './WidgetContainer'
import { FloatingWindowsManager } from './FloatingWindowsManager'

// Error boundary
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

// Accessibility
import { useAccessibility } from '@/hooks/useAccessibility'

// Custom hooks
import { useJarvisCore } from '@/hooks/useJarvisCore'
import { useSpotifyIntegration } from '@/hooks/useSpotifyIntegration'
import { useWindowManager } from '@/hooks/useWindowManager'

export function JarvisMainContainer() {
  const [detectedTaskType, setDetectedTaskType] = useState<string>('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Window management hook
  const windowManager = useWindowManager()

  // Spotify integration hook
  const spotify = useSpotifyIntegration()

  // Core Jarvis functionality hook
  const jarvis = useJarvisCore({
    onTaskTypeDetected: setDetectedTaskType
  })

  // Accessibility hook
  const { AnnouncementComponent } = useAccessibility({ 
    announceMessages: true, 
    keyboardNavigation: true 
  })

  // Fullscreen functionality
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.warn('Fullscreen not supported or failed:', error)
    }
  }

  // Initialize on mount
  useEffect(() => {
    jarvis.loadConversations()
    jarvis.loadAndSetAvailableVoices()
    spotify.checkSpotifyConnection()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])


  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('JarvisMainContainer error:', error, errorInfo)
      }}
    >
      <div className="relative h-screen bg-background overflow-hidden">
        {/* Accessibility Announcements */}
        <AnnouncementComponent />
        
        {/* Skip to main content */}
        <button
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-background text-foreground px-4 py-2 rounded"
          onClick={() => document.getElementById('main-interface')?.focus()}
        >
          Skip to main content
        </button>

        {/* Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-lg bg-card/80 backdrop-blur-sm 
                     text-foreground hover:bg-card hover:scale-105 transition-all duration-200 
                     border border-border/50 shadow-lg flex items-center justify-center"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <Minimize className="w-5 h-5" />
          ) : (
            <Maximize className="w-5 h-5" />
          )}
        </button>
        
        {/* Chat History */}
        <ChatHistory 
          isVisible={windowManager.showChatHistory}
          onClose={windowManager.closeChatHistory}
          messages={jarvis.getCurrentMessages()}
          onClearHistory={jarvis.clearChatHistory}
          onSendMessage={jarvis.handleChatMessage}
          isLoading={jarvis.apiLoading}
        />

        {/* Main Interface */}
        <main 
          id="main-interface" 
          className="flex flex-col h-full" 
          tabIndex={-1}
          role="main"
          aria-label="Jarvis Voice Assistant Interface"
        >
          {/* Header Section */}
          <HeaderSection
            detectedTaskType={detectedTaskType}
            settingsOpen={windowManager.settingsOpen}
            setSettingsOpen={windowManager.setSettingsOpen}
            ttsMode={jarvis.ttsMode}
            onTTSModeChange={jarvis.handleTTSModeChange}
            voice={jarvis.voice}
            onVoiceChange={jarvis.handleVoiceChange}
            speechRate={jarvis.speechRate}
            onSpeechRateChange={jarvis.setSpeechRate}
            availableVoices={jarvis.availableVoices}
            onTestVoice={jarvis.testVoice}
            onSaveSettings={jarvis.saveSettings}
            isSpeaking={jarvis.isSpeaking}
            voiceState={jarvis.voiceState}
            wakeWordEnabled={jarvis.wakeWordEnabled}
            onWakeWordEnabledChange={jarvis.handleWakeWordEnabledChange}
            autoVoiceDetection={jarvis.autoVoiceDetection}
            onAutoVoiceDetectionChange={jarvis.handleAutoVoiceDetectionChange}
            continuousListening={jarvis.continuousListening}
            onContinuousListeningChange={jarvis.handleContinuousListeningChange}
            microphoneGain={jarvis.microphoneGain}
            onMicrophoneGainChange={jarvis.setMicrophoneGain}
          />

          {/* Mode-specific interfaces */}
          {jarvis.chatMode === 'voice' ? (
            <>
              {/* Animated Blob */}
              <AnimatedBlob 
                audioLevel={jarvis.realTimeAudioLevel}
                voiceState={jarvis.voiceState}
                isSpeaking={jarvis.isSpeaking}
              />

              {/* Voice Controls */}
              <VoiceControls 
                voiceState={jarvis.voiceState}
                isSpeaking={jarvis.isSpeaking}
                isVoiceEnabled={jarvis.isVoiceEnabled}
                voiceTranscript={jarvis.transcript}
                voiceRecognitionInitialized={jarvis.voiceRecognitionInitialized}
                wakeWordEnabled={jarvis.wakeWordEnabled}
                isListeningForWakeWord={jarvis.isListeningForWakeWord}
                onStartVoice={jarvis.handleStartVoice}
                onStopVoice={jarvis.handleStopVoice}
                onStopTTS={jarvis.handleStopTTS}
                onToggleChatMode={jarvis.handleToggleChatMode}
              />
            </>
          ) : (
            /* Chat View */
            <div className="absolute inset-0 z-20 bg-background">
              <div className="relative h-full">
                {/* Header with mode toggle */}
                <div className="absolute top-6 right-6 z-30">
                  <Button
                    onClick={jarvis.handleToggleChatMode}
                    variant="outline"
                    size="sm"
                    className="text-foreground hover:text-foreground hover:bg-accent cursor-pointer"
                  >
                    Back to Voice
                  </Button>
                </div>
                
                {/* Chat Interface */}
                <ChatView 
                  messages={jarvis.getCurrentMessages()}
                  onSendMessage={jarvis.handleChatMessage}
                  isLoading={jarvis.apiLoading}
                />
              </div>
            </div>
          )}

          {/* Widget Container */}
          <WidgetContainer
            showWidgets={windowManager.showWidgets}
            setShowWidgets={windowManager.setShowWidgets}
            spotifyConnected={spotify.spotifyConnected}
            onSpotifyConnect={spotify.handleSpotifyConnect}
            onSpotifyStateUpdate={spotify.handleSpotifyStateUpdate}
            pomodoroWidgetRef={jarvis.pomodoroWidgetRef}
            onPomodoroBreakStart={jarvis.handlePomodoroBreakStart}
            onPomodoroPromptContinue={jarvis.handlePomodoroPromptContinue}
            onPomodoroContinueYes={jarvis.handlePomodoroContinueYes}
            onPomodoroContinueNo={jarvis.handlePomodoroContinueNo}
          />

          {/* App Buttons Panel */}
          <AppButtonsPanel
            onShowKanbanApp={windowManager.toggleKanbanApp}
            onShowPlanningApp={windowManager.togglePlanningApp}
            onShowChatHistory={windowManager.toggleChatHistory}
            onOpenSettings={windowManager.openSettings}
          />

          {/* Floating Windows Manager */}
          <FloatingWindowsManager
            showPlanningApp={windowManager.showPlanningApp}
            onClosePlanningApp={windowManager.closePlanningApp}
            showKanbanApp={windowManager.showKanbanApp}
            onCloseKanbanApp={windowManager.closeKanbanApp}
            windowZIndices={windowManager.windowZIndices}
            onFocusPlanning={() => windowManager.bringWindowToFront('planning')}
            onFocusKanban={() => windowManager.bringWindowToFront('kanban')}
          />
        </main>
      </div>
    </ErrorBoundary>
  )
}