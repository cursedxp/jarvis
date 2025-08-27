'use client'

import React from 'react'
import dynamic from 'next/dynamic'

const FloatingWindow = dynamic(
  () =>
    import('./FloatingWindow').then((mod) => ({ default: mod.FloatingWindow })),
  { ssr: false }
)

const PlanningClient = dynamic(
  () => import('../../app/planning/PlanningClient'),
  { ssr: false }
)

const KanbanClient = dynamic(
  () => import('../../app/kanban/KanbanClient'),
  { ssr: false }
)

interface FloatingWindowsManagerProps {
  // Planning app
  showPlanningApp: boolean
  onClosePlanningApp: () => void
  
  // Kanban app
  showKanbanApp: boolean
  onCloseKanbanApp: () => void
  
  // Window management
  windowZIndices: {
    planning: number
    kanban: number
  }
  onFocusPlanning: () => void
  onFocusKanban: () => void
}

export const FloatingWindowsManager = React.memo<FloatingWindowsManagerProps>(function FloatingWindowsManager({
  showPlanningApp,
  onClosePlanningApp,
  showKanbanApp,
  onCloseKanbanApp,
  windowZIndices,
  onFocusPlanning,
  onFocusKanban,
}) {
  return (
    <>
      {/* Planning App Floating Window */}
      <FloatingWindow
        isOpen={showPlanningApp}
        onClose={onClosePlanningApp}
        title="Planning App"
        defaultWidth={800}
        defaultHeight={600}
        zIndex={windowZIndices.planning}
        onFocus={onFocusPlanning}
      >
        <PlanningClient />
      </FloatingWindow>

      {/* Kanban Board Floating Window */}
      <FloatingWindow
        isOpen={showKanbanApp}
        onClose={onCloseKanbanApp}
        title="Kanban Board"
        defaultWidth={1200}
        defaultHeight={800}
        zIndex={windowZIndices.kanban}
        onFocus={onFocusKanban}
      >
        <KanbanClient />
      </FloatingWindow>
    </>
  )
})