'use client'

import dynamic from 'next/dynamic'
import { ThemeProvider } from '@/contexts/ThemeContext'

const KanbanClient = dynamic(() => import('./KanbanClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-foreground">Loading Kanban Board...</div>
    </div>
  )
})

export default function KanbanPage() {
  return (
    <ThemeProvider>
      <KanbanClient />
    </ThemeProvider>
  )
}