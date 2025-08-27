'use client'

import React from 'react'
import { PomodoroWidget, PomodoroWidgetRef } from './PomodoroWidget'
import SpotifyPlayer from '../SpotifyPlayer'

interface WidgetContainerProps {
  showWidgets: boolean
  setShowWidgets: (show: boolean) => void
  
  // Spotify props
  spotifyConnected: boolean
  onSpotifyConnect: () => void
  onSpotifyStateUpdate: (data: Record<string, unknown>) => void
  
  // Pomodoro props
  pomodoroWidgetRef: React.RefObject<PomodoroWidgetRef | null>
  onPomodoroBreakStart: () => void
  onPomodoroPromptContinue: () => void
  onPomodoroContinueYes: () => void
  onPomodoroContinueNo: () => void
}

export const WidgetContainer = React.memo<WidgetContainerProps>(function WidgetContainer({
  showWidgets,
  setShowWidgets,
  spotifyConnected,
  onSpotifyConnect,
  onSpotifyStateUpdate,
  pomodoroWidgetRef,
  onPomodoroBreakStart,
  onPomodoroPromptContinue,
  onPomodoroContinueYes,
  onPomodoroContinueNo,
}) {
  return (
    <>
      {/* Widget Toggle Button - Top Center */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-30">
        <button
          onClick={() => setShowWidgets(!showWidgets)}
          className="bg-card/20 backdrop-blur-sm text-foreground 
                     rounded-xl px-4 py-1 transition-all duration-200 hover:bg-card/30
                     shadow-lg hover:shadow-xl cursor-pointer"
          title={showWidgets ? "Hide Widgets" : "Show Widgets"}
        >
          <div className="w-6 h-0.5 bg-foreground rounded-full mx-auto"></div>
        </button>
      </div>

      {/* Widget Container - Top Center */}
      <div
        data-testid="widget-container"
        className={`absolute top-8 left-1/2 transform -translate-x-1/2 z-30 flex gap-4 items-center justify-center
                    transition-all duration-500 ease-in-out
                    ${
                      showWidgets
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
                    }`}
      >
        {/* Spotify Player Widget */}
        <SpotifyPlayer
          isConnected={spotifyConnected}
          onConnect={onSpotifyConnect}
          onMusicStateUpdate={onSpotifyStateUpdate}
        />

        {/* Pomodoro Widget */}
        <PomodoroWidget
          ref={pomodoroWidgetRef}
          onBreakStart={onPomodoroBreakStart}
          onPromptContinue={onPomodoroPromptContinue}
          onContinueYes={onPomodoroContinueYes}
          onContinueNo={onPomodoroContinueNo}
        />
      </div>
    </>
  )
})