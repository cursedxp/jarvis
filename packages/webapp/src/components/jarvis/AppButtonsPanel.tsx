'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import { Settings, History, Calendar } from "lucide-react"

interface AppButtonsPanelProps {
  onShowKanbanApp: () => void
  onShowPlanningApp: () => void
  onShowChatHistory: () => void
  onOpenSettings: () => void
}

export const AppButtonsPanel = React.memo<AppButtonsPanelProps>(function AppButtonsPanel({
  onShowKanbanApp,
  onShowPlanningApp,
  onShowChatHistory,
  onOpenSettings,
}) {
  return (
    <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-3 bg-card/20 backdrop-blur-sm py-3 px-1 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
      <Button
        onClick={onShowKanbanApp}
        variant="ghost"
        size="sm"
        className="text-foreground hover:text-foreground hover:bg-accent cursor-pointer p-3"
        title="Kanban Board"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002 2m0 0v10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2"
          />
        </svg>
      </Button>
      <Button
        onClick={onShowPlanningApp}
        variant="ghost"
        size="sm"
        className="text-foreground hover:text-foreground hover:bg-accent cursor-pointer p-3"
        title="Planning App"
      >
        <Calendar className="w-5 h-5" />
      </Button>
      <Button
        onClick={onShowChatHistory}
        variant="ghost"
        size="sm"
        className="text-foreground hover:text-foreground hover:bg-accent cursor-pointer p-3"
        title="Chat History"
      >
        <History className="w-5 h-5" />
      </Button>
      <Button
        onClick={onOpenSettings}
        variant="ghost"
        size="sm"
        className="text-foreground hover:text-foreground hover:bg-accent cursor-pointer p-3"
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </Button>
    </div>
  )
})